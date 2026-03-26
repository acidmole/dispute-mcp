import {
  indexStatutes,
  indexCaseLaw,
  indexGovernmentProposals,
  indexConsumerBoard,
} from "../src/data/indexer.js";
import { CONSUMER_LAWS } from "../src/types.js";

const VALID_SOURCES = ["all", "law", "kko", "kho", "he", "kril"] as const;
type Source = (typeof VALID_SOURCES)[number];

function parseArgs(): { source: Source; startYear: number; endYear: number } {
  const args = process.argv.slice(2);
  let source: Source = "all";
  let startYear = 2000;
  let endYear = new Date().getFullYear();

  for (const arg of args) {
    if (arg.startsWith("--source=")) {
      const val = arg.split("=")[1] as Source;
      if (VALID_SOURCES.includes(val)) {
        source = val;
      } else {
        console.error(`Invalid source: ${val}. Valid: ${VALID_SOURCES.join(", ")}`);
        process.exit(1);
      }
    } else if (arg.startsWith("--start-year=")) {
      startYear = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--end-year=")) {
      endYear = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npm run index-finlex -- [options]

Options:
  --source=SOURCE    Source to index: ${VALID_SOURCES.join(", ")} (default: all)
  --start-year=YYYY  Start year for case law and HE (default: 2000)
  --end-year=YYYY    End year for case law and HE (default: current year)

Examples:
  npm run index-finlex                     # Index everything
  npm run index-finlex -- --source=law     # Only statutes
  npm run index-finlex -- --source=kko     # Only KKO precedents
  npm run index-finlex -- --source=kko --start-year=2020  # KKO from 2020 onwards
`);
      process.exit(0);
    }
  }

  return { source, startYear, endYear };
}

async function main() {
  console.log("=== Dispute MCP Legal Database Indexer ===\n");

  const { source, startYear, endYear } = parseArgs();
  const startTime = Date.now();
  let totalChunks = 0;

  // --- Statutes ---
  if (source === "all" || source === "law") {
    console.log(`\n=== Indexing ${CONSUMER_LAWS.length} Finnish statutes ===\n`);
    for (const law of CONSUMER_LAWS) {
      console.log(`  - ${law.name} (${law.number}/${law.year})`);
    }
    console.log();
    const count = await indexStatutes(CONSUMER_LAWS, console.log);
    totalChunks += count;
  }

  // --- KKO ---
  if (source === "all" || source === "kko") {
    console.log(`\n=== Indexing KKO precedents (${startYear}-${endYear}) ===\n`);
    const count = await indexCaseLaw("kko", startYear, endYear, console.log);
    totalChunks += count;
  }

  // --- KHO ---
  if (source === "all" || source === "kho") {
    console.log(`\n=== Indexing KHO precedents (${startYear}-${endYear}) ===\n`);
    const count = await indexCaseLaw("kho", startYear, endYear, console.log);
    totalChunks += count;
  }

  // --- Government proposals ---
  if (source === "all" || source === "he") {
    console.log(`\n=== Indexing government proposals (${startYear}-${endYear}) ===\n`);
    const count = await indexGovernmentProposals(startYear, endYear, console.log);
    totalChunks += count;
  }

  // --- Consumer Disputes Board ---
  if (source === "all" || source === "kril") {
    console.log(`\n=== Indexing Consumer Disputes Board (KRIL) decisions ===\n`);
    const count = await indexConsumerBoard(console.log);
    totalChunks += count;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! Indexed ${totalChunks} total chunks in ${elapsed}s.`);
  console.log("Database stored at: ./data/lancedb/");
}

main().catch((error) => {
  console.error("Indexing failed:", error);
  process.exit(1);
});
