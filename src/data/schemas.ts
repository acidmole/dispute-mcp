import { z } from "zod";
import {
  DocumentTypeSchema,
  DisputeTypeSchema,
  SourceTypeSchema,
  LanguageSchema,
} from "../types.js";

// Tool input schemas

export const AnalyzeDocumentInputSchema = z.object({
  file_path: z
    .string()
    .optional()
    .describe("Absolute path to PDF, image, or text file to analyze"),
  text: z
    .string()
    .optional()
    .describe("Direct text input to analyze (alternative to file_path)"),
  document_type: DocumentTypeSchema.describe(
    "Type of document being analyzed"
  ),
});

export const SearchLegalInputSchema = z.object({
  query: z
    .string()
    .describe("Legal question or topic to search for, in Finnish"),
  source_type: SourceTypeSchema.default("all").describe(
    "Filter by legal source type"
  ),
  legal_area: z
    .string()
    .optional()
    .describe(
      'Filter by legal area, e.g. "kuluttajansuoja", "sopimusoikeus", "työoikeus"'
    ),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of results to return"),
});

export const GenerateDisputeInputSchema = z.object({
  dispute_type: DisputeTypeSchema.describe("Type of dispute to generate"),
  document_analysis: z
    .object({
      documentType: z.string(),
      parties: z.object({
        sender: z.string().optional(),
        recipient: z.string().optional(),
      }),
      claims: z.array(z.string()),
      amounts: z.array(
        z.object({
          value: z.number(),
          currency: z.string(),
          description: z.string(),
        })
      ),
      dates: z.array(
        z.object({ date: z.string(), description: z.string() })
      ),
      deadlines: z.array(
        z.object({ date: z.string(), description: z.string() })
      ),
      referenceNumbers: z.array(z.string()),
      summary: z.string(),
      rawText: z.string(),
    })
    .describe("Structured analysis from analyze_document tool"),
  legal_references: z
    .array(
      z.object({
        citation: z.string(),
        text: z.string(),
        sourceType: z.string(),
        relevanceScore: z.number(),
        url: z.string().optional(),
        lawName: z.string().optional(),
        section: z.string().optional(),
        chapter: z.string().optional(),
      })
    )
    .describe("Legal references from search_legal tool"),
  user_arguments: z
    .string()
    .describe(
      "User's own reasoning, facts, and arguments for the dispute"
    ),
  respondent: z
    .string()
    .describe("Name/organization the dispute is addressed to"),
  language: LanguageSchema.default("fi").describe("Output language"),
});
