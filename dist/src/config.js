"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    tripType: "one-way", // "one-way" veya "round-trip"
    origin: "İstanbul", // Kalkış şehri
    destination: "Ankara", // Varış şehri
    departureDate: "10.07.2025", // GG.AA.YYYY formatında
    returnDate: undefined, // Sadece round-trip için: "15.07.2025"
    adults: 1,
    children: 0,
};
exports.default = config;
