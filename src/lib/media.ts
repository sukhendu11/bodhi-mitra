import { supabase } from "@/integrations/supabase/client";

export interface MediaAsset {
  id: string;
  url: string;
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  bucket: string;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MEDIA_BUCKETS = ["blog-images", "site-assets", "avatars", "book-covers"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

const db = () => supabase as any;

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
