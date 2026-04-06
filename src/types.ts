import { z } from "zod";

// Document types that can be analyzed
export const DocumentTypeSchema = z.enum([
  "invoice",
  "court_summons",
  "contract",
  "letter",
  "other",
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

// Dispute types that can be generated
export const DisputeTypeSchema = z.enum([
  // Template-based types
  "karajaoikeus_vastaus",
  "reklamaatio",
  "kril_hakemus",
  "laskun_kiistaminen",
  "perinnan_kiistaminen",
  "hallinto_valitus",
  "vakuutus_oikaisu",
  "vuokra_reklamaatio",
  "vahingonkorvaus",
  "takaisinsaanti",
  // Child support types
  "elatusapu_sopimus",
  "elatusapu_hakemus",
  "elatusapu_muutos",
  "elatustuki_hakemus",
  // Legacy types (mapped to templates)
  "invoice_denial",
  "court_response",
  "complaint",
  "claim",
  "objection",
]);
export type DisputeType = z.infer<typeof DisputeTypeSchema>;

// Legal source types
export const SourceTypeSchema = z.enum([
  "law",
  "kko_ruling",
  "kho_ruling",
  "he_document",
  "consumer_board",
  "all",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

// Output language
export const LanguageSchema = z.enum(["fi", "sv"]);
export type Language = z.infer<typeof LanguageSchema>;

// Result from document analysis
export interface DocumentAnalysis {
  documentType: DocumentType;
  parties: {
    sender?: string;
    recipient?: string;
  };
  claims: string[];
  amounts: { value: number; currency: string; description: string }[];
  dates: { date: string; description: string }[];
  deadlines: { date: string; description: string }[];
  referenceNumbers: string[];
  summary: string;
  rawText: string;
}

// A chunk of legal text stored in the vector DB
export interface LegalChunk {
  id: string;
  text: string;
  vector: number[];
  sourceType: "law" | "kko_ruling" | "kho_ruling" | "he_document" | "consumer_board";
  lawId?: string;
  lawName?: string;
  section?: string;
  chapter?: string;
  caseId?: string;
  heNumber?: string;
  legalArea?: string;
  citation: string; // Human-readable citation e.g. "Kuluttajansuojalaki 5 luku 12 §"
  url?: string;
}

// Search result from legal search
export interface LegalSearchResult {
  citation: string;
  text: string;
  sourceType: string;
  relevanceScore: number;
  url?: string;
  lawName?: string;
  section?: string;
  chapter?: string;
}

// Statute metadata from Finlex API
export interface StatuteInfo {
  year: number;
  number: number;
  name: string;
  legalArea: string;
}

// The focused set of consumer-relevant Finnish laws to index
export const CONSUMER_LAWS: StatuteInfo[] = [
  { year: 1978, number: 38, name: "Kuluttajansuojalaki", legalArea: "kuluttajansuoja" },
  { year: 1734, number: 4, name: "Oikeudenkäymiskaari", legalArea: "prosessioikeus" },
  { year: 1974, number: 412, name: "Vahingonkorvauslaki", legalArea: "vahingonkorvaus" },
  { year: 1982, number: 633, name: "Korkolaki", legalArea: "velvoiteoikeus" },
  { year: 1999, number: 513, name: "Laki saatavien perinnästä", legalArea: "perintä" },
  { year: 1994, number: 843, name: "Asuntokauppalaki", legalArea: "asuntokauppa" },
  { year: 2001, number: 55, name: "Työsopimuslaki", legalArea: "työoikeus" },
  { year: 1999, number: 731, name: "Perustuslaki", legalArea: "perusoikeudet" },
  { year: 1929, number: 228, name: "Laki varallisuusoikeudellisista oikeustoimista", legalArea: "sopimusoikeus" },
  { year: 1966, number: 120, name: "Kauppalaki (irtain omaisuus)", legalArea: "kauppaoikeus" },
  { year: 2013, number: 746, name: "Laki kuluttajariitalautakunnasta", legalArea: "kuluttajansuoja" },
  { year: 1995, number: 1552, name: "Kiinteistökauppalaki (maakaari)", legalArea: "kiinteistöoikeus" },
  { year: 2005, number: 746, name: "Laki asuinhuoneiston vuokrauksesta", legalArea: "vuokraoikeus" },
  { year: 2007, number: 460, name: "Laki sähköisestä viestinnästä", legalArea: "viestintäoikeus" },
  { year: 2013, number: 527, name: "Rikoslaki (petokset, 36 luku)", legalArea: "rikosoikeus" },
  { year: 2010, number: 100, name: "Kuluttajaturvallisuuslaki", legalArea: "kuluttajansuoja" },
  { year: 1996, number: 1118, name: "Vanhentumislaki (saatavan vanhentuminen)", legalArea: "velvoiteoikeus" },
  { year: 2004, number: 228, name: "Tietosuojalaki", legalArea: "tietosuoja" },
  // Family law (perheoikeus)
  { year: 1975, number: 704, name: "Laki lapsen elatuksesta", legalArea: "perheoikeus" },
  { year: 2008, number: 580, name: "Elatustukilaki", legalArea: "perheoikeus" },
  { year: 1929, number: 234, name: "Avioliittolaki", legalArea: "perheoikeus" },
  { year: 2015, number: 11, name: "Isyyslaki", legalArea: "perheoikeus" },
  { year: 2018, number: 253, name: "Äitiyslaki", legalArea: "perheoikeus" },
  { year: 1983, number: 361, name: "Laki lapsen huollosta ja tapaamisoikeudesta", legalArea: "perheoikeus" },
];
