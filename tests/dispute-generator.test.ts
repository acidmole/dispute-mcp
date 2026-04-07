import { describe, it, expect } from "vitest";
import { generateDispute } from "../src/services/dispute-generator.js";
import type { DocumentAnalysis, LegalSearchResult } from "../src/types.js";

const mockAnalysis: DocumentAnalysis = {
  documentType: "invoice",
  parties: { sender: "Yritys Oy", recipient: "Matti Meikäläinen" },
  claims: ["Vaadimme maksua 500,00 euroa."],
  amounts: [{ value: 500, currency: "EUR", description: "Palvelumaksu" }],
  dates: [{ date: "1.1.2026", description: "Laskun päivämäärä" }],
  deadlines: [{ date: "15.1.2026", description: "Eräpäivä" }],
  referenceNumbers: ["INV-2026-001"],
  summary: "Lasku palvelumaksusta 500,00 EUR",
  rawText: "Lasku...",
};

const mockRefs: LegalSearchResult[] = [
  {
    citation: "Kuluttajansuojalaki 5 luku 12 §",
    text: "Tavaran virhe on oikaistava...",
    sourceType: "law",
    relevanceScore: 0.9,
    url: "https://www.finlex.fi/fi/laki/ajantasa/1978/19780038",
  },
  {
    citation: "KKO:2024:42",
    text: "Korkein oikeus katsoi...",
    sourceType: "kko_ruling",
    relevanceScore: 0.8,
  },
];

describe("generateDispute", () => {
  it("generates template-based document for new types", () => {
    const result = generateDispute({
      disputeType: "karajaoikeus_vastaus",
      documentAnalysis: mockAnalysis,
      legalReferences: mockRefs,
      userArguments: "Kiistän kanteen kokonaisuudessaan.",
      respondent: "Käräjäoikeus",
      language: "fi",
    });

    expect(result).toContain("VASTAUS KÄRÄJÄOIKEUDELLE");
    expect(result).toContain("Kiistän kanteen");
    expect(result).toContain("INV-2026-001");
    expect(result).toContain("dispute-mcp");
  });

  it("generates template-based document for reklamaatio", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: mockRefs,
      userArguments: "Tuote on viallinen.",
      respondent: "Kauppa Oy",
      language: "fi",
    });

    expect(result).toContain("REKLAMAATIO");
    expect(result).toContain("Kauppa Oy");
  });

  it("maps legacy invoice_denial to laskun_kiistaminen", () => {
    const result = generateDispute({
      disputeType: "invoice_denial",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Lasku on perusteeton.",
      respondent: "Yritys Oy",
      language: "fi",
    });

    expect(result).toContain("LASKUN KIISTÄMINEN");
  });

  it("maps legacy court_response to karajaoikeus_vastaus", () => {
    const result = generateDispute({
      disputeType: "court_response",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Kiistän.",
      respondent: "Käräjäoikeus",
      language: "fi",
    });

    expect(result).toContain("VASTAUS KÄRÄJÄOIKEUDELLE");
  });

  it("groups legal references by source type", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: mockRefs,
      userArguments: "Tuote viallinen.",
      respondent: "Kauppa Oy",
      language: "fi",
    });

    expect(result).toContain("Sovellettavat lainkohdat");
    expect(result).toContain("Oikeuskäytäntö (KKO)");
    expect(result).toContain("Kuluttajansuojalaki 5 luku 12 §");
    expect(result).toContain("KKO:2024:42");
  });

  it("includes deadline warning from template", () => {
    const result = generateDispute({
      disputeType: "hallinto_valitus",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Päätös on lainvastainen.",
      respondent: "Hallinto-oikeus",
      language: "fi",
    });

    expect(result).toContain("MÄÄRÄAIKA");
    expect(result).toContain("30 päivää");
  });

  it("includes disclaimer", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("ei ole oikeudellinen neuvo");
  });

  it("includes signature block", () => {
    const result = generateDispute({
      disputeType: "laskun_kiistaminen",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Perusteeton.",
      respondent: "Yritys",
      language: "fi",
    });

    expect(result).toContain("Allekirjoitus");
    expect(result).toContain("____________________");
  });

  it("includes date", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("Päivämäärä");
    // Should contain current year
    expect(result).toContain(String(new Date().getFullYear()));
  });
});

