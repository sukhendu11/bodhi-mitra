import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock Supabase client ─────────────────────────────────────── */

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

/* ─── Mock TanStack Start (server functions need runtime context) ─── */

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: any = (args: any) => builder._handler(args);
    builder.method = () => builder;
    builder.middleware = () => builder;
    builder.handler = (handlerFn: any) => {
      builder._handler = handlerFn;
      return builder;
    };
    builder.validator = () => builder;
    return builder;
  },
  createMiddleware: () => ({
    server: (fn: any) => fn,
  }),
}));

/* ─── Helper: build thenable chain mock ─────────────────────────── */

function makeChainable() {
  const chain: Record<string, any> = {};
  let resolveValue: any = { data: null, error: null, count: 0 };
  let currentPromise: Promise<any> | null = null;

  const getPromise = () => {
    if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
    return currentPromise;
  };

  chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
  chain.catch = (onrejected: any) => getPromise().catch(onrejected);

  chain.__setResult = (data: any) => {
    resolveValue = data;
    currentPromise = null;
  };

  const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  chain.insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }));

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── Import after mocks are set up ────────────────────────────── */

const {
  getReaderBookmarks,
  addReaderBookmark,
  removeReaderBookmark,
  getReaderNotes,
  addReaderNote,
  deleteReaderNote,
} = (await import("../books-reader")) as any;

/* ════════════════════════════════════════════════════════════════════
   getReaderBookmarks
   ════════════════════════════════════════════════════════════════════ */

describe("getReaderBookmarks", () => {
  const mockBookmarks = [
    {
      id: "bm-1",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 5,
      label: "Chapter 1",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "bm-2",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 3,
      label: "Introduction",
      created_at: "2026-01-02T00:00:00Z",
    },
  ];

  it("returns bookmarks for a book ordered by page number", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockBookmarks, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getReaderBookmarks({
      context: { userId: "user-1" },
      data: { bookId: "book-123" },
    });

    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith("reader_bookmarks");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("book_id", "book-123");
    expect(chain.order).toHaveBeenCalledWith("page_number", { ascending: true });
  });

  it("returns empty array when no bookmarks exist", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getReaderBookmarks({
      context: { userId: "user-1" },
      data: { bookId: "book-123" },
    });

    expect(result).toEqual([]);
  });

  it("throws on database error", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: new Error("DB failure") });
    chain.then = (_: any, onrejected: any) =>
      Promise.reject(new Error("DB failure")).catch(onrejected);
    mockFrom.mockReturnValue(chain);

    await expect(
      getReaderBookmarks({ context: { userId: "user-1" }, data: { bookId: "book-123" } }),
    ).rejects.toThrow("DB failure");
  });
});

/* ════════════════════════════════════════════════════════════════════
   addReaderBookmark
   ════════════════════════════════════════════════════════════════════ */

describe("addReaderBookmark", () => {
  it("adds a bookmark successfully with label", async () => {
    const chain = makeChainable();
    const expectedBookmark = {
      id: "bm-new",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 10,
      label: "Key insight",
      created_at: "2026-01-03T00:00:00Z",
    };
    chain.__setResult({ data: expectedBookmark, error: null });
    mockFrom.mockReturnValue(chain);
    // Override the default insert mock to return a select/single chain
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: expectedBookmark, error: null })),
      })),
    }));

    const result = await addReaderBookmark({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 10, label: "Key insight" },
    });

    expect(result).toEqual(expectedBookmark);
    expect(mockFrom).toHaveBeenCalledWith("reader_bookmarks");
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      book_id: "book-123",
      page_number: 10,
      label: "Key insight",
    });
  });

  it("adds a bookmark with empty label when label is omitted", async () => {
    const chain = makeChainable();
    const expectedBookmark = {
      id: "bm-new",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 1,
      label: "",
      created_at: "2026-01-03T00:00:00Z",
    };
    chain.__setResult({ data: expectedBookmark, error: null });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: expectedBookmark, error: null })),
      })),
    }));

    const result = await addReaderBookmark({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 1 },
    });

    expect(result.label).toBe("");
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      book_id: "book-123",
      page_number: 1,
      label: "",
    });
  });

  it("returns alreadyExists on duplicate bookmark (23505)", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "23505", message: "duplicate key", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key", details: "", hint: "" },
          }),
        ),
      })),
    }));

    const result = await addReaderBookmark({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 5, label: "Duplicate" },
    });

    expect(result).toEqual({ alreadyExists: true });
  });

  it("throws on other database errors", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "42P01", message: "relation not found", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "42P01", message: "relation not found", details: "", hint: "" },
          }),
        ),
      })),
    }));

    await expect(
      addReaderBookmark({
        context: { userId: "user-1" },
        data: { bookId: "book-123", pageNumber: 5, label: "Error" },
      }),
    ).rejects.toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════
   removeReaderBookmark
   ════════════════════════════════════════════════════════════════════ */

describe("removeReaderBookmark", () => {
  it("removes a bookmark successfully", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await removeReaderBookmark({
      context: { userId: "user-1" },
      data: { id: "bm-1" },
    });

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("reader_bookmarks");
    expect(chain.eq).toHaveBeenCalledWith("id", "bm-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.delete).toHaveBeenCalled();
  });

  it("scopes delete to the current user", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await removeReaderBookmark({
      context: { userId: "other-user" },
      data: { id: "bm-1" },
    });

    expect(chain.eq).toHaveBeenCalledWith("user_id", "other-user");
  });

  it("throws on database error", async () => {
    const chain = makeChainable();
    chain.then = (_: any, onrejected: any) =>
      Promise.reject(new Error("Delete failed")).catch(onrejected);
    mockFrom.mockReturnValue(chain);

    await expect(
      removeReaderBookmark({ context: { userId: "user-1" }, data: { id: "bm-1" } }),
    ).rejects.toThrow("Delete failed");
  });
});

