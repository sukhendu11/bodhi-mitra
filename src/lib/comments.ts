import { supabase } from "@/integrations/supabase/client";
import { getComments as strapiGetComments } from "@/lib/strapi-client";
import { isMockId } from "@/lib/utils";
import { mockFetchComments } from "@/lib/mock-comments";
import { isSupabaseUnavailableError } from "@/lib/supabase-unavailable";
import type { StrapiComment } from "@/lib/strapi-client";

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

/** Map a Strapi Comment to the app's Comment type */
function mapStrapiComment(sc: StrapiComment, postId?: string): Comment {
  return {
    id: String(sc.documentId),
    post_id: postId || "",
    user_id: "",
    user_name: sc.author_name,
    comment_text: sc.content,
    created_at: sc.createdAt,
    updated_at: sc.updatedAt,
    parent_id: sc.parent?.documentId ? String(sc.parent.documentId) : null,
  };
}

/**
 * Fetch comments for a post.
 * Mock post ids (e.g. "post-3") read from the mock store directly — their
 * string ids can't be queried against the UUID post_id column. Otherwise
 * tries Strapi API first, falls back to Supabase, then mock comments.
 */
export async function fetchComments(postId: string): Promise<Comment[]> {
  // Mock post id → mock comments store (fast path, no backend calls)
  if (isMockId(postId)) return mockFetchComments(postId);

  // Try Strapi first
  try {
    const strapiRes = await strapiGetComments({ status: "approved" });
    const items = (Array.isArray(strapiRes.data) ? strapiRes.data : []).filter(Boolean);
    return items.map((c) => mapStrapiComment(c, postId));
  } catch {
    // Strapi unavailable — fall through to Supabase
  }

  // Fallback to Supabase
  try {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Comment[];
  } catch (err) {
    // Only fall back to mock comments when Supabase is genuinely unavailable
    // (offline dev) — real DB errors (e.g. RLS) still surface.
    if (isSupabaseUnavailableError(err)) return mockFetchComments(postId);
    throw err;
  }
}

/** Add a comment (writes remain in Supabase — app data). */
export async function addComment(input: {
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  parent_id?: string | null;
}): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert(input as never)
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateComment(id: string, comment_text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .update({ comment_text, updated_at: new Date().toISOString() } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}
