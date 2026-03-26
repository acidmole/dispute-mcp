#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  AnalyzeDocumentInputSchema,
  SearchLegalInputSchema,
  GenerateDisputeInputSchema,
} from "./data/schemas.js";
import { analyzeDocument } from "./tools/analyze-document.js";
import { searchLegalTool } from "./tools/search-legal.js";
import { generateDisputeTool } from "./tools/generate-dispute.js";

const server = new Server(
  {
    name: "dispute-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_document",
        description:
          "Analyze a document (invoice, court summons, contract, letter) and extract structured information including parties, claims, amounts, dates, deadlines, and reference numbers. Supports PDF, images (OCR), and text files. Provide either file_path or text.",
        inputSchema: {
          type: "object" as const,
          properties: {
            file_path: {
              type: "string",
              description:
                "Absolute path to PDF, image, or text file to analyze",
            },
            text: {
              type: "string",
              description:
                "Direct text input to analyze (alternative to file_path)",
            },
            document_type: {
              type: "string",
              enum: ["invoice", "court_summons", "contract", "letter", "other"],
              description: "Type of document being analyzed",
            },
          },
          required: ["document_type"],
        },
      },
      {
        name: "search_legal",
        description:
          "Search Finnish legal sources using semantic search. Sources include: statutes (law), Supreme Court precedents (kko_ruling), Supreme Administrative Court precedents (kho_ruling), government proposals (he_document), and Consumer Disputes Board decisions (consumer_board). Returns relevant legal texts with proper citations. Query in Finnish for best results.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description:
                "Legal question or topic to search for, in Finnish",
            },
            source_type: {
              type: "string",
              enum: ["law", "kko_ruling", "kho_ruling", "he_document", "consumer_board", "all"],
              default: "all",
              description: "Filter by legal source type: law (statutes), kko_ruling (Supreme Court), kho_ruling (Supreme Administrative Court), he_document (government proposals), consumer_board (Consumer Disputes Board), all",
            },
            legal_area: {
              type: "string",
              description:
                'Filter by legal area, e.g. "kuluttajansuoja", "sopimusoikeus", "työoikeus"',
            },
            limit: {
              type: "number",
              default: 10,
              description: "Maximum number of results to return (1-50)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "generate_dispute",
        description:
          "Generate a structured Finnish legal dispute document (invoice denial, court response, complaint, claim, or objection). Combines document analysis, legal references, and user arguments into a complete dispute document with proper legal citations. Output is in structured markdown.",
        inputSchema: {
          type: "object" as const,
          properties: {
            dispute_type: {
              type: "string",
              enum: [
                "invoice_denial",
                "court_response",
                "complaint",
                "claim",
                "objection",
              ],
              description: "Type of dispute to generate",
            },
            document_analysis: {
              type: "object",
              description: "Structured analysis from analyze_document tool",
              properties: {
                documentType: { type: "string" },
                parties: {
                  type: "object",
                  properties: {
                    sender: { type: "string" },
                    recipient: { type: "string" },
                  },
                },
                claims: { type: "array", items: { type: "string" } },
                amounts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      currency: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                dates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                deadlines: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                referenceNumbers: {
                  type: "array",
                  items: { type: "string" },
                },
                summary: { type: "string" },
                rawText: { type: "string" },
              },
            },
            legal_references: {
              type: "array",
              description: "Legal references from search_legal tool",
              items: {
                type: "object",
                properties: {
                  citation: { type: "string" },
                  text: { type: "string" },
                  sourceType: { type: "string" },
                  relevanceScore: { type: "number" },
                  url: { type: "string" },
                  lawName: { type: "string" },
                  section: { type: "string" },
                  chapter: { type: "string" },
                },
              },
            },
            user_arguments: {
              type: "string",
              description:
                "User's own reasoning, facts, and arguments for the dispute",
            },
            respondent: {
              type: "string",
              description:
                "Name/organization the dispute is addressed to",
            },
            language: {
              type: "string",
              enum: ["fi", "sv"],
              default: "fi",
              description: "Output language (Finnish or Swedish)",
            },
          },
          required: [
            "dispute_type",
            "document_analysis",
            "legal_references",
            "user_arguments",
            "respondent",
          ],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_document": {
        const input = AnalyzeDocumentInputSchema.parse(args);
        const result = await analyzeDocument(input);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search_legal": {
        const input = SearchLegalInputSchema.parse(args);
        const results = await searchLegalTool(input);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "generate_dispute": {
        const input = GenerateDisputeInputSchema.parse(args);
        const document = generateDisputeTool({
          dispute_type: input.dispute_type,
          document_analysis: input.document_analysis as any,
          legal_references: input.legal_references as any,
          user_arguments: input.user_arguments,
          respondent: input.respondent,
          language: input.language,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: document,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("dispute-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
