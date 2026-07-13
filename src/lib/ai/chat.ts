/**
 * AI Chat — Server functions for the "Ask Bodhi" chat assistant.
 *
 * Architecture:
 * 1. User sends a query from AiChatPanel
 * 2. Server function embeds the query and searches content_sections via pgvector
 * 3. Top-K results are assembled into a RAG context prompt
 * 4. LLM generates a response citing the sources
 */

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbedding } from "./embeddings";

/* ─── Types ────────────────────────────────────────────────────── */

export interface ChatSource {
  id: string;
  contentType: string;
  contentId: string;
  heading: string;
  excerpt: string;
  similarity: number;
}

export interface ChatRequest {
  query: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

/* ─── RAG Search ───────────────────────────────────────────────── */

/**
 * Search content sections for the most relevant chunks given a query.
 * Uses pgvector cosine similarity via the match_content_sections RPC.
 */
export async function searchContentSections(
  query: string,
  options?: {
    threshold?: number;
    limit?: number;
    contentType?: string;
  },
): Promise<ChatSource[]> {
  const embedding = await generateEmbedding(query);

  const { data, error } = await (supabase as any).rpc("match_content_sections", {
    query_embedding: embedding,
    match_threshold: options?.threshold ?? 0.7,
    match_count: options?.limit ?? 5,
    filter_content_type: options?.contentType ?? null,
    filter_content_id: null,
  });

  if (error) {
    console.error("[ai/chat] searchContentSections error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    heading: row.heading ?? "",
    excerpt: row.body_text?.slice(0, 300) ?? "",
    similarity: row.similarity ?? 0,
  }));
}

/* ─── Build RAG Prompt ─────────────────────────────────────────── */

/**
 * Assemble a system prompt with RAG context from search results.
 */
function buildRagPrompt(query: string, sources: ChatSource[]): string {
  if (sources.length === 0) {
    return `You are Bodhi, a helpful guide for the Bodhi Mitra wisdom platform. 

The user asked: "${query}"

Unfortunately, you couldn't find specific content matching this question in the platform's library. Helpfully suggest they explore the books, posts, or courses available on the platform, or rephrase their question.`;
  }

  const contextBlock = sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] (${s.contentType}, heading: "${s.heading}", relevance: ${(s.similarity * 100).toFixed(0)}%)
${s.excerpt}`,
    )
    .join("\n\n");

  return `You are Bodhi, a wise and compassionate guide for the Bodhi Mitra wisdom platform. You help users explore Buddhist psychology, mindfulness, meditation, and personal growth through the platform's content.

Answer the user's question based SOLELY on the provided content sources below. If the sources don't contain enough information to answer, say so honestly.

Always cite your sources using [Source N] markers. Keep answers concise but meaningful — aim for 2-4 paragraphs.

User's question: "${query}"

Relevant content from the platform:

${contextBlock}`;
}

/* ─── Chat Functions ───────────────────────────────────────────── */

/**
 * Answer a question using RAG: search content, build prompt, generate response.
 */
export async function chatWithSources(
  query: string,
  history?: { role: "user" | "assistant"; content: string }[],
): Promise<ChatResponse> {
  const sources = await searchContentSections(query);
  const systemPrompt = buildRagPrompt(query, sources);

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      ...(history?.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) ?? []),
      { role: "user" as const, content: query },
    ],
  });

  // Collect the full response text
  let answer = "";
  for await (const chunk of result.textStream) {
    answer += chunk;
  }

  return { answer, sources };
}

/**
 * Create a streaming chat response as a ReadableStream for the API route.
 */
export async function createChatStream(
  query: string,
  history?: { role: "user" | "assistant"; content: string }[],
): Promise<ReadableStream> {
  const sources = await searchContentSections(query);
  const systemPrompt = buildRagPrompt(query, sources);

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      ...(history?.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) ?? []),
      { role: "user" as const, content: query },
    ],
  });

  return result.textStream.pipeThrough(new TextEncoderStream());
}
