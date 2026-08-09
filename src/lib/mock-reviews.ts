/**
 * Mock book reviews — reader reviews section on the single book page.
 *
 * Mirrors a `book_reviews` table the same way mock-ratings mirrors
 * `book_ratings`: one row per (user × book), upsert on re-submit,
 * localStorage on the client / in-memory on the server.
 *
 * Each book is seeded with a few deterministic community reviews so
 * the reviews section renders immediately in the demo. A submitted
 * review carries a star rating that is ALSO written into the mock
 * ratings store (mockSubmitRating), so the rating breakdown and the
 * review list always agree.
 */
import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { mockSubmitRating } from "@/lib/mock-ratings";

const STORE_KEY = "sabbe-satta-mock-reviews";

export interface MockBookReview {
  id: string;
  user_id: string;
  book_id: string;
  rating: number; // 1-5
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

/* ─── Store ────────────────────────────────────────────────────── */

const memoryStore: MockBookReview[] = [];
let seedPromise: Promise<void> | null = null;

function readStore(): MockBookReview[] {
  if (typeof window === "undefined") return [...memoryStore];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockBookReview[];
  } catch {
    return [];
  }
}

function writeStore(rows: MockBookReview[]) {
  if (typeof window === "undefined") {
    memoryStore.length = 0;
    memoryStore.push(...rows);
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(rows));
}

function generateId() {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Seeded community reviews ─────────────────────────────────── */

const REVIEWER_POOL = [
  "Amara Sen",
  "David Park",
  "Fatima Zahra",
  "Haruki Tanaka",
  "Isabella Rossi",
  "Jonas Weber",
  "Kamala Nair",
  "Leon Ferreira",
  "Mei Chen",
  "Oliver Hart",
  "Priya Sharma",
  "Samir Hossain",
];

const REVIEW_TEMPLATES: { title: string; body: string }[] = [
  {
    title: "A quiet treasure",
    body: "I keep coming back to this book. The tone is gentle without ever being vague — every chapter left me with something I could actually use that day.",
  },
  {
    title: "Clear and compassionate",
    body: "So many books in this space are either too academic or too fluffy. This one finds the middle way: precise, warm, and grounded in real practice.",
  },
  {
    title: "Exactly what I needed",
    body: "I picked this up during a difficult season and it became a daily companion. Short chapters, no pressure, and a sense that the author truly understands.",
  },
  {
    title: "Worth the read, more than once",
    body: "The first pass gave me the practices. The second pass revealed the depth underneath them. This is a book that grows with you.",
  },
  {
    title: "Practical and profound",
    body: "The guidance is deceptively simple, and that's its strength. Small instructions, patiently explained, that add up to real change over time.",
  },
];

/**
 * Deterministic per-book seed: 3 community reviews, rotating through
 * the reviewer pool and review templates by book index. Ratings stay
 * near the book's static avg so the breakdown looks plausible.
 */
async function doSeed() {
  const rows = readStore();
  if (rows.some((r) => r.user_id.startsWith("seed-"))) return;

  const { data } = await mockFetchPublishedBooks(1, 100);
  data.forEach((book, bookIndex) => {
    const base = Math.round(Number(book.avg_rating) * 2) / 2; // 4.4 → 4.5
    const ratings = [base >= 4.5 ? 5 : 4, 4, base >= 4 ? 5 : 4];
    for (let i = 0; i < 3; i++) {
      const persona = REVIEWER_POOL[(bookIndex * 3 + i) % REVIEWER_POOL.length];
      const template = REVIEW_TEMPLATES[(bookIndex + i) % REVIEW_TEMPLATES.length];
      const created = new Date(Date.now() - (bookIndex * 5 + i * 9 + 2) * 24 * 60 * 60 * 1000).toISOString();
      rows.push({
        id: `seed-${book.id}-${i}`,
        user_id: `seed-${book.id}-${i}`,
        book_id: book.id,
        rating: ratings[i],
        title: template.title,
        body: template.body,
        author_name: persona,
        created_at: created,
        updated_at: created,
      });
    }
  });
  writeStore(rows);
}

// Same self-healing pattern as mock-ratings: if the store has been cleared
// (demo reset / tests), drop the cached promise so the next read re-seeds.
function seedOnce(): Promise<void> {
  const rows = readStore();
  if (!rows.some((r) => r.user_id.startsWith("seed-"))) seedPromise = null;
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

/* ─── Reads ────────────────────────────────────────────────────── */

export async function mockFetchBookReviews(bookId: string): Promise<MockBookReview[]> {
  await seedOnce();
  return readStore()
    .filter((r) => r.book_id === bookId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function mockGetUserBookReview(
  userId: string | null | undefined,
  bookId: string,
): Promise<MockBookReview | null> {
  if (!userId) return null;
  await seedOnce();
  return (
    readStore().find((r) => r.user_id === userId && r.book_id === bookId) ?? null
  );
}

/* ─── Writes ───────────────────────────────────────────────────── */

/**
 * Upsert a review (one per user per book). The star rating is also
 * written to the ratings store so aggregates stay in sync. Deleting
 * the review later keeps the rating (rate-without-writing is allowed,
 * matching the real app).
 */
export async function mockSubmitBookReview(input: {
  userId: string;
  bookId: string;
  rating: number;
  title?: string;
  body: string;
  authorName?: string;
}): Promise<MockBookReview> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  if (!input.body.trim()) {
    throw new Error("Review text is required");
  }

  await seedOnce();
  const rows = readStore();
  const now = new Date().toISOString();

  // Keep the star aggregates in lockstep with the review.
  await mockSubmitRating({ userId: input.userId, bookId: input.bookId, rating: input.rating });

  const existing = rows.find(
    (r) => r.user_id === input.userId && r.book_id === input.bookId,
  );
  if (existing) {
    existing.rating = input.rating;
    existing.title = input.title?.trim() ?? existing.title;
    existing.body = input.body.trim();
    existing.updated_at = now;
    writeStore(rows);
    return { ...existing };
  }

  const row: MockBookReview = {
    id: generateId(),
    user_id: input.userId,
    book_id: input.bookId,
    rating: input.rating,
    title: input.title?.trim() ?? "",
    body: input.body.trim(),
    author_name: input.authorName?.trim() || "Reader",
    created_at: now,
    updated_at: now,
  };
  rows.push(row);
  writeStore(rows);
  return { ...row };
}

export async function mockDeleteBookReview(userId: string, bookId: string): Promise<void> {
  await seedOnce();
  writeStore(
    readStore().filter((r) => !(r.user_id === userId && r.book_id === bookId)),
  );
}
