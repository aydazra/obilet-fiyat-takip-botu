import http from "http";
import fs from "fs";
import path from "path";
import { runScraper } from "./src/scraper";
import { SearchConfig } from "./src/interfaces";

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const FIYATLAR_PATH = path.join(__dirname, "..", "fiyatlar.json");
const PORT = 3000;

// MIME tipleri
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
};

let isRunning = false; // aynı anda iki scraper çalışmasın

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = req.url || "/";

  // ── POST /search → scraper'ı çalıştır ──────────────────────────────────────
  if (req.method === "POST" && url === "/search") {
    if (isRunning) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Scraper zaten çalışıyor, bekleyin..." }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const config: SearchConfig = JSON.parse(body);
        console.log("\n🔍 Arama isteği alındı:", config);

        isRunning = true;
        const result = await runScraper(config);
        isRunning = false;

        // public/data.json'a kaydet
        const dataPath = path.join(PUBLIC_DIR, "data.json");
        fs.writeFileSync(dataPath, JSON.stringify(result, null, 2), "utf-8");

        // fiyatlar.json'a da kaydet
        fs.writeFileSync(FIYATLAR_PATH, JSON.stringify(result, null, 2), "utf-8");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        isRunning = false;
        console.error("Scraper hatası:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // ── GET /status → scraper durumu ───────────────────────────────────────────
  if (req.method === "GET" && url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ running: isRunning }));
    return;
  }

  // ── Statik dosya sun ───────────────────────────────────────────────────────
  let filePath = path.join(PUBLIC_DIR, url === "/" ? "index.html" : url);
  const ext = path.extname(filePath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end("404 Not Found"); return;
  }

  res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n✅ Sunucu başlatıldı: http://localhost:${PORT}`);
  console.log("   Tarayıcıda açın ve arama yapın!\n");
});
