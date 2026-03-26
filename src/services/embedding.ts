import { pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/multilingual-e5-large";
const BATCH_SIZE = 16;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    console.error(`Loading embedding model ${MODEL_ID}...`);
    extractor = await (pipeline as any)("feature-extraction", MODEL_ID, {
      dtype: "fp32",
    });
    console.error("Embedding model loaded.");
  }
  return extractor;
}

export async function embed(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(`query: ${text}`, { pooling: "mean", normalize: true });
  return output.tolist()[0] as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const prefixed = batch.map((t) => `passage: ${t}`);

    const ext = await getExtractor();
    const output = await ext(prefixed, { pooling: "mean", normalize: true });
    const batchEmbeddings = output.tolist() as number[][];
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

export const VECTOR_DIMENSIONS = 1024;
