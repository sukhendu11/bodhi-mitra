import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

/* ─── Text splitting ──────────────────────────────────────────── */

/**
 * Split text into chunks for embedding and RAG.
 * Uses recursive character splitting to preserve paragraph/sentence boundaries.
 * Standard chunk: 500-1000 tokens with 10-20% overlap.
 */
export function createTextSplitter(chunkSize = 800, chunkOverlap = 150) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
}

/**
 * Split a long text into chunks with metadata.
 */
export async function splitIntoChunks(
  text: string,
  heading = "",
  options?: { chunkSize?: number; chunkOverlap?: number },
): Promise<{ text: string; index: number }[]> {
  const splitter = createTextSplitter(options?.chunkSize, options?.chunkOverlap);
  const docs = await splitter.createDocuments([text]);
  return docs.map((doc, i) => ({
    text: doc.pageContent,
    index: i,
  }));
}

/* ─── Embedding generation ─────────────────────────────────────── */

const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate a single embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in parallel.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}

/* ─── Content preparation ─────────────────────────────────────── */

/**
 * Prepare content for embedding: split into chunks and generate embeddings.
 * Returns array of chunks with their vectors.
 */
export async function prepareContentForEmbedding(
  bodyText: string,
  heading = "",
  options?: { chunkSize?: number; chunkOverlap?: number },
): Promise<{ text: string; index: number; embedding: number[] }[]> {
  const chunks = await splitIntoChunks(bodyText, heading, options);

  // Generate embeddings for all chunks in parallel
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  return chunks.map((chunk, i) => ({
    text: chunk.text,
    index: chunk.index,
    embedding: embeddings[i],
  }));
}
