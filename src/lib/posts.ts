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


export async function fetchPosts(category?: PostCategory): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function fetchAllPostsAdmin(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
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
