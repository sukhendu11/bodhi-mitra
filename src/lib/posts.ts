import { supabase } from "@/integrations/supabase/client";
import { mockFetchPosts, mockFetchPostBySlug, mockFetchPostCounts } from "@/lib/mock-data";

export type PostCategory = string;

export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export async function fetchPosts(
  category?: PostCategory,
  page = 1,
  pageSize = 9,
  searchQuery?: string,
  categories?: string[],
): Promise<PaginatedResult<Post>> {
  return mockFetchPosts(category, page, pageSize, searchQuery, categories);
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  return mockFetchPostBySlug(slug);
}

/** Fetch a post by ID (admin). */
export async function fetchPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Post | null) ?? null;
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

export async function fetchPostCounts(
  categoryNames?: string[],
): Promise<Record<string, number>> {
  return mockFetchPostCounts();
}

import { slugifyPost as cmsSlugify } from "@/lib/cms-engine";

/** @deprecated Use slugifyPost from @/lib/cms-engine instead */
export function slugify(title: string): string {
  return cmsSlugify(title);
}
