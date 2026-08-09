/**
 * Mock cart — localStorage-based fallback for frontend dev without Supabase.
 * Same API shape as the real cart, but persists to localStorage.
 */

import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { mockRecordOrder } from "@/lib/mock-commerce";

const CART_KEY = "sabbe-satta-cart";

/**
 * Minimal book snapshot carried inside a cart item.
 *
 * Server functions have no access to the browser's localStorage `mock-cms`
 * overrides, so admin-created (CMS) books can't be resolved from a catalog
 * lookup server-side. Forcing the caller to pass the full book and snapshotting
 * it here lets add-to-cart, cart enrichment, and checkout all work for ANY
 * book the client displays — base or admin-created — without a server lookup.
 */
export interface MockCartBookSnapshot {
  id: string;
  title_en: string | null;
  title_bn: string | null;
  slug: string;
  cover_image: string | null;
  price: number;
  is_free: boolean;
  author_name: string | null;
}

interface StoredCartItem {
  id: string;
  bookId: string;
  addedAt: string;
  /** Book snapshot captured at add time (SSR-safe source of truth). */
  book?: MockCartBookSnapshot;
}

/** Coerce a Book to the snapshot shape (id must match bookId). */
function toSnapshot(bookId: string, book: MockCartBookSnapshot): MockCartBookSnapshot {
  return {
    id: book.id || bookId,
    title_en: book.title_en ?? null,
    title_bn: book.title_bn ?? null,
    slug: book.slug ?? "",
    cover_image: book.cover_image ?? null,
    price: Number(book.price) || 0,
    is_free: !!book.is_free,
    author_name: book.author_name ?? null,
  };
}

/**
 * In-memory fallback store so the mock cart survives server-function calls
 * in dev (where `localStorage` doesn't exist on the server). The browser
 * path still uses localStorage for cross-session persistence.
 */
const memoryCart: StoredCartItem[] = [];

function readCart(): StoredCartItem[] {
  if (typeof window === "undefined") return [...memoryCart];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(items: StoredCartItem[]) {
  if (typeof window === "undefined") {
    memoryCart.length = 0;
    memoryCart.push(...items);
    return;
  }
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function generateId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function mockAddToCart(
  bookId: string,
  book?: MockCartBookSnapshot,
) {
  // Prefer the caller-provided snapshot (works for admin-created books the
  // server's catalog store can't see). Fall back to a catalog lookup only when
  // no snapshot was supplied.
  const resolved =
    book && book.id === bookId
      ? toSnapshot(bookId, book)
      : await resolveMockBook(bookId);
  if (!resolved) throw new Error("Book not found.");
  if (resolved.is_free)
    throw new Error("Free books are automatically accessible. Use the Read button instead.");

  const items = readCart();
  if (items.some((i) => i.bookId === bookId)) {
    return { message: "Book is already in your cart.", alreadyInCart: true };
  }

  items.push({
    id: generateId(),
    bookId,
    addedAt: new Date().toISOString(),
    book: resolved,
  });
  writeCart(items);
  return { message: "Added to cart.", alreadyInCart: false };
}

/** Resolve a book from the mock catalog (server-side view — no CMS overrides). */
async function resolveMockBook(
  bookId: string,
): Promise<MockCartBookSnapshot | null> {
  const books = await mockFetchPublishedBooks(1, 100);
  const book = books.data.find((b) => b.id === bookId);
  if (!book) return null;
  return toSnapshot(bookId, book);
}

export async function mockRemoveFromCart(cartItemId: string) {
  const items = readCart();
  const idx = items.findIndex((i) => i.id === cartItemId);
  if (idx === -1) throw new Error("Cart item not found.");
  items.splice(idx, 1);
  writeCart(items);
  return { message: "Removed from cart." };
}

export async function mockClearCart() {
  writeCart([]);
  return { message: "Cart cleared." };
}

export async function mockGetCart() {
  const items = readCart();
  if (!items.length) {
    return { id: "mock-cart", items: [], itemCount: 0, totalPrice: 0 };
  }

  const books = await mockFetchPublishedBooks(1, 100);
  const bookMap = new Map(books.data.map((b) => [b.id, b]));

  const cartItems = items.map((item) => {
    // Prefer the snapshot captured at add time (works for admin-created books
    // the server catalog may not know); fall back to a catalog lookup only for
    // legacy cart items stored before snapshots existed.
    const snap = item.book;
    const fallback = bookMap.get(item.bookId);
    const book = snap ?? (fallback ? toSnapshot(item.bookId, fallback) : undefined);
    return {
      id: item.id,
      cart_id: "mock-cart",
      book_id: item.bookId,
      created_at: item.addedAt,
      book_title_en: book?.title_en ?? null,
      book_title_bn: book?.title_bn ?? null,
      book_slug: book?.slug ?? "",
      book_cover: book?.cover_image ?? null,
      book_price: book?.price ?? 0,
      book_is_free: book?.is_free ?? false,
      book_author: book?.author_name ?? null,
    };
  });

  const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.book_price), 0);

  return {
    id: "mock-cart",
    items: cartItems,
    itemCount: cartItems.length,
    totalPrice,
  };
}

export async function mockGetCartCount() {
  return { count: readCart().length };
}

/* ─── Checkout (M2 Commerce) ────────────────────────────────────── */

/**
 * Simulate a cart checkout: record an order + purchases from the current
 * cart, then clear it. Returns the created order (mirrors checkoutCart).
 *
 * @param discount - optional coupon discount (applied to the order total;
 *   per-book purchase amounts keep their full price).
 * @param taxRate - optional sales-tax percentage applied to the post-discount
 *   subtotal and stored on the order.
 */
export async function mockCheckout(userId: string, discount = 0, taxRate = 0) {
  const cart = await mockGetCart();
  if (cart.itemCount === 0) throw new Error("Your cart is empty.");

  const items = cart.items.map((item) => ({
    bookId: item.book_id,
    titleEn: item.book_title_en,
    titleBn: item.book_title_bn,
    price: Number(item.book_price),
  }));

  const order = await mockRecordOrder(userId, items, discount, taxRate);
  await mockClearCart();
  return { order, itemCount: order.items.length, total: order.total };
}
