/**
 * Reading Statistics — derived from the reading-history store.
 *
 * The history store is append-only session snapshots (`{ page, totalPages,
 * progressPct, timestamp }` per debounced save). From those snapshots we can
 * derive, per book, two signals between consecutive rows:
 *
 *   • pagesRead — positive page delta, clamped to [1, 25] (a bigger jump means
 *     the user navigated via TOC/thumbnails, not read)
 *   • timeMs     — wall-clock gap, clamped to [2s, 30min] (a longer gap means a
 *     new reading session later in the day, not continuous reading)
 *
 * Everything else (streaks, pages-per-day, totals) is bucketed on top of those
 * per-book signals. All derivations are pure — `computeReadingStats` is unit
 * tested with hand-crafted rows.
 *
 * Real mode: the Supabase `reading_progress` table has no session timeline, so
 * stats degrade to per-book progress (no streaks / no time) — documented seam.
 */
import { isMockMode } from "@/lib/data-source";
import { mockFetchBookById, mockFetchPublishedBooks } from "@/lib/mock-data";
import {
  getAllHistoryRows,
  clearHistoryRows,
  recordReadingSession,
  type ReadingHistoryEntry,
} from "@/lib/reading-history";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

/* ─── Types ────────────────────────────────────────────────────── */

export interface DayStat {
  date: string; // YYYY-MM-DD (local)
  label: string; // short chart label (e.g. "Aug 3")
  pages: number;
  timeMs: number;
  sessions: number;
}

export interface BookStat {
  bookId: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  coverImage: string;
  pagesRead: number;
  timeMs: number;
  sessions: number;
  lastReadAt: string;
  progressPct: number;
}

export interface ReadingStats {
  totalSessions: number;
  totalPagesRead: number;
  totalTimeMs: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  days: DayStat[]; // last N days, zero-filled (oldest → newest)
  books: BookStat[]; // time spent per book, most recently read first
  avgSessionMinutes: number;
}

/* ─── Constants ────────────────────────────────────────────────── */

const MAX_PAGE_JUMP = 25; // page deltas above this are navigation, not reading
const MIN_SESSION_GAP_MS = 2_000; // below this is a debounce artifact
const MAX_SESSION_GAP_MS = 30 * 60_000; // above this starts a new session
/** Full activity window exposed on `stats.days` (feeds the streak strip). */
const WINDOW_DAYS = 28;
/** Chart slice — the bar chart shows the most recent 14 of the window. */
export const CHART_DAYS = 14;
export const STREAK_STRIP_DAYS = WINDOW_DAYS;

/* ─── Pure helpers (unit-tested) ───────────────────────────────── */

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Distinct local days with any session, oldest first. */
function activeDayKeys(rows: ReadingHistoryEntry[]): string[] {
  const set = new Set<string>();
  for (const r of rows) set.add(localDayKey(r.timestamp));
  return [...set].sort();
}

