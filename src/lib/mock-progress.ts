/**
 * Mock reading progress — M3 Reading & Engagement seam (ROADMAP.md).
 *
 * Mirrors the Supabase `reading_progress` table for the offline demo:
 * one row per (user × book) with last_page / total_pages and computed
 * progress_pct / completed. localStorage on the client, in-memory on
 * the server (server functions have no localStorage) — same pattern as
 * mock-cart.ts / mock-commerce.ts.
 *
 * Seeded state (ROADMAP §2.3): the demo user has started one of their
 * purchased books (~35%), so the library progress bars and reader
 * resume are demoable immediately.
 */
import { mockFetchBookById, mockFetchPublishedBooks } from "@/lib/mock-data";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

const STORE_KEY = "sabbe-satta-mock-progress";

export interface MockProgressRow {
  id: string;
  user_id: string;
  book_id: string;
  last_page: number;
  total_pages: number;
  progress_pct: number; // 0.00 - 100.00
  completed: boolean;
  started_at: string;
  updated_at: string;
}

/* ─── Store ────────────────────────────────────────────────────── */

const memoryStore: MockProgressRow[] = [];
let seedPromise: Promise<void> | null = null;

function readStore(): MockProgressRow[] {
  if (typeof window === "undefined") return [...memoryStore];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockProgressRow[];
  } catch {
    return [];
  }
}

function writeStore(rows: MockProgressRow[]) {
  if (typeof window === "undefined") {
    memoryStore.length = 0;
    memoryStore.push(...rows);
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function generateId() {
  return `progress-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Seed demo progress (ROADMAP §2.3: reading progress) ──────── */

function seedOnce(): Promise<void> {
  // Idempotent — re-seeds only when the demo user has no progress yet.
  const rows = readStore();
  const hasDemoProgress = rows.some((r) => r.user_id === DEMO_ACCOUNTS.user.id);
  if (!hasDemoProgress) seedPromise = null;
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

async function doSeed() {
  const rows = readStore();
  const hasDemoProgress = rows.some((r) => r.user_id === DEMO_ACCOUNTS.user.id);
  if (hasDemoProgress) return;

  const { data } = await mockFetchPublishedBooks(1, 100);
  const paid = data.filter((b) => !b.is_free);
  const startedBook = paid[0]; // the demo user's first purchase
  if (!startedBook) return;

  const now = new Date().toISOString();
  const totalPages = startedBook.pages || 320;
  const lastPage = Math.round(totalPages * 0.35);
  rows.push({
    id: generateId(),
    user_id: DEMO_ACCOUNTS.user.id,
    book_id: startedBook.id,
    last_page: lastPage,
    total_pages: totalPages,
    progress_pct: Math.round((lastPage / totalPages) * 10000) / 100,
    completed: false,
    started_at: now,
    updated_at: now,
  });
  writeStore(rows);
}

/* ─── Reads ────────────────────────────────────────────────────── */

/** Compute progress_pct / completed the same way the real service does. */
function computePct(lastPage: number, totalPages: number) {
  const progressPct =
    totalPages > 0 ? Math.min(100, Math.round((lastPage / totalPages) * 10000) / 100) : 0;
  return { progressPct, completed: progressPct >= 100 };
}

export async function mockGetProgress(
  userId: string | null | undefined,
  bookId: string,
): Promise<MockProgressRow | null> {
  if (!userId) return null;
  await seedOnce();
  const row = readStore().find((r) => r.user_id === userId && r.book_id === bookId);
  return row ? { ...row } : null;
}

/** All progress rows for a user, newest first (book info for joins). */
export async function mockGetUserProgress(
  userId: string,
): Promise<(MockProgressRow & { book_slug: string; book_title_en: string; book_title_bn: string })[]> {
  await seedOnce();
  return readStore()
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => {
      const book = mockFetchBookById(row.book_id);
      return {
        ...row,
        book_slug: book?.slug ?? "",
        book_title_en: book?.title_en ?? "",
        book_title_bn: book?.title_bn ?? "",
      };
    });
}

/* ─── Writes ───────────────────────────────────────────────────── */

export async function mockUpsertProgress(input: {
  userId: string;
  bookId: string;
  lastPage: number;
  totalPages?: number;
}): Promise<MockProgressRow> {
  await seedOnce();
  const rows = readStore();

  let total = input.totalPages ?? 0;
  if (total <= 0) total = mockFetchBookById(input.bookId)?.pages ?? 0;
  const { progressPct, completed } = computePct(input.lastPage, total);
  const now = new Date().toISOString();

  const existing = rows.find(
    (r) => r.user_id === input.userId && r.book_id === input.bookId,
  );
  if (existing) {
    existing.last_page = input.lastPage;
    existing.total_pages = total;
    existing.progress_pct = progressPct;
    existing.completed = completed;
    existing.updated_at = now;
    writeStore(rows);
    return { ...existing };
  }

  const row: MockProgressRow = {
    id: generateId(),
    user_id: input.userId,
    book_id: input.bookId,
    last_page: input.lastPage,
    total_pages: total,
    progress_pct: progressPct,
    completed,
    started_at: now,
    updated_at: now,
  };
  rows.push(row);
  writeStore(rows);
  return { ...row };
}

export async function mockMarkBookCompleted(
  userId: string,
  bookId: string,
): Promise<MockProgressRow> {
  const total = mockFetchBookById(bookId)?.pages ?? 1;
  return mockUpsertProgress({ userId, bookId, lastPage: total, totalPages: total });
}

export async function mockDeleteProgress(userId: string, bookId: string): Promise<void> {
  await seedOnce();
  writeStore(readStore().filter((r) => !(r.user_id === userId && r.book_id === bookId)));
}
