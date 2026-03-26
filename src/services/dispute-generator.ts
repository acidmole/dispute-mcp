import type { DocumentAnalysis, LegalSearchResult, DisputeType, Language } from "../types.js";
import { findTemplate, type LegalDocumentTemplate } from "../data/document-templates.js";

interface DisputeInput {
  disputeType: DisputeType;
  documentAnalysis: DocumentAnalysis;
  legalReferences: LegalSearchResult[];
  userArguments: string;
  respondent: string;
  language: Language;
}

function formatDate(lang: Language): string {
  const now = new Date();
  if (lang === "fi") {
    return `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// --- Legal references rendering (shared) ---

function renderLegalReferences(refs: LegalSearchResult[], lang: Language): string {
  const lines: string[] = [];

  const sourceGroups: Record<string, Record<Language, string>> = {
    law: { fi: "Sovellettavat lainkohdat", sv: "Tillämpliga lagbestämmelser" },
    kko_ruling: { fi: "Oikeuskäytäntö (KKO)", sv: "Rättspraxis (HD)" },
    kho_ruling: { fi: "Oikeuskäytäntö (KHO)", sv: "Rättspraxis (HFD)" },
    he_document: { fi: "Lain esityöt", sv: "Lagens förarbeten" },
    consumer_board: { fi: "Kuluttajariitalautakunnan ratkaisukäytäntö", sv: "Konsumenttvistenämndens beslutspraxis" },
  };

  const groupOrder = ["law", "kko_ruling", "kho_ruling", "he_document", "consumer_board"];
  const grouped = new Map<string, LegalSearchResult[]>();
  for (const ref of refs) {
    const group = grouped.get(ref.sourceType) || [];
    group.push(ref);
    grouped.set(ref.sourceType, group);
  }

  for (const sourceType of groupOrder) {
    const groupRefs = grouped.get(sourceType);
    if (!groupRefs || groupRefs.length === 0) continue;

    const groupTitle = sourceGroups[sourceType]?.[lang] || sourceType;
    lines.push(`### ${groupTitle}`);
    lines.push("");

    for (const ref of groupRefs) {
      lines.push(`**${ref.citation}**`);
      lines.push("");
      const excerpt = ref.text.length > 500
        ? ref.text.substring(0, 500) + "..."
        : ref.text;
      lines.push(`> ${excerpt.replace(/\n/g, "\n> ")}`);
      lines.push("");
      if (ref.url) {
        lines.push(`*${lang === "fi" ? "Lähde" : "Källa"}: ${ref.url}*`);
        lines.push("");
      }
    }
  }

  // Ungrouped
  for (const [sourceType, groupRefs] of grouped) {
    if (!groupOrder.includes(sourceType)) {
      for (const ref of groupRefs) {
        lines.push(`**${ref.citation}**`);
        lines.push("");
        const excerpt = ref.text.length > 500
          ? ref.text.substring(0, 500) + "..."
          : ref.text;
        lines.push(`> ${excerpt.replace(/\n/g, "\n> ")}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// --- Template-based generation ---

function generateFromTemplate(input: DisputeInput, template: LegalDocumentTemplate): string {
  const { documentAnalysis, legalReferences, userArguments, respondent, language } = input;
  const lang = language;
  const lines: string[] = [];

  // Header
  lines.push(`# ${template.name.toUpperCase()}`);
  lines.push("");
  lines.push(`**${lang === "fi" ? "Päivämäärä" : "Datum"}:** ${formatDate(lang)}`);
  lines.push(`**${lang === "fi" ? "Vastaanottaja" : "Mottagare"}:** ${respondent}`);
  if (documentAnalysis.parties.recipient) {
    lines.push(`**${lang === "fi" ? "Lähettäjä" : "Avsändare"}:** ${documentAnalysis.parties.recipient}`);
  }
  lines.push("");

  // Reference numbers
  if (documentAnalysis.referenceNumbers.length > 0) {
    lines.push(`**${lang === "fi" ? "Viite" : "Referens"}:** ${documentAnalysis.referenceNumbers.join(", ")}`);
    lines.push("");
  }

  // Deadline warning at top
  if (template.deadline) {
    lines.push(`> **${lang === "fi" ? "MÄÄRÄAIKA" : "TIDSFRIST"}:** ${template.deadline.description}${template.deadline.days ? ` (${template.deadline.days} päivää ${template.deadline.fromEvent})` : ""}`);
    lines.push("");
  }

  // Render template sections
  for (const section of template.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");

    // Fill section content from available data
    const content = getSectionContent(section.id, input, template);
    if (content) {
      lines.push(content);
    } else if (section.required) {
      lines.push(`*[${section.description}]*`);
    }
    lines.push("");
  }

  // Legal references
  if (legalReferences.length > 0) {
    lines.push(`## ${lang === "fi" ? "Oikeudelliset perusteet" : "Rättsliga grunder"}`);
    lines.push("");
    lines.push(renderLegalReferences(legalReferences, lang));
  }

  // Template warnings
  if (template.warnings.length > 0) {
    lines.push("---");
    lines.push("");
    for (const w of template.warnings) {
      lines.push(`> ${w}`);
      lines.push("");
    }
  }

  // Disclaimer
  lines.push("---");
  lines.push("");
  lines.push(
    lang === "fi"
      ? `*Tämä ${template.name.toLowerCase()} on luotu automaattisesti dispute-mcp-työkalulla. Se ei ole oikeudellinen neuvo. Tarkista aina asiakirja pätevän juristin kanssa ennen käyttöä.*`
      : "*Detta dokument har skapats automatiskt med dispute-mcp-verktyget. Det utgör inte juridisk rådgivning. Kontrollera alltid dokumentet med en kvalificerad jurist.*"
  );

  return lines.join("\n");
}

function getSectionContent(sectionId: string, input: DisputeInput, template: LegalDocumentTemplate): string | null {
  const { documentAnalysis, userArguments } = input;

  switch (sectionId) {
    // Common sections that map to document analysis data
    case "tunnistetiedot":
    case "osapuolet":
    case "hakija":
    case "valittaja": {
      const parts: string[] = [];
      if (documentAnalysis.parties.recipient) {
        parts.push(`**Lähettäjä:** ${documentAnalysis.parties.recipient}`);
      }
      if (documentAnalysis.parties.sender) {
        parts.push(`**Vastapuoli:** ${documentAnalysis.parties.sender}`);
      }
      if (documentAnalysis.referenceNumbers.length > 0) {
        parts.push(`**Viite:** ${documentAnalysis.referenceNumbers.join(", ")}`);
      }
      return parts.length > 0 ? parts.join("\n") : null;
    }

    case "vastapuoli":
    case "laskun_tiedot":
    case "saatavan_tiedot":
    case "paatos":
    case "vuokrakohde":
    case "valituksen_kohde":
    case "kohde": {
      const parts: string[] = [];
      if (documentAnalysis.summary) {
        parts.push(documentAnalysis.summary);
      }
      if (documentAnalysis.amounts.length > 0) {
        parts.push("");
        for (const a of documentAnalysis.amounts) {
          parts.push(`- ${a.description}: ${a.value.toFixed(2)} ${a.currency}`);
        }
      }
      return parts.length > 0 ? parts.join("\n") : null;
    }

    case "tosiseikat":
    case "asian_kuvaus":
    case "virheen_kuvaus":
    case "riidan_kohde":
    case "tapahtumakuvaus":
    case "vahinko":
    case "syy_vastaamatta": {
      if (documentAnalysis.claims.length > 0) {
        const parts = documentAnalysis.claims.map(c => `- ${c}`);
        if (documentAnalysis.dates.length > 0) {
          parts.push("");
          parts.push("**Päivämäärät:**");
          for (const d of documentAnalysis.dates) {
            parts.push(`- ${d.description}: ${d.date}`);
          }
        }
        return parts.join("\n");
      }
      return null;
    }

    case "kiistamisperusteet":
    case "kiistamisperuste":
    case "kiistaminen":
    case "kanta":
    case "kanta_kanteeseen":
    case "perusteet":
    case "muutosvaatimukset":
    case "syy_yhteys":
      return userArguments || null;

    case "vaatimukset":
    case "korvausvaatimus": {
      const demands = template.demands.map(d => `- ${d.text}`);
      return demands.join("\n");
    }

    case "maaraaika":
      return "Pyydän vastausta 14 päivän kuluessa tämän kirjeen vastaanottamisesta.";

    case "todisteet":
      return null; // User needs to fill

    case "oikeuslahteet":
    case "lainkohdat":
      return null; // Filled by legal references section

    case "oikeudenkayntikulut":
      return "Vaadin, että vastapuoli velvoitetaan korvaamaan oikeudenkäyntikuluni viivästyskorkoineen.";

    case "prosessivaitteet":
    case "prosessiosoite":
    case "uusi_selvitys":
    case "perintakulut":
    case "yrityksen_vastaus":
      return null; // Situational

    case "keskeytyspyynto":
      return "Vaadin vapaaehtoisen perinnän välitöntä lopettamista. Mikäli velkoja katsoo saatavan olevan oikeutettu, pyydän asian siirtämistä tuomioistuimen ratkaistavaksi.";

    case "tiedoksisaanti":
      return null; // User must fill

    case "allekirjoitus":
      return [
        `Paikka ja aika: ____________________`,
        "",
        `Allekirjoitus: ____________________`,
        "",
        `Nimenselvennys: ____________________`,
      ].join("\n");

    case "liitteet":
    case "liiteluettelo":
      return "*[Luettelo liitteistä]*";

    default:
      return null;
  }
}

// --- Legacy generation (fallback) ---

const LEGACY_TITLES: Record<string, Record<Language, string>> = {
  invoice_denial: { fi: "LASKUN KIISTÄMINEN", sv: "BESTRIDANDE AV FAKTURA" },
  court_response: { fi: "VASTAUS KÄRÄJÄOIKEUDELLE", sv: "SVAR TILL TINGSRÄTTEN" },
  complaint: { fi: "REKLAMAATIO", sv: "REKLAMATION" },
  claim: { fi: "VAATIMUS", sv: "KRAV" },
  objection: { fi: "MUISTUTUS / HUOMAUTUS", sv: "ANMÄRKNING" },
};

function generateLegacy(input: DisputeInput): string {
  // Try to find a matching template even for legacy types
  const template = findTemplate(input.disputeType);
  if (template) {
    return generateFromTemplate(input, template);
  }

  // Pure fallback for unknown types
  const { documentAnalysis, legalReferences, userArguments, respondent, language } = input;
  const lang = language;
  const title = LEGACY_TITLES[input.disputeType]?.[lang] || input.disputeType.toUpperCase();
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Päivämäärä:** ${formatDate(lang)}`);
  lines.push(`**Vastaanottaja:** ${respondent}`);
  lines.push("");
  lines.push(`## Asia`);
  lines.push("");
  lines.push(documentAnalysis.summary);
  lines.push("");
  lines.push(`## Perustelut`);
  lines.push("");
  lines.push(userArguments);
  lines.push("");

  if (legalReferences.length > 0) {
    lines.push(`## Oikeudelliset perusteet`);
    lines.push("");
    lines.push(renderLegalReferences(legalReferences, lang));
  }

  lines.push("---");
  lines.push("");
  lines.push("Paikka ja aika: ____________________");
  lines.push("");
  lines.push("Allekirjoitus: ____________________");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Tämä asiakirja on luotu automaattisesti. Se ei ole oikeudellinen neuvo.*");

  return lines.join("\n");
}

// --- Main export ---

export function generateDispute(input: DisputeInput): string {
  const template = findTemplate(input.disputeType);
  if (template) {
    return generateFromTemplate(input, template);
  }
  return generateLegacy(input);
}
