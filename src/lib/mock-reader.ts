/**
 * Mock reader bookmarks & notes — M3 Reading & Engagement seam (ROADMAP.md).
 *
 * Mirrors the Supabase `reader_bookmarks` / `reader_notes` tables for
 * the offline demo — the reader page's side-panel features persist
 * across reloads. localStorage on the client, in-memory on the server
 * (server functions have no localStorage) — same pattern as mock-cart.
 */
const BOOKMARKS_KEY = "sabbe-satta-mock-reader-bookmarks";
const NOTES_KEY = "sabbe-satta-mock-reader-notes";

export interface MockReaderBookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  label: string;
  created_at: string;
}

export interface MockReaderNote {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  text: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/* ─── Generic store helpers ────────────────────────────────────── */

const memory: { bookmarks: MockReaderBookmark[]; notes: MockReaderNote[] } = {
  bookmarks: [],
  notes: [],
};

function readKey<T>(key: string, memoryKey: keyof typeof memory): T[] {
  if (typeof window === "undefined") return [...(memory[memoryKey] as unknown as T[])];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeKey<T>(key: string, memoryKey: keyof typeof memory, rows: T[]) {
  if (typeof window === "undefined") {
    (memory[memoryKey] as unknown as T[]) = rows;
    return;
  }
  localStorage.setItem(key, JSON.stringify(rows));
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Reader bookmarks ─────────────────────────────────────────── */

export async function mockGetReaderBookmarks(
  userId: string,
  bookId: string,
): Promise<MockReaderBookmark[]> {
  return readKey<MockReaderBookmark>(BOOKMARKS_KEY, "bookmarks")
    .filter((b) => b.user_id === userId && b.book_id === bookId)
    .sort((a, b) => a.page_number - b.page_number)
    .map((b) => ({ ...b }));
}

export async function mockAddReaderBookmark(input: {
  userId: string;
  bookId: string;
  pageNumber: number;
  label?: string;
}): Promise<MockReaderBookmark | { alreadyExists: true }> {
  const rows = readKey<MockReaderBookmark>(BOOKMARKS_KEY, "bookmarks");
  const dup = rows.some(
    (b) =>
      b.user_id === input.userId &&
      b.book_id === input.bookId &&
      b.page_number === input.pageNumber,
  );
  if (dup) return { alreadyExists: true };

  const row: MockReaderBookmark = {
    id: generateId("rb"),
    user_id: input.userId,
    book_id: input.bookId,
    page_number: input.pageNumber,
    label: input.label ?? "",
    created_at: new Date().toISOString(),
  };
  rows.push(row);
  writeKey(BOOKMARKS_KEY, "bookmarks", rows);
  return { ...row };
}

export async function mockRemoveReaderBookmark(
  userId: string,
  id: string,
): Promise<{ success: boolean }> {
  writeKey(
    BOOKMARKS_KEY,
    "bookmarks",
    readKey<MockReaderBookmark>(BOOKMARKS_KEY, "bookmarks").filter(
      (b) => !(b.id === id && b.user_id === userId),
    ),
  );
  return { success: true };
}

/* ─── Reader notes ─────────────────────────────────────────────── */

export async function mockGetReaderNotes(
  userId: string,
  bookId: string,
): Promise<MockReaderNote[]> {
  return readKey<MockReaderNote>(NOTES_KEY, "notes")
    .filter((n) => n.user_id === userId && n.book_id === bookId)
    .sort((a, b) => a.page_number - b.page_number)
    .map((n) => ({ ...n }));
}

export async function mockAddReaderNote(input: {
  userId: string;
  bookId: string;
  pageNumber: number;
  text: string;
  color?: string;
}): Promise<MockReaderNote> {
  const rows = readKey<MockReaderNote>(NOTES_KEY, "notes");
  const now = new Date().toISOString();
  const row: MockReaderNote = {
    id: generateId("rn"),
    user_id: input.userId,
    book_id: input.bookId,
    page_number: input.pageNumber,
    text: input.text,
    color: input.color ?? "#fef08a",
    created_at: now,
    updated_at: now,
  };
  rows.push(row);
  writeKey(NOTES_KEY, "notes", rows);
  return { ...row };
}

export async function mockDeleteReaderNote(
  userId: string,
  id: string,
): Promise<{ success: boolean }> {
  writeKey(
    NOTES_KEY,
    "notes",
    readKey<MockReaderNote>(NOTES_KEY, "notes").filter(
      (n) => !(n.id === id && n.user_id === userId),
    ),
  );
  return { success: true };
}

export async function mockUpdateReaderNote(input: {
  userId: string;
  id: string;
  text: string;
  color?: string;
}): Promise<MockReaderNote> {
  const rows = readKey<MockReaderNote>(NOTES_KEY, "notes");
  const row = rows.find((n) => n.id === input.id && n.user_id === input.userId);
  if (!row) throw new Error("Note not found");
  row.text = input.text;
  if (input.color) row.color = input.color;
  row.updated_at = new Date().toISOString();
  writeKey(NOTES_KEY, "notes", rows);
  return { ...row };
}
