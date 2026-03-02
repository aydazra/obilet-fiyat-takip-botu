import fs from "fs";
import path from "path";
import config from "./config";
import { runScraper } from "./scraper";
import { ScrapeResult } from "./interfaces";

async function main(): Promise<void> {
  try {
    const result: ScrapeResult = await runScraper(config);

    // JSON dosyasına kaydet
    const outputPath = path.join(__dirname, "..", "fiyatlar.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 Veriler kaydedildi: ${outputPath}`);

    // Web arayüzü için de güncelle
    const publicDataPath = path.join(__dirname, "..", "public", "data.json");
    if (fs.existsSync(path.dirname(publicDataPath))) {
      fs.writeFileSync(publicDataPath, JSON.stringify(result, null, 2), "utf-8");
      console.log(`🌐 Web verisi güncellendi: ${publicDataPath}`);
    }

    console.log("\n📊 Sonuçlar:");
    result.flights.forEach((flight, i) => {
      console.log(`  ${i + 1}. ${flight.airline} | ${flight.departureTime} → ${flight.arrivalTime} | ${flight.price}`);
    });
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
}

main();
