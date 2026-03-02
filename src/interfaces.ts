export interface SearchConfig {
  tripType: "one-way" | "round-trip";
  origin: string;
  destination: string;
  departureDate: string; // "DD.MM.YYYY"
  returnDate?: string;   // "DD.MM.YYYY" - sadece gidiş-dönüş için
  adults: number;
  children: number;
  nonStop?: boolean;     // true = sadece aktarmasız uçuşlar
}

export interface Flight {
  airline: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: string;
  isDirect: boolean;
}

export interface ScrapeResult {
  searchConfig: SearchConfig;
  scrapedAt: string;
  flights: Flight[];
}