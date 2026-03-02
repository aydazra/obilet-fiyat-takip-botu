import puppeteer, { Browser, Page } from "puppeteer";
import { Flight, SearchConfig, ScrapeResult } from "./interfaces";

// Türkçe normalize
function norm(s: string): string {
  return s
    .replace(/İ/g,"I").replace(/I/g,"i")  // İ → I → i (önce büyük I'ya, sonra küçüğe)
    .replace(/ı/g,"i")
    .replace(/Ğ/g,"g").replace(/ğ/g,"g")
    .replace(/Ü/g,"u").replace(/ü/g,"u")
    .replace(/Ş/g,"s").replace(/ş/g,"s")
    .replace(/Ö/g,"o").replace(/ö/g,"o")
    .replace(/Ç/g,"c").replace(/ç/g,"c")
    .toLowerCase().trim();
}

// Tarih: "27.02.2026" → "20260227"
function fmtDate(d: string): string {
  const [day, month, year] = d.split(".");
  return `${year}${month}${day}`;
}

// Bilinen şehir kodları (Obilet URL'lerinden alındı)
const KNOWN_CODES: Record<string, string> = {
  "istanbul":      "250_0",
  "ankara":        "222_4",
  "izmir":         "251_18",   // ADB - Adnan Menderes
  "antalya":       "223_0",
  "trabzon":       "225_48",
  "adana":         "226_6",
  "gaziantep":     "243_16",
  "erzurum":       "241_14",
  "kayseri":       "230_19",
  "konya":         "231_22",
  "samsun":        "232_44",
  "bodrum":        "227_10",
  "dalaman":       "228_12",
  "diyarbakir":    "237_11",
  "van":           "235_51",
  "hatay":         "238_17",
  "malatya":       "239_26",
  "nevsehir":      "240_34",
  "mardin":        "241_29",
  "elazig":        "242_71",
  "eskisehir":     "237_14",
  "kahramanmaras": "243_72",
  "bursa":         "236_9",
  "mugla":         "228_12",
  "denizli":       "229_13",
};

function getCityCode(city: string): string | null {
  const n = norm(city);
  if (KNOWN_CODES[n]) return KNOWN_CODES[n];
  for (const [key, val] of Object.entries(KNOWN_CODES)) {
    if (n.includes(key) || key.includes(n)) return val;
  }
  return null;
}

// ─── Aktarmasız filtresi ─────────────────────────────────────────────────────
async function applyNonStopFilter(page: Page): Promise<void> {
  console.log("🔍 Aktarmasız filtresi uygulanıyor...");
  try {
    await page.waitForTimeout(2000);
    await page.waitForSelector("#filters, .filters, [class*='filter']", { timeout: 6000 }).catch(() => {});

    const result = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("input[type='checkbox'], label, span, li, div, a, button"));
      for (const el of all) {
        const text = (el.textContent || "").trim();
        if (text === "Aktarmasız" || text.startsWith("Aktarmasız ") || text === "Direkt") {
          if ((el as HTMLInputElement).type === "checkbox") {
            const label = el.closest("label") || el.parentElement;
            if (label) { (label as HTMLElement).click(); return "checkbox"; }
            (el as HTMLElement).click(); return "checkbox-direct";
          }
          (el as HTMLElement).click();
          return "element: " + text;
        }
      }
      return null;
    });

    if (result) {
      console.log("✅ Aktarmasız filtresi uygulandı:", result);
    } else {
      const xr = await page.$x("//label[contains(.,'Aktarmasız')] | //span[normalize-space(text())='Aktarmasız']");
      if (xr.length > 0) {
        await (xr[0] as any).click();
        console.log("✅ Aktarmasız XPath ile uygulandı.");
      } else {
        console.warn("⚠️  Aktarmasız filtresi bulunamadı.");
      }
    }
    await page.waitForTimeout(2000);
  } catch (err) {
    console.warn("⚠️  Filtre hatası:", (err as Error).message);
  }
}

