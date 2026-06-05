import { supabase } from "@/integrations/supabase/client";

export interface Page {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  header_en: string;
  header_bn: string;
  body_en: string;
  body_bn: string;
  banner_url: string;
  meta_description_en: string;
  meta_description_bn: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PageInput {
  slug: string;
  title_en: string;
  title_bn: string;
  header_en?: string;
  header_bn?: string;
  body_en?: string;
  body_bn?: string;
  banner_url?: string;
  meta_description_en?: string;
  meta_description_bn?: string;
  visible?: boolean;
  sort_order?: number;
}

/** Fetch all visible pages (for public display). */
export async function fetchPublicPages(): Promise<Page[]> {
  const { data, error } = await (supabase as any)
    .from("pages")
    .select("*")
    .eq("visible", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Page[];
}

/** Fetch all pages for admin (including hidden). */
export async function fetchAllPages(page = 1, pageSize = 50): Promise<{ data: Page[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await (supabase as any)
    .from("pages")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as Page[], total: count ?? 0 };
}

/** Fetch a single page by slug. */
export async function fetchPageBySlug(slug: string): Promise<Page | null> {
  const { data, error } = await (supabase as any)
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Page | null;
}

/** Fetch a single page by ID. */
export async function fetchPageById(id: string): Promise<Page | null> {
  const { data, error } = await (supabase as any)
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Page | null;
}

/** Create a new page. */
export async function createPage(input: PageInput): Promise<Page> {
  const { data, error } = await (supabase as any)
    .from("pages")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Page;
}

/** Update an existing page. */
export async function updatePage(id: string, input: Partial<PageInput>): Promise<Page> {
  const { data, error } = await (supabase as any)
    .from("pages")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Page;
}

/** Delete a page. */
export async function deletePage(id: string): Promise<void> {
  const { error } = await (supabase as any).from("pages").delete().eq("id", id);
  if (error) throw error;
}

/** Slugify a title into a URL-friendly slug. */
export function slugifyPage(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
