import { searchLegal } from "../services/legal-search.js";
import type { LegalSearchResult } from "../types.js";

export async function searchLegalTool(input: {
  query: string;
  source_type?: string;
  legal_area?: string;
  limit?: number;
}): Promise<LegalSearchResult[]> {
  return searchLegal(input.query, {
    sourceType: input.source_type,
    legalArea: input.legal_area,
    limit: input.limit,
  });
}
