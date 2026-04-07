import { XMLParser } from "fast-xml-parser";
import type { StatuteInfo } from "../types.js";

const BASE_URL = "https://opendata.finlex.fi/finlex/avoindata/v1";
const USER_AGENT = "dispute-mcp/1.0";

interface FetchedSection {
  lawId: string;
  lawName: string;
  legalArea: string;
  chapter: string;
  chapterHeading: string;
  section: string;
  sectionHeading: string;
  text: string;
  citation: string;
  url: string;
}

async function fetchWithRetry(
  url: string,
  retries = 3
): Promise<Response> {
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

function extractTextContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";

  const obj = node as Record<string, unknown>;

  // Handle text content directly
  if ("#text" in obj) {
    return String(obj["#text"]);
  }

  // Recurse into child elements, skip attributes (prefixed with @_)
  let text = "";
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@_")) continue; // Skip XML attributes
    if (Array.isArray(value)) {
      text += value.map(extractTextContent).join(" ");
    } else {
      text += extractTextContent(value);
    }
  }
  return text.trim();
}

function parseSections(
  body: Record<string, unknown>,
  statute: StatuteInfo
): FetchedSection[] {
  const sections: FetchedSection[] = [];
  const lawId = `${statute.number}/${statute.year}`;
  const baseUrl = `https://www.finlex.fi/fi/laki/ajantasa/${statute.year}/${statute.year}${String(statute.number).padStart(4, "0")}`;

  // Try to find chapters (luku) or direct sections (pykälä)
  // Chapters may be inside an hcontainer wrapper
  const chapters = findElements(body, "chapter");
  if (chapters.length > 0) {
    for (const chapter of chapters) {
      // Extract chapter number from <num> element (e.g. "1 luku.")
      const chapterNumText = findNum(chapter);
      const chapterLabel = extractNumberFromText(chapterNumText) ||
        extractChapterNumber(getAttr(chapter, "eId") || "");
      const chapterHeading = findHeading(chapter);
      const chapterSections = findElements(chapter, "section");

      for (const section of chapterSections) {
        // Extract section number from <num> element (e.g. "1§")
        const sectionNumText = findNum(section);
        const sectionLabel = extractNumberFromText(sectionNumText) ||
          extractSectionNumber(getAttr(section, "eId") || "");
        const sectionHeading = findHeading(section);
        const sectionText = extractSectionText(section);

        if (sectionText.trim()) {
          sections.push({
            lawId,
            lawName: statute.name,
            legalArea: statute.legalArea,
            chapter: chapterLabel,
            chapterHeading,
            section: sectionLabel,
            sectionHeading,
            text: sectionText,
            citation: `${statute.name} ${chapterLabel ? chapterLabel + " luku " : ""}${sectionLabel} §`,
            url: baseUrl,
          });
        }
      }
    }
  } else {
    // No chapters, look for direct sections
    const directSections = findElements(body, "section");
    for (const section of directSections) {
      const sectionNumText = findNum(section);
      const sectionLabel = extractNumberFromText(sectionNumText) ||
        extractSectionNumber(getAttr(section, "eId") || "");
      const sectionHeading = findHeading(section);
      const sectionText = extractSectionText(section);

      if (sectionText.trim()) {
        sections.push({
          lawId,
          lawName: statute.name,
          legalArea: statute.legalArea,
          chapter: "",
          chapterHeading: "",
          section: sectionLabel,
          sectionHeading,
          text: sectionText,
          citation: `${statute.name} ${sectionLabel} §`,
          url: baseUrl,
        });
      }
    }
  }

  return sections;
}

