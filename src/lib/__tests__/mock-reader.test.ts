import { describe, it, expect, beforeEach } from "vitest";
import {
  mockGetReaderBookmarks,
  mockAddReaderBookmark,
  mockRemoveReaderBookmark,
  mockGetReaderNotes,
  mockAddReaderNote,
  mockDeleteReaderNote,
  mockUpdateReaderNote,
} from "@/lib/mock-reader";

const BOOKMARKS_KEY = "sabbe-satta-mock-reader-bookmarks";
const NOTES_KEY = "sabbe-satta-mock-reader-notes";

beforeEach(() => {
  localStorage.removeItem(BOOKMARKS_KEY);
  localStorage.removeItem(NOTES_KEY);
});

describe("reader bookmarks", () => {
  it("adds a bookmark and returns it", async () => {
    const row = await mockAddReaderBookmark({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 12,
      label: "",
    });
    if ("alreadyExists" in row) throw new Error("unexpected duplicate");
    expect(row.user_id).toBe("user-1");
    expect(row.book_id).toBe("book-2");
    expect(row.page_number).toBe(12);
  });

  it("returns alreadyExists on duplicate page bookmark", async () => {
    await mockAddReaderBookmark({ userId: "user-1", bookId: "book-2", pageNumber: 12 });
    const dup = await mockAddReaderBookmark({ userId: "user-1", bookId: "book-2", pageNumber: 12 });
    expect(dup).toEqual({ alreadyExists: true });
  });

  it("lists bookmarks ordered by page number", async () => {
    await mockAddReaderBookmark({ userId: "user-1", bookId: "book-2", pageNumber: 40 });
    await mockAddReaderBookmark({ userId: "user-1", bookId: "book-2", pageNumber: 3 });
    const rows = await mockGetReaderBookmarks("user-1", "book-2");
    expect(rows.map((r) => r.page_number)).toEqual([3, 40]);
  });

  it("scopes bookmarks per user and per book", async () => {
    await mockAddReaderBookmark({ userId: "user-1", bookId: "book-2", pageNumber: 3 });
    expect(await mockGetReaderBookmarks("user-2", "book-2")).toEqual([]);
    expect(await mockGetReaderBookmarks("user-1", "book-4")).toEqual([]);
  });

  it("removes a bookmark", async () => {
    const row = await mockAddReaderBookmark({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 3,
    });
    if ("alreadyExists" in row) throw new Error("unexpected duplicate");
    await mockRemoveReaderBookmark("user-1", row.id);
    expect(await mockGetReaderBookmarks("user-1", "book-2")).toEqual([]);
  });
});

describe("reader notes", () => {
  it("adds a note with a default color", async () => {
    const note = await mockAddReaderNote({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 5,
      text: "Important insight",
    });
    expect(note.text).toBe("Important insight");
    expect(note.color).toBe("#fef08a");
    expect(note.page_number).toBe(5);
  });

  it("accepts a custom color", async () => {
    const note = await mockAddReaderNote({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 6,
      text: "Green highlight",
      color: "#86efac",
    });
    expect(note.color).toBe("#86efac");
  });

  it("lists notes ordered by page number, scoped per user/book", async () => {
    await mockAddReaderNote({ userId: "user-1", bookId: "book-2", pageNumber: 9, text: "B" });
    await mockAddReaderNote({ userId: "user-1", bookId: "book-2", pageNumber: 2, text: "A" });
    const notes = await mockGetReaderNotes("user-1", "book-2");
    expect(notes.map((n) => n.page_number)).toEqual([2, 9]);
    expect(await mockGetReaderNotes("user-2", "book-2")).toEqual([]);
  });

  it("updates a note's text", async () => {
    const note = await mockAddReaderNote({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 5,
      text: "Original",
    });
    const updated = await mockUpdateReaderNote({
      userId: "user-1",
      id: note.id,
      text: "Revised",
    });
    expect(updated.text).toBe("Revised");
    expect(updated.updated_at >= note.updated_at).toBe(true);
  });

  it("throws when updating a note owned by another user", async () => {
    const note = await mockAddReaderNote({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 5,
      text: "Original",
    });
    await expect(
      mockUpdateReaderNote({ userId: "user-2", id: note.id, text: "Hijack" }),
    ).rejects.toThrow("Note not found");
  });

  it("deletes a note", async () => {
    const note = await mockAddReaderNote({
      userId: "user-1",
      bookId: "book-2",
      pageNumber: 5,
      text: "Delete me",
    });
    await mockDeleteReaderNote("user-1", note.id);
    expect(await mockGetReaderNotes("user-1", "book-2")).toEqual([]);
  });
});
