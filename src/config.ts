import { SearchConfig } from "./interfaces";

const config: SearchConfig = {
  tripType: "one-way",       // "one-way" veya "round-trip"
  origin: "İstanbul",        // Kalkış şehri
  destination: "Ankara",     // Varış şehri
  departureDate: "10.07.2025", // GG.AA.YYYY formatında
  returnDate: undefined,     // Sadece round-trip için: "15.07.2025"
  adults: 1,
  children: 0,
};

export default config;
