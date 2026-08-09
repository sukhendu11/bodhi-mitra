import { describe, it, expect, beforeEach, vi } from "vitest";

/* ─── Single low-level dependency (no server-fn mocks needed) ───┐

   These tests exercise the mock-cart store directly to lock the
   admin-created-book regression: add-to-cart must work for books the
   server-side catalog (static mock data, no CMS localStorage overrides)
   CANNOT resolve, because the caller now supplies a full book snapshot.
   └────────────────────────────────────────────────────────────────── */

const { mockAddToCart, mockGetCart, mockClearCart } = await import(
  "../mock-cart"
);

describe("mock-cart — book snapshot (admin-created book regression)", () => {
  beforeEach(() => {
    mockClearCart();
    vi.clearAllMocks();
  });

  it("accepts a caller-supplied snapshot for a book the catalog cannot resolve", async () => {
    // `book-admin-123` deliberately does NOT exist in MOCK_BOOKS_DATA or the
    // mock CMS store. Before the fix, mockAddToCart resolved only against the
    // catalog and threw "Book not found." — exactly the bug for admin-created
    // books, because server functions see an empty CMS override store.
    const bookId = "book-admin-123";
    const book = {
      id: bookId,
      title_en: "Admin-Created Book",
      title_bn: "অ্যাডমিন বই",
      slug: "admin-created-book",
      cover_image: "https://example.com/cover.jpg",
      price: 19.99,
      is_free: false,
      author_name: "Demo Admin",
    };

    const result = await mockAddToCart(bookId, book);
    expect(result).toEqual({ message: "Added to cart.", alreadyInCart: false });

    const cart = await mockGetCart();
    expect(cart.itemCount).toBe(1);
    expect(cart.items[0].book_id).toBe(bookId);
    // Enrichment comes from the stored snapshot, not a server catalog lookup,
    // so title/price/slug are all present for the unresolvable book.
    expect(cart.items[0].book_title_en).toBe("Admin-Created Book");
    expect(cart.items[0].book_price).toBe(19.99);
    expect(cart.items[0].book_slug).toBe("admin-created-book");
    expect(cart.totalPrice).toBe(19.99);
  });

  it("still rejects a book with no snapshot and no catalog entry (Book not found)", async () => {
    await expect(mockAddToCart("book-nope")).rejects.toThrow("Book not found.");
  });

  it("still rejects free books even when a snapshot is provided", async () => {
    const book = {
      id: "book-free-x",
      title_en: "Free Guide",
      title_bn: "ফ্রি গাইড",
      slug: "free-guide",
      cover_image: null,
      price: 0,
      is_free: true,
      author_name: null,
    };
    await expect(mockAddToCart("book-free-x", book)).rejects.toThrow(
      "Free books are automatically accessible. Use the Read button instead.",
    );
    expect((await mockGetCart()).itemCount).toBe(0);
  });

  it("duplicate add returns alreadyInCart using a snapshot", async () => {
    const bookId = "book-dup";
    const book = {
      id: bookId,
      title_en: "Dup",
      title_bn: null,
      slug: "dup",
      cover_image: null,
      price: 5,
      is_free: false,
      author_name: null,
    };
    await mockAddToCart(bookId, book);
    const result = await mockAddToCart(bookId, book);
    expect(result).toEqual({ message: "Book is already in your cart.", alreadyInCart: true });
    expect((await mockGetCart()).itemCount).toBe(1);
  });

  it("falls back to the catalog when no snapshot is supplied", async () => {
    // book-2 is a paid book in MOCK_BOOKS_DATA — resolved from the catalog.
    const result = await mockAddToCart("book-2");
    expect(result).toEqual({ message: "Added to cart.", alreadyInCart: false });
    const cart = await mockGetCart();
    expect(cart.items[0].book_id).toBe("book-2");
    expect(cart.items[0].book_title_en).toBeTruthy();
  });
});