import { readFile } from "fs/promises";
import { extname } from "path";

export async function parseDocument(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePdf(filePath);
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".tiff":
    case ".bmp":
    case ".webp":
      return parseImage(filePath);
    case ".txt":
    case ".md":
    case ".csv":
      return parseText(filePath);
    default:
      // Try as text
      return parseText(filePath);
  }
}

async function parsePdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  // pdf-parse is a CJS module, use dynamic import
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseImage(filePath: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("fin");
  const {
    data: { text },
  } = await worker.recognize(filePath);
  await worker.terminate();
  return text;
}

async function parseText(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}
