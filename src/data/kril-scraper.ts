import { XMLParser } from "fast-xml-parser";

const SITEMAP_URLS = [
  "https://www.kuluttajariita.fi/paatos-sitemap.xml",
  "https://www.kuluttajariita.fi/paatos-sitemap2.xml",
];
const USER_AGENT = "dispute-mcp/1.0 (legal research tool)";
const REQUEST_DELAY_MS = 1000;

export interface KRILDecision {
  url: string;
  caseNumber: string;
  decisionDate: string;
  title: string;
  categories: string[];
  keywords: string[];
  facts: string;
  claim: string;
  reasoning: string;
  outcome: string;
  applicableLaws: string[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.status === 429) {
        const wait = Math.pow(2, attempt) * 3000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      return response.text();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function getDecisionUrls(): Promise<string[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const urls: string[] = [];

  for (const sitemapUrl of SITEMAP_URLS) {
    try {
      const xml = await fetchWithRetry(sitemapUrl);
      const parsed = parser.parse(xml);

      const urlset = parsed["urlset"];
      if (!urlset) continue;

      let urlEntries = urlset["url"];
      if (!Array.isArray(urlEntries)) {
        urlEntries = urlEntries ? [urlEntries] : [];
      }

      for (const entry of urlEntries) {
        const loc = entry["loc"];
        if (
          typeof loc === "string" &&
          loc.includes("/paatokset/") &&
          loc !== "https://www.kuluttajariita.fi/paatokset/"
        ) {
          urls.push(loc);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return urls;
}

function extractBetween(html: string, startMarker: string, endMarker: string): string {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return "";
  const contentStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, contentStart);
  if (endIdx === -1) return html.substring(contentStart);
  return html.substring(contentStart, endIdx);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractField(html: string, label: string): string {
  // Try pattern: <strong>Label</strong> or <b>Label</b> followed by content
  const patterns = [
    new RegExp(`<(?:strong|b|h[2-4])>[^<]*${label}[^<]*</(?:strong|b|h[2-4])>\\s*:?\\s*</?(p|div)[^>]*>([\\s\\S]*?)(?=<(?:strong|b|h[2-4])>|$)`, "i"),
    new RegExp(`<(?:strong|b|h[2-4])>[^<]*${label}[^<]*</(?:strong|b|h[2-4])>([\\s\\S]*?)(?=<(?:strong|b|h[2-4])>|$)`, "i"),
    new RegExp(`${label}[:\\s]*</(?:strong|b|h[2-4]|dt)>\\s*(?:<(?:dd|p|div)[^>]*>)?([\\s\\S]*?)(?=<(?:strong|b|h[2-4]|dt)>|</(?:dl|article)>|$)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const content = match[match.length - 1] || match[1];
      return stripHtml(content);
    }
  }
  return "";
}

function extractCaseNumber(html: string): string {
  // Look for case number pattern D/NNNN/NN/NNNN
  const match = html.match(/D\/\d+\/\d+\/\d{4}/);
  if (match) return match[0];

  // Try extracting from "Diaarinumero" field
  const diariMatch = html.match(/[Dd]iaarinumero[:\s]*(?:<[^>]*>)*\s*([^\s<]+)/);
  if (diariMatch) return diariMatch[1];

  return "";
}

function extractDate(html: string): string {
  // Look for date near "Ratkaisupäivämäärä" or "Päätöspäivämäärä"
  const dateMatch = html.match(
    /(?:Ratkaisupäivämäärä|Päätöspäivämäärä|Julkaisupäivämäärä)[:\s]*(?:<[^>]*>)*\s*(\d{1,2}\.\d{1,2}\.\d{4})/i
  );
  if (dateMatch) return dateMatch[1];

  // Fallback: any date in the content
  const anyDate = html.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
  return anyDate ? anyDate[1] : "";
}

function extractKeywords(html: string): string[] {
  const kwSection = extractField(html, "Asiasana");
  if (!kwSection) return [];
  return kwSection
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 1);
}

function extractCategories(html: string): string[] {
  const catSection = extractField(html, "Aihepiir");
  if (!catSection) return [];
  return catSection
    .split(/[,\n]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 1);
}

function extractApplicableLaws(html: string): string[] {
  // Find law references like "kuluttajansuojalaki", "KSL 5:12" etc.
  const laws: string[] = [];
  const lawPatterns = [
    /(?:kuluttajansuojalaki|KSL)\s*\d*[:\s§]?\d*/gi,
    /(?:kauppalaki|OikTL|korkolaki)\s*\d*[:\s§]?\d*/gi,
    /(?:asuntokauppalaki|vahingonkorvauslaki)\s*\d*[:\s§]?\d*/gi,
    /\d+\/\d{4}\s*(?:laki|lain)/gi,
  ];

  const fullText = stripHtml(html);
  for (const pattern of lawPatterns) {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      const law = match[0].trim();
      if (!laws.includes(law)) {
        laws.push(law);
      }
    }
  }

  return laws;
}

function parseDecisionHtml(html: string, url: string): KRILDecision | null {
  // Extract the main content area
  const contentStart = html.indexOf('<div class="entry-content">');
  const contentEnd = html.indexOf("</article>");
  const content =
    contentStart !== -1
      ? html.substring(contentStart, contentEnd !== -1 ? contentEnd : undefined)
      : html;

  const caseNumber = extractCaseNumber(content);
  if (!caseNumber) {
    // Try broader search
    const broadCase = extractCaseNumber(html);
    if (!broadCase) return null;
  }

  const decisionDate = extractDate(content) || extractDate(html);

  // Extract title from <h1> or <title>
  let title = "";
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) title = stripHtml(h1Match[1]);
  if (!title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) title = stripHtml(titleMatch[1]).replace(/ - Kuluttajariitalautakunta$/, "");
  }

  // Extract structured fields
  const facts =
    extractField(content, "Tosiseikat") ||
    extractField(content, "Tapahtumatiedot") ||
    extractField(content, "Asian kuvaus");

  const claim =
    extractField(content, "Vaatimus") ||
    extractField(content, "Kuluttajan vaatimus");

  const reasoning =
    extractField(content, "Perustelu") ||
    extractField(content, "Ratkaistava") ||
    extractField(content, "Arviointi");

  const outcome =
    extractField(content, "Suositus") ||
    extractField(content, "Ratkaisu") ||
    extractField(content, "Päätös");

  const keywords = extractKeywords(content) || extractKeywords(html);
  const categories = extractCategories(content) || extractCategories(html);
  const applicableLaws = extractApplicableLaws(content);

  // If we couldn't extract any meaningful content, try a simpler approach
  const hasContent = facts || claim || reasoning || outcome;

  if (!hasContent) {
    // Fall back to extracting full text content
    const fullText = stripHtml(content);
    if (fullText.length < 100) return null;

    return {
      url,
      caseNumber: caseNumber || extractCaseNumber(html) || url.split("/").filter(Boolean).pop() || "",
      decisionDate,
      title,
      categories,
      keywords,
      facts: fullText.substring(0, 2000),
      claim: "",
      reasoning: "",
      outcome: "",
      applicableLaws,
    };
  }

  return {
    url,
    caseNumber: caseNumber || extractCaseNumber(html) || "",
    decisionDate,
    title,
    categories,
    keywords,
    facts,
    claim,
    reasoning,
    outcome,
    applicableLaws,
  };
}

export async function fetchAllKRIL(
  onProgress?: (msg: string) => void
): Promise<KRILDecision[]> {
  const log = onProgress || ((msg: string) => console.error(msg));

  log("Fetching KRIL decision URLs from sitemaps...");
  const urls = await getDecisionUrls();
  log(`Found ${urls.length} KRIL decision URLs.`);

  const decisions: KRILDecision[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      const html = await fetchWithRetry(url);
      const decision = parseDecisionHtml(html, url);

      if (decision) {
        decisions.push(decision);
      }
    } catch (error) {
      // Silently skip failed pages
    }

    if ((i + 1) % 100 === 0) {
      log(`  Scraped ${i + 1}/${urls.length} KRIL decisions (${decisions.length} parsed)...`);
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  log(`Parsed ${decisions.length} KRIL decisions.`);
  return decisions;
}