function currentStreak(days: Set<string>, now = new Date()): number {
  const cursor = new Date(now);
  if (!days.has(localDayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1); // today not read yet → count from yesterday
  }
  let streak = 0;
  while (days.has(localDayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function longestStreak(days: string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    if (prev) {
      const gap = (Date.parse(key) - Date.parse(prev)) / 86_400_000;
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

/**
 * Core derivation — everything computed from raw session rows.
 * `bookInfo` supplies per-book metadata (id/slug/titles/cover/pages).
 */
export function computeReadingStats(
  rows: ReadingHistoryEntry[],
  bookInfo: (bookId: string) => {
    slug: string;
    titleEn: string;
    titleBn: string;
    coverImage: string;
    pages: number;
  } | null,
  now = new Date(),
): ReadingStats {
  // ── Per-book accumulation from consecutive same-book rows ─────
  const byBook = new Map<
    string,
    {
      pagesRead: number;
      timeMs: number;
      sessions: number;
      lastReadAt: string;
      lastPage: number;
      totalPages: number;
    }
  >();
  // Day buckets
  const dayBuckets = new Map<string, DayStat>();

  const bucket = (key: string): DayStat => {
    let b = dayBuckets.get(key);
    if (!b) {
      b = { date: key, label: shortLabel(key), pages: 0, timeMs: 0, sessions: 0 };
      dayBuckets.set(key, b);
    }
    return b;
  };

  // Sort ascending, then scan consecutive rows grouped by book.
  const sorted = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let prevForBook = new Map<string, ReadingHistoryEntry>();

  for (const row of sorted) {
    let stat = byBook.get(row.bookId);
    if (!stat) {
      stat = {
        pagesRead: 0,
        timeMs: 0,
        sessions: 0,
        lastReadAt: row.timestamp,
        lastPage: row.page,
        totalPages: row.totalPages,
      };
      byBook.set(row.bookId, stat);
    }
    stat.sessions++;
    stat.lastReadAt = row.timestamp;
    stat.lastPage = row.page;
    stat.totalPages = row.totalPages;
    bucket(localDayKey(row.timestamp)).sessions++;

    const prev = prevForBook.get(row.bookId);
    if (prev) {
      const delta = row.page - prev.page;
      if (delta > 0 && delta <= MAX_PAGE_JUMP) {
        stat.pagesRead += delta;
        bucket(localDayKey(row.timestamp)).pages += delta;
      }
      const gap = Date.parse(row.timestamp) - Date.parse(prev.timestamp);
      if (gap >= MIN_SESSION_GAP_MS && gap <= MAX_SESSION_GAP_MS) {
        stat.timeMs += gap;
        bucket(localDayKey(row.timestamp)).timeMs += gap;
      }
    }
    prevForBook.set(row.bookId, row);
  }

  // ── Streaks ────────────────────────────────────────────────────
  const days = activeDayKeys(rows);
  const daySet = new Set(days);
  const curStreak = currentStreak(daySet, now);
  const longStreak = longestStreak(days);

  // ── Zero-filled activity window (last WINDOW_DAYS, oldest → newest) ─
  const window: DayStat[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = localDayKey(d.toISOString());
    const existing = dayBuckets.get(key);
    window.push(
      existing ?? { date: key, label: shortLabel(key), pages: 0, timeMs: 0, sessions: 0 },
    );
  }

  // ── Book rows (enriched with metadata) ─────────────────────────
  const books: BookStat[] = [...byBook.entries()]
    .map(([bookId, s]) => {
      const info = bookInfo(bookId);
      return {
        bookId,
        slug: info?.slug ?? "",
        titleEn: info?.titleEn ?? bookId,
        titleBn: info?.titleBn ?? bookId,
        coverImage: info?.coverImage ?? "",
        pagesRead: s.pagesRead,
        timeMs: s.timeMs,
        sessions: s.sessions,
        lastReadAt: s.lastReadAt,
        progressPct:
          s.totalPages > 0 ? Math.min(100, Math.round((s.lastPage / s.totalPages) * 100)) : 0,
      };
    })
    .sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt));

  const totalSessions = rows.length;
  const totalPagesRead = [...byBook.values()].reduce((s, b) => s + b.pagesRead, 0);
  const totalTimeMs = [...byBook.values()].reduce((s, b) => s + b.timeMs, 0);

  return {
    totalSessions,
    totalPagesRead,
    totalTimeMs,
    currentStreak: curStreak,
    longestStreak: longStreak,
    activeDays: daySet.size,
    days: window,
    books,
    avgSessionMinutes:
      totalSessions > 0 ? Math.round(totalTimeMs / totalSessions / 60_000) : 0,
  };
}

/* ─── Demo seed — so the dashboard is demoable immediately ─────── */

let seedPromise: Promise<void> | null = null;
/** A full seed writes ~20–40 rows; fewer than this means an interrupted/partial seed. */
const FULL_SEED_MIN_ROWS = 7;
/** Bump when the demo seed's shape changes so stale/legacy seeds regenerate. */
const SEED_VERSION = 3;
const SEED_VERSION_KEY = "sabbe-satta-history-seed-version";

function readSeedVersion(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SEED_VERSION_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function writeSeedVersion() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  } catch {
    /* ignore */
  }
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedHistoryOnce(): Promise<void> {
  const userId = DEMO_ACCOUNTS.user.id;
  const existing = await getAllHistoryRows(userId);
  const complete = existing.length >= FULL_SEED_MIN_ROWS && readSeedVersion() === SEED_VERSION;
  if (complete) {
    seedPromise = null;
    return;
  }
  if (seedPromise) return seedPromise;
  seedPromise = doSeed(userId);
  return seedPromise;
}

/**
 * Generate ~28 days of realistic reading history for the demo account:
 * one primary book per day (rotating) with monotonic page progression and
 * 1–2 reading bursts 10–25 min apart (so pages read and reading time both
 * accumulate). A partial/interrupted seed is cleared and regenerated.
 */
async function doSeed(userId: string): Promise<void> {
  const { data } = await mockFetchPublishedBooks(1, 100);
  const books = data.slice(0, 3);
  if (books.length === 0) return;

  // Wipe any partial seed so stats never mix stale rows with fresh ones.
  await clearHistoryRows(userId);

  const rand = mulberry32(0x5abbe5a7);
  const now = new Date();
  const cursor = new Map<string, number>(
    books.map((b) => [b.id, 1 + Math.floor(rand() * 8)]),
  );

  for (let day = STREAK_STRIP_DAYS - 1; day >= 0; day--) {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    // Weekends a little more likely to be read than weekdays.
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (rand() > (isWeekend ? 0.9 : 0.65)) continue;

    // One primary book per day — deterministic rotation for even coverage.
    const book = books[day % books.length];
    const total = book.pages || 320;
    const bursts = 1 + Math.floor(rand() * 2);
    const events: { time: Date; page: number }[] = [];

    // First burst of the day anchors the time; later bursts build on it
    // (+10–25 min) so the same-book gap stays inside the 30-min session
    // window and reading time accumulates.
    const baseTime = new Date(d);
    baseTime.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);

    for (let i = 0; i < bursts; i++) {
      let page = (cursor.get(book.id) ?? 1) + (4 + Math.floor(rand() * 14));
      if (page >= total) page = 1 + Math.floor(rand() * 8); // finished → restart
      cursor.set(book.id, page);

      const time = new Date(baseTime);
      if (i > 0) time.setMinutes(time.getMinutes() + 10 + Math.floor(rand() * 15));
      events.push({ time, page });
    }

    // Write bursts in timestamp order (ascending → deltas stay positive).
    events.sort((a, b) => a.time.getTime() - b.time.getTime());
    for (const e of events) {
      await recordReadingSession({
        userId,
        bookId: book.id,
        page: e.page,
        totalPages: total,
        timestamp: e.time.toISOString(),
      });
    }
  }
  writeSeedVersion();
  seedPromise = null;
}

/* ─── Public API ───────────────────────────────────────────────── */

/** Full stats for a user. Mock mode seeds demo history on first access. */
export async function getReadingStats(
  userId: string | null | undefined,
): Promise<ReadingStats> {
  if (!userId) return emptyStats();

  if (isMockMode()) {
    // Seed demo history only for the demo account — other mock users
    // start with a clean (empty) history.
    if (userId === DEMO_ACCOUNTS.user.id) await seedHistoryOnce();
    const rows = await getAllHistoryRows(userId);
    return computeReadingStats(rows, (bookId) => {
      const b = mockFetchBookById(bookId);
      return b
        ? {
            slug: b.slug,
            titleEn: b.title_en,
            titleBn: b.title_bn,
            coverImage: b.cover_image,
            pages: b.pages || 0,
          }
        : null;
    });
  }

  // Real mode — reading_progress has no session timeline; degrade to progress.
  const { getUserProgress } = await import("@/lib/books-progress");
  const rows = await getUserProgress(userId);
  const books: BookStat[] = rows.map((r) => ({
    bookId: r.book_id,
    slug: r.book_slug ?? "",
    titleEn: r.book_title_en ?? "",
    titleBn: r.book_title_bn ?? "",
    coverImage: "",
    pagesRead: 0,
    timeMs: 0,
    sessions: 1,
    lastReadAt: r.updated_at ?? new Date().toISOString(),
    progressPct: r.progress_pct,
  }));
  return {
    totalSessions: books.length,
    totalPagesRead: 0,
    totalTimeMs: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    days: [],
    books,
    avgSessionMinutes: 0,
  };
}

function emptyStats(): ReadingStats {
  return {
    totalSessions: 0,
    totalPagesRead: 0,
    totalTimeMs: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    days: [],
    books: [],
    avgSessionMinutes: 0,
  };
}

/* ─── Formatting helpers (shared with the dashboard UI) ───────── */

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
