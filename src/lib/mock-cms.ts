/**
 * Mock CMS content store — M5 Mock Admin Panel seam (ROADMAP.md).
 *
 * Mirrors admin CRUD over the static mock content layer: create / edit /
 * delete books, posts, and videos. `mock-data.ts` applies these overrides
 * inside its fetch functions, so admin edits reflect on public pages
 * immediately (books grid, post pages, videos hub).
 *
 * localStorage on the client, in-memory on the server (server functions
 * have no localStorage) — same pattern as mock-commerce.ts. Writes
 * dispatch a custom event so open admin views can re-read.
 */
import type { Book } from "@/lib/books";
import type { Post } from "@/lib/posts";
import type { Video } from "@/lib/videos";

const STORE_KEY = "sabbe-satta-mock-cms";
/** Custom window event fired on CMS writes (same-tab reactivity). */
export const MOCK_CMS_EVENT = "sabbe-satta:mock-cms-change";

export interface MockCmsStore {
  /** Upserts keyed by id — edited rows override base, new rows are added. */
  books: Record<string, Book>;
  deletedBookIds: string[];
  posts: Record<string, Post>;
  deletedPostIds: string[];
  videos: Record<string, Video>;
  deletedVideoIds: string[];
}

function emptyStore(): MockCmsStore {
  return {
    books: {},
    deletedBookIds: [],
    posts: {},
    deletedPostIds: [],
    videos: {},
    deletedVideoIds: [],
  };
}

const memoryStore: MockCmsStore = emptyStore();

function readStore(): MockCmsStore {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    return JSON.parse(raw) as MockCmsStore;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: MockCmsStore) {
  if (typeof window === "undefined") {
    memoryStore.books = store.books;
    memoryStore.deletedBookIds = store.deletedBookIds;
    memoryStore.posts = store.posts;
    memoryStore.deletedPostIds = store.deletedPostIds;
    memoryStore.videos = store.videos;
    memoryStore.deletedVideoIds = store.deletedVideoIds;
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(MOCK_CMS_EVENT));
}

/** Reset all overrides (test seam / "reset demo data"). */
export function mockClearCms() {
  writeStore(emptyStore());
}

