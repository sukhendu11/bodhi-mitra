import { describe, it, expect, beforeEach } from "vitest";
import {
  mockFetchBookReviews,
  mockGetUserBookReview,
  mockSubmitBookReview,
  mockDeleteBookReview,
} from "@/lib/mock-reviews";
import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { mockGetRatingAggregates, mockGetUserRating } from "@/lib/mock-ratings";

const STORE_KEY = "sabbe-satta-mock-reviews";

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem("sabbe-satta-mock-ratings");
});

describe("seeded community reviews", () => {
  it("seeds at least 3 reviews for every published book", async () => {
    const { data } = await mockFetchPublishedBooks(1, 100);
    expect(data.length).toBeGreaterThanOrEqual(10);
    for (const book of data) {
      const reviews = await mockFetchBookReviews(book.id);
      expect(reviews.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("seed reviews carry valid ratings and reviewer names", async () => {
    const reviews = await mockFetchBookReviews("book-1");
    expect(reviews.length).toBeGreaterThan(0);
    for (const r of reviews) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
      expect(r.author_name.length).toBeGreaterThan(0);
      expect(r.body.length).toBeGreaterThan(0);
    }
  });

  it("sorts newest first", async () => {
    const reviews = await mockFetchBookReviews("book-1");
    expect(reviews.length).toBeGreaterThan(1);
    for (let i = 1; i < reviews.length; i++) {
      expect(reviews[i - 1].created_at >= reviews[i].created_at).toBe(true);
    }
  });

  it("does not attribute seeded reviews to real users", async () => {
    const reviews = await mockFetchBookReviews("book-1");
    expect(reviews.length).toBeGreaterThan(0);
    for (const r of reviews) {
      expect(r.user_id.startsWith("seed-")).toBe(true);
    }
  });
});

describe("mockSubmitBookReview (one per user per book)", () => {
  it("creates a review row", async () => {
    const row = await mockSubmitBookReview({
      userId: "user-1",
      bookId: "book-2",
      rating: 5,
      title: "Wonderful",
      body: "A genuinely helpful companion for daily practice.",
    });
    expect(row.user_id).toBe("user-1");
    expect(row.book_id).toBe("book-2");
    expect(row.rating).toBe(5);
    expect(await mockGetUserBookReview("user-1", "book-2")).toMatchObject({
      title: "Wonderful",
      rating: 5,
    });
  });

  it("updates the same row on re-submit", async () => {
    await mockSubmitBookReview({ userId: "user-1", bookId: "book-2", rating: 5, body: "First draft." });
    await mockSubmitBookReview({ userId: "user-1", bookId: "book-2", rating: 3, body: "Revised opinion." });
    const reviews = await mockFetchBookReviews("book-2");
    const mine = reviews.filter((r) => r.user_id === "user-1");
    expect(mine).toHaveLength(1);
    expect(mine[0].rating).toBe(3);
    expect(mine[0].body).toBe("Revised opinion.");
  });

  it("rejects invalid ratings and empty bodies", async () => {
    await expect(
      mockSubmitBookReview({ userId: "user-1", bookId: "book-2", rating: 6, body: "ok" }),
    ).rejects.toThrow("Rating must be between 1 and 5");
    await expect(
      mockSubmitBookReview({ userId: "user-1", bookId: "book-2", rating: 4, body: "   " }),
    ).rejects.toThrow("Review text is required");
  });

  it("syncs the star rating into the ratings store", async () => {
    // book-2 baseline: avg 4.8, total 95 (demo rating seed targets book-8/9 only).
    const before = await mockGetRatingAggregates("book-2");
    expect(before.total_ratings).toBe(95);

    await mockSubmitBookReview({
      userId: "user-1",
      bookId: "book-2",
      rating: 5,
      body: "Sync test review.",
    });

    expect(await mockGetUserRating("user-1", "book-2")).toBe(5);
    const after = await mockGetRatingAggregates("book-2");
    expect(after.total_ratings).toBe(96);
    // (4.8 * 95 + 5) / 96 ≈ 4.802
    expect(after.avg_rating).toBeCloseTo(4.8, 1);
  });
});

describe("mockDeleteBookReview", () => {
  it("removes the review but keeps the rating", async () => {
    await mockSubmitBookReview({ userId: "user-1", bookId: "book-2", rating: 4, body: "To be deleted." });
    await mockDeleteBookReview("user-1", "book-2");

    expect(await mockGetUserBookReview("user-1", "book-2")).toBeNull();
    // The star rating survives — rate-without-writing is allowed.
    expect(await mockGetUserRating("user-1", "book-2")).toBe(4);
  });
});
