import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://opendata.finlex.fi/finlex/avoindata/v1/akn/fi";
const USER_AGENT = "dispute-mcp/1.0";

type CourtType = "kko" | "kho";

const COURT_DOC_TYPES: Record<CourtType, string> = {
  kko: "supreme-court-precedent",
  kho: "supreme-administrative-court-precedent",
};

const COURT_WEB_URLS: Record<CourtType, string> = {
  kko: "https://www.finlex.fi/fi/oikeuskaytanto/korkein-oikeus/ennakkopaatokset",
  kho: "https://www.finlex.fi/fi/oikeuskaytanto/korkein-hallinto-oikeus/vuosikirjat",
};

export interface CaseLawData {
  caseId: string;
  ecli: string;
  court: CourtType;
  year: number;
  number: number;
  dateIssued: string;
  keywords: string[];
  title: string;
  introduction: string;
  sections: { heading: string; text: string }[];
  url: string;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml" },
    });

    if (response.status === 429) {
      const wait = Math.pow(2, attempt) * 2000;
      console.error(`Rate limited, waiting ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return response;
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function listDecisions(
  court: CourtType,
  startYear: number,
  endYear: number
): Promise<string[]> {
  const docType = COURT_DOC_TYPES[court];
  const uris: string[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/doc/${docType}/list?format=json&startYear=${startYear}&endYear=${endYear}&langAndVersion=fin@&page=${page}&limit=10`;
    const response = await fetchWithRetry(url);
    const text = await response.text();

    let items: { akn_uri: string }[];
    try {
      items = JSON.parse(text);
    } catch {
      break;
    }

    if (!Array.isArray(items) || items.length === 0) break;

    for (const item of items) {
      // The list returns judgment/ URIs but we need doc/ for fetching
      const uri = item.akn_uri.replace("/judgment/", "/doc/");
      uris.push(uri);
    }

    if (items.length < 10) break;
    page++;
    await new Promise((r) => setTimeout(r, 200));
  }

  return uris;
}

function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";

  const obj = node as Record<string, unknown>;
  if ("#text" in obj) return String(obj["#text"]);

  let text = "";
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@_")) continue;
    if (Array.isArray(value)) {
      text += value.map(extractText).join(" ");
    } else {
      text += " " + extractText(value);
    }
  }
  return text.trim();
}

function findElements(obj: unknown, tagName: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  if (!obj || typeof obj !== "object") return results;

  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const localName = key.includes(":") ? key.split(":").pop()! : key;
    if (localName === tagName) {
      if (Array.isArray(value)) {
        results.push(...(value as Record<string, unknown>[]));
      } else if (typeof value === "object" && value !== null) {
        results.push(value as Record<string, unknown>);
      }
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        for (const item of value) {
          results.push(...findElements(item, tagName));
        }
      } else {
        results.push(...findElements(value, tagName));
      }
    }
  }
  return results;
}

function getAttr(obj: Record<string, unknown>, attr: string): string | undefined {
  const key = `@_${attr}`;
  if (key in obj) return String(obj[key]);
  if (attr in obj) return String(obj[attr]);
  return undefined;
}

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  textNodeName: "#text",
  isArray: (name: string) => {
    return ["tblock", "keyword", "p", "FRBRalias"].some((tag) =>
      name.endsWith(tag)
    );
  },
};

