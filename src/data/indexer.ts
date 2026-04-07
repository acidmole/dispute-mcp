import * as lancedb from "@lancedb/lancedb";
import { embedBatch, VECTOR_DIMENSIONS } from "../services/embedding.js";
import { fetchStatute, type FetchedSection } from "./finlex-fetcher.js";
import { fetchAllCaseLaw } from "./case-law-fetcher.js";
import { fetchAllHE } from "./he-fetcher.js";
import { fetchAllKRIL } from "./kril-scraper.js";
import type { LegalChunk, StatuteInfo } from "../types.js";

import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/lancedb");
const TABLE_NAME = "legal_docs";

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;

export async function getDb(): Promise<lancedb.Connection> {
  if (!db) {
    db = await lancedb.connect(DB_PATH);
  }
  return db;
}

export async function getTable(): Promise<lancedb.Table> {
  if (!table) {
    const database = await getDb();
    const tableNames = await database.tableNames();
    if (tableNames.includes(TABLE_NAME)) {
      table = await database.openTable(TABLE_NAME);
    } else {
      throw new Error(
        `Table "${TABLE_NAME}" not found. Run "npm run index-finlex" to populate the database.`
      );
    }
  }
  return table;
}

async function clearSourceType(sourceType: string): Promise<void> {
  const database = await getDb();
  const tableNames = await database.tableNames();
  if (tableNames.includes(TABLE_NAME)) {
    const tbl = await database.openTable(TABLE_NAME);
    try {
      await tbl.delete(`"sourceType" = '${sourceType}'`);
    } catch {
      // Table may be empty or column may not exist yet
    }
  }
}

async function addRecords(records: LegalChunk[]): Promise<void> {
  if (records.length === 0) return;

  const database = await getDb();
  const tableNames = await database.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    const tbl = await database.openTable(TABLE_NAME);
    await tbl.add(records as unknown as Record<string, unknown>[]);
    table = tbl;
  } else {
    table = await database.createTable(TABLE_NAME, records as unknown as Record<string, unknown>[]);
  }
}

async function embedAndStore(
  chunks: Omit<LegalChunk, "vector">[],
  log: (msg: string) => void
): Promise<number> {
  if (chunks.length === 0) {
    log("No chunks to index.");
    return 0;
  }

  log(`\nEmbedding ${chunks.length} chunks...`);
  const texts = chunks.map((c) => c.text);
  const vectors = await embedBatch(texts);

  const records: LegalChunk[] = chunks.map((chunk, i) => ({
    ...chunk,
    vector: vectors[i],
  }));

  log(`Storing in LanceDB...`);
  await addRecords(records);
  log(`Indexed ${records.length} chunks.`);
  return records.length;
}

// --- Statutes (laws) ---

function sectionsToChunks(sections: FetchedSection[]): Omit<LegalChunk, "vector">[] {
  return sections.map((section, idx) => {
    const contextParts: string[] = [];
    contextParts.push(section.lawName);
    if (section.chapterHeading) {
      contextParts.push(`${section.chapter} luku: ${section.chapterHeading}`);
    }
    if (section.sectionHeading) {
      contextParts.push(`${section.section} §: ${section.sectionHeading}`);
    }
    contextParts.push(section.text);

    return {
      id: `${section.lawId}_ch${section.chapter || "0"}_sec${section.section}_${idx}`,
      text: contextParts.join("\n"),
      sourceType: "law" as const,
      lawId: section.lawId,
      lawName: section.lawName,
      section: section.section,
      chapter: section.chapter,
      legalArea: section.legalArea,
      citation: section.citation,
      url: section.url,
    };
  });
}

export async function indexStatutes(
  statutes: StatuteInfo[],
  onProgress?: (msg: string) => void
): Promise<number> {
  const log = onProgress || ((msg: string) => console.error(msg));
  await clearSourceType("law");

  const allChunks: Omit<LegalChunk, "vector">[] = [];

  for (const statute of statutes) {
    const sections = await fetchStatute(statute);
    const chunks = sectionsToChunks(sections);
    allChunks.push(...chunks);
    log(`  ${statute.name}: ${chunks.length} chunks`);
    await new Promise((r) => setTimeout(r, 500));
  }

  return embedAndStore(allChunks, log);
}

// --- Case law (KKO/KHO) ---

