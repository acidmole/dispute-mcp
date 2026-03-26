import { generateDispute } from "../services/dispute-generator.js";
import type { DocumentAnalysis, LegalSearchResult, DisputeType, Language } from "../types.js";

export function generateDisputeTool(input: {
  dispute_type: DisputeType;
  document_analysis: DocumentAnalysis;
  legal_references: LegalSearchResult[];
  user_arguments: string;
  respondent: string;
  language?: Language;
}): string {
  return generateDispute({
    disputeType: input.dispute_type,
    documentAnalysis: input.document_analysis,
    legalReferences: input.legal_references,
    userArguments: input.user_arguments,
    respondent: input.respondent,
    language: input.language || "fi",
  });
}
