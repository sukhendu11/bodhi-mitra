/**
 * Strapi API Client for Sabbe Satta
 *
 * Provides typed functions to interact with Strapi REST API.
 * Used for all content reads (posts, books, pages, videos, courses, etc.).
 * App data (purchases, cart, progress, bookmarks, ratings, etc.) remains
 * in Supabase only — no user-specific Strapi endpoints exist.
 */

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = import.meta.env.VITE_STRAPI_API_TOKEN || "";

/**
 * Strapi API fetch for public content reads.
 * Uses the static STRAPI_TOKEN (API token with read permissions).
 */
async function strapiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${STRAPI_URL}/api${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (STRAPI_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  }

  const res = await fetch(url, {
    headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Strapi API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Build query string for Strapi v5 filters */
function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (key === "page") {
      parts.push(`pagination[page]=${encodeURIComponent(value)}`);
    } else if (key === "pageSize") {
      parts.push(`pagination[pageSize]=${encodeURIComponent(value)}`);
    } else if (key === "sort") {
      parts.push(`sort=${encodeURIComponent(value)}`);
    } else if (key === "search") {
      // Strapi v5 $containsInsensitive filter
      parts.push(`filters[$and][0][$or][0][title_en][$containsInsensitive]=${encodeURIComponent(value)}`);
      parts.push(`filters[$and][0][$or][1][title_bn][$containsInsensitive]=${encodeURIComponent(value)}`);
    } else if (key.startsWith("filter_")) {
      // Custom filters like filter_featured=true becomes filters[featured][$eq]=true
      const filterKey = key.replace("filter_", "");
      parts.push(`filters[${filterKey}][$eq]=${encodeURIComponent(value)}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length > 0 ? `&${parts.join("&")}` : "";
}

/* ─── Types ─────────────────────────────────────────────────────── */

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiItem {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiMedia {
  id: number;
  name: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
}

/* ─── Content Type Interfaces ───────────────────────────────────── */

export interface Post extends StrapiItem {
  title_en: string;
  title_bn?: string;
  slug: string;
  content_en?: unknown[];
  content_bn?: unknown[];
  excerpt_en?: string;
  excerpt_bn?: string;
  cover_image?: StrapiMedia;
  author?: string;
  categories?: Category[];
  tags?: Tag[];
  seo_title?: string;
  seo_description?: string;
  reading_time?: number;
  featured?: boolean;
  sort_order?: number;
  publishedAt?: string;
}

export interface Book extends StrapiItem {
  title_en: string;
  title_bn?: string;
  slug: string;
  description_en?: unknown[];
  description_bn?: unknown[];
  author_name?: string;
  cover_image?: StrapiMedia;
  pdf_file?: StrapiMedia;
  price?: number;
  currency?: string;
  is_free?: boolean;
  book_status?: "draft" | "published" | "archived";
  rating?: number;
  rating_count?: number;
  featured?: boolean;
  sort_order?: number;
  categories?: Category[];
  tags?: Tag[];
  seo_title?: string;
  seo_description?: string;
  publishedAt?: string;
}

export interface Page extends StrapiItem {
  title_en: string;
  title_bn?: string;
  slug: string;
  content_en?: unknown[];
  content_bn?: unknown[];
  sections?: any;
  banner_url?: string;
  visible?: boolean;
  sort_order?: number;
  seo_title?: string;
  seo_description?: string;
  publishedAt?: string;
}

export interface Video extends StrapiItem {
  title_en: string;
  title_bn?: string;
  slug?: string;
  description_en?: string;
  description_bn?: string;
  embed_url: string;
  thumbnail?: StrapiMedia;
  duration?: number;
  sort_order?: number;
  publishedAt?: string;
}

export interface Course extends StrapiItem {
  title_en: string;
  title_bn?: string;
  slug: string;
  description_en?: unknown[];
  description_bn?: unknown[];
  cover_image?: StrapiMedia;
  price?: number;
  is_free?: boolean;
  course_status?: "draft" | "published" | "archived";
  sort_order?: number;
  lessons?: any;
  publishedAt?: string;
}

export interface StrapiComment extends StrapiItem {
  content: string;
  author_name: string;
  author_email?: string;
  parent?: { id: number; documentId: string };
  children?: StrapiComment[];
  status?: "pending" | "approved" | "rejected";
}

export interface StrapiNavItem extends StrapiItem {
  title_en: string;
  title_bn?: string;
  url: string;
  type: "internal" | "external" | "dropdown";
  target?: string;
  parent?: { id: number; documentId: string };
  children?: StrapiNavItem[];
  location?: "header" | "footer";
  visible?: boolean;
  sort_order?: number;
}

export interface Category extends StrapiItem {
  name_en: string;
  name_bn?: string;
  slug: string;
  description_en?: string;
  description_bn?: string;
  color?: string;
  visible?: boolean;
  sort_order?: number;
}

export interface Tag extends StrapiItem {
  name_en: string;
  name_bn?: string;
  slug: string;
  color?: string;
}

export interface SiteSettings extends StrapiItem {
  site_name?: string;
  site_name_bn?: string;
  site_tagline_en?: string;
  site_tagline_bn?: string;
  logo?: StrapiMedia;
  favicon?: StrapiMedia;
  accent_color?: string;
  dark_mode?: boolean;
  maintenance_mode?: boolean;
  maintenance_message_en?: string;
  maintenance_message_bn?: string;
  meta_title?: string;
  meta_description?: string;
  og_image?: StrapiMedia;
  google_analytics_id?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_youtube?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  config?: any;
}

/* ─── Posts ─────────────────────────────────────────────────────── */

export interface PostFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  search?: string;
  locale?: string;
}

export async function getPosts(filters?: PostFilters): Promise<StrapiResponse<Post[]>> {
  const { page = 1, pageSize = 10, sort = "publishedAt:desc" } = filters || {};
  let endpoint = `/posts?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}&populate=*`;

  if (filters?.featured) endpoint += "&filters[featured][$eq]=true";
  if (filters?.category) endpoint += `&filters[categories][slug][$eq]=${encodeURIComponent(filters.category)}`;
  if (filters?.tag) endpoint += `&filters[tags][slug][$eq]=${encodeURIComponent(filters.tag)}`;
  if (filters?.search) {
    const q = encodeURIComponent(filters.search);
    endpoint += `&filters[$or][0][title_en][$containsInsensitive]=${q}&filters[$or][1][title_bn][$containsInsensitive]=${q}&filters[$or][2][excerpt_en][$containsInsensitive]=${q}&filters[$or][3][excerpt_bn][$containsInsensitive]=${q}`;
  }

  return strapiFetch(endpoint);
}

export async function getPostBySlug(slug: string): Promise<StrapiResponse<Post[]>> {
  return strapiFetch(`/posts?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

export async function getPostById(id: number): Promise<StrapiResponse<Post>> {
  return strapiFetch(`/posts/${id}?populate=*`);
}

/* ─── Books ─────────────────────────────────────────────────────── */

export interface BookFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  featured?: boolean;
  categorySlug?: string;
  search?: string;
  locale?: string;
}

export async function getBooks(filters?: BookFilters): Promise<StrapiResponse<Book[]>> {
  const { page = 1, pageSize = 12, sort = "sort_order:asc" } = filters || {};
  let endpoint = `/books?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}&populate=*`;

  if (filters?.featured) endpoint += "&filters[featured][$eq]=true";
  if (filters?.categorySlug) endpoint += `&filters[categories][slug][$eq]=${encodeURIComponent(filters.categorySlug)}`;
  if (filters?.search) {
    const q = encodeURIComponent(filters.search);
    endpoint += `&filters[$or][0][title_en][$containsInsensitive]=${q}&filters[$or][1][title_bn][$containsInsensitive]=${q}&filters[$or][2][description_en][$containsInsensitive]=${q}&filters[$or][3][description_bn][$containsInsensitive]=${q}`;
  }

  return strapiFetch(endpoint);
}

export async function getBookBySlug(slug: string): Promise<StrapiResponse<Book[]>> {
  return strapiFetch(`/books?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

export async function getBookById(id: number): Promise<StrapiResponse<Book>> {
  return strapiFetch(`/books/${id}?populate=*`);
}

export async function getFeaturedBooks(): Promise<StrapiResponse<Book[]>> {
  return strapiFetch("/books?filters[featured][$eq]=true&populate=*");
}

/* ─── Pages ─────────────────────────────────────────────────────── */

export interface PageFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  visible?: boolean;
  search?: string;
}

export async function getPages(filters?: PageFilters): Promise<StrapiResponse<Page[]>> {
  const { page = 1, pageSize = 20, sort = "sort_order:asc" } = filters || {};
  let endpoint = `/pages?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}&populate=*`;

  if (filters?.visible !== undefined) endpoint += `&filters[visible][$eq]=${filters.visible}`;
  if (filters?.search) {
    const q = encodeURIComponent(filters.search);
    endpoint += `&filters[$or][0][title_en][$containsInsensitive]=${q}&filters[$or][1][title_bn][$containsInsensitive]=${q}`;
  }

  return strapiFetch(endpoint);
}

export async function getPageBySlug(slug: string): Promise<StrapiResponse<Page[]>> {
  return strapiFetch(`/pages?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

export async function getPageById(id: number): Promise<StrapiResponse<Page>> {
  return strapiFetch(`/pages/${id}?populate=*`);
}

/* ─── Videos ────────────────────────────────────────────────────── */

export interface VideoFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
}

export async function getVideos(filters?: VideoFilters): Promise<StrapiResponse<Video[]>> {
  const { page = 1, pageSize = 12, sort = "sort_order:asc" } = filters || {};
  let endpoint = `/videos?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}&populate=*`;

  if (filters?.search) {
    const q = encodeURIComponent(filters.search);
    endpoint += `&filters[$or][0][title_en][$containsInsensitive]=${q}&filters[$or][1][title_bn][$containsInsensitive]=${q}`;
  }

  return strapiFetch(endpoint);
}

export async function getVideoBySlug(slug: string): Promise<StrapiResponse<Video[]>> {
  return strapiFetch(`/videos?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

export async function getVideoById(id: number): Promise<StrapiResponse<Video>> {
  return strapiFetch(`/videos/${id}?populate=*`);
}

/* ─── Courses ───────────────────────────────────────────────────── */

export interface CourseFilters {
  page?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
}

export async function getCourses(filters?: CourseFilters): Promise<StrapiResponse<Course[]>> {
  const { page = 1, pageSize = 12, sort = "sort_order:asc" } = filters || {};
  let endpoint = `/courses?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}&populate=*`;

  if (filters?.search) {
    const q = encodeURIComponent(filters.search);
    endpoint += `&filters[$or][0][title_en][$containsInsensitive]=${q}&filters[$or][1][title_bn][$containsInsensitive]=${q}`;
  }

  return strapiFetch(endpoint);
}

export async function getCourseBySlug(slug: string): Promise<StrapiResponse<Course[]>> {
  return strapiFetch(`/courses?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
}

export async function getCourseById(id: number): Promise<StrapiResponse<Course>> {
  return strapiFetch(`/courses/${id}?populate=*`);
}

/* ─── Categories & Tags ─────────────────────────────────────────── */

export interface CategoryFilters {
  sort?: string;
  visible?: boolean;
}

export async function getCategories(filters?: CategoryFilters): Promise<StrapiResponse<Category[]>> {
  const sort = filters?.sort || "sort_order:asc";
  let endpoint = `/categories?sort=${sort}&populate=*`;
  if (filters?.visible !== undefined) endpoint += `&filters[visible][$eq]=${filters.visible}`;
  return strapiFetch(endpoint);
}

export async function getTags(sort?: string): Promise<StrapiResponse<Tag[]>> {
  return strapiFetch(`/tags?sort=${sort || "name_en:asc"}`);
}

/* ─── Navigation (Public Reads) ─────────────────────────────────── */

export async function getNavItems(location?: "header" | "footer"): Promise<StrapiResponse<StrapiNavItem[]>> {
  let endpoint = "/navigations?sort=sort_order:asc&populate=*";
  if (location) endpoint += `&filters[location][$eq]=${location}`;
  return strapiFetch(endpoint);
}

/* ─── Comments (Public Reads) ───────────────────────────────────── */

export async function getComments(filters?: {
  contentId?: string;
  status?: string;
  sort?: string;
}): Promise<StrapiResponse<StrapiComment[]>> {
  let endpoint = "/comments?sort=createdAt:asc&populate[children][populate]=*";
  if (filters?.status) endpoint += `&filters[status][$eq]=${filters.status}`;
  return strapiFetch(endpoint);
}

/* ─── Site Settings ─────────────────────────────────────────────── */

export async function getSiteSettings(): Promise<StrapiResponse<SiteSettings>> {
  return strapiFetch("/sitesetting?populate=*");
}

/* ─── Media Upload ──────────────────────────────────────────────── */

export async function uploadMedia(
  file: File,
  folder?: string
): Promise<StrapiResponse<StrapiMedia>> {
  const formData = new FormData();
  formData.append("files", file);
  if (folder) formData.append("folder", folder);

  const url = `${STRAPI_URL}/api/upload`;
  const headers: Record<string, string> = {};
  if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}