export async function indexCaseLaw(
  court: "kko" | "kho",
  startYear: number,
  endYear: number,
  onProgress?: (msg: string) => void
): Promise<number> {
  const log = onProgress || ((msg: string) => console.error(msg));
  const sourceType = court === "kko" ? "kko_ruling" : "kho_ruling";
  await clearSourceType(sourceType);

  const decisions = await fetchAllCaseLaw(court, startYear, endYear, log);
  const chunks: Omit<LegalChunk, "vector">[] = [];

  for (const decision of decisions) {
    // Introduction chunk (summary)
    if (decision.introduction) {
      chunks.push({
        id: `${sourceType}_${decision.year}_${decision.number}_intro`,
        text: `${decision.title}\nAsiasanat: ${decision.keywords.join(", ")}\n\n${decision.introduction}`,
        sourceType,
        caseId: decision.caseId,
        legalArea: decision.keywords[0] || "",
        citation: `${decision.title}`,
        url: decision.url,
      });
    }

    // Section chunks (reasoning, decision, etc.)
    for (const [i, section] of decision.sections.entries()) {
      if (section.text.length > 100) {
        chunks.push({
          id: `${sourceType}_${decision.year}_${decision.number}_sec${i}`,
          text: `${decision.title}\n${section.heading}\n\n${section.text}`,
          sourceType,
          caseId: decision.caseId,
          legalArea: decision.keywords[0] || "",
          citation: `${decision.title} - ${section.heading}`,
          url: decision.url,
        });
      }
    }
  }

  return embedAndStore(chunks, log);
}

// --- Government proposals (HE) ---

export async function indexGovernmentProposals(
  startYear: number,
  endYear: number,
  onProgress?: (msg: string) => void
): Promise<number> {
  const log = onProgress || ((msg: string) => console.error(msg));
  await clearSourceType("he_document");

  const proposals = await fetchAllHE(startYear, endYear, log);
  const chunks: Omit<LegalChunk, "vector">[] = [];

  for (const he of proposals) {
    // Introduction chunk
    if (he.introduction) {
      chunks.push({
        id: `he_${he.year}_${he.number}_intro`,
        text: `${he.heNumber}: ${he.title}\n\nESITYKSEN PÄÄASIALLINEN SISÄLTÖ\n${he.introduction}`,
        sourceType: "he_document",
        heNumber: he.heNumber,
        citation: `${he.heNumber} - ${he.title}`,
        url: he.url,
      });
    }

    // Rationale section chunks
    for (const [i, section] of he.rationale.entries()) {
      if (section.text.length > 100) {
        const text = section.text.length > 2000
          ? section.text.substring(0, 2000) + "..."
          : section.text;
        chunks.push({
          id: `he_${he.year}_${he.number}_rat${i}`,
          text: `${he.heNumber}: ${he.title}\n${section.num}. ${section.heading}\n\n${text}`,
          sourceType: "he_document",
          heNumber: he.heNumber,
          citation: `${he.heNumber} - ${section.heading}`,
          url: he.url,
        });
      }
    }
  }

  return embedAndStore(chunks, log);
}

// --- Consumer Disputes Board (KRIL) ---

export async function indexConsumerBoard(
  onProgress?: (msg: string) => void
): Promise<number> {
  const log = onProgress || ((msg: string) => console.error(msg));
  await clearSourceType("consumer_board");

  const decisions = await fetchAllKRIL(log);
  const chunks: Omit<LegalChunk, "vector">[] = [];

  for (const decision of decisions) {
    // Context chunk: facts + claim
    chunks.push({
      id: `kril_${decision.caseNumber.replace(/\//g, "_")}_ctx`,
      text: [
        `Kuluttajariitalautakunta ${decision.caseNumber}`,
        `Päivämäärä: ${decision.decisionDate}`,
        decision.keywords.length > 0 ? `Asiasanat: ${decision.keywords.join(", ")}` : "",
        `\nTosiseikat:\n${decision.facts}`,
        decision.claim ? `\nVaatimus:\n${decision.claim}` : "",
      ].filter(Boolean).join("\n"),
      sourceType: "consumer_board",
      caseId: decision.caseNumber,
      legalArea: decision.categories[0] || "",
      citation: `KRIL ${decision.caseNumber}`,
      url: decision.url,
    });

    // Legal reasoning chunk
    if (decision.reasoning && decision.reasoning.length > 50) {
      chunks.push({
        id: `kril_${decision.caseNumber.replace(/\//g, "_")}_law`,
        text: [
          `Kuluttajariitalautakunta ${decision.caseNumber}`,
          `\nPerustelut:\n${decision.reasoning}`,
          decision.outcome ? `\nRatkaisu:\n${decision.outcome}` : "",
          decision.applicableLaws.length > 0
            ? `\nSovellettavat lait: ${decision.applicableLaws.join(", ")}`
            : "",
        ].filter(Boolean).join("\n"),
        sourceType: "consumer_board",
        caseId: decision.caseNumber,
        legalArea: decision.categories[0] || "",
        citation: `KRIL ${decision.caseNumber} - Perustelut ja ratkaisu`,
        url: decision.url,
      });
    }
  }

  return embedAndStore(chunks, log);
}