describe("generateDispute legal reference verification", () => {
  it("filters out references with low relevance score", () => {
    const lowRelevanceRef: LegalSearchResult = {
      citation: "Kuluttajansuojalaki 99 luku 999 §",
      text: "Vain heikosti liittyvä teksti",
      sourceType: "law",
      relevanceScore: 0.1, // Below 0.3 threshold
    };
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [lowRelevanceRef],
      userArguments: "Tuote viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    // The rejected reference should NOT appear in the legal grounds section
    expect(result).not.toContain("## Oikeudelliset perusteet");
    expect(result).toContain("Hylätyt lakiviittaukset");
    expect(result).toContain("liian alhainen relevanssi");
  });

  it("filters out references with empty citation", () => {
    const emptyRef: LegalSearchResult = {
      citation: "",
      text: "Jotain tekstiä",
      sourceType: "law",
      relevanceScore: 0.9,
    };
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [emptyRef],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("tyhjä viittaus");
  });

  it("filters out references with invalid source type", () => {
    const invalidRef: LegalSearchResult = {
      citation: "Outo lähde 1 §",
      text: "Tekstiä",
      sourceType: "fabricated_source",
      relevanceScore: 0.9,
    };
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [invalidRef],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("tuntematon lähdetyyppi");
    expect(result).not.toContain("Outo lähde 1 §\n>");
  });

  it("keeps valid references with high relevance", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: mockRefs, // 0.9 and 0.8 relevance
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("Kuluttajansuojalaki 5 luku 12 §");
    expect(result).toContain("KKO:2024:42");
  });

  it("includes legality and verification disclaimer", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toContain("LAINMUKAISUUS JA VERIFIOINTI");
    expect(result).toContain("lainvastaisiin tai rikollisiin");
    expect(result).toContain("Finlex");
  });
});

describe("generateDispute elatusapu", () => {
  it("generates elatusapu_sopimus with calculation sections", () => {
    const result = generateDispute({
      disputeType: "elatusapu_sopimus",
      documentAnalysis: mockAnalysis,
      legalReferences: mockRefs,
      userArguments: "Sovimme elatusavuksi 350 euroa kuukaudessa.",
      respondent: "Lastenvalvoja, Helsinki",
      language: "fi",
    });

    expect(result).toContain("ELATUSSOPIMUS");
    expect(result).toContain("362.23"); // peruskulutus 0-6v
    expect(result).toContain("Elatuskyky");
  });

  it("generates elatusapu_muutos with modification basis", () => {
    const result = generateDispute({
      disputeType: "elatusapu_muutos",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Tuloni ovat laskeneet 30% työttömyyden vuoksi.",
      respondent: "Lastenvalvoja",
      language: "fi",
    });

    expect(result).toContain("ELATUSAVUN MUUTOSHAKEMUS");
    expect(result).toContain("15 %");
  });

  it("generates elatustuki_hakemus with Kela amount", () => {
    const result = generateDispute({
      disputeType: "elatustuki_hakemus",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Elatusvelvollinen ei ole maksanut elatusapua 6 kuukauteen.",
      respondent: "Kela",
      language: "fi",
    });

    expect(result).toContain("ELATUSTUKIHAKEMUS");
    expect(result).toContain("197.71");
  });
});

describe("generateDispute edge cases", () => {
  it("handles empty legal references", () => {
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: mockAnalysis,
      legalReferences: [],
      userArguments: "Virhe.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).not.toContain("Oikeudelliset perusteet");
  });

  it("handles empty amounts", () => {
    const analysis = { ...mockAnalysis, amounts: [] };
    const result = generateDispute({
      disputeType: "laskun_kiistaminen",
      documentAnalysis: analysis,
      legalReferences: [],
      userArguments: "Perusteeton.",
      respondent: "Yritys",
      language: "fi",
    });

    expect(result).toBeTruthy();
  });

  it("handles empty claims", () => {
    const analysis = { ...mockAnalysis, claims: [] };
    const result = generateDispute({
      disputeType: "reklamaatio",
      documentAnalysis: analysis,
      legalReferences: [],
      userArguments: "Viallinen.",
      respondent: "Kauppa",
      language: "fi",
    });

    expect(result).toBeTruthy();
  });
});
