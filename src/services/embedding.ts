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
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const ext = await getExtractor();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const prefixed = batch.map((t) => `passage: ${t}`);

    const output = await ext(prefixed, { pooling: "mean", normalize: true });

    const data = output.data as Float32Array;
    const dims = output.dims;
    const embeddingDim = dims[dims.length - 1];

    for (let j = 0; j < batch.length; j++) {
      const start = j * embeddingDim;
      const end = start + embeddingDim;
      allEmbeddings.push(Array.from(data.slice(start, end)));
    }
  }

  return allEmbeddings;
}

export const VECTOR_DIMENSIONS = 1024;
