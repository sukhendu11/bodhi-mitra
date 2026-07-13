import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({
    headers: new Map([["authorization", "Bearer test-token"]]),
  }),
}));

/* ─── Mock Stripe checkout (used by checkoutCart) ──────────────── */

vi.mock("@/lib/stripe-checkout", () => ({
  createCheckoutSession: vi.fn(({ data }: any) =>
    Promise.resolve({ url: "https://checkout.stripe.com/session_123" }),
  ),
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

  const methods = [
    "select",
    "eq",
    "in",
    "or",
    "order",
    "range",
    "maybeSingle",
    "single",
    "delete",
    "limit",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);

  return chain;
}

function createMockSupabase() {
  return { from: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── Import after mocks are set up ────────────────────────────── */

const { addToCart, removeFromCart, clearCart, getCart, getCartCount, checkoutCart } = (await import(
  "../cart"
)) as any;

/* ════════════════════════════════════════════════════════════════════
   addToCart
   ════════════════════════════════════════════════════════════════════ */

describe("addToCart", () => {
  it("adds a paid book to cart successfully", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "book-1", is_free: false, price: 9.99 }, error: null });
    chains[1].__setResult({ data: { id: "cart-1" }, error: null });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await addToCart({
      context: { userId: "user-1", supabase },
      data: { bookId: "book-1" },
    });

    expect(result).toEqual({ message: "Added to cart.", alreadyInCart: false });
    expect(supabase.from).toHaveBeenCalledTimes(3);
    expect(supabase.from).toHaveBeenNthCalledWith(1, "books");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "carts");
    expect(supabase.from).toHaveBeenNthCalledWith(3, "cart_items");
  });

  it("creates a new cart if one doesn't exist", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "book-1", is_free: false, price: 9.99 }, error: null });
    chains[1].__setResult({ data: null, error: null }); // no existing cart
    chains[2].__setResult({ data: { id: "new-cart" }, error: null }); // created
    chains[3].__setResult({ data: null, error: null }); // insert success

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await addToCart({
      context: { userId: "user-1", supabase },
      data: { bookId: "book-1" },
    });

    expect(result).toEqual({ message: "Added to cart.", alreadyInCart: false });
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });

  it("throws error when book is not found", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      addToCart({
        context: { userId: "user-1", supabase },
        data: { bookId: "nonexistent" },
      }),
    ).rejects.toThrow("Book not found.");
  });

  it("throws error when book is free", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: { id: "free-book", is_free: true, price: 0 }, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      addToCart({
        context: { userId: "user-1", supabase },
        data: { bookId: "free-book" },
      }),
    ).rejects.toThrow("Free books are automatically accessible. Use the Read button instead.");
  });

  // Success path — throws on cart creation error
  it("throws on cart creation error", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "book-1", is_free: false, price: 9.99 }, error: null });
    chains[1].__setResult({ data: null, error: null }); // no cart found
    chains[2].__setResult({
      data: null,
      error: { code: "42P01", message: "relation not found", details: "", hint: "" },
    }); // insert fails on cart creation

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      addToCart({
        context: { userId: "user-1", supabase },
        data: { bookId: "book-1" },
      }),
    ).rejects.toThrow("relation not found");
  });

  it("returns alreadyInCart on duplicate cart item (23505)", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "book-1", is_free: false, price: 9.99 }, error: null });
    chains[1].__setResult({ data: { id: "cart-1" }, error: null });
    chains[2].__setResult({
      data: null,
      error: { code: "23505", message: "duplicate key", details: "", hint: "" },
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await addToCart({
      context: { userId: "user-1", supabase },
      data: { bookId: "book-1" },
    });

    expect(result).toEqual({ message: "Book is already in your cart.", alreadyInCart: true });
  });
});

/* ════════════════════════════════════════════════════════════════════
   removeFromCart
   ════════════════════════════════════════════════════════════════════ */