function parseJudgmentXml(
  xml: string,
  court: CourtType,
  year: number,
  number: number
): CaseLawData | null {
  const parser = new XMLParser(XML_PARSER_OPTIONS);
  const parsed = parser.parse(xml);

  const root = parsed["akomaNtoso"] || parsed["akn:akomaNtoso"] || parsed;
  const judgment = root["judgment"] || root["akn:judgment"];

  if (!judgment) return null;

  // Extract metadata
  const meta = judgment["meta"] || judgment["akn:meta"] || {};
  const identification = findElements(meta, "identification")[0] || {};
  const work = findElements(identification, "FRBRWork")[0] || {};
  const aliases = findElements(work, "FRBRalias");
  const dateEl = findElements(work, "FRBRdate")[0];
  const numberEl = findElements(work, "FRBRnumber")[0];

  let ecli = "";
  for (const alias of aliases) {
    if (getAttr(alias, "name") === "ecli") {
      ecli = getAttr(alias, "value") || "";
    }
  }

  const dateIssued = dateEl ? getAttr(dateEl, "date") || "" : "";

  // Extract keywords
  const classification = findElements(meta, "classification")[0];
  const keywordElements = classification ? findElements(classification, "keyword") : [];
  const keywords = keywordElements
    .map((kw) => getAttr(kw, "showAs") || "")
    .filter(Boolean);

  // Extract title from header
  const header = judgment["header"] || judgment["akn:header"] || {};
  const docNumberEls = findElements(header, "docNumber");
  const title = docNumberEls.length > 0
    ? extractText(docNumberEls[0])
    : `${court.toUpperCase()}:${year}:${number}`;

  // Extract body
  const body = judgment["judgmentBody"] || judgment["akn:judgmentBody"] || {};

  // Introduction (summary)
  const introEls = findElements(body, "introduction");
  const introduction = introEls.length > 0 ? extractText(introEls[0]) : "";

  // Background, motivation, decision as sections
  const sections: { heading: string; text: string }[] = [];

  for (const sectionName of ["background", "motivation", "decision"]) {
    const els = findElements(body, sectionName);
    for (const el of els) {
      // Each section may contain tblocks with headings
      const tblocks = findElements(el, "tblock");
      if (tblocks.length > 0) {
        for (const tblock of tblocks) {
          const headingEls = findElements(tblock, "heading");
          const heading = headingEls.length > 0 ? extractText(headingEls[0]) : sectionName;
          const text = extractText(tblock);
          if (text.length > heading.length + 10) {
            sections.push({ heading, text });
          }
        }
      } else {
        const text = extractText(el);
        if (text.length > 50) {
          const sectionLabels: Record<string, string> = {
            background: "Asian tausta",
            motivation: "Perustelut",
            decision: "Tuomiolauselma",
          };
          sections.push({ heading: sectionLabels[sectionName] || sectionName, text });
        }
      }
    }
  }

  const courtLabel = court.toUpperCase();
  const webUrl = `${COURT_WEB_URLS[court]}/${year}/${courtLabel.toLowerCase()}${year}${String(number).padStart(4, "0")}`;

  return {
    caseId: title || `${courtLabel}:${year}:${number}`,
    ecli,
    court,
    year,
    number,
    dateIssued,
    keywords,
    title: title || `${courtLabel}:${year}:${number}`,
    introduction,
    sections,
    url: webUrl,
  };
}

export async function fetchAllCaseLaw(
  court: CourtType,
  startYear: number,
  endYear: number,
  onProgress?: (msg: string) => void
): Promise<CaseLawData[]> {
  const log = onProgress || ((msg: string) => console.error(msg));
  const courtLabel = court.toUpperCase();

  log(`Listing ${courtLabel} decisions ${startYear}-${endYear}...`);
  const uris = await listDecisions(court, startYear, endYear);
  log(`Found ${uris.length} ${courtLabel} decisions.`);

  const decisions: CaseLawData[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    // Extract year and number from URI
    // Format: .../doc/supreme-court-precedent/{year}/{number}/fin@
    const parts = uri.split("/");
    const langIdx = parts.findIndex((p) => p.startsWith("fin@"));
    const number = langIdx > 0 ? parseInt(parts[langIdx - 1], 10) : i + 1;
    const year = langIdx > 1 ? parseInt(parts[langIdx - 2], 10) : startYear;

    try {
      const response = await fetchWithRetry(uri);
      const xml = await response.text();
      const decision = parseJudgmentXml(xml, court, year, number);

      if (decision) {
        decisions.push(decision);
      }
    } catch (error) {
      log(`  Failed to fetch ${courtLabel}:${year}:${number}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if ((i + 1) % 50 === 0) {
      log(`  Fetched ${i + 1}/${uris.length} ${courtLabel} decisions...`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  log(`Parsed ${decisions.length} ${courtLabel} decisions.`);
  return decisions;
}
