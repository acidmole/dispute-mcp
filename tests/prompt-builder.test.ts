import { describe, it, expect } from "vitest";
import { buildDocumentPrompt } from "../src/services/prompt-builder.js";
import { DOCUMENT_TEMPLATES } from "../src/data/document-templates.js";

describe("buildDocumentPrompt", () => {
  it("builds prompt for each template without error", () => {
    for (const t of DOCUMENT_TEMPLATES) {
      const prompt = buildDocumentPrompt(t, "");
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
    }
  });

  it("includes template name in prompt", () => {
    const t = DOCUMENT_TEMPLATES[0];
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain(t.name);
  });

  it("includes legal basis", () => {
    const t = DOCUMENT_TEMPLATES[0];
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain(t.legalBasis);
  });

  it("includes context when provided", () => {
    const t = DOCUMENT_TEMPLATES[0];
    const prompt = buildDocumentPrompt(t, "Sain laskun jota en tunnista");
    expect(prompt).toContain("Sain laskun jota en tunnista");
  });

  it("does not include context section when empty", () => {
    const t = DOCUMENT_TEMPLATES[0];
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).not.toContain("Käyttäjän kuvaus tilanteesta");
  });

  it("marks required sections as PAKOLLINEN", () => {
    const t = DOCUMENT_TEMPLATES.find((t) => t.id === "karajaoikeus_vastaus")!;
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain("**[PAKOLLINEN]**");
  });

  it("includes deadline warning when present", () => {
    const t = DOCUMENT_TEMPLATES.find((t) => t.id === "hallinto_valitus")!;
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain("MÄÄRÄAIKA");
    expect(prompt).toContain("30 päivää");
  });

  it("includes search queries", () => {
    const t = DOCUMENT_TEMPLATES.find((t) => t.id === "reklamaatio")!;
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain("search_legal");
    for (const q of t.searchQueries) {
      expect(prompt).toContain(q);
    }
  });

  it("includes warnings", () => {
    const t = DOCUMENT_TEMPLATES.find((t) => t.id === "karajaoikeus_vastaus")!;
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain("yksipuoliseen tuomioon");
  });

  it("includes disclaimer", () => {
    const t = DOCUMENT_TEMPLATES[0];
    const prompt = buildDocumentPrompt(t, "");
    expect(prompt).toContain("ei ole oikeudellinen neuvo");
  });
});