describe("removeFromCart", () => {
  it("removes a cart item successfully", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "item-1", cart_id: "cart-1" }, error: null });
    chains[1].__setResult({ data: { user_id: "user-1" }, error: null });
    chains[2].__setResult({ data: null, error: null });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await removeFromCart({
      context: { userId: "user-1", supabase },
      data: { cartItemId: "item-1" },
    });

    expect(result).toEqual({ message: "Removed from cart." });
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });

  it("throws error when cart item not found", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      removeFromCart({
        context: { userId: "user-1", supabase },
        data: { cartItemId: "nonexistent" },
      }),
    ).rejects.toThrow("Cart item not found.");
  });

  it("throws error when cart belongs to another user", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "item-1", cart_id: "cart-1" }, error: null });
    chains[1].__setResult({ data: { user_id: "other-user" }, error: null }); // different user

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      removeFromCart({
        context: { userId: "user-1", supabase },
        data: { cartItemId: "item-1" },
      }),
    ).rejects.toThrow("Not authorized.");
  });

  it("throws error on database delete error", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "item-1", cart_id: "cart-1" }, error: null });
    chains[1].__setResult({ data: { user_id: "user-1" }, error: null });
    chains[2].__setResult({
      data: null,
      error: { code: "42P01", message: "delete failed", details: "", hint: "" },
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      removeFromCart({
        context: { userId: "user-1", supabase },
        data: { cartItemId: "item-1" },
      }),
    ).rejects.toThrow("delete failed");
  });
});

/* ════════════════════════════════════════════════════════════════════
   clearCart
   ════════════════════════════════════════════════════════════════════ */

describe("clearCart", () => {
  it("clears cart items successfully", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ data: null, error: null });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await clearCart({
      context: { userId: "user-1", supabase },
    });

    expect(result).toEqual({ message: "Cart cleared." });
    expect(supabase.from).toHaveBeenNthCalledWith(1, "carts");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "cart_items");
  });

  it("returns empty message when no cart exists", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await clearCart({
      context: { userId: "user-1", supabase },
    });

    expect(result).toEqual({ message: "Cart is already empty." });
  });

  it("throws on delete error", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: null,
      error: { code: "42P01", message: "delete error", details: "", hint: "" },
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      clearCart({
        context: { userId: "user-1", supabase },
      }),
    ).rejects.toThrow("delete error");
  });
});

/* ════════════════════════════════════════════════════════════════════
   getCart
   ════════════════════════════════════════════════════════════════════ */

describe("getCart", () => {
  it("returns empty cart when no cart exists", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await getCart({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ id: "", items: [], itemCount: 0, totalPrice: 0 });
  });

  it("returns empty items when cart has no items", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ data: null, error: null }); // no items — null

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCart({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ id: "cart-1", items: [], itemCount: 0, totalPrice: 0 });
  });

  it("returns empty items when items array is empty", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ data: [], error: null }); // empty array

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCart({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ id: "cart-1", items: [], itemCount: 0, totalPrice: 0 });
  });

  it("enriches cart items with book data and calculates total", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: [
        { id: "item-1", cart_id: "cart-1", book_id: "book-1", created_at: "2026-01-01T00:00:00Z" },
        { id: "item-2", cart_id: "cart-1", book_id: "book-2", created_at: "2026-01-02T00:00:00Z" },
      ],
      error: null,
    });
    chains[2].__setResult({
      data: [
        {
          id: "book-1",
          title_en: "First Book",
          title_bn: null,
          slug: "first-book",
          cover_image: "cover1.jpg",
          price: 9.99,
          is_free: false,
          author: "Author One",
        },
        {
          id: "book-2",
          title_en: "Second Book",
          title_bn: null,
          slug: "second-book",
          cover_image: null,
          price: 14.99,
          is_free: false,
          author: null,
        },
      ],
      error: null,
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCart({ context: { userId: "user-1", supabase } });

    expect(result.id).toBe("cart-1");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].book_title_en).toBe("First Book");
    expect(result.items[0].book_price).toBe(9.99);
    expect(result.items[0].book_author).toBe("Author One");
    expect(result.items[1].book_title_en).toBe("Second Book");
    expect(result.items[1].book_price).toBe(14.99);
    expect(result.items[1].book_author).toBeNull();
    expect(result.totalPrice).toBeCloseTo(24.98);
    expect(result.itemCount).toBe(2);
  });

  it("handles missing book data gracefully", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: [
        { id: "item-1", cart_id: "cart-1", book_id: "missing-book", created_at: "2026-01-01T00:00:00Z" },
      ],
      error: null,
    });
    chains[2].__setResult({
      data: [], // book not found
      error: null,
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCart({ context: { userId: "user-1", supabase } });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].book_title_en).toBeNull();
    expect(result.items[0].book_slug).toBe("");
    expect(result.items[0].book_price).toBe(0);
    expect(result.items[0].book_is_free).toBe(false);
    expect(result.totalPrice).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════════
   getCartCount
   ════════════════════════════════════════════════════════════════════ */

