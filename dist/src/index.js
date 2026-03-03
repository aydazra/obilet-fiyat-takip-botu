"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const scraper_1 = require("./scraper");
async function main() {
    try {
        const result = await (0, scraper_1.runScraper)(config_1.default);
        // JSON dosyasına kaydet
        const outputPath = path_1.default.join(__dirname, "..", "fiyatlar.json");
        fs_1.default.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
        console.log(`💾 Veriler kaydedildi: ${outputPath}`);
        // Web arayüzü için de güncelle
        const publicDataPath = path_1.default.join(__dirname, "..", "public", "data.json");
        if (fs_1.default.existsSync(path_1.default.dirname(publicDataPath))) {
            fs_1.default.writeFileSync(publicDataPath, JSON.stringify(result, null, 2), "utf-8");
            console.log(`🌐 Web verisi güncellendi: ${publicDataPath}`);
        }
        console.log("\n📊 Sonuçlar:");
        result.flights.forEach((flight, i) => {
            console.log(`  ${i + 1}. ${flight.airline} | ${flight.departureTime} → ${flight.arrivalTime} | ${flight.price}`);
        });
    }
    catch (error) {
        console.error("❌ Hata:", error);
        process.exit(1);
    }
}
main();
