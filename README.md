# ✈️ Gelişmiş Uçak Bileti Fiyat Botu

**Obilet** üzerinden Puppeteer ile uçak bileti fiyatlarını otomatik olarak çeken, filtreleyen ve web arayüzünde gösteren TypeScript projesi.

## 🛠️ Kullanılan Teknolojiler

| Teknoloji | Amaç |
|---|---|
| TypeScript (Node.js) | Programlama dili |
| Puppeteer | Headless browser / web scraping |
| GitHub Actions | CI/CD otomasyon |
| Git & GitHub | Versiyon kontrolü |

---

## 🚀 Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Scraper'ı çalıştır
npm start

# 3. Web arayüzünü aç (ayrı terminal)
npm run serve
# → Tarayıcıda: http://localhost:3000
```

---

## ⚙️ Arama Parametrelerini Değiştirme

`src/config.ts` dosyasını aç ve istediğin değerleri gir:

```ts
const config: SearchConfig = {
  tripType: "one-way",        // "one-way" (Tek Yön) veya "round-trip" (Gidiş-Dönüş)
  origin: "İstanbul",         // Kalkış şehri
  destination: "Ankara",      // Varış şehri
  departureDate: "10.07.2025",// Gidiş tarihi — GG.AA.YYYY formatında
  returnDate: undefined,      // Dönüş tarihi — sadece round-trip için: "15.07.2025"
  adults: 1,                  // Yetişkin yolcu sayısı
  children: 0,                // Çocuk yolcu sayısı
};
```

Değişikliği kaydedip terminalde çalıştır:
```bash
npm start
```

---

## 📁 Proje Yapısı

```
obilet-scraper/
├── src/
│   ├── config.ts        ← 🔧 BURADAN parametreleri değiştir
│   ├── interfaces.ts    ← TypeScript tip tanımları
│   ├── scraper.ts       ← Puppeteer scraping motoru
│   └── index.ts         ← Giriş noktası
├── public/
│   ├── index.html       ← Web arayüzü (localhost:3000)
│   └── data.json        ← Çekilen veriler (otomatik güncellenir)
├── .github/
│   └── workflows/
│       └── scraper.yml  ← GitHub Actions (her gün 11:00 TR)
├── fiyatlar.json        ← Ham JSON çıktısı
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 Nasıl Çalışır?

```
src/config.ts'te parametreler ayarlanır
        ↓
Puppeteer görünmez Chrome açar
        ↓
obilet.com/ucak-bileti'ne gider
        ↓
Formu otomatik doldurur (şehir, tarih, yolcu)
        ↓
"Aktarmasız" filtresini uygular
        ↓
İlk 5 uçuşun verilerini çeker
        ↓
fiyatlar.json ve public/data.json'a kaydeder
        ↓
Web arayüzü bu veriyi gösterir
```

---

## 🤖 GitHub Actions Otomasyonu

Scraper her gün **saat 11:00 (Türkiye saati)** otomatik çalışır.

Manuel tetiklemek için:
> GitHub → Actions sekmesi → "Obilet Uçuş Scraper" → "Run workflow"

---

## 📊 Çıktı Formatı

```json
{
  "searchConfig": {
    "tripType": "one-way",
    "origin": "İstanbul",
    "destination": "Ankara",
    "departureDate": "27.02.2026",
    "adults": 1,
    "children": 0
  },
  "scrapedAt": "2026-02-25T12:11:23.679Z",
  "flights": [
    {
      "airline": "AJet",
      "departureTime": "05:25",
      "arrivalTime": "06:40",
      "duration": "1s 15dk",
      "price": "837,72 TL",
      "isDirect": true
    }
  ]
}
```

---

## ✅ Kabul Kriterleri Karşılaması

| # | Kriter | Durum |
|---|---|---|
| 1 | TypeScript ile type-safe yazılmış | ✅ |
| 2 | Parametreler config'den değiştirilebilir | ✅ |
| 3 | Tek Yön & Gidiş-Dönüş (tarih seçici dahil) | ✅ |
| 4 | Aktarmasız filtresi başarıyla uygulanıyor | ✅ |
| 5 | GitHub Actions workflow yeşil tik | ✅ |
| 6 | README.md kurulum ve parametre rehberi | ✅ |
