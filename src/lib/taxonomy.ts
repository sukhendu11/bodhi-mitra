import { supabase } from "@/integrations/supabase/client";

// ─── Categories ───────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  icon: string;
  color: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  slug: string;
  name_en: string;
  name_bn?: string;
  description_en?: string;
  description_bn?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  visible?: boolean;
}

const db = () => supabase as any;

/** Fetch all visible categories for public display. */
export async function fetchVisibleCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .eq("visible", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

/** Fetch all categories for admin (including hidden). */
export async function fetchAllCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

/** Fetch a single category by slug. */
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Category | null;
}

/** Create a category. */
export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await db()
    .from("categories")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

/** Update a category. */
export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data, error } = await db()
    .from("categories")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

/** Delete a category. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ─── Tags ─────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  color: string;
  created_at: string;
}

export interface TagInput {
  slug: string;
  name_en: string;
  name_bn?: string;
  color?: string;
}

/** Fetch all tags. */
export async function fetchAllTags(): Promise<Tag[]> {
  const { data, error } = await db()
    .from("tags")
    .select("*")
    .order("name_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Tag[];
}

/** Fetch a single tag by slug. */
export async function fetchTagBySlug(slug: string): Promise<Tag | null> {
  const { data, error } = await db()
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Tag | null;
}

/** Create a tag. */
export async function createTag(input: TagInput): Promise<Tag> {
  const { data, error } = await db()
    .from("tags")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

/** Update a tag. */
export async function updateTag(id: string, input: Partial<TagInput>): Promise<Tag> {
  const { data, error } = await db()
    .from("tags")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

/** Delete a tag. */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await db().from("tags").delete().eq("id", id);
  if (error) throw error;
}

/** Find or create a tag by name (for tag input fields). */
export async function findOrCreateTag(name: string): Promise<Tag> {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const existing = await fetchTagBySlug(slug);
  if (existing) return existing;

  return createTag({ slug, name_en: name.trim(), name_bn: name.trim() });
}

// ─── Content-Category/Tag Assignment ──────────────────────────────────────

export type ContentType = "post" | "book" | "page";

/** Get categories for a content item. */
export async function getContentCategories(
  contentId: string,
  contentType: ContentType,
): Promise<Category[]> {
  const { data, error } = await db()
    .from("content_categories")
    .select("category_id")
    .eq("content_id", contentId)
    .eq("content_type", contentType);
  if (error) throw error;
  if (!data?.length) return [];

  const categoryIds = data.map((r: { category_id: string }) => r.category_id);
  const { data: categories, error: catError } = await db()
    .from("categories")
    .select("*")
    .in("id", categoryIds);
  if (catError) throw catError;
  return (categories ?? []) as Category[];
}

/** Set categories for a content item (replaces all existing). */
export async function setContentCategories(
  contentId: string,
  contentType: ContentType,
  categoryIds: string[],
): Promise<void> {
  await db()
    .from("content_categories")
    .delete()
    .eq("content_id", contentId)
    .eq("content_type", contentType);

  if (!categoryIds.length) return;

  const rows = categoryIds.map((categoryId) => ({
    content_id: contentId,
    content_type: contentType,
    category_id: categoryId,
  }));
  const { error } = await db().from("content_categories").insert(rows);
  if (error) throw error;
}

/** Get tags for a content item. */
export async function getContentTags(
  contentId: string,
  contentType: ContentType,
): Promise<Tag[]> {
  const { data, error } = await db()
    .from("content_tags")
    .select("tag_id")
    .eq("content_id", contentId)
    .eq("content_type", contentType);
  if (error) throw error;
  if (!data?.length) return [];

  const tagIds = data.map((r: { tag_id: string }) => r.tag_id);
  const { data: tags, error: tagError } = await db()
    .from("tags")
    .select("*")
    .in("id", tagIds);
  if (tagError) throw tagError;
  return (tags ?? []) as Tag[];
}

/** Set tags for a content item (replaces all existing). */
export async function setContentTags(
  contentId: string,
  contentType: ContentType,
  tagIds: string[],
): Promise<void> {
  await db()
    .from("content_tags")
    .delete()
    .eq("content_id", contentId)
    .eq("content_type", contentType);

  if (!tagIds.length) return;

  const rows = tagIds.map((tagId) => ({
    content_id: contentId,
    content_type: contentType,
    tag_id: tagId,
  }));
  const { error } = await db().from("content_tags").insert(rows);
  if (error) throw error;
}

/** Slugify helper. */
export function slugifyTaxonomy(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
