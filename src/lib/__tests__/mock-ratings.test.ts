import { describe, it, expect, beforeEach } from "vitest";
import {
  mockGetUserRating,
  mockGetRatingAggregates,
  mockSubmitRating,
  mockDeleteRating,
} from "@/lib/mock-ratings";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

const STORE_KEY = "sabbe-satta-mock-ratings";

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
});

describe("mockSubmitRating", () => {
  it("creates a rating row", async () => {
    const row = await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    expect(row.user_id).toBe("user-1");
    expect(row.book_id).toBe("book-2");
    expect(row.rating).toBe(5);
  });

  it("updates an existing rating (one per user per book)", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 3 });
    expect(await mockGetUserRating("user-1", "book-2")).toBe(3);
  });

  it("rejects ratings outside 1-5", async () => {
    await expect(
      mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 0 }),
    ).rejects.toThrow("Rating must be between 1 and 5");
    await expect(
      mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 6 }),
    ).rejects.toThrow("Rating must be between 1 and 5");
  });
});

describe("mockGetRatingAggregates (JS recompute mirroring the DB trigger)", () => {
  it("starts from the book's static community baseline", async () => {
    const agg = await mockGetRatingAggregates("book-2");
    // book-2 mock data: avg 4.8, total 95.
    expect(agg.total_ratings).toBe(95);
    expect(agg.avg_rating).toBeCloseTo(4.8, 1);
  });

  it("layers a new user rating on top of the baseline", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    const agg = await mockGetRatingAggregates("book-2");
    expect(agg.total_ratings).toBe(96);
    // (4.8 * 95 + 5) / 96 ≈ 4.802
    expect(agg.avg_rating).toBeCloseTo(4.8, 1);
  });

  it("recomputes when a rating is updated", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 1 });
    const agg = await mockGetRatingAggregates("book-2");
    expect(agg.total_ratings).toBe(96);
    // (4.8 * 95 + 1) / 96 ≈ 4.76
    expect(agg.avg_rating).toBeCloseTo(4.76, 2);
  });

  it("builds a distribution covering all stars", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 4 });
    const agg = await mockGetRatingAggregates("book-2");
    const starCount = Object.values(agg.distribution).reduce((s, n) => s + n, 0);
    expect(starCount).toBe(96);
  });

  it("isolates aggregates per book", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    const other = await mockGetRatingAggregates("book-4");
    // book-4 mock data: avg 4.6, total 76 — unaffected by book-2 rating.
    expect(other.total_ratings).toBe(76);
  });
});

describe("mockGetUserRating / mockDeleteRating", () => {
  it("returns null when the user hasn't rated", async () => {
    expect(await mockGetUserRating("user-1", "book-2")).toBeNull();
  });

  it("returns null for null userId", async () => {
    expect(await mockGetUserRating(null, "book-2")).toBeNull();
  });

  it("deletes the rating and restores the baseline", async () => {
    await mockSubmitRating({ userId: "user-1", bookId: "book-2", rating: 5 });
    await mockDeleteRating("user-1", "book-2");
    expect(await mockGetUserRating("user-1", "book-2")).toBeNull();
    const agg = await mockGetRatingAggregates("book-2");
    expect(agg.total_ratings).toBe(95);
  });
});

describe("seeded demo ratings (ROADMAP §2.3)", () => {
  it("seeds 2 demo ratings on first read (on the demo user's books)", async () => {
    // The seed rates the demo user's purchased books (newest paid picks:
    // book-9 first, book-8 second — same picks as the mock-commerce seed).
    const agg = await mockGetRatingAggregates("book-9");
    expect(agg.total_ratings).toBeGreaterThanOrEqual(96);
    expect(await mockGetUserRating(DEMO_ACCOUNTS.user.id, "book-9")).toBe(5);
    expect(await mockGetUserRating(DEMO_ACCOUNTS.user.id, "book-8")).toBe(4);
  });

  it("does not seed ratings for other users", async () => {
    expect(await mockGetUserRating("some-other-user", "book-9")).toBeNull();
  });
});
