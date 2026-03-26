import { getTable } from "../data/indexer.js";
import { embed } from "./embedding.js";
import type { LegalSearchResult } from "../types.js";

export async function searchLegal(
  query: string,
  options: {
    sourceType?: string;
    legalArea?: string;
    limit?: number;
  } = {}
): Promise<LegalSearchResult[]> {
  const { sourceType = "all", legalArea, limit = 10 } = options;

  const table = await getTable();
  const queryVector = await embed(query);

  let search = table.search(queryVector).limit(limit);

  // Build filter conditions (quote camelCase column names for LanceDB)
  const conditions: string[] = [];
  if (sourceType && sourceType !== "all") {
    conditions.push(`"sourceType" = '${sourceType}'`);
  }
  if (legalArea) {
    conditions.push(`"legalArea" = '${legalArea}'`);
  }

  if (conditions.length > 0) {
    search = search.where(conditions.join(" AND "));
  }

  const results = await search.toArray();

  return results.map((row) => ({
    citation: row.citation as string,
    text: row.text as string,
    sourceType: row.sourceType as string,
    relevanceScore: row._distance != null ? 1 / (1 + (row._distance as number)) : 0,
    url: row.url as string | undefined,
    lawName: row.lawName as string | undefined,
    section: row.section as string | undefined,
    chapter: row.chapter as string | undefined,
  }));
}