function findElements(
  obj: unknown,
  tagName: string
): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  if (!obj || typeof obj !== "object") return results;

  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    // Match tag names like "akn:chapter", "chapter", etc.
    const localName = key.includes(":") ? key.split(":").pop()! : key;
    if (localName === tagName) {
      if (Array.isArray(value)) {
        results.push(
          ...(value as Record<string, unknown>[])
        );
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

function findHeading(obj: Record<string, unknown>): string {
  const headings = findElements(obj, "heading");
  if (headings.length > 0) {
    return extractTextContent(headings[0]);
  }
  return "";
}

function findNum(obj: Record<string, unknown>): string {
  const nums = findElements(obj, "num");
  if (nums.length > 0) {
    return extractTextContent(nums[0]).trim();
  }
  return "";
}

function extractSectionText(section: Record<string, unknown>): string {
  // Finlex XML uses: section > subsection > content > p
  // Also possible: section > paragraph, section > intro, section > point
  const subsections = findElements(section, "subsection");
  const paragraphs = findElements(section, "paragraph");
  const contents = findElements(section, "content");
  const intros = findElements(section, "intro");
  const points = findElements(section, "point");

  const parts: string[] = [];

  for (const intro of intros) {
    const t = extractTextContent(intro);
    if (t) parts.push(t);
  }

  // Prefer subsections (Finlex standard structure)
  for (const sub of subsections) {
    const t = extractTextContent(sub);
    if (t) parts.push(t);
  }

  if (parts.length === 0) {
    for (const para of paragraphs) {
      const t = extractTextContent(para);
      if (t) parts.push(t);
    }
  }

  if (parts.length === 0) {
    for (const content of contents) {
      const t = extractTextContent(content);
      if (t) parts.push(t);
    }
  }

  for (const point of points) {
    const t = extractTextContent(point);
    if (t) parts.push(t);
  }

  if (parts.length === 0) {
    // Fallback: extract all text from the section
    const t = extractTextContent(section);
    if (t) parts.push(t);
  }

  return parts.join("\n").trim();
}

function getAttr(
  obj: Record<string, unknown>,
  attr: string
): string | undefined {
  // fast-xml-parser puts attributes with @ prefix
  const key = `@_${attr}`;
  if (key in obj) return String(obj[key]);
  // Also check direct attribute
  if (attr in obj) return String(obj[attr]);
  return undefined;
}

function extractNumberFromText(text: string): string {
  // Extract number from strings like "1§", "1 §", "1 luku.", "12a§"
  const match = text.match(/(\d+[a-z]?)\s*[§.]/);
  return match ? match[1] : "";
}

function extractSectionNumber(eId: string): string {
  // eId format: "chp_1__sec_1", "sec_1", etc.
  const match = eId.match(/sec_(\d+[a-z]?)$/);
  if (match) return match[1];
  const fallback = eId.match(/(\d+[a-z]?)$/);
  return fallback ? fallback[1] : eId;
}

function extractChapterNumber(eId: string): string {
  // eId format: "chp_1"
  const match = eId.match(/chp_(\d+[a-z]?)$/);
  if (match) return match[1];
  const fallback = eId.match(/(\d+[a-z]?)$/);
  return fallback ? fallback[1] : eId;
}

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  textNodeName: "#text",
  isArray: (name: string) => {
    return [
      "chapter",
      "section",
      "subsection",
      "paragraph",
      "point",
      "content",
      "p",
      "heading",
      "intro",
      "hcontainer",
    ].some((tag) => name.endsWith(tag));
  },
};

function parseStatuteXml(
  xml: string,
  statute: StatuteInfo
): FetchedSection[] {
  const parser = new XMLParser(XML_PARSER_OPTIONS);
  const parsed = parser.parse(xml);

  const root = parsed["akomaNtoso"] || parsed["akn:akomaNtoso"] || parsed;
  const act =
    root["act"] || root["akn:act"] || root["bill"] || root["akn:bill"];

  if (!act) {
    // Try to parse from root directly
    return parseSections(parsed, statute);
  }

  const body = act["body"] || act["akn:body"];
  if (!body) {
    console.error(`  No body element found for ${statute.name}`);
    return [];
  }

  return parseSections(body, statute);
}

export async function fetchStatute(
  statute: StatuteInfo
): Promise<FetchedSection[]> {
  const url = `${BASE_URL}/akn/fi/act/statute/${statute.year}/${statute.number}/fin@`;
  console.error(
    `Fetching ${statute.name} (${statute.number}/${statute.year})...`
  );

  try {
    const response = await fetchWithRetry(url);
    const xml = await response.text();
    const sections = parseStatuteXml(xml, statute);
    console.error(`  Parsed ${sections.length} sections from ${statute.name}`);
    return sections;
  } catch (error) {
    console.error(
      `  Failed to fetch ${statute.name}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

export type { FetchedSection };
