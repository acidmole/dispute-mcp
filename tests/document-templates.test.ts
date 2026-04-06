import { describe, it, expect } from "vitest";
import { DOCUMENT_TEMPLATES, findTemplate, LEGACY_TYPE_MAP } from "../src/data/document-templates.js";

describe("Document Templates", () => {
  it("contains 14 templates", () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(14);
  });

  it("each template has required fields", () => {
    for (const t of DOCUMENT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.targetInstitution).toBeTruthy();
      expect(t.legalBasis).toBeTruthy();
      expect(t.sections.length).toBeGreaterThan(0);
      expect(t.demands.length).toBeGreaterThan(0);
      expect(t.searchQueries.length).toBeGreaterThan(0);
      expect(t.applicableLaws.length).toBeGreaterThan(0);
    }
  });

  it("each template has unique id", () => {
    const ids = DOCUMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has at least one required section", () => {
    for (const t of DOCUMENT_TEMPLATES) {
      const requiredSections = t.sections.filter((s) => s.required);
      expect(requiredSections.length).toBeGreaterThan(0);
    }
  });

  it("each section has id, title, and description", () => {
    for (const t of DOCUMENT_TEMPLATES) {
      for (const s of t.sections) {
        expect(s.id, `${t.id} section missing id`).toBeTruthy();
        expect(s.title, `${t.id}/${s.id} missing title`).toBeTruthy();
        expect(s.description, `${t.id}/${s.id} missing description`).toBeTruthy();
      }
    }
  });

  it("templates with deadlines have valid deadline structure", () => {
    const withDeadlines = DOCUMENT_TEMPLATES.filter((t) => t.deadline);
    expect(withDeadlines.length).toBeGreaterThan(0);

    for (const t of withDeadlines) {
      expect(t.deadline!.description).toBeTruthy();
      expect(t.deadline!.fromEvent).toBeTruthy();
    }
  });

  it("karajaoikeus_vastaus has OK 5:10 required sections", () => {
    const t = findTemplate("karajaoikeus_vastaus");
    expect(t).toBeDefined();

    const requiredIds = t!.sections.filter((s) => s.required).map((s) => s.id);
    expect(requiredIds).toContain("kanta");
    expect(requiredIds).toContain("kiistamisperusteet");
    expect(requiredIds).toContain("todisteet");
    expect(requiredIds).toContain("oikeudenkayntikulut");
    expect(requiredIds).toContain("allekirjoitus");
  });

  it("hallinto_valitus has 30-day deadline", () => {
    const t = findTemplate("hallinto_valitus");
    expect(t).toBeDefined();
    expect(t!.deadline).toBeDefined();
    expect(t!.deadline!.days).toBe(30);
  });

  it("takaisinsaanti has 30-day deadline", () => {
    const t = findTemplate("takaisinsaanti");
    expect(t).toBeDefined();
    expect(t!.deadline!.days).toBe(30);
  });

  it("elatusapu_sopimus has required calculation sections", () => {
    const t = findTemplate("elatusapu_sopimus");
    expect(t).toBeDefined();
    expect(t!.targetInstitution).toContain("Lastenvalvoja");
    const requiredIds = t!.sections.filter((s) => s.required).map((s) => s.id);
    expect(requiredIds).toContain("lapsen_tiedot");
    expect(requiredIds).toContain("elatuskyky");
    expect(requiredIds).toContain("elatusapulaskelma");
    expect(requiredIds).toContain("lapsen_kulut");
  });

  it("elatusapu_hakemus targets käräjäoikeus", () => {
    const t = findTemplate("elatusapu_hakemus");
    expect(t).toBeDefined();
    expect(t!.targetInstitution).toBe("Käräjäoikeus");
    expect(t!.legalBasis).toContain("704/1975");
  });

  it("elatusapu_muutos has modification-specific required sections", () => {
    const t = findTemplate("elatusapu_muutos");
    expect(t).toBeDefined();
    const requiredIds = t!.sections.filter((s) => s.required).map((s) => s.id);
    expect(requiredIds).toContain("alkuperainen_sopimus");
    expect(requiredIds).toContain("muutoksen_peruste");
  });

  it("elatustuki_hakemus targets Kela with elatustukilaki basis", () => {
    const t = findTemplate("elatustuki_hakemus");
    expect(t).toBeDefined();
    expect(t!.targetInstitution).toBe("Kela");
    expect(t!.legalBasis).toContain("580/2008");
    const requiredIds = t!.sections.filter((s) => s.required).map((s) => s.id);
    expect(requiredIds).toContain("maksamattomuus");
  });
});

describe("findTemplate", () => {
  it("finds template by id", () => {
    const t = findTemplate("reklamaatio");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Reklamaatio");
  });

  it("finds template by legacy type", () => {
    const t = findTemplate("court_response");
    expect(t).toBeDefined();
    expect(t!.id).toBe("karajaoikeus_vastaus");
  });

  it("finds template for invoice_denial legacy type", () => {
    const t = findTemplate("invoice_denial");
    expect(t).toBeDefined();
    expect(t!.id).toBe("laskun_kiistaminen");
  });

  it("returns undefined for unknown type", () => {
    const t = findTemplate("nonexistent");
    expect(t).toBeUndefined();
  });
});

describe("LEGACY_TYPE_MAP", () => {
  it("maps all 5 legacy types", () => {
    expect(LEGACY_TYPE_MAP["court_response"]).toBe("karajaoikeus_vastaus");
    expect(LEGACY_TYPE_MAP["complaint"]).toBe("reklamaatio");
    expect(LEGACY_TYPE_MAP["invoice_denial"]).toBe("laskun_kiistaminen");
    expect(LEGACY_TYPE_MAP["objection"]).toBe("perinnan_kiistaminen");
    expect(LEGACY_TYPE_MAP["claim"]).toBe("vahingonkorvaus");
  });
});
