import { describe, it, expect, beforeEach } from "vitest";
import {
  mockGetProgress,
  mockGetUserProgress,
  mockUpsertProgress,
  mockMarkBookCompleted,
  mockDeleteProgress,
} from "@/lib/mock-progress";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

const STORE_KEY = "sabbe-satta-mock-progress";

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
});

describe("mockUpsertProgress", () => {
  it("creates a row with computed progress_pct and completed=false", async () => {
    const row = await mockUpsertProgress({
      userId: "user-1",
      bookId: "book-2",
      lastPage: 160,
      totalPages: 320,
    });

    expect(row.user_id).toBe("user-1");
    expect(row.book_id).toBe("book-2");
    expect(row.last_page).toBe(160);
    expect(row.progress_pct).toBe(50);
    expect(row.completed).toBe(false);
    expect(row.started_at).toBeTruthy();
  });

  it("resolves totalPages from the mock book when not provided", async () => {
    const row = await mockUpsertProgress({
      userId: "user-1",
      bookId: "book-2",
      lastPage: 160,
    });
    // book-2 has 320 pages in mock data.
    expect(row.total_pages).toBe(320);
    expect(row.progress_pct).toBe(50);
  });

  it("marks a book completed at 100%", async () => {
    const row = await mockUpsertProgress({
      userId: "user-1",
      bookId: "book-2",
      lastPage: 320,
      totalPages: 320,
    });
    expect(row.progress_pct).toBe(100);
    expect(row.completed).toBe(true);
  });

  it("updates the existing row instead of creating a duplicate", async () => {
    await mockUpsertProgress({ userId: "user-1", bookId: "book-2", lastPage: 10, totalPages: 320 });
    const updated = await mockUpsertProgress({
      userId: "user-1",
      bookId: "book-2",
      lastPage: 160,
      totalPages: 320,
    });

    expect(updated.progress_pct).toBe(50);
    const rows = await mockGetUserProgress("user-1");
    expect(rows).toHaveLength(1);
  });
});

describe("mockGetProgress / mockMarkBookCompleted / mockDeleteProgress", () => {
  it("returns null when no progress exists", async () => {
    expect(await mockGetProgress("user-1", "book-2")).toBeNull();
  });

  it("returns the row for a user × book", async () => {
    await mockUpsertProgress({ userId: "user-1", bookId: "book-2", lastPage: 64, totalPages: 320 });
    const row = await mockGetProgress("user-1", "book-2");
    expect(row?.last_page).toBe(64);
  });

  it("scopes reads per user", async () => {
    await mockUpsertProgress({ userId: "user-1", bookId: "book-2", lastPage: 64, totalPages: 320 });
    expect(await mockGetProgress("user-2", "book-2")).toBeNull();
  });

  it("mockMarkBookCompleted sets 100%", async () => {
    const row = await mockMarkBookCompleted("user-1", "book-2");
    expect(row.completed).toBe(true);
    expect(row.progress_pct).toBe(100);
  });

  it("mockDeleteProgress removes the row", async () => {
    await mockUpsertProgress({ userId: "user-1", bookId: "book-2", lastPage: 64, totalPages: 320 });
    await mockDeleteProgress("user-1", "book-2");
    expect(await mockGetProgress("user-1", "book-2")).toBeNull();
  });
});

describe("mockGetUserProgress (book join)", () => {
  it("joins book slug/titles and sorts newest first", async () => {
    // Insert the older row first (book-4), then the newer row (book-2) with a
    // clock delay so `updated_at` ordering is deterministic across ms boundaries
    // (back-to-back writes in the same millisecond made the sort order flaky).
    await mockUpsertProgress({ userId: "user-1", bookId: "book-4", lastPage: 10, totalPages: 280 });
    await new Promise((r) => setTimeout(r, 5));
    await mockUpsertProgress({ userId: "user-1", bookId: "book-2", lastPage: 64, totalPages: 320 });

    const rows = await mockGetUserProgress("user-1");
    expect(rows).toHaveLength(2);
    expect(rows[0].book_slug).toBe("walking-the-middle-way");
    expect(rows[0].book_title_en).toBeTruthy();
    expect(rows[1].book_slug).toBe("emotional-resilience");
  });

  it("returns empty for users with no progress", async () => {
    expect(await mockGetUserProgress("user-2")).toEqual([]);
  });
});

describe("seeded demo progress (ROADMAP §2.3)", () => {
  it("seeds the demo user's started book on first read", async () => {
    const rows = await mockGetUserProgress(DEMO_ACCOUNTS.user.id);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].progress_pct).toBeGreaterThan(0);
    expect(rows[0].completed).toBe(false);
  });

  it("does not seed progress for other users", async () => {
    expect(await mockGetUserProgress("some-other-user")).toEqual([]);
  });
});