describe("getCartCount", () => {
  it("returns 0 when no cart exists", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await getCartCount({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ count: 0 });
  });

  it("returns correct item count", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ count: 3, data: null, error: null });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCartCount({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ count: 3 });
  });

  it("handles null count from database", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ count: null, data: null, error: null });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await getCartCount({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ count: 0 });
  });
});

/* ════════════════════════════════════════════════════════════════════
   checkoutCart
   ════════════════════════════════════════════════════════════════════ */

describe("checkoutCart", () => {
  it("creates a Stripe Checkout Session with paid items", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: [{ book_id: "book-1" }, { book_id: "book-2" }],
      error: null,
    });
    chains[2].__setResult({
      data: [
        { id: "book-1", slug: "first-book", title_en: "First Book", price: 9.99, is_free: false },
        { id: "book-2", slug: "second-book", title_en: "Second Book", price: 14.99, is_free: false },
      ],
      error: null,
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    const result = await checkoutCart({ context: { userId: "user-1", supabase } });
    expect(result).toEqual({ url: "https://checkout.stripe.com/session_123" });
  });

  it("throws error when cart is empty (no cart)", async () => {
    const supabase = createMockSupabase();
    const chain = makeChainable();
    chain.__setResult({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      checkoutCart({ context: { userId: "user-1", supabase } }),
    ).rejects.toThrow("Your cart is empty.");
  });

  it("throws error when cart has no items", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({ data: null, error: null }); // no items

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      checkoutCart({ context: { userId: "user-1", supabase } }),
    ).rejects.toThrow("Your cart is empty.");
  });

  it("throws error when all books are free", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: [{ book_id: "free-1" }, { book_id: "free-2" }],
      error: null,
    });
    chains[2].__setResult({
      data: [
        { id: "free-1", slug: "free-book", title_en: "Free Book", price: 0, is_free: true },
        { id: "free-2", slug: "another-free", title_en: "Another Free", price: 0, is_free: true },
      ],
      error: null,
    });

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      checkoutCart({ context: { userId: "user-1", supabase } }),
    ).rejects.toThrow("All items in your cart are free. Use the Read button instead.");
  });

  it("throws error when no valid books found", async () => {
    const supabase = createMockSupabase();
    const chains = [makeChainable(), makeChainable(), makeChainable()];

    chains[0].__setResult({ data: { id: "cart-1" }, error: null });
    chains[1].__setResult({
      data: [{ book_id: "book-1" }],
      error: null,
    });
    chains[2].__setResult({ data: null, error: null }); // books query returns null

    let callIdx = 0;
    supabase.from.mockImplementation(() => chains[callIdx++]);

    await expect(
      checkoutCart({ context: { userId: "user-1", supabase } }),
    ).rejects.toThrow("No valid books in cart.");
  });
});
