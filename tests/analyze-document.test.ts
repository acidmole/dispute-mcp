import { describe, it, expect } from "vitest";
import { analyzeDocument } from "../src/tools/analyze-document.js";

describe("analyzeDocument", () => {
  it("extracts euro amounts", async () => {
    const result = await analyzeDocument({
      text: "Laskun summa on 125,50 € ja perintäkulut 15,00 euroa.",
      document_type: "invoice",
    });

    expect(result.amounts.length).toBeGreaterThanOrEqual(1);
    expect(result.amounts.some((a) => a.value === 125.5)).toBe(true);
  });

  it("extracts Finnish dates", async () => {
    const result = await analyzeDocument({
      text: "Eräpäivä on 15.3.2026 ja lasku on päivätty 1.3.2026.",
      document_type: "invoice",
    });

    expect(result.dates.length).toBeGreaterThanOrEqual(1);
    expect(result.dates.some((d) => d.date === "15.3.2026")).toBe(true);
  });

  it("extracts deadlines", async () => {
    const result = await analyzeDocument({
      text: "Eräpäivä on 15.3.2026. Viimeistään 30.3.2026 mennessä.",
      document_type: "invoice",
    });

    expect(result.deadlines.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts reference numbers", async () => {
    const result = await analyzeDocument({
      text: "Laskunumero: INV-2026-001\nViite: RF12345678",
      document_type: "invoice",
    });

    expect(result.referenceNumbers.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts sender from business name", async () => {
    const result = await analyzeDocument({
      text: "Perintäpalvelu Oy\nLasku maksamattomasta palvelusta.",
      document_type: "invoice",
    });

    expect(result.parties.sender).toBeTruthy();
  });

  it("sets document type correctly", async () => {
    const result = await analyzeDocument({
      text: "Tämä on testiasiakirja.",
      document_type: "court_summons",
    });

    expect(result.documentType).toBe("court_summons");
  });

  it("generates summary", async () => {
    const result = await analyzeDocument({
      text: "Tämä on lasku palvelumaksusta.",
      document_type: "invoice",
    });

    expect(result.summary).toBeTruthy();
    expect(result.summary).toContain("Lasku");
  });

  it("preserves raw text", async () => {
    const text = "Alkuperäinen teksti tässä.";
    const result = await analyzeDocument({
      text,
      document_type: "other",
    });

    expect(result.rawText).toBe(text);
  });

  it("throws when neither file_path nor text provided", async () => {
    await expect(
      analyzeDocument({ document_type: "invoice" })
    ).rejects.toThrow();
  });
});
