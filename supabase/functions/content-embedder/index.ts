/**
 * Content Embedder — Supabase Edge Function
 *
 * Chunks content and generates embeddings for the RAG system.
 * Triggered by Database Webhooks on content tables (books, posts, courses, videos).
 *
 * Deploy: supabase functions deploy content-embedder --no-verify-jwt
 * Secrets: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown>;
}

interface ContentSection {
  content_type: string;
  content_id: string;
  section_index: number;
  heading: string;
  body_text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

serve(async (req: Request) => {
  try {
    // Verify request has key
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    // Skip deletes — we'll just leave orphaned embeddings (cleanup is optional)
    if (type === "DELETE") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Map table to content type
    const contentTypeMap: Record<string, string> = {
      books: "book",
      posts: "post",
      courses: "course",
      videos: "video",
    };

    const contentType = contentTypeMap[table];
    if (!contentType) {
      return new Response(JSON.stringify({ error: `Unknown table: ${table}` }), { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract content for embedding
    const contentParts = extractContent(contentType, record);
    if (!contentParts || contentParts.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No content to embed" }), {
        status: 200,
      });
    }

    // Initialize OpenAI embedding
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("OPENAI_API_KEY not set");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
      });
    }

    // Delete existing sections for this content (on update)
    if (type === "UPDATE") {
      await supabase
        .from("content_sections")
        .delete()
        .eq("content_type", contentType)
        .eq("content_id", record.id as string);
    }

    // Generate embeddings and insert
    const contentId = record.id as string;
    for (let i = 0; i < contentParts.length; i++) {
      const part = contentParts[i];
      const embedding = await generateEmbedding(part.body_text, openaiKey);

      const section: Omit<ContentSection, "embedding"> & { embedding: string } = {
        content_type: contentType,
        content_id: contentId,
        section_index: i,
        heading: part.heading,
        body_text: part.body_text,
        embedding: JSON.stringify(embedding),
        metadata: part.metadata ?? {},
      };

      await supabase.from("content_sections").insert(section);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sections: contentParts.length,
        contentType,
        contentId,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    console.error("content-embedder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});

/* ─── Content Extraction ───────────────────────────────────────── */

function extractContent(
  contentType: string,
  record: Record<string, unknown>,
): { heading: string; body_text: string; metadata?: Record<string, unknown> }[] {
  switch (contentType) {
    case "book":
      return extractBookContent(record);
    case "post":
      return extractPostContent(record);
    case "course":
      return extractCourseContent(record);
    case "video":
      return extractVideoContent(record);
    default:
      return [];
  }
}

function extractBookContent(
  record: Record<string, unknown>,
): { heading: string; body_text: string; metadata?: Record<string, unknown> }[] {
  const parts: { heading: string; body_text: string; metadata?: Record<string, unknown> }[] = [];

  // Combine bilingual descriptions
  const descEn = (record.description_en as string) ?? "";
  const descBn = (record.description_bn as string) ?? "";
  const fullDesc = [descEn, descBn].filter(Boolean).join("\n\n");

  if (fullDesc) {
    // Split description into chunks for embedding
    const chunks = splitIntoParagraphs(fullDesc, 500);
    chunks.forEach((chunk, i) => {
      parts.push({
        heading: `Description — ${(record.title_en as string) || "Untitled"}`,
        body_text: chunk,
        metadata: {
          title_en: record.title_en,
          title_bn: record.title_bn,
          author: record.author_name,
          category: record.category,
        },
      });
    });
  }

  return parts;
}

function extractPostContent(
  record: Record<string, unknown>,
): { heading: string; body_text: string; metadata?: Record<string, unknown> }[] {
  const parts: { heading: string; body_text: string; metadata?: Record<string, unknown> }[] = [];

  const contentEn = (record.content_en as string) ?? "";
  const contentBn = (record.content_bn as string) ?? "";
  const fullContent = [contentEn, contentBn].filter(Boolean).join("\n\n");

  if (fullContent) {
    const chunks = splitIntoParagraphs(fullContent, 500);
    chunks.forEach((chunk, i) => {
      parts.push({
        heading: `${(record.title_en as string) || "Post"} — Part ${i + 1}`,
        body_text: chunk,
        metadata: {
          title_en: record.title_en,
          title_bn: record.title_bn,
          category: record.category,
          tags: record.tags,
        },
      });
    });
  }

  return parts;
}

function extractCourseContent(
  record: Record<string, unknown>,
): { heading: string; body_text: string; metadata?: Record<string, unknown> }[] {
  const parts: { heading: string; body_text: string; metadata?: Record<string, unknown> }[] = [];

  const descEn = (record.description_en as string) ?? "";
  const descBn = (record.description_bn as string) ?? "";
  const fullDesc = [descEn, descBn].filter(Boolean).join("\n\n");

  if (fullDesc) {
    const chunks = splitIntoParagraphs(fullDesc, 500);
    chunks.forEach((chunk, i) => {
      parts.push({
        heading: `${(record.title_en as string) || "Course"} — Part ${i + 1}`,
        body_text: chunk,
        metadata: {
          title_en: record.title_en,
          title_bn: record.title_bn,
          level: record.level,
        },
      });
    });
  }

  return parts;
}

function extractVideoContent(
  record: Record<string, unknown>,
): { heading: string; body_text: string; metadata?: Record<string, unknown> }[] {
  const parts: { heading: string; body_text: string; metadata?: Record<string, unknown> }[] = [];

  const title = (record.title as string) ?? "";
  const desc = (record.description as string) ?? "";
  const fullText = [title, desc].filter(Boolean).join("\n");

  if (fullText) {
    parts.push({
      heading: title,
      body_text: fullText,
      metadata: {
        title,
        duration: record.duration,
      },
    });
  }

  return parts;
}

/* ─── Text Splitting ───────────────────────────────────────────── */

function splitIntoParagraphs(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

/* ─── OpenAI Embedding ─────────────────────────────────────────── */

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8191), // Token limit safety
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
