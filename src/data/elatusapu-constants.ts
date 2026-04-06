// Elatusapuvakiot OM 2007:2 ohjeen, OM 2023 vuoroasumistäydennyksen ja STM:n
// vuosittaisten indeksitarkistusten mukaisesti.
//
// Lähteet:
// - OM 2007:2 "Ohje lapsen elatusavun suuruuden arvioimiseksi"
// - OM 2023 "Elatusapu vuoroasumistilanteessa"
// - STM "Elatusapujen määrät" (vuosittainen ohje)

export interface ElatusapuVakiot {
  vuosi: number;
  indeksikerroin: { osoittaja: number; nimittaja: number };
  kelaElatustuki: number;
  peruskulutus: { "0-6": number; "7-12": number; "13-17": number };
  asumisprosentitYksinhuolto: Record<string, number>;
  asumisprosentitVuoroasuminen: Record<string, number>;
  luonapitovahennys: {
    "0-6": Record<string, number>;
    "7-12": Record<string, number>;
    "13-17": Record<string, number>;
  };
  muutoskynnys: number;
}

export const ELATUSAPU_VAKIOT: Record<number, ElatusapuVakiot> = {
  2026: {
    vuosi: 2026,
    indeksikerroin: { osoittaja: 2338, nimittaja: 2343 },
    kelaElatustuki: 197.71,
    peruskulutus: { "0-6": 362.23, "7-12": 421.95, "13-17": 567.64 },
    asumisprosentitYksinhuolto: {
      "1": 23,
      "2": 19,
      "3": 16,
      "4": 14,
      "5": 12,
      "6": 10,
    },
    asumisprosentitVuoroasuminen: {
      "1": 11.5,
      "2": 9.5,
      "3": 8,
      "4": 6,
    },
    luonapitovahennys: {
      "0-6": { "7-9": 37.0, "10-12": 51.0, "13-15": 67.0 },
      "7-12": { "7-9": 41.0, "10-12": 55.0, "13-15": 71.5 },
      "13-17": { "7-9": 44.5, "10-12": 62.5, "13-15": 77.5 },
    },
    muutoskynnys: 0.15,
  },
};

export function haeVakiot(vuosi?: number): ElatusapuVakiot {
  if (vuosi && ELATUSAPU_VAKIOT[vuosi]) return ELATUSAPU_VAKIOT[vuosi];
  const viimeisin = Math.max(...Object.keys(ELATUSAPU_VAKIOT).map(Number));
  return ELATUSAPU_VAKIOT[viimeisin];
}
