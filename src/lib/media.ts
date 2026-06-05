import { supabase } from "@/integrations/supabase/client";

export interface MediaAsset {
  id: string;
  url: string;
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  bucket: string;
  storage_provider: string;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetInput {
  url: string;
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  bucket: string;
  storage_provider?: string;
  alt_text?: string;
}

export interface PaginatedMedia {
  data: MediaAsset[];
  total: number;
}

export const MEDIA_BUCKETS = ["blog-images", "site-assets", "avatars", "book-covers"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

const db = () => supabase as any;

/** Fetch media assets with pagination, search, and bucket filter. */
export async function fetchMediaAssets(
  page = 1,
  pageSize = 24,
  options?: { bucket?: string; search?: string; mimeType?: string },
): Promise<PaginatedMedia> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db()
    .from("media_assets")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.bucket) query = query.eq("bucket", options.bucket);
  if (options?.mimeType) query = query.eq("mime_type", options.mimeType);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.textSearch("search_vector", q, { config: "simple" });
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as MediaAsset[], total: count ?? 0 };
}

/** Get a single media asset by ID. */
export async function fetchMediaAsset(id: string): Promise<MediaAsset | null> {
  const { data, error } = await db()
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MediaAsset | null;
}

/** Insert a media asset record after upload. */
export async function addMediaAsset(input: MediaAssetInput): Promise<MediaAsset> {
  const { data, error } = await db()
    .from("media_assets")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

/** Update a media asset (alt text, etc.). */
export async function updateMediaAsset(id: string, patch: Partial<MediaAssetInput>): Promise<MediaAsset> {
  const { data, error } = await db()
    .from("media_assets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

/** Delete a media asset record AND its storage file. */
export async function deleteMediaAsset(id: string): Promise<void> {
  const asset = await fetchMediaAsset(id);
  if (!asset) throw new Error("Media asset not found");

  // Use the deterministic storage_provider column instead of heuristic detection
  if (asset.storage_provider === "r2") {
    // Try to clean from R2 (best-effort, non-blocking)
    try {
      const { deleteFile } = await import("@/lib/r2");
      await deleteFile(asset.path).catch(() => {});
    } catch {}
  } else {
    // Clean from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(asset.bucket)
      .remove([asset.path]);
    if (storageError) {
      console.warn("[media] Storage delete failed:", storageError.message);
    }
  }

  // Remove the database record
  const { error } = await db().from("media_assets").delete().eq("id", id);
  if (error) throw error;
}

/** Track an uploaded file in the media_assets table. */
export async function trackUpload(params: {
  url: string;
  path: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  bucket: string;
  storageProvider?: string;
  altText?: string;
}): Promise<MediaAsset> {
  return addMediaAsset({
    url: params.url,
    path: params.path,
    filename: params.filename,
    file_size: params.fileSize,
    mime_type: params.mimeType,
    bucket: params.bucket,
    storage_provider: params.storageProvider || "supabase",
    alt_text: params.altText,
  });
}

/** Get upload counts by bucket for the media dashboard. */
export async function getMediaStats(): Promise<{ bucket: string; count: number }[]> {
  const stats: { bucket: string; count: number }[] = [];
  for (const bucket of MEDIA_BUCKETS) {
    const { count, error } = await db()
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .eq("bucket", bucket);
    if (!error) stats.push({ bucket, count: count ?? 0 });
  }
  return stats;
}
