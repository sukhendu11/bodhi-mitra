/**
 * Reading History — mock-first seam for "Recent Books" + "Reading History".
 *
 * Mock mode records every reading session as an append-only event row in
 * localStorage (client) / an in-memory array (server functions have no
 * localStorage) — the same pattern as mock-progress.ts / mock-cart.ts.
 *
 * Real mode: the Supabase `reading_progress` table already tracks the last
 * read position per (user × book) with timestamps, so history/recent books
 * are derived from `getUserProgress` (books-progress.ts) instead of a new
 * table. The reader records sessions through `recordReadingSession`, which
 * is a no-op in real mode.
 */
import { isMockMode } from "@/lib/data-source";
import { mockFetchBookById } from "@/lib/mock-data";
import { getUserProgress } from "@/lib/books-progress";

export interface ReadingHistoryEntry {
  id: string;
  userId: string;
  bookId: string;
  page: number;
  totalPages: number;
  progressPct: number; // 0–100
  timestamp: string;
}

export interface ReadingHistoryBook {
  entry: ReadingHistoryEntry;
  book: {
    id: string;
    slug: string;
    title_en: string;
    title_bn: string;
    cover_image: string;
  } | null;
}

const STORE_KEY = "sabbe-satta-reading-history";
const MAX_ENTRIES = 200;

/* ─── Store ────────────────────────────────────────────────────── */

const memoryStore: ReadingHistoryEntry[] = [];

function readStore(): ReadingHistoryEntry[] {
  if (typeof window === "undefined") return [...memoryStore];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ReadingHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStore(rows: ReadingHistoryEntry[]) {
  if (typeof window === "undefined") {
    memoryStore.length = 0;
    memoryStore.push(...rows);
    return;
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rows));
  } catch {
    // Storage full / private mode — degrade silently
  }
}

function generateId() {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function bookInfo(bookId: string) {
  const b = mockFetchBookById(bookId);
  return b
    ? {
        id: b.id,
        slug: b.slug,
        title_en: b.title_en,
        title_bn: b.title_bn,
        cover_image: b.cover_image,
      }
    : null;
}

/* ─── Writes ───────────────────────────────────────────────────── */

/** Remove all history rows for a user (used by the demo re-seed). */
export async function clearHistoryRows(userId: string): Promise<void> {
  writeStore(readStore().filter((r) => r.userId !== userId));
}

/**
 * Record a reading session. Debounced by callers (the reader already
 * debounces progress saves). No-op in real mode — history is derived
 * from `reading_progress` there.
 */
export async function recordReadingSession(input: {
  userId?: string | null;
  bookId: string;
  page: number;
  totalPages: number;
  /** Optional explicit timestamp (the demo seed backdates its sessions). */
  timestamp?: string;
}): Promise<void> {
  if (!input.userId || !input.bookId) return;
  if (!isMockMode()) return;
  const rows = readStore();
  rows.push({
    id: generateId(),
    userId: input.userId,
    bookId: input.bookId,
    page: input.page,
    totalPages: input.totalPages,
    progressPct:
      input.totalPages > 0
        ? Math.min(100, Math.round((input.page / input.totalPages) * 100))
        : 0,
    timestamp: input.timestamp ?? new Date().toISOString(),
  });
  writeStore(rows.slice(-MAX_ENTRIES));
}

/* ─── Reads ────────────────────────────────────────────────────── */

/** Raw session rows for a user, oldest first (used by reading-stats). */
export async function getAllHistoryRows(
  userId: string | null | undefined,
): Promise<ReadingHistoryEntry[]> {
  if (!userId) return [];
  return readStore()
    .filter((r) => r.userId === userId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Recently read books — one entry per book, most recent first. */
export async function getRecentBooks(
  userId: string | null | undefined,
  limit = 6,
): Promise<ReadingHistoryBook[]> {
  if (!userId) return [];
  if (!isMockMode()) {
    const rows = await getUserProgress(userId);
    return rows.slice(0, limit).map((row) => ({
      entry: {
        id: row.id ?? `progress-${row.book_id}`,
        userId,
        bookId: row.book_id,
        page: row.last_page,
        totalPages: row.total_pages,
        progressPct: row.progress_pct,
        timestamp: row.updated_at ?? new Date().toISOString(),
      },
      book: {
        id: row.book_id,
        slug: row.book_slug ?? "",
        title_en: row.book_title_en ?? "",
        title_bn: row.book_title_bn ?? "",
        cover_image: "",
      },
    }));
  }

  const rows = readStore().filter((r) => r.userId === userId);
  // Latest entry per book (store is append-only, so the last one wins)
  const latest = new Map<string, ReadingHistoryEntry>();
  for (const r of rows) latest.set(r.bookId, r);
  return [...latest.values()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
    .map((entry) => ({ entry, book: bookInfo(entry.bookId) }));
}

/** Full reading history timeline, newest first. */
export async function getReadingHistory(
  userId: string | null | undefined,
  limit = 50,
): Promise<ReadingHistoryBook[]> {
  if (!userId) return [];
  if (!isMockMode()) {
    const rows = await getUserProgress(userId);
    return rows.slice(0, limit).map((row) => ({
      entry: {
        id: row.id ?? `progress-${row.book_id}`,
        userId,
        bookId: row.book_id,
        page: row.last_page,
        totalPages: row.total_pages,
        progressPct: row.progress_pct,
        timestamp: row.updated_at ?? new Date().toISOString(),
      },
      book: {
        id: row.book_id,
        slug: row.book_slug ?? "",
        title_en: row.book_title_en ?? "",
        title_bn: row.book_title_bn ?? "",
        cover_image: "",
      },
    }));
  }

  return readStore()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
    .map((entry) => ({ entry, book: bookInfo(entry.bookId) }));
}