/* ════════════════════════════════════════════════════════════════════
   getReaderNotes
   ════════════════════════════════════════════════════════════════════ */

describe("getReaderNotes", () => {
  const mockNotes = [
    {
      id: "note-1",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 5,
      text: "Important point about mindfulness",
      color: "#fef08a",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "note-2",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 3,
      text: "Key insight from introduction",
      color: "#86efac",
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    },
  ];

  it("returns notes for a book ordered by page number", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: mockNotes, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getReaderNotes({
      context: { userId: "user-1" },
      data: { bookId: "book-123" },
    });

    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith("reader_notes");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("book_id", "book-123");
    expect(chain.order).toHaveBeenCalledWith("page_number", { ascending: true });
  });

  it("returns empty array when no notes exist", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getReaderNotes({
      context: { userId: "user-1" },
      data: { bookId: "book-123" },
    });

    expect(result).toEqual([]);
  });

  it("throws on database error", async () => {
    const chain = makeChainable();
    chain.then = (_: any, onrejected: any) =>
      Promise.reject(new Error("Query failed")).catch(onrejected);
    mockFrom.mockReturnValue(chain);

    await expect(
      getReaderNotes({ context: { userId: "user-1" }, data: { bookId: "book-123" } }),
    ).rejects.toThrow("Query failed");
  });
});

/* ════════════════════════════════════════════════════════════════════
   addReaderNote
   ════════════════════════════════════════════════════════════════════ */

describe("addReaderNote", () => {
  it("adds a note with text and page number", async () => {
    const chain = makeChainable();
    const expectedNote = {
      id: "note-new",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 7,
      text: "Profound teaching on impermanence",
      color: "#fef08a",
      created_at: "2026-01-03T00:00:00Z",
      updated_at: "2026-01-03T00:00:00Z",
    };
    chain.__setResult({ data: expectedNote, error: null });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: expectedNote, error: null })),
      })),
    }));

    const result = await addReaderNote({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 7, text: "Profound teaching on impermanence" },
    });

    expect(result).toEqual(expectedNote);
    expect(mockFrom).toHaveBeenCalledWith("reader_notes");
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      book_id: "book-123",
      page_number: 7,
      text: "Profound teaching on impermanence",
      color: "#fef08a",
    });
  });

  it("defaults color to #fef08a (yellow) when not specified", async () => {
    const chain = makeChainable();
    const expectedNote = {
      id: "note-2",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 2,
      text: "Simple note",
      color: "#fef08a",
      created_at: "2026-01-04T00:00:00Z",
      updated_at: "2026-01-04T00:00:00Z",
    };
    chain.__setResult({ data: expectedNote, error: null });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: expectedNote, error: null })),
      })),
    }));

    const result = await addReaderNote({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 2, text: "Simple note" },
    });

    expect(result.color).toBe("#fef08a");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ color: "#fef08a" }),
    );
  });

  it("accepts custom color", async () => {
    const chain = makeChainable();
    const expectedNote = {
      id: "note-3",
      user_id: "user-1",
      book_id: "book-123",
      page_number: 4,
      text: "Green note",
      color: "#86efac",
      created_at: "2026-01-05T00:00:00Z",
      updated_at: "2026-01-05T00:00:00Z",
    };
    chain.__setResult({ data: expectedNote, error: null });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: expectedNote, error: null })),
      })),
    }));

    const result = await addReaderNote({
      context: { userId: "user-1" },
      data: { bookId: "book-123", pageNumber: 4, text: "Green note", color: "#86efac" },
    });

    expect(result.color).toBe("#86efac");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ color: "#86efac" }),
    );
  });

  it("throws on database error", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "23503", message: "foreign key violation", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "23503", message: "foreign key violation", details: "", hint: "" },
          }),
        ),
      })),
    }));

    await expect(
      addReaderNote({
        context: { userId: "user-1" },
        data: { bookId: "nonexistent", pageNumber: 1, text: "Error test" },
      }),
    ).rejects.toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════
   deleteReaderNote
   ════════════════════════════════════════════════════════════════════ */

describe("deleteReaderNote", () => {
  it("deletes a note successfully", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await deleteReaderNote({
      context: { userId: "user-1" },
      data: { id: "note-1" },
    });

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("reader_notes");
    expect(chain.eq).toHaveBeenCalledWith("id", "note-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.delete).toHaveBeenCalled();
  });

  it("scopes delete to the current user", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await deleteReaderNote({
      context: { userId: "specific-user" },
      data: { id: "note-1" },
    });

    expect(chain.eq).toHaveBeenCalledWith("user_id", "specific-user");
  });

  it("throws on database error", async () => {
    const chain = makeChainable();
    chain.then = (_: any, onrejected: any) =>
      Promise.reject(new Error("Delete failed")).catch(onrejected);
    mockFrom.mockReturnValue(chain);

    await expect(
      deleteReaderNote({ context: { userId: "user-1" }, data: { id: "note-1" } }),
    ).rejects.toThrow("Delete failed");
  });
});
