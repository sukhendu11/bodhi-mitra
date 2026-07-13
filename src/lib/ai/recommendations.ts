/**
 * AI Recommendations — Semantic content recommendations using pgvector.
 *
 * Architecture:
 * 1. For a given content item (book, post, course), find semantically similar content
 * 2. Uses the content_sections table's embeddings and match_content_sections RPC
 * 3. Returns deduplicated, ranked results across content types
 */

import { supabase } from "@/integrations/supabase/client";
import { generateEmbedding } from "./embeddings";
import type { Book } from "@/lib/books";

/* ─── Types ────────────────────────────────────────────────────── */

export interface ContentRecommendation {
  contentType: "book" | "post" | "course" | "video";
  contentId: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  matchReason: string;
  similarity: number;
}

/* ─── Semantic recommendations via pgvector ────────────────────── */

/**
 * Get semantic recommendations for a specific content item.
 * Uses pgvector to find the most semantically similar content sections,
 * then aggregates and deduplicates by content_id.
 */
export async function getSemanticRecommendations(
  contentType: string,
  contentId: string,
  limit = 6,
): Promise<ContentRecommendation[]> {
  // Get the content sections for this item
  const { data: sections } = await (supabase as any)
    .from("content_sections")
    .select("id, body_text, heading")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .limit(3);

  if (!sections || sections.length === 0) return [];

  // Use the first section to generate a search embedding
  const queryText = sections.map((s: any) => s.body_text).join(" ");
  const embedding = await generateEmbedding(queryText.slice(0, 2000));

  // Search for similar content, excluding the source item
  const { data: similar } = await (supabase as any).rpc("match_content_sections", {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: limit * 3, // Fetch more for dedup
    filter_content_type: null,
    filter_content_id: null,
  });

  if (!similar || similar.length === 0) return [];

  // Deduplicate by content_id and filter out the source item
  const seen = new Set<string>();
  seen.add(contentId);

  const deduped = (similar as any[])
    .filter((s: any) => {
      if (seen.has(s.content_id)) return false;
      if (s.content_id === contentId) return false;
      seen.add(s.content_id);
      return true;
    })
    .slice(0, limit);

  if (deduped.length === 0) return [];

  // Enrich with metadata from source tables
  return enrichRecommendations(deduped);
}

/**
 * Enrich raw similar search results with titles, slugs, and images.
 */
async function enrichRecommendations(
  results: any[],
): Promise<ContentRecommendation[]> {
  // Group by content type for batch fetching
  const byType: Record<string, string[]> = {};
  for (const r of results) {
    if (!byType[r.content_type]) byType[r.content_type] = [];
    byType[r.content_type].push(r.content_id);
  }

  // Fetch metadata from each content type's table
  const metadataMap = new Map<string, { title: string; slug: string; imageUrl: string }>();

  for (const [type, ids] of Object.entries(byType)) {
    let table: string;
    let titleField: string;
    let imageField: string;

    switch (type) {
      case "book":
        table = "books";
        titleField = "title_en";
        imageField = "cover_image";
        break;
      case "post":
        table = "posts";
        titleField = "title_en";
        imageField = "cover_image";
        break;
      case "course":
        table = "courses";
        titleField = "title_en";
        imageField = "cover_image";
        break;
      case "video":
        table = "videos";
        titleField = "title";
        imageField = "thumbnail_url";
        break;
      default:
        continue;
    }

    const { data: items } = await (supabase as any)
      .from(table)
      .select(`id, slug, ${titleField}, ${imageField}`)
      .in("id", ids);

    if (items) {
      for (const item of items) {
        metadataMap.set(`${type}:${item.id}`, {
          title: item[titleField] ?? "Untitled",
          slug: item.slug ?? "",
          imageUrl: item[imageField] ?? "",
        });
      }
    }
  }

  return results
    .map((r) => {
      const meta = metadataMap.get(`${r.content_type}:${r.content_id}`);
      if (!meta) return null;
      return {
        contentType: r.content_type as ContentRecommendation["contentType"],
        contentId: r.content_id,
        title: meta.title,
        slug: meta.slug,
        excerpt: (r.body_text ?? "").slice(0, 200),
        imageUrl: meta.imageUrl,
        matchReason: getMatchReason(r.similarity),
        similarity: r.similarity ?? 0,
      };
    })
    .filter(Boolean) as ContentRecommendation[];
}

/* ─── Rule-based recommendations (fallback) ────────────────────── */

/**
 * Get rule-based book recommendations when semantic search isn't available.
 * Falls back to: same category, featured books, recent books.
 */
export async function getRuleBasedRecommendations(
  userId: string | undefined,
  currentBookId: string,
  category?: string,
  limit = 6,
): Promise<Book[]> {
  const db = supabase as any;

  // Build query: same category + published, exclude current book
  let query = db
    .from("books")
    .select("*")
    .eq("status", "published")
    .neq("id", currentBookId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return (data ?? []) as Book[];
}

/* ─── Utility ──────────────────────────────────────────────────── */

function getMatchReason(similarity: number): string {
  if (similarity > 0.9) return "Highly related content";
  if (similarity > 0.8) return "Similar topic";
  if (similarity > 0.7) return "Related content";
  return "You might also like";
}