function genId(prefix: string) {
  return `${prefix}-admin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ─── Apply overrides (consumed by mock-data.ts) ─────────────────── */

export function mockApplyBookOverrides(base: Book[]): Book[] {
  const s = readStore();
  const kept = base.filter((b) => !s.deletedBookIds.includes(b.id));
  const merged = kept.map((b) => (s.books[b.id] ? { ...b, ...s.books[b.id] } : b));
  const created = Object.values(s.books).filter((b) => !base.some((x) => x.id === b.id));
  return [...merged, ...created];
}

export function mockApplyPostOverrides(base: Post[]): Post[] {
  const s = readStore();
  const kept = base.filter((p) => !s.deletedPostIds.includes(p.id));
  const merged = kept.map((p) => (s.posts[p.id] ? { ...p, ...s.posts[p.id] } : p));
  const created = Object.values(s.posts).filter((p) => !base.some((x) => x.id === p.id));
  return [...merged, ...created];
}

export function mockApplyVideoOverrides(base: Video[]): Video[] {
  const s = readStore();
  const kept = base.filter((v) => !s.deletedVideoIds.includes(v.id));
  const merged = kept.map((v) => (s.videos[v.id] ? { ...v, ...s.videos[v.id] } : v));
  const created = Object.values(s.videos).filter((v) => !base.some((x) => x.id === v.id));
  return [...merged, ...created];
}

/* ─── Books CRUD ─────────────────────────────────────────────────── */

export function mockNewBook(input: Partial<Book> & { title_en: string }): Book {
  const now = new Date().toISOString();
  return {
    id: genId("book"),
    slug: slugify(input.title_en) || `book-${Date.now()}`,
    title_en: input.title_en,
    title_bn: input.title_bn || input.title_en,
    author_name: input.author_name || "Sabbe Satta",
    description_en: input.description_en || "",
    description_bn: input.description_bn || "",
    cover_image: input.cover_image || "",
    pdf_url: input.pdf_url || "",
    pdf_file_size: input.pdf_file_size || 0,
    price: input.price ?? 0,
    is_free: input.is_free ?? false,
    pages: input.pages || 0,
    isbn: input.isbn || "",
    status: input.status || "published",
    featured: input.featured ?? false,
    tags: input.tags || [],
    category: input.category || "Meditation",
    meta_description_en: input.meta_description_en || "",
    meta_description_bn: input.meta_description_bn || "",
    sort_order: input.sort_order ?? 999,
    avg_rating: input.avg_rating ?? 0,
    total_ratings: input.total_ratings ?? 0,
    created_at: now,
    updated_at: now,
  };
}

export function mockUpsertBook(book: Book): Book {
  const s = readStore();
  const next = { ...book, updated_at: new Date().toISOString() };
  s.books = { ...s.books, [next.id]: next };
  s.deletedBookIds = s.deletedBookIds.filter((id) => id !== next.id);
  writeStore(s);
  return next;
}

export function mockDeleteBook(id: string): void {
  const s = readStore();
  s.deletedBookIds = [...new Set([...s.deletedBookIds, id])];
  const rest = { ...s.books };
  delete rest[id];
  s.books = rest;
  writeStore(s);
}

/* ─── Posts CRUD ─────────────────────────────────────────────────── */

export function mockNewPost(input: Partial<Post> & { title_en: string }): Post {
  const now = new Date().toISOString();
  return {
    id: genId("post"),
    title: input.title_en,
    content: input.content_en || null,
    excerpt: input.excerpt_en || null,
    title_en: input.title_en,
    title_bn: input.title_bn || input.title_en,
    content_en: input.content_en || null,
    content_bn: input.content_bn || null,
    excerpt_en: input.excerpt_en || null,
    excerpt_bn: input.excerpt_bn || null,
    slug: slugify(input.title_en) || `post-${Date.now()}`,
    cover_image: input.cover_image || null,
    category: input.category || "Meditation",
    author_name: input.author_name || "Sabbe Satta",
    author_image: input.author_image || null,
    status: input.status || "published",
    tags: input.tags || [],
    created_at: now,
  };
}

export function mockUpsertPost(post: Post): Post {
  const s = readStore();
  s.posts = { ...s.posts, [post.id]: post };
  s.deletedPostIds = s.deletedPostIds.filter((id) => id !== post.id);
  writeStore(s);
  return post;
}

export function mockDeletePost(id: string): void {
  const s = readStore();
  s.deletedPostIds = [...new Set([...s.deletedPostIds, id])];
  const rest = { ...s.posts };
  delete rest[id];
  s.posts = rest;
  writeStore(s);
}

/* ─── Videos CRUD ────────────────────────────────────────────────── */

export function mockNewVideo(input: Partial<Video> & { title: string }): Video {
  const now = new Date().toISOString();
  return {
    id: genId("video"),
    title: input.title,
    description: input.description || "",
    title_en: input.title_en || input.title,
    title_bn: input.title_bn || input.title,
    description_en: input.description_en || input.description || "",
    description_bn: input.description_bn || "",
    thumbnail_url:
      input.thumbnail_url ||
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=640&h=360&fit=crop&auto=format",
    youtube_url: input.youtube_url || "",
    duration: input.duration || 0,
    category: input.category || "Meditation",
    sort_order: input.sort_order ?? 999,
    status: input.status || "published",
    created_at: now,
    updated_at: now,
  };
}

export function mockUpsertVideo(video: Video): Video {
  const s = readStore();
  const next = { ...video, updated_at: new Date().toISOString() };
  s.videos = { ...s.videos, [next.id]: next };
  s.deletedVideoIds = s.deletedVideoIds.filter((id) => id !== next.id);
  writeStore(s);
  return next;
}

export function mockDeleteVideo(id: string): void {
  const s = readStore();
  s.deletedVideoIds = [...new Set([...s.deletedVideoIds, id])];
  const rest = { ...s.videos };
  delete rest[id];
  s.videos = rest;
  writeStore(s);
}
