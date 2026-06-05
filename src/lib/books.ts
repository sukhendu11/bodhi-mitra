import { supabase } from "@/integrations/supabase/client";

export type BookStatus = "draft" | "published" | "archived";

export interface Book {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  author_name: string;
  description_en: string;
  description_bn: string;
  cover_image: string;
  pdf_url: string;
  pdf_file_size: number;
  price: number;
  is_free: boolean;
  pages: number;
  isbn: string;
  status: BookStatus;
  featured: boolean;
  tags: string[];
  category: string;
  meta_description_en: string;
  meta_description_bn: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  slug: string;
  title_en: string;
  title_bn: string;
  author_name?: string;
  description_en?: string;
  description_bn?: string;
  cover_image?: string;
  pdf_url?: string;
  pdf_file_size?: number;
  price?: number;
  is_free?: boolean;
  pages?: number;
  isbn?: string;
  status?: BookStatus;
  featured?: boolean;
  tags?: string[];
  category?: string;
  meta_description_en?: string;
  meta_description_bn?: string;
  sort_order?: number;
}

export interface PaginatedBooks {
  data: Book[];
  total: number;
}

/** Fetch published books for public display. */
export async function fetchPublishedBooks(
  page = 1,
  pageSize = 12,
  options?: { category?: string; featured?: boolean; search?: string },
): Promise<PaginatedBooks> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from("books")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.category) query = query.eq("category", options.category);
  if (options?.featured) query = query.eq("featured", true);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.or(`title_en.ilike.*${q}*,title_bn.ilike.*${q}*,description_en.ilike.*${q}*`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Book[], total: count ?? 0 };
}

/** Fetch all books for admin (including drafts/archived). */
export async function fetchAllBooks(
  page = 1,
  pageSize = 20,
  options?: { status?: BookStatus; category?: string; search?: string },
): Promise<PaginatedBooks> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from("books")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.status) query = query.eq("status", options.status);
  if (options?.category) query = query.eq("category", options.category);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.or(`title_en.ilike.*${q}*,title_bn.ilike.*${q}*,author_name.ilike.*${q}*`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Book[], total: count ?? 0 };
}

/** Fetch a single book by slug (public). */
export async function fetchBookBySlug(slug: string): Promise<Book | null> {
  const { data, error } = await (supabase as any)
    .from("books")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Book | null;
}

/** Fetch a single book by ID (admin). */
export async function fetchBookById(id: string): Promise<Book | null> {
  const { data, error } = await (supabase as any)
    .from("books")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Book | null;
}

/** Create a new book. */
export async function createBook(input: BookInput): Promise<Book> {
  const { data, error } = await (supabase as any)
    .from("books")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

/** Update an existing book. */
export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  const { data, error } = await (supabase as any)
    .from("books")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

/** Delete a book. */
export async function deleteBook(id: string): Promise<void> {
  const { error } = await (supabase as any).from("books").delete().eq("id", id);
  if (error) throw error;
}

/** Get books stats for admin dashboard. */
export async function getBookStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
  free: number;
}> {
  const db = supabase as any;

  const { count: total } = await db.from("books").select("*", { count: "exact", head: true });
  const { count: published } = await db.from("books").select("*", { count: "exact", head: true }).eq("status", "published");
  const { count: draft } = await db.from("books").select("*", { count: "exact", head: true }).eq("status", "draft");
  const { count: archived } = await db.from("books").select("*", { count: "exact", head: true }).eq("status", "archived");
  const { count: free } = await db.from("books").select("*", { count: "exact", head: true }).eq("is_free", true);

  return {
    total: total ?? 0,
    published: published ?? 0,
    draft: draft ?? 0,
    archived: archived ?? 0,
    free: free ?? 0,
  };
}

/** Slugify a book title. */
export function slugifyBook(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
