/**
 * Mock book ratings — M3 Reading & Engagement seam (ROADMAP.md).
 *
 * Mirrors the Supabase `book_ratings` table and the
 * `update_book_rating_aggregates()` trigger behavior in JS:
 *   - one rating row per (user × book), upsert on re-rate
 *   - `avg_rating` / `total_ratings` recomputed from the book's
 *     static community baseline + any stored user ratings, so the
 *     rating stars and breakdown move after the demo user rates.
 *
 * localStorage on the client, in-memory on the server — same pattern
 * as mock-cart.ts / mock-commerce.ts.
 *
 * Seeded state (ROADMAP §2.3): the demo user rated 2 of their
 * purchased books, so the books page shows their votes immediately.
 */
import { mockFetchBookById, mockFetchPublishedBooks } from "@/lib/mock-data";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";
import type { RatingAggregate } from "@/lib/books-ratings";

const STORE_KEY = "sabbe-satta-mock-ratings";

export interface MockBookRating {
  id: string;
  user_id: string;
  book_id: string;
  rating: number; // 1-5
  created_at: string;
  updated_at: string;
}

/* ─── Store ────────────────────────────────────────────────────── */

const memoryStore: MockBookRating[] = [];
let seedPromise: Promise<void> | null = null;

function readStore(): MockBookRating[] {
  if (typeof window === "undefined") return [...memoryStore];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockBookRating[];
  } catch {
    return [];
  }
}

function writeStore(rows: MockBookRating[]) {
  if (typeof window === "undefined") {
    memoryStore.length = 0;
    memoryStore.push(...rows);
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function generateId() {
  return `rating-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Seed demo ratings (ROADMAP §2.3: 2 ratings) ──────────────── */

function seedOnce(): Promise<void> {
  const rows = readStore();
  const hasDemoRatings = rows.some((r) => r.user_id === DEMO_ACCOUNTS.user.id);
  if (!hasDemoRatings) seedPromise = null;
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

async function doSeed() {
  const rows = readStore();
  const hasDemoRatings = rows.some((r) => r.user_id === DEMO_ACCOUNTS.user.id);
  if (hasDemoRatings) return;

  // Rate the demo user's purchased books (same picks as mock-commerce seed).
  const { data } = await mockFetchPublishedBooks(1, 100);
  const paid = data.filter((b) => !b.is_free).slice(0, 2);
  const seedRatings: [string, number][] = paid.map((b, i) => [b.id, i === 0 ? 5 : 4]);
  if (!seedRatings.length) return;

  const now = new Date().toISOString();
  for (const [bookId, rating] of seedRatings) {
    rows.push({
      id: generateId(),
      user_id: DEMO_ACCOUNTS.user.id,
      book_id: bookId,
      rating,
      created_at: now,
      updated_at: now,
    });
  }
  writeStore(rows);
}

/* ─── Aggregate computation (mirrors the DB trigger) ───────────── */

/**
 * Synthesize a plausible star distribution for the book's static
 * community baseline (avg_rating × total_ratings from mock data),
 * then layer stored user ratings on top.
 */
function computeAggregate(bookId: string, rows: MockBookRating[]): RatingAggregate {
  const book = mockFetchBookById(bookId);
  const baseAvg = Number(book?.avg_rating ?? 0);
  const baseTotal = Number(book?.total_ratings ?? 0);

  // Community baseline distribution: two adjacent buckets reproducing baseAvg.
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = baseAvg * baseTotal;
  let total = baseTotal;
  if (baseTotal > 0) {
    const low = Math.max(1, Math.min(5, Math.floor(baseAvg)));
    const high = Math.max(1, Math.min(5, Math.ceil(baseAvg)));
    if (low === high) {
      distribution[low] = baseTotal;
    } else {
      const frac = baseAvg - low;
      const highCount = Math.round(frac * baseTotal);
      distribution[high] = highCount;
      distribution[low] = baseTotal - highCount;
    }
  }

  for (const r of rows) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    sum += r.rating;
    total += 1;
  }

  return {
    avg_rating: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
    total_ratings: total,
    distribution,
  };
}

/* ─── Reads ────────────────────────────────────────────────────── */

export async function mockGetUserRating(
  userId: string | null | undefined,
  bookId: string,
): Promise<number | null> {
  if (!userId) return null;
  await seedOnce();
  return readStore().find((r) => r.user_id === userId && r.book_id === bookId)?.rating ?? null;
}

export async function mockGetRatingAggregates(bookId: string): Promise<RatingAggregate> {
  await seedOnce();
  const rows = readStore().filter((r) => r.book_id === bookId);
  return computeAggregate(bookId, rows);
}

/* ─── Writes ───────────────────────────────────────────────────── */

export async function mockSubmitRating(input: {
  userId: string;
  bookId: string;
  rating: number;
}): Promise<MockBookRating> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  await seedOnce();
  const rows = readStore();
  const now = new Date().toISOString();

  const existing = rows.find(
    (r) => r.user_id === input.userId && r.book_id === input.bookId,
  );
  if (existing) {
    existing.rating = input.rating;
    existing.updated_at = now;
    writeStore(rows);
    return { ...existing };
  }

  const row: MockBookRating = {
    id: generateId(),
    user_id: input.userId,
    book_id: input.bookId,
    rating: input.rating,
    created_at: now,
    updated_at: now,
  };
  rows.push(row);
  writeStore(rows);
  return { ...row };
}

export async function mockDeleteRating(userId: string, bookId: string): Promise<void> {
  await seedOnce();
  writeStore(
    readStore().filter((r) => !(r.user_id === userId && r.book_id === bookId)),
  );
}