// ─── Uçuşları çek ────────────────────────────────────────────────────────────
async function scrapeFlights(page: Page): Promise<Flight[]> {
  console.log("✈️  Uçuş verileri çekiliyor...");

  await page.waitForSelector("li.item.journey, li[class*='journey']", { timeout: 25000 })
    .catch(() => console.warn("⚠️  Uçuş listesi timeout..."));
  await page.waitForTimeout(2000);

  return await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(
      "li.item.journey, li[class*='journey'][class*='available']"
    ));

    return cards.slice(0, 5).map((card): any => {
      const airlineEls = card.querySelectorAll(".primary.set.airline, .airline-name");
      const airlines = [...new Set(Array.from(airlineEls).map(el => el.textContent?.trim()).filter(Boolean))];
      const airline = airlines.join(" / ") || "";

      const allText = card.textContent || "";
      const times = [...new Set((allText.match(/\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\b/g) || []))];
      const departureTime = times[0] || "";
      const arrivalTime = times[1] || "";

      const durMatch = allText.match(/\d+\s*s\s*\d+\s*dk|\d+\s*saat/i);
      const duration = durMatch ? durMatch[0].trim() : "";

      const priceCol = card.querySelector(".price.col, [class*='price'][class*='col']");
      let price = "";
      if (priceCol) {
        const m = (priceCol.textContent || "").match(/[\d.,]+\s*(?:TL|₺)/);
        if (m) price = m[0].trim();
      }
      if (!price) {
        const m = allText.match(/[\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:TL|₺)/);
        if (m) price = m[0].trim();
      }

      const isDirect = !allText.match(/aktarma|Aktarma|transit/i);
      return { airline, departureTime, arrivalTime, duration, price, isDirect };
    });
  });
}

// ─── Ana scraper ─────────────────────────────────────────────────────────────
export async function runScraper(config: SearchConfig): Promise<ScrapeResult> {
  console.log("🚀 Scraper başlatılıyor...");
  console.log("📋 Config:", config);

  // Şehir kodlarını bul
  const originCode = getCityCode(config.origin);
  const destCode = getCityCode(config.destination);

  // Yolcu string: 1a, 2a, 1a1c vs.
  const pasStr = `${config.adults}a${config.children > 0 ? config.children + "c" : ""}`;

  // Tarih string
  const depDate = fmtDate(config.departureDate);

  let searchUrl: string;

  if (originCode && destCode) {
    // Direkt URL ile git — en güvenilir yöntem
    const filter = config.nonStop ? "direct" : "all";
    searchUrl = `https://www.obilet.com/ucuslar/${originCode}-${destCode}/${depDate}/${pasStr}/economy/${filter}`;
    console.log("🔗 Direkt URL:", searchUrl);
  } else {
    // Kod bilinmiyorsa ana sayfadan form doldur
    searchUrl = "https://www.obilet.com/ucak-bileti";
    console.log(`⚠️  "${config.origin}" veya "${config.destination}" için kod bulunamadı, form dolduruluyor...`);
  }

  const browser: Browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox","--disable-setuid-sandbox","--lang=tr-TR",
           "--disable-blink-features=AutomationControlled","--window-size=1366,768"],
    defaultViewport: { width: 1366, height: 768 },
  });

  const page: Page = await browser.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9" });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  try {
    if (originCode && destCode) {
      // ── URL ile direkt git ─────────────────────────────────────────────────
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.click("#onetrust-accept-btn-handler").catch(() => {});
      await page.waitForTimeout(500);

      console.log("🔗 Sonuç URL:", page.url());

    } else {
      // ── Kod bilinmiyor — ana sayfadan form doldur, kodları öğren ──────────
      await page.goto("https://www.obilet.com/ucak-bileti", { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.click("#onetrust-accept-btn-handler").catch(() => {});
      await page.waitForTimeout(1000);

      // Şehirleri doldurarak kodları öğren
      const discoveredOrigin = originCode || await discoverCityCode(page, config.origin, "origin");
      const discoveredDest = destCode || await discoverCityCode(page, config.destination, "destination");

      if (discoveredOrigin && discoveredDest) {
        // Artık kodlar var, direkt URL ile git
        const filter = config.nonStop ? "direct" : "all";
        const url = `https://www.obilet.com/ucuslar/${discoveredOrigin}-${discoveredDest}/${depDate}/${pasStr}/economy/${filter}`;
        console.log("🔗 Keşfedilen URL:", url);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(4000);
        await page.click("#onetrust-accept-btn-handler").catch(() => {});
        await page.waitForTimeout(500);
        // İleride hızlı kullanım için logla
        console.log(`💡 İpucu: "${config.origin}" kodu: ${discoveredOrigin}, "${config.destination}" kodu: ${discoveredDest}`);
      } else {
        throw new Error(`"${config.origin}" veya "${config.destination}" şehri bulunamadı. Şehir adını kontrol et.`);
      }
    }

    // Aktarmasız filtresi URL ile zaten uygulandı
    console.log(config.nonStop ? "✅ Aktarmasız filtresi URL ile uygulandı (/direct)" : "ℹ️  Tüm uçuşlar gösteriliyor");

    // Uçuşları çek
    const flights = await scrapeFlights(page);
    console.log(`\n✅ ${flights.length} uçuş bulundu.`);

    if (flights.length === 0) {
      await page.screenshot({ path: "debug-screenshot.png", fullPage: false });
      console.log("📸 debug-screenshot.png kaydedildi.");
    }

    return { searchConfig: config, scrapedAt: new Date().toISOString(), flights };
  } finally {
    await browser.close();
  }
}

