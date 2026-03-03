"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scraper_1 = require("./src/scraper");
const PUBLIC_DIR = path_1.default.join(__dirname, "..", "public");
const FIYATLAR_PATH = path_1.default.join(__dirname, "..", "fiyatlar.json");
const PORT = 3000;
// MIME tipleri
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json",
    ".css": "text/css",
    ".js": "application/javascript",
    ".png": "image/png",
};
let isRunning = false; // aynı anda iki scraper çalışmasın
const server = http_1.default.createServer(async (req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
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
                const config = JSON.parse(body);
                console.log("\n🔍 Arama isteği alındı:", config);
                isRunning = true;
                const result = await (0, scraper_1.runScraper)(config);
                isRunning = false;
                // public/data.json'a kaydet
                const dataPath = path_1.default.join(PUBLIC_DIR, "data.json");
                fs_1.default.writeFileSync(dataPath, JSON.stringify(result, null, 2), "utf-8");
                // fiyatlar.json'a da kaydet
                fs_1.default.writeFileSync(FIYATLAR_PATH, JSON.stringify(result, null, 2), "utf-8");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
            }
            catch (err) {
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
    let filePath = path_1.default.join(PUBLIC_DIR, url === "/" ? "index.html" : url);
    const ext = path_1.default.extname(filePath);
    if (!fs_1.default.existsSync(filePath)) {
        res.writeHead(404);
        res.end("404 Not Found");
        return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    fs_1.default.createReadStream(filePath).pipe(res);
});
server.listen(PORT, () => {
    console.log(`\n✅ Sunucu başlatıldı: http://localhost:${PORT}`);
    console.log("   Tarayıcıda açın ve arama yapın!\n");
});
