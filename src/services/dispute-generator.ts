import type { DocumentAnalysis, LegalSearchResult, DisputeType, Language } from "../types.js";
import { findTemplate, type LegalDocumentTemplate } from "../data/document-templates.js";
import { haeVakiot } from "../data/elatusapu-constants.js";

interface DisputeInput {
  disputeType: DisputeType;
  documentAnalysis: DocumentAnalysis;
  legalReferences: LegalSearchResult[];
  userArguments: string;
  respondent: string;
  language: Language;
}

// Minimum relevance score for legal references to be included in generated documents.
// References below this threshold are filtered out to prevent inaccurate citations.
const MIN_RELEVANCE_SCORE = 0.3;

// Valid source types that can appear in the vector database
const VALID_SOURCE_TYPES = new Set(["law", "kko_ruling", "kho_ruling", "he_document", "consumer_board"]);

/**
 * Validate and filter legal references before including them in documents.
 * Removes references that:
 * - Have relevance scores below the threshold (likely false positives)
 * - Have empty or missing citations
 * - Have invalid source types (not from the legal database)
 */
function validateLegalReferences(refs: LegalSearchResult[]): {
  valid: LegalSearchResult[];
  rejected: string[];
} {
  const valid: LegalSearchResult[] = [];
  const rejected: string[] = [];

  for (const ref of refs) {
    if (!ref.citation || ref.citation.trim().length === 0) {
      rejected.push("Hylätty: tyhjä viittaus");
      continue;
    }
    if (!ref.text || ref.text.trim().length === 0) {
      rejected.push(`Hylätty: ${ref.citation} — tyhjä teksti`);
      continue;
    }
    if (!VALID_SOURCE_TYPES.has(ref.sourceType)) {
      rejected.push(`Hylätty: ${ref.citation} — tuntematon lähdetyyppi '${ref.sourceType}'`);
      continue;
    }
    if (ref.relevanceScore < MIN_RELEVANCE_SCORE) {
      rejected.push(`Hylätty: ${ref.citation} — liian alhainen relevanssi (${ref.relevanceScore.toFixed(2)} < ${MIN_RELEVANCE_SCORE})`);
      continue;
    }
    valid.push(ref);
  }

  return { valid, rejected };
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

  // Validate legal references before using them in the document.
  // Only verified references from the legal database are included.
  const { valid: verifiedReferences, rejected } = validateLegalReferences(legalReferences);

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

  // Legal references (only verified ones)
  if (verifiedReferences.length > 0) {
    lines.push(`## ${lang === "fi" ? "Oikeudelliset perusteet" : "Rättsliga grunder"}`);
    lines.push("");
    lines.push(renderLegalReferences(verifiedReferences, lang));
  }

  // Report rejected references for transparency
  if (rejected.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`> **${lang === "fi" ? "Hylätyt lakiviittaukset" : "Avvisade rättsliga referenser"}:**`);
    for (const r of rejected) {
      lines.push(`> - ${r}`);
    }
    lines.push(`> *${lang === "fi" ? "Nämä viittaukset on hylätty automaattisesti, koska niitä ei voitu varmistaa oikeuslähdetietokannasta. Hae uudelleen search_legal-työkalulla." : "Dessa referenser har avvisats automatiskt eftersom de inte kunde verifieras."}*`);
    lines.push("");
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

  // Legality and verification disclaimer
  lines.push("---");
  lines.push("");
  if (lang === "fi") {
    lines.push("> **TÄRKEÄ HUOMAUTUS — LAINMUKAISUUS JA VERIFIOINTI**");
    lines.push(">");
    lines.push("> Tätä asiakirjaa ei saa käyttää lainvastaisiin tai rikollisiin tarkoituksiin. Asiakirja ei saa sisältää perättömiä väitteitä, valheellisia todisteita tai vilpillisiä vaatimuksia. Perättömien tietojen esittäminen viranomaiselle voi täyttää rikoslain (RL 16:8, 33:1, 36:1) mukaisten rikosten tunnusmerkistön.");
    lines.push(">");
    lines.push("> Kaikki tämän asiakirjan lakiviittaukset on tarkistettava Finlexistä (https://www.finlex.fi) ennen käyttöä. Asiakirja perustuu vektorihakuun oikeuslähdetietokannasta — viittaukset voivat olla puutteellisia, vanhentuneita tai virheellisiä. Vain pätevä juristi voi varmistaa viittausten oikeellisuuden ja sovellettavuuden tapaukseesi.");
    lines.push(">");
    lines.push(`> *Tämä ${template.name.toLowerCase()} on luotu automaattisesti dispute-mcp-työkalulla. Se ei ole oikeudellinen neuvo. Tarkista aina asiakirja pätevän juristin kanssa ennen käyttöä.*`);
  } else {
    lines.push("> **VIKTIG ANMÄRKNING — LAGLIGHET OCH VERIFIERING**");
    lines.push(">");
    lines.push("> Detta dokument får inte användas för olagliga eller brottsliga ändamål. Dokumentet får inte innehålla osanna påståenden, falska bevis eller bedrägliga krav.");
    lines.push(">");
    lines.push("> Alla rättsliga referenser i detta dokument måste verifieras mot Finlex (https://www.finlex.fi) före användning.");
    lines.push(">");
    lines.push("> *Detta dokument har skapats automatiskt med dispute-mcp-verktyget. Det utgör inte juridisk rådgivning. Kontrollera alltid dokumentet med en kvalificerad jurist.*");
  }

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

    // --- Elatusapu (child support) sections ---

    case "lapsen_tiedot":
      return [
        "**Lapsen nimi:** ____________________",
        "**Syntymäaika:** ____________________",
        "**Henkilötunnus:** ____________________",
        "**Ikäryhmä:** ☐ 0–6 v. ☐ 7–12 v. ☐ 13–17 v.",
      ].join("\n");

    case "lapsen_kulut": {
      const v = haeVakiot();
      return [
        `**Lapsen peruskulutus (OM 2007:2 ohje, ${v.vuosi}):**`,
        `- 0–6-vuotiaat: ${v.peruskulutus["0-6"]} €/kk`,
        `- 7–12-vuotiaat: ${v.peruskulutus["7-12"]} €/kk`,
        `- 13–17-vuotiaat: ${v.peruskulutus["13-17"]} €/kk`,
        "",
        "**Erityiskustannukset:**",
        "- Päivähoito/koulu: ________ €/kk",
        "- Terveydenhuolto: ________ €/kk",
        "- Harrastukset: ________ €/kk",
        "- Vakuutukset: ________ €/kk",
        "",
        "**Lapsen elatuksen tarve yhteensä:** ________ €/kk",
      ].join("\n");
    }

    case "asumiskustannukset": {
      const v = haeVakiot();
      return [
        "**Lähivanhemman asumiskustannukset:** ________ €/kk",
        "",
        `**Lapsen osuus asumiskustannuksista (OM 2007:2 ohje, ${v.vuosi}):**`,
        "Yksinhuolto:",
        ...Object.entries(v.asumisprosentitYksinhuolto).map(([n, p]) => `- ${n} lasta: ${p} %`),
        "",
        "Vuoroasuminen:",
        ...Object.entries(v.asumisprosentitVuoroasuminen).map(([n, p]) => `- ${n} lasta: ${p} %`),
        "",
        "**Lapsen asumiskustannus:** ________ €/kk",
      ].join("\n");
    }

    case "elatuskyky":
      return [
        "**Elatusvelvollisen elatuskyky:**",
        "- Tulot yhteensä: ________ €/kk",
        "- Yleinen elinkustannus: ________ €/kk",
        "- Asumiskustannukset (netto): ________ €/kk",
        "- Erityiset terveydenhoitokulut: ________ €/kk",
        "- Työmatkakustannukset: ________ €/kk",
        "- Muut elatusvelvollisuudet: ________ €/kk",
        "- **Elatuskyky:** ________ €/kk",
        "",
        "**Lähivanhemman elatuskyky:**",
        "- Tulot yhteensä: ________ €/kk",
        "- (samat vähennyserät)",
        "- **Elatuskyky:** ________ €/kk",
      ].join("\n");

    case "vuoroasuminen":
      return [
        "**Vuoroasuminen:**",
        "- Lapsi asuu vanhemman A luona: ________ yötä/kk",
        "- Lapsi asuu vanhemman B luona: ________ yötä/kk",
        "",
        "Vuoroasumiseksi katsotaan ≥ 40 % ajasta molempien luona.",
        "Vuoroasumisessa käytetään alennettuja asumisprosentteja.",
      ].join("\n");

    case "luonapitovahennys": {
      const v = haeVakiot();
      const nightRanges = Object.keys(v.luonapitovahennys["0-6"]);
      return [
        `**Luonapitovähennys (${v.vuosi}):**`,
        "",
        "| Yöt/kk | 0–6 v. | 7–12 v. | 13–17 v. |",
        "|--------|--------|---------|----------|",
        ...nightRanges.map((yot) =>
          `| ${yot} | ${v.luonapitovahennys["0-6"][yot]} € | ${v.luonapitovahennys["7-12"][yot]} € | ${v.luonapitovahennys["13-17"][yot]} € |`
        ),
        "",
        "**Sovellettava vähennys:** ________ €/kk",
      ].join("\n");
    }

    case "elatusapulaskelma": {
      const v = haeVakiot();
      return [
        "**Elatusapulaskelma:**",
        "",
        "1. Lapsen elatuksen tarve: ________ €/kk",
        "2. Vähennettynä lähivanhemman osuus: ________ €/kk",
        "3. Elatusvelvollisen osuus (elatuskykyjen suhteessa): ________ €/kk",
        "4. Luonapitovähennys: ________ €/kk",
        "5. **Elatusapu yhteensä: ________ €/kk**",
        "",
        `Kelan elatustuki (vähimmäistaso ${v.vuosi}): ${v.kelaElatustuki} €/kk`,
        `Indeksikerroin ${v.vuosi}: ${v.indeksikerroin.osoittaja}/${v.indeksikerroin.nimittaja}`,
      ].join("\n");
    }

    case "muutoksen_peruste":
      return [
        "**Olosuhteiden muutos:**",
        "- Alkuperäinen elatusapu: ________ €/kk",
        "- Muutoksen syy: ____________________",
        "- Muutoksen ajankohta: ____________________",
        "",
        "**Uusi laskelma osoittaa ≥ 15 % muutoksen:**",
        "- Uusi elatusapu: ________ €/kk",
        "- Muutos: ________ € (________ %)",
        "",
        "Muutos ei ole tilapäinen ja perustelee sopimuksen tarkistamista.",
      ].join("\n");

    case "alkuperainen_sopimus":
      return [
        "**Alkuperäinen sopimus/tuomio:**",
        "- Päivämäärä: ____________________",
        "- Vahvistaja: ☐ Lastenvalvoja ☐ Käräjäoikeus",
        "- Elatusavun määrä: ________ €/kk",
        "- Viite/diaarinumero: ____________________",
      ].join("\n");

    case "maksamattomuus": {
      const v = haeVakiot();
      return [
        "**Elatusavun maksamattomuus:**",
        "- Elatusvelvollinen: ____________________",
        "- Maksamattomat kuukaudet: ____________________",
        "- Maksamaton summa yhteensä: ________ €",
        "- Perintätoimet: ____________________",
        "",
        `Kelan elatustuki ${v.vuosi}: ${v.kelaElatustuki} €/kk per lapsi`,
      ].join("\n");
    }

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
