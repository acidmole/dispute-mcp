import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://opendata.finlex.fi/finlex/avoindata/v1/akn/fi";
const USER_AGENT = "dispute-mcp/1.0";
const DOC_TYPE = "government-proposal";

export interface HEData {
  heNumber: string;
  year: number;
  number: number;
  title: string;
  dateIssued: string;
  introduction: string;
  rationale: { num: string; heading: string; text: string }[];
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

async function listProposals(
  startYear: number,
  endYear: number
): Promise<string[]> {
  const uris: string[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/doc/${DOC_TYPE}/list?format=json&startYear=${startYear}&endYear=${endYear}&langAndVersion=fin@&page=${page}&limit=10`;
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
      uris.push(item.akn_uri);
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
  return undefined;
}

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  textNodeName: "#text",
  isArray: (name: string) => {
    return ["hcontainer", "tblock", "p", "content"].some((tag) =>
      name.endsWith(tag)
    );
  },
};

function parseHEXml(xml: string, year: number, number: number): HEData | null {
  const parser = new XMLParser(XML_PARSER_OPTIONS);
  const parsed = parser.parse(xml);

  const root = parsed["akomaNtoso"] || parsed["akn:akomaNtoso"] || parsed;
  const doc = root["doc"] || root["akn:doc"];
  if (!doc) return null;

  // Extract metadata
  const meta = doc["meta"] || doc["akn:meta"] || {};
  const identification = findElements(meta, "identification")[0] || {};
  const work = findElements(identification, "FRBRWork")[0] || {};
  const dateEl = findElements(work, "FRBRdate")[0];
  const dateIssued = dateEl ? getAttr(dateEl, "date") || "" : "";

  // Extract preface: docNumber and docTitle
  const preface = doc["preface"] || doc["akn:preface"] || {};
  const docNumberEls = findElements(preface, "docNumber");
  const docTitleEls = findElements(preface, "docTitle");
  const heNumber = docNumberEls.length > 0 ? extractText(docNumberEls[0]) : `HE ${number}/${year}`;
  const title = docTitleEls.length > 0 ? extractText(docTitleEls[0]) : "";

  // Extract mainBody
  const mainBody = doc["mainBody"] || doc["akn:mainBody"] || {};
  const hcontainers = findElements(mainBody, "hcontainer");

  let introduction = "";
  const rationale: { num: string; heading: string; text: string }[] = [];

  for (const hc of hcontainers) {
    const name = getAttr(hc, "name") || "";

    if (name === "introduction") {
      // ESITYKSEN PÄÄASIALLINEN SISÄLTÖ
      const contentEls = findElements(hc, "content");
      introduction = contentEls.map(extractText).join("\n").trim();
      if (!introduction) {
        introduction = extractText(hc);
      }
    } else if (name === "rationale") {
      // PERUSTELUT - extract top-level tblocks only
      const tblocks = findElements(hc, "tblock");
      for (const tblock of tblocks) {
        const numEls = findElements(tblock, "num");
        const headingEls = findElements(tblock, "heading");
        const num = numEls.length > 0 ? extractText(numEls[0]) : "";
        const heading = headingEls.length > 0 ? extractText(headingEls[0]) : "";
        const text = extractText(tblock);

        if (text.length > 100 && heading) {
          rationale.push({ num, heading, text });
        }
      }
    }
  }

  const url = `https://www.finlex.fi/fi/esitykset/he/${year}/${year}${String(number).padStart(4, "0")}`;

  return {
    heNumber,
    year,
    number,
    title,
    dateIssued,
    introduction,
    rationale,
    url,
  };
}

export async function fetchAllHE(
  startYear: number,
  endYear: number,
  onProgress?: (msg: string) => void
): Promise<HEData[]> {
  const log = onProgress || ((msg: string) => console.error(msg));

  log(`Listing government proposals ${startYear}-${endYear}...`);
  const uris = await listProposals(startYear, endYear);
  log(`Found ${uris.length} government proposals.`);

  const proposals: HEData[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    // Extract year and number from URI
    const parts = uri.split("/");
    const langIdx = parts.findIndex((p) => p.startsWith("fin@"));
    const num = langIdx > 0 ? parseInt(parts[langIdx - 1], 10) : i + 1;
    const yr = langIdx > 1 ? parseInt(parts[langIdx - 2], 10) : startYear;

    try {
      const response = await fetchWithRetry(uri);
      const xml = await response.text();
      const he = parseHEXml(xml, yr, num);

      if (he && (he.introduction || he.rationale.length > 0)) {
        proposals.push(he);
      }
    } catch (error) {
      log(`  Failed to fetch HE ${num}/${yr}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if ((i + 1) % 100 === 0) {
      log(`  Fetched ${i + 1}/${uris.length} proposals...`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  log(`Parsed ${proposals.length} government proposals.`);
  return proposals;
}
