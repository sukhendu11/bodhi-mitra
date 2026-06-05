import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */

export type VideoStatus = "draft" | "published";

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  youtube_url: string;
  sort_order: number;
  status: VideoStatus;
  created_at: string;
  updated_at: string;
}

export interface VideoInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  youtube_url: string;
  sort_order?: number;
  status?: VideoStatus;
}

export interface PaginatedVideos {
  data: Video[];
  total: number;
}

/* ─── Public ────────────────────────────────────────────────────── */

/* ─── YouTube URL helpers ───────────────────────────────────────── */

/**
 * Extract the YouTube video ID from various URL formats.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, or a bare ID.
 */
export function getYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Fetch published videos for public display, ordered by sort_order. */
export async function fetchPublishedVideos(
  page = 1,
  pageSize = 12,
): Promise<PaginatedVideos> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await (supabase as any)
    .from("videos")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as Video[], total: count ?? 0 };
}

/* ─── Admin CRUD ────────────────────────────────────────────────── */

/** Fetch all videos (including drafts) for admin. */
export async function fetchAllVideos(
  page = 1,
  pageSize = 20,
  options?: { status?: VideoStatus; search?: string },
): Promise<PaginatedVideos> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from("videos")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.status) query = query.eq("status", options.status);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.or(`title.ilike.*${q}*,description.ilike.*${q}*`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Video[], total: count ?? 0 };
}

/** Fetch a single video by ID. */
export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await (supabase as any)
    .from("videos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Video | null;
}

/** Create a new video. */
export async function createVideo(input: VideoInput): Promise<Video> {
  const { data, error } = await (supabase as any)
    .from("videos")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Video;
}

/** Update an existing video. */
export async function updateVideo(id: string, input: Partial<VideoInput>): Promise<Video> {
  const { data, error } = await (supabase as any)
    .from("videos")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Video;
}

/** Delete a video. */
export async function deleteVideo(id: string): Promise<void> {
  const { error } = await (supabase as any).from("videos").delete().eq("id", id);
  if (error) throw error;
}

/** Get video stats for admin dashboard. */
export async function getVideoStats(): Promise<{
  total: number;
  published: number;
  draft: number;
}> {
  const db = supabase as any;

  const { count: total } = await db.from("videos").select("*", { count: "exact", head: true });
  const { count: published } = await db.from("videos").select("*", { count: "exact", head: true }).eq("status", "published");
  const { count: draft } = await db.from("videos").select("*", { count: "exact", head: true }).eq("status", "draft");

  return {
    total: total ?? 0,
    published: published ?? 0,
    draft: draft ?? 0,
  };
}
