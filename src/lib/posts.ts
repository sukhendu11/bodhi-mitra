import { supabase } from "@/integrations/supabase/client";

export type PostCategory = "Buddhist Psychology" | "Wisdom" | "Books";
export const POST_CATEGORIES: PostCategory[] = ["Buddhist Psychology", "Wisdom", "Books"];

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  // Legacy single-language fields (kept for back-compat, may be empty for new posts)
  title: string | null;
  content: string | null;
  excerpt: string | null;
  // Bilingual fields (preferred)
  title_en: string | null;
  title_bn: string | null;
  content_en: string | null;
  content_bn: string | null;
  excerpt_en: string | null;
  excerpt_bn: string | null;
  slug: string;
  cover_image: string | null;
  category: PostCategory;
  author_name: string;
  author_image: string | null;
  status: PostStatus;
  tags: string[];
  created_at: string;
}

export interface PostInput {
  title_en: string;
  title_bn: string;
  content_en: string;
  content_bn: string;
  excerpt_en: string | null;
  excerpt_bn: string | null;
  slug: string;
  cover_image: string | null;
  category: PostCategory;
  author_name: string;
  author_image: string | null;
  status: PostStatus;
  tags: string[];
}


/** Build the row to send to Supabase. Mirrors EN into legacy `title`/`content`/`excerpt`
 *  so anything still reading the old columns keeps working. */
function toRow(input: Partial<PostInput>) {
  return {
    ...input,
    ...(input.title_en !== undefined ? { title: input.title_en } : {}),
    ...(input.content_en !== undefined ? { content: input.content_en } : {}),
    ...(input.excerpt_en !== undefined ? { excerpt: input.excerpt_en } : {}),
  };
}


export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export async function fetchPosts(category?: PostCategory, page = 1, pageSize = 9, searchQuery?: string): Promise<PaginatedResult<Post>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (category) query = query.eq("category", category);
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().replace(/[%_]/g, "");
    if (q) {
      // Use `*` wildcard (PostgREST-native) instead of `%` to avoid URL-encoding issues
      query = query.or(`title_en.ilike.*${q}*,title_bn.ilike.*${q}*,category.ilike.*${q}*,excerpt_en.ilike.*${q}*,excerpt_bn.ilike.*${q}*`);
    }
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as unknown as Post[], total: count ?? 0 };
}

export async function fetchAllPostsAdmin(category?: PostCategory, page = 1, pageSize = 20): Promise<PaginatedResult<Post>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (category) query = query.eq("category", category);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as unknown as Post[], total: count ?? 0 };
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Post | null) ?? null;
}

export async function fetchPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Post | null) ?? null;
}

export async function createPost(input: PostInput): Promise<Post> {
  const row = toRow(input) as never;
  const { data, error } = await supabase.from("posts").insert(row).select().single();
  if (error) throw error;
  return data as unknown as Post;
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<Post> {
  const row = toRow(input) as never;
  const { data, error } = await supabase.from("posts").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data as unknown as Post;
}


export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadCoverImage(file: File): Promise<string> {
  // Try R2 via dynamic import (avoids forcing R2 as dependency in this module)
  try {
    const { checkR2Available } = await import("@/lib/r2-functions");
    const isAvailable = await checkR2Available();
    if (isAvailable.available) {
      const { getPresignedUploadUrl } = await import("@/lib/r2-functions");
      const { presignedUrl, publicUrl, key } = await getPresignedUploadUrl({
        data: { prefix: "post-covers", filename: file.name, contentType: file.type || "image/jpeg" },
      });
      // Upload directly to R2 via presigned URL
      const response = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!response.ok) throw new Error(`R2 upload failed: ${response.status}`);
      return publicUrl;
    }
  } catch {}

  // Fallback to Supabase Storage
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("blog-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