// ─── Obilet'ten şehir kodunu dinamik olarak öğren ────────────────────────────
async function discoverCityCode(page: Page, cityName: string, field: "origin" | "destination"): Promise<string | null> {
  const inputSel = field === "origin" ? "#origin input.button" : "#destination input.button";
  const idSel = field === "origin" ? "#origin .display .id, #origin span.id" : "#destination .display .id, #destination span.id";

  try {
    // ob-select'in input'una şehri yaz
    await page.waitForSelector(inputSel, { timeout: 5000 });
    await page.click(inputSel, { clickCount: 3 });
    await page.type(inputSel, cityName, { delay: 80 });
    await page.waitForTimeout(1500);

    // Dropdown'dan ilk sonucu seç
    const picked = await page.evaluate((city: string) => {
      const norm = (s: string) => s.toLowerCase()
        .replace(/ı/g,"i").replace(/İ/g,"i").replace(/ğ/g,"g")
        .replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c");
      const items = Array.from(document.querySelectorAll(".results li, [class*='results'] li, [class*='dropdown'] li"));
      for (const item of items) {
        if (norm(item.textContent || "").includes(norm(city.slice(0, 4)))) {
          (item as HTMLElement).click(); return true;
        }
      }
      if (items.length > 0) { (items[0] as HTMLElement).click(); return true; }
      return false;
    }, cityName);

    if (!picked) {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(600);

    // Seçilen şehrin ID'sini oku (DevTools'ta gördüğümüz <span class="id">237_11</span>)
    const code = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      return el?.textContent?.trim() || null;
    }, idSel);

    if (code) console.log(`  🔑 ${cityName} kodu bulundu: ${code}`);
    return code;
  } catch (e) {
    return null;
  }
}
async function fillCityByForm(page: Page, origin: string, destination: string): Promise<boolean> {
  let originOk = false;
  let destOk = false;

  // Kalkış
  try {
    await page.waitForSelector("input[placeholder*='Nereden']", { timeout: 8000 });
    await page.click("input[placeholder*='Nereden']", { clickCount: 3 });
    await page.type("input[placeholder*='Nereden']", origin, { delay: 80 });
    await page.waitForTimeout(1500);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    originOk = true;
    console.log(`  ✅ Kalkış: ${origin}`);
  } catch (e) {
    console.warn("  ⚠️  Kalkış doldurulamadı:", (e as Error).message);
  }

  // Varış
  try {
    await page.waitForSelector("input[placeholder*='Nereye']", { timeout: 5000 });
    await page.click("input[placeholder*='Nereye']", { clickCount: 3 });
    await page.type("input[placeholder*='Nereye']", destination, { delay: 80 });
    await page.waitForTimeout(1500);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    destOk = true;
    console.log(`  ✅ Varış: ${destination}`);
  } catch (e) {
    console.warn("  ⚠️  Varış doldurulamadı:", (e as Error).message);
  }

  return originOk && destOk;
}

// Şehir listesini dışa aktar (UI için)
export { KNOWN_CODES, getCityCode };