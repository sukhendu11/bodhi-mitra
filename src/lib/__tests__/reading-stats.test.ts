import { describe, it, expect } from "vitest";
import { computeReadingStats, formatDuration, getReadingStats } from "@/lib/reading-stats";
import { clearHistoryRows, recordReadingSession } from "@/lib/reading-history";
import { setMockModeOverride } from "@/lib/data-source";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";
import type { ReadingHistoryEntry } from "@/lib/reading-history";

// Fixed base date so day-bucketing is deterministic (rows + `now` align).
const BASE = new Date("2026-08-07T12:00:00");

const ISO = (daysAgo: number, hour = 12, minute = 0) => {
  const d = new Date(BASE);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

function row(overrides: Partial<ReadingHistoryEntry>): ReadingHistoryEntry {
  return {
    id: Math.random().toString(36),
    userId: "u1",
    bookId: "b1",
    page: 1,
    totalPages: 320,
    progressPct: 0,
    timestamp: ISO(0),
    ...overrides,
  };
}

const BOOK_INFO = (id: string) => ({
  slug: `slug-${id}`,
  titleEn: `Book ${id}`,
  titleBn: `বই ${id}`,
  coverImage: "",
  pages: 320,
});

describe("computeReadingStats", () => {
  it("returns zeroed stats for no rows", () => {
    const s = computeReadingStats([], () => BOOK_INFO("b1"), BASE);
    expect(s.totalSessions).toBe(0);
    expect(s.totalPagesRead).toBe(0);
    expect(s.totalTimeMs).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(0);
    expect(s.activeDays).toBe(0);
    expect(s.days).toHaveLength(28);
    expect(s.books).toHaveLength(0);
  });

  it("counts pages advanced between consecutive rows, clamped to 25", () => {
    const rows = [
      row({ page: 10, timestamp: ISO(0, 9, 0) }),
      row({ page: 25, timestamp: ISO(0, 9, 5) }), // +15 pages
      row({ page: 80, timestamp: ISO(0, 9, 10) }), // +55 → clamped (navigation)
      row({ page: 70, timestamp: ISO(0, 9, 15) }), // backwards → 0
    ];
    const s = computeReadingStats(rows, () => BOOK_INFO("b1"), BASE);
    expect(s.totalPagesRead).toBe(15);
  });

  it("accumulates reading time only for gaps within a session window", () => {
    const rows = [
      row({ page: 10, timestamp: ISO(0, 9, 0) }),
      row({ page: 12, timestamp: ISO(0, 9, 10) }), // +10 min
      row({ page: 14, timestamp: ISO(0, 12, 0) }), // +2h50m → outside window
      row({ page: 16, timestamp: ISO(0, 12, 5) }), // +5 min
    ];
    const s = computeReadingStats(rows, () => BOOK_INFO("b1"), BASE);
    expect(s.totalTimeMs).toBe(15 * 60_000);
  });

  it("buckets pages by local day", () => {
    const rows = [
      row({ page: 5, timestamp: ISO(3, 10, 0) }),
      row({ page: 20, timestamp: ISO(3, 10, 10) }), // +15 pages 3 days ago
      row({ page: 20, timestamp: ISO(1, 10, 0) }), // new session, no delta
      row({ page: 30, timestamp: ISO(1, 10, 10) }), // +10 pages 1 day ago
    ];
    const s = computeReadingStats(rows, () => BOOK_INFO("b1"), BASE);
    const today = s.days[s.days.length - 1];
    expect(s.days[s.days.length - 4].pages).toBe(15); // 3 days ago
    expect(s.days[s.days.length - 2].pages).toBe(10); // 1 day ago
    expect(today.pages).toBe(0);
  });

  it("computes current streak ending today, or from yesterday if today unread", () => {
    const now = BASE;
    // Read today, yesterday, and 2 days ago → streak 3
    const rows3 = [
      row({ timestamp: ISO(2, 10, 0) }),
      row({ timestamp: ISO(1, 10, 0) }),
      row({ timestamp: ISO(0, 10, 0) }),
    ];
    expect(computeReadingStats(rows3, () => BOOK_INFO("b1"), now).currentStreak).toBe(3);

    // Today unread, but yesterday + 2 days ago read → streak counts from yesterday = 2
    const rows2 = [row({ timestamp: ISO(2, 10, 0) }), row({ timestamp: ISO(1, 10, 0) })];
    expect(computeReadingStats(rows2, () => BOOK_INFO("b1"), now).currentStreak).toBe(2);

    // 3 days ago only → streak 0
    const rows0 = [row({ timestamp: ISO(3, 10, 0) })];
    expect(computeReadingStats(rows0, () => BOOK_INFO("b1"), now).currentStreak).toBe(0);
  });

  it("computes longest streak across gaps", () => {
    const rows = [
      row({ timestamp: ISO(6, 10, 0) }),
      row({ timestamp: ISO(5, 10, 0) }),
      row({ timestamp: ISO(4, 10, 0) }), // 3-day run
      row({ timestamp: ISO(2, 10, 0) }),
      row({ timestamp: ISO(1, 10, 0) }), // 2-day run (gap at day 3)
    ];
    const s = computeReadingStats(rows, () => BOOK_INFO("b1"), BASE);
    expect(s.longestStreak).toBe(3);
    expect(s.activeDays).toBe(5);
  });

  it("produces per-book stats with progress from the last row", () => {
    const rows = [
      row({ bookId: "b1", page: 64, totalPages: 320, timestamp: ISO(2, 10, 0) }),
      row({ bookId: "b1", page: 80, totalPages: 320, timestamp: ISO(2, 10, 5) }),
      row({ bookId: "b2", page: 10, totalPages: 100, timestamp: ISO(1, 10, 0) }),
    ];
    const s = computeReadingStats(rows, BOOK_INFO, BASE);
    expect(s.books).toHaveLength(2);
    const b1 = s.books.find((b) => b.bookId === "b1")!;
    expect(b1.pagesRead).toBe(16);
    expect(b1.sessions).toBe(2);
    expect(b1.progressPct).toBe(25); // 80/320
    const b2 = s.books.find((b) => b.bookId === "b2")!;
    expect(b2.progressPct).toBe(10);
    // Books sorted by last read, newest first
    expect(s.books[0].bookId).toBe("b2");
  });

  it("separates sessions per book (no cross-book time bleed)", () => {
    const rows = [
      row({ bookId: "b1", page: 5, timestamp: ISO(0, 9, 0) }),
      row({ bookId: "b2", page: 5, timestamp: ISO(0, 9, 5) }), // interleaved
      row({ bookId: "b1", page: 10, timestamp: ISO(0, 9, 10) }),
    ];
    const s = computeReadingStats(rows, BOOK_INFO, BASE);
    const b1 = s.books.find((b) => b.bookId === "b1")!;
    expect(b1.timeMs).toBe(10 * 60_000); // only the b1→b1 gap counts
  });
});

describe("getReadingStats (demo seed)", () => {
  it("seeds a realistic 28-day demo history for the demo account", async () => {
    setMockModeOverride(true);
    try {
      await clearHistoryRows(DEMO_ACCOUNTS.user.id);
      const s = await getReadingStats(DEMO_ACCOUNTS.user.id);
      // The fixed RNG seed produces ~20 active days over 28.
      expect(s.activeDays).toBeGreaterThanOrEqual(10);
      expect(s.totalSessions).toBeGreaterThanOrEqual(15);
      expect(s.totalPagesRead).toBeGreaterThan(50);
      expect(s.books.length).toBe(3);
      expect(s.days).toHaveLength(28);
      // Monotonic page progression means at least one book shows pages read.
      expect(s.books.some((b) => b.pagesRead > 0)).toBe(true);
      // Anchored bursts accumulate reading time.
      expect(s.totalTimeMs).toBeGreaterThan(0);
    } finally {
      setMockModeOverride(null);
    }
  });

  it("re-seeds when the demo history is partial (interrupted seed)", async () => {
    setMockModeOverride(true);
    try {
      await clearHistoryRows(DEMO_ACCOUNTS.user.id);
      // Simulate an interrupted seed: write just 1 row.
      await recordReadingSession({
        userId: DEMO_ACCOUNTS.user.id,
        bookId: "book-1",
        page: 12,
        totalPages: 320,
      });
      const s = await getReadingStats(DEMO_ACCOUNTS.user.id);
      expect(s.activeDays).toBeGreaterThanOrEqual(10);
    } finally {
      setMockModeOverride(null);
    }
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(5 * 60_000)).toBe("5m");
    expect(formatDuration(3 * 3_600_000)).toBe("3h");
    expect(formatDuration(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
  });
});
