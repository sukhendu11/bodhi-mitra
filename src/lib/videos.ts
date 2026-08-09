import { supabase } from "@/integrations/supabase/client";
import { mockFetchPublishedVideos } from "@/lib/mock-data";

/* ─── Types ─────────────────────────────────────────────────────── */

export type VideoStatus = "draft" | "published";

export interface Video {
  id: string;
  title: string;
  description: string;
  /** Bilingual parity with posts/books — optional (legacy/Strapi rows may only have `title`). */
  title_en?: string;
  title_bn?: string;
  description_en?: string;
  description_bn?: string;
  thumbnail_url: string;
  youtube_url: string;
  duration?: number;
  category?: string;
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
  duration?: number;
  category?: string;
  sort_order?: number;
  status?: VideoStatus;
}

export interface PaginatedVideos {
  data: Video[];
  total: number;
}

/* ─── YouTube oEmbed ────────────────────────────────────────────── */

export interface YouTubeMetadata {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

/**
 * Fetch video metadata from YouTube's public oEmbed API.
 * No API key required. In production, proxy through a server function
 * to avoid CORS issues; in dev, falls back gracefully.
 */
export async function fetchYouTubeOEmbed(youtubeUrl: string): Promise<YouTubeMetadata | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

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

/**
 * Format seconds into "MM:SS" or "H:MM:SS" display string.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function fetchPublishedVideos(page = 1, pageSize = 12): Promise<PaginatedVideos> {
  return mockFetchPublishedVideos(page, pageSize);
}

/* ─── Admin CRUD ────────────────────────────────────────────────── */

/** Fetch all videos (including drafts) for admin. */
export async function fetchAllVideos(
  page = 1,
  pageSize = 20,
  options?: { status?: VideoStatus; search?: string },
): Promise<PaginatedVideos> {
  // Admin reads still go to Supabase (until Phase 2 admin transition)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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

/** Fetch a single video by ID (admin — remains in Supabase until Phase 2). */
export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Video | null;
}

/** Create a new video. */
export async function createVideo(input: VideoInput): Promise<Video> {
  const { data, error } = await supabase.from("videos").insert(input as any).select().single();
  if (error) throw error;
  return data as Video;
}

/** Update an existing video. */
export async function updateVideo(id: string, input: Partial<VideoInput>): Promise<Video> {
  const { data, error } = await supabase
    .from("videos")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(input as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Video;
}

/** Delete a video. */
export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw error;
}

/** Get video stats for admin dashboard. */
export async function getVideoStats(): Promise<{
  total: number;
  published: number;
  draft: number;
}> {
  const db = supabase;

  const { count: total } = await db.from("videos").select("*", { count: "exact", head: true });
  const { count: published } = await db
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");
  const { count: draft } = await db
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft");

  return {
    total: total ?? 0,
    published: published ?? 0,
    draft: draft ?? 0,
  };
}
