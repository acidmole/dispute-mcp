import type { DocumentAnalysis, DocumentType } from "../types.js";
import { parseDocument } from "../services/document-parser.js";

export async function analyzeDocument(input: {
  file_path?: string;
  text?: string;
  document_type: DocumentType;
}): Promise<DocumentAnalysis> {
  let rawText: string;

  if (input.text) {
    rawText = input.text;
  } else if (input.file_path) {
    rawText = await parseDocument(input.file_path);
  } else {
    throw new Error("Either file_path or text must be provided");
  }

  // Extract structured information from the text
  const analysis: DocumentAnalysis = {
    documentType: input.document_type,
    parties: extractParties(rawText),
    claims: extractClaims(rawText),
    amounts: extractAmounts(rawText),
    dates: extractDates(rawText),
    deadlines: extractDeadlines(rawText),
    referenceNumbers: extractReferenceNumbers(rawText),
    summary: generateSummary(rawText, input.document_type),
    rawText,
  };

  return analysis;
}

function extractParties(text: string): { sender?: string; recipient?: string } {
  const parties: { sender?: string; recipient?: string } = {};

  // Common patterns in Finnish business correspondence
  const senderPatterns = [
    /(?:Lähettäjä|Myyjä|Toimittaja|Velkoja)[:\s]+([^\n]+)/i,
    /(?:^|\n)([A-ZÄÖÅ][A-Za-zÄÖÅäöå\s]+(?:Oy|Oyj|Ky|Ab|Ry|Osk))\b/m,
  ];
  const recipientPatterns = [
    /(?:Vastaanottaja|Ostaja|Asiakas|Velallinen)[:\s]+([^\n]+)/i,
  ];

  for (const pattern of senderPatterns) {
    const match = text.match(pattern);
    if (match) {
      parties.sender = match[1].trim();
      break;
    }
  }

  for (const pattern of recipientPatterns) {
    const match = text.match(pattern);
    if (match) {
      parties.recipient = match[1].trim();
      break;
    }
  }

  return parties;
}

function extractClaims(text: string): string[] {
  const claims: string[] = [];
  const lower = text.toLowerCase();

  // Look for claim-like statements
  const claimPatterns = [
    /(?:vaadimme|vaatii|velvoitetaan|on velvollinen|tulee maksaa|on maksettava)[^.]*\./gi,
    /(?:kanteen?\s+mukaan|kantaja\s+vaatii)[^.]*\./gi,
    /(?:perintäkulut?|viivästyskorko|maksumuistutus)[^.]*\./gi,
  ];

  for (const pattern of claimPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const claim = match[0].trim();
      if (claim.length > 10 && !claims.includes(claim)) {
        claims.push(claim);
      }
    }
  }

  // If no specific claims found, try to extract key sentences
  if (claims.length === 0) {
    const sentences = text.split(/[.!]/).filter((s) => s.trim().length > 20);
    // Take first few substantive sentences as potential claims
    for (const sentence of sentences.slice(0, 3)) {
      if (
        lower.includes("maksa") ||
        lower.includes("lasku") ||
        lower.includes("vaati") ||
        lower.includes("velk")
      ) {
        claims.push(sentence.trim() + ".");
      }
    }
  }

  return claims;
}

function extractAmounts(
  text: string
): { value: number; currency: string; description: string }[] {
  const amounts: { value: number; currency: string; description: string }[] =
    [];

  // Match euro amounts: 123,45 €, EUR 123.45, 123,45 euroa
  const amountPattern =
    /(\d[\d\s]*[.,]\d{2})\s*(?:€|EUR|euroa?)|(?:€|EUR)\s*(\d[\d\s]*[.,]\d{2})/gi;
  const matches = text.matchAll(amountPattern);

  for (const match of matches) {
    const raw = (match[1] || match[2]).replace(/\s/g, "").replace(",", ".");
    const value = parseFloat(raw);
    if (!isNaN(value) && value > 0) {
      // Try to find context around the amount
      const idx = match.index || 0;
      const context = text.substring(Math.max(0, idx - 50), idx + match[0].length + 20);
      const description = context.trim().replace(/\n/g, " ");

      amounts.push({ value, currency: "EUR", description });
    }
  }

  // Also match plain integer amounts followed by €
  const plainPattern = /(\d+)\s*(?:€|EUR|euroa?)/gi;
  const plainMatches = text.matchAll(plainPattern);
  for (const match of plainMatches) {
    const value = parseInt(match[1], 10);
    if (!isNaN(value) && value > 0 && !amounts.some((a) => a.value === value)) {
      const idx = match.index || 0;
      const context = text.substring(Math.max(0, idx - 50), idx + match[0].length + 20);
      amounts.push({
        value,
        currency: "EUR",
        description: context.trim().replace(/\n/g, " "),
      });
    }
  }

  return amounts;
}

function extractDates(
  text: string
): { date: string; description: string }[] {
  const dates: { date: string; description: string }[] = [];

  // Finnish date format: 1.2.2024, 01.02.2024
  const datePattern = /(\d{1,2}\.\d{1,2}\.\d{4})/g;
  const matches = text.matchAll(datePattern);

  for (const match of matches) {
    const idx = match.index || 0;
    const before = text.substring(Math.max(0, idx - 40), idx).trim();
    const description =
      before.split(/[.\n]/).pop()?.trim() || "Asiakirjassa mainittu päivämäärä";

    dates.push({ date: match[1], description });
  }

  return dates;
}

function extractDeadlines(
  text: string
): { date: string; description: string }[] {
  const deadlines: { date: string; description: string }[] = [];

  // Look for deadline-related keywords near dates
  const deadlinePatterns = [
    /(?:eräpäivä|määräaika|viimeistään|mennessä|viimeinen\s+(?:maksu|vastaus)päivä)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/gi,
    /(\d{1,2}\.\d{1,2}\.\d{4})\s*(?:mennessä|viimeistään)/gi,
  ];

  for (const pattern of deadlinePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const date = match[1];
      const idx = match.index || 0;
      const context = text
        .substring(Math.max(0, idx - 30), idx + match[0].length + 30)
        .trim()
        .replace(/\n/g, " ");

      deadlines.push({ date, description: context });
    }
  }

  return deadlines;
}

function extractReferenceNumbers(text: string): string[] {
  const refs: string[] = [];

  // Common reference number patterns
  const patterns = [
    /(?:viite|ref\.?|viitenumero|laskunumero|asianumero)[:\s]*([A-Za-z0-9\-/]+)/gi,
    /(?:laskun?\s+(?:nro|numero))[:\s]*([A-Za-z0-9\-/]+)/gi,
    /(?:diaarinumero|dnro)[:\s]*([A-Za-z0-9\-/]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const ref = match[1].trim();
      if (ref.length > 2 && !refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }

  return refs;
}

function generateSummary(text: string, docType: DocumentType): string {
  const trimmed = text.trim();
  const firstLines = trimmed
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, 5)
    .join(" ")
    .substring(0, 300);

  const typeDescriptions: Record<DocumentType, string> = {
    invoice: "Lasku",
    court_summons: "Haaste/kutsu oikeuteen",
    contract: "Sopimus",
    letter: "Kirje",
    other: "Asiakirja",
  };

  return `${typeDescriptions[docType]}: ${firstLines}${firstLines.length >= 300 ? "..." : ""}`;
}
