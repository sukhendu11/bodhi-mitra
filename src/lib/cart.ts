import { createServerFn } from "@tanstack/react-start";
import { requireAuthOrMock } from "@/lib/mock-auth";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import {
  mockAddToCart,
  mockRemoveFromCart,
  mockClearCart,
  mockGetCart,
  mockGetCartCount,
} from "@/lib/mock-cart";
import { getPaymentProvider } from "@/lib/payments";
import { createPaymentOrder, fulfillOrder } from "@/lib/payments/orders";
import { getServerSiteUrl } from "@/lib/site-url";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface CartItem {
  id: string;
  cart_id: string;
  book_id: string;
  created_at: string;
  book_title_en: string | null;
  book_title_bn: string | null;
  book_slug: string;
  book_cover: string | null;
  book_price: number;
  book_is_free: boolean;
  book_author: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
}

/* ─── Helper: get the user's cart (create if not exists) ───────── */

async function getOrCreateCart(supabase: any, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: newCart, error } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return newCart.id;
}

/* ─── Add to cart ──────────────────────────────────────────────── */

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({ context, data }: { context: { userId: string | null; supabase: any }; data: unknown }) => {
      const { supabase, userId } = context;
      const input = data as { bookId: string; book?: MockCartBookSnapshot };

      // Mock mode (no Supabase / guest) — localStorage cart. The client supplies
      // the full book so admin-created books (unknown to the server catalog)
      // work too.
      if (!supabase || !userId) {
        return mockAddToCart(input.bookId, input.book);
      }

      // Verify book exists (business logic — always runs)
      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select("id, is_free, price")
        .eq("id", input.bookId)
        .maybeSingle();

      // Supabase unavailable — fall back to mock cart
      if (bookErr && (bookErr.code === "42P01" || bookErr.message?.includes("fetch"))) {
        return mockAddToCart(input.bookId, input.book);
      }

      if (!book) throw new Error("Book not found.");
      if (book.is_free)
        throw new Error("Free books are automatically accessible. Use the Read button instead.");

      // Insert cart item
      const cartId = await getOrCreateCart(supabase, userId);

      const { error } = await supabase
        .from("cart_items")
        .insert({ cart_id: cartId, book_id: input.bookId });

      if (error) {
        if (error.code === "23505") {
          return { message: "Book is already in your cart.", alreadyInCart: true };
        }
        throw new Error(error.message);
      }

      return { message: "Added to cart.", alreadyInCart: false };
    },
  );

/* ─── Remove from cart ─────────────────────────────────────────── */

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({ context, data }: { context: { userId: string | null; supabase: any }; data: unknown }) => {
      const { supabase, userId } = context;
      const input = data as { cartItemId: string };

      // Mock mode — localStorage cart
      if (!supabase || !userId) {
        return mockRemoveFromCart(input.cartItemId);
      }

      // Verify the cart item belongs to this user
      const { data: item, error: itemErr } = await supabase
        .from("cart_items")
        .select("id, cart_id")
        .eq("id", input.cartItemId)
        .maybeSingle();

      // Supabase unavailable — fall back to mock
      if (itemErr && (itemErr.code === "42P01" || itemErr.message?.includes("fetch"))) {
        return mockRemoveFromCart(input.cartItemId);
      }

      if (!item) throw new Error("Cart item not found.");

      const { data: cart } = await supabase
        .from("carts")
        .select("user_id")
        .eq("id", item.cart_id)
        .single();

      if (cart?.user_id !== userId) throw new Error("Not authorized.");

      const { error } = await supabase.from("cart_items").delete().eq("id", input.cartItemId);

      if (error) throw new Error(error.message);
      return { message: "Removed from cart." };
    },
  );

/* ─── Clear cart ───────────────────────────────────────────────── */

export const clearCart = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(async ({ context }: { context: { userId: string | null; supabase: any } }) => {
    const { supabase, userId } = context;

    // Mock mode — localStorage cart
    if (!supabase || !userId) {
      return mockClearCart();
    }

    const { data: cart, error: cartErr } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Supabase unavailable — fall back to mock
    if (cartErr && (cartErr.code === "42P01" || cartErr.message?.includes("fetch"))) {
      return mockClearCart();
    }

    if (!cart) return { message: "Cart is already empty." };

    const { error } = await supabase.from("cart_items").delete().eq("cart_id", cart.id);

    if (error) throw new Error(error.message);
    return { message: "Cart cleared." };
  });

/* ─── Get cart with enriched book data ─────────────────────────── */

export const getCart = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(async ({ context }: { context: { userId: string | null; supabase: any } }) => {
    const { supabase, userId } = context;

    // Mock mode — localStorage cart
    if (!supabase || !userId) {
      return mockGetCart() as any;
    }

    const { data: cart, error: cartErr } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Supabase unavailable — fall back to mock
    if (cartErr && (cartErr.code === "42P01" || cartErr.message?.includes("fetch"))) {
      return mockGetCart() as any;
    }

    if (!cart) {
      return { id: "", items: [], itemCount: 0, totalPrice: 0 } satisfies Cart;
    }

    const { data: items } = await supabase
      .from("cart_items")
      .select("id, cart_id, book_id, created_at")
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: false });

    if (!items?.length) {
      return { id: cart.id, items: [], itemCount: 0, totalPrice: 0 } satisfies Cart;
    }

    // Fetch book details for each item
    const bookIds: string[] = items.map((i: any) => i.book_id);
    const { data: books } = await supabase
      .from("books")
      .select("id, title_en, title_bn, slug, cover_image, price, is_free, author")
      .in("id", bookIds);

    const bookMap = new Map<string, Record<string, any>>();
    (books ?? []).forEach((b: any) => bookMap.set(b.id, b));

    const cartItems: CartItem[] = items.map((item: any) => {
      const book = bookMap.get(item.book_id) ?? ({} as Record<string, any>);
      return {
        id: item.id,
        cart_id: item.cart_id,
        book_id: item.book_id,
        created_at: item.created_at,
        book_title_en: book.title_en ?? null,
        book_title_bn: book.title_bn ?? null,
        book_slug: book.slug ?? "",
        book_cover: book.cover_image ?? null,
        book_price: book.price ?? 0,
        book_is_free: book.is_free ?? false,
        book_author: book.author ?? null,
      };
    });

    const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.book_price), 0);

    return {
      id: cart.id,
      items: cartItems,
      itemCount: cartItems.length,
      totalPrice,
    } satisfies Cart;
  });

/* ─── Get cart item count (lightweight, for badge) ─────────────── */

export const getCartCount = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(async ({ context }: { context: { userId: string | null; supabase: any } }) => {
    const { supabase, userId } = context;

    // Mock mode — localStorage cart count
    if (!supabase || !userId) {
      return mockGetCartCount();
    }

    const { data: cart, error: cartErr } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Supabase unavailable — fall back to mock
    if (cartErr && (cartErr.code === "42P01" || cartErr.message?.includes("fetch"))) {
      return mockGetCartCount();
    }

    if (!cart) return { count: 0 };

    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("cart_id", cart.id);

    return { count: count ?? 0 };
  });

/* ─── Cart checkout (provider-agnostic — AD-026) ───────────────── */

/**
 * Initiate checkout for all cart items through the ACTIVE payment provider:
 *
 *   1. Loads the cart (mock or Supabase) and validates it
 *   2. Creates a server-side `pending` order (order state lives on the server)
 *   3. Asks the provider to create the payment:
 *        simulated → `{ simulated: true, orderId, amount }` (inline form)
 *        piprapay  → `{ url }` (redirect to hosted checkout)
 *
 * The cart is NOT cleared here — fulfillment happens only after payment is
 * verified (`completeMockCheckout` for simulated, or the webhook for
 * redirect providers).
 */
export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { userId: string | null; supabase: any };
      data: unknown;
    }) => {
      const { supabase, userId } = context;
      const input = (data ?? {}) as {
        discount?: number;
        taxRate?: number;
        couponId?: string;
      };
      const discount = input.discount ?? 0;
      const taxRate = input.taxRate ?? 0;
      const couponId = input.couponId ?? null;

      // Mock mode — cart lives in the mock store; the server fn reads it
      // from the shared server-side memory (same as the UI's getCart).
      if (!supabase || !userId) {
        const uid = userId ?? "";
        if (!uid) throw new Error("Sign in to start checkout.");
        const cart = await mockGetCart();
        if (cart.itemCount === 0) throw new Error("Your cart is empty.");

        const order = await createPaymentOrder({
          userId: uid,
          provider: getPaymentProvider().id,
          discount,
          taxRate,
          couponId,
          items: cart.items.map((i) => ({
            bookId: i.book_id,
            titleEn: i.book_title_en,
            titleBn: i.book_title_bn,
            price: Number(i.book_price),
          })),
        });

        const result = await getPaymentProvider().createPayment({
          orderId: order.id,
          userId: uid,
          items: order.items,
          amount: order.total,
          discount: order.discount,
          tax: order.tax,
          currency: order.currency,
          successUrl: `${getServerSiteUrl()}/checkout/success`,
          cancelUrl: `${getServerSiteUrl()}/cart?checkout=cancel`,
          couponId,
        });

        if (result.kind === "redirect") return { url: result.url };
        return { simulated: true, orderId: result.orderId, amount: result.amount };
      }

      // Real mode — cart lives in Supabase.
      const { data: cart, error: cartErr } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      // Supabase unavailable — simulated checkout via mock cart
      if (cartErr && (cartErr.code === "42P01" || cartErr.message?.includes("fetch"))) {
        const uid = userId ?? "";
        if (!uid) throw new Error("Sign in to start checkout.");
        const mock = await mockGetCart();
        if (mock.itemCount === 0) throw new Error("Your cart is empty.");

        const order = await createPaymentOrder({
          userId: uid,
          provider: getPaymentProvider().id,
          discount,
          taxRate,
          couponId,
          items: mock.items.map((i) => ({
            bookId: i.book_id,
            titleEn: i.book_title_en,
            titleBn: i.book_title_bn,
            price: Number(i.book_price),
          })),
        });
        const result = await getPaymentProvider().createPayment({
          orderId: order.id,
          userId: uid,
          items: order.items,
          amount: order.total,
          discount: order.discount,
          tax: order.tax,
          currency: order.currency,
          successUrl: `${getServerSiteUrl()}/checkout/success`,
          cancelUrl: `${getServerSiteUrl()}/cart?checkout=cancel`,
          couponId,
        });
        if (result.kind === "redirect") return { url: result.url };
        return { simulated: true, orderId: result.orderId, amount: result.amount };
      }

      if (!cart) throw new Error("Your cart is empty.");

      const { data: items } = await supabase
        .from("cart_items")
        .select("book_id")
        .eq("cart_id", cart.id);

      if (!items?.length) throw new Error("Your cart is empty.");

      // Get book details
      const bookIds: string[] = items.map((i: any) => i.book_id);
      const { data: books } = await supabase
        .from("books")
        .select("id, slug, title_en, title_bn, price, is_free")
        .in("id", bookIds);

      if (!books?.length) throw new Error("No valid books in cart.");

      // Filter out free books (they should be purchased directly, not via checkout)
      const paidBooks = books.filter((b: any) => !b.is_free);
      if (paidBooks.length === 0)
        throw new Error("All items in your cart are free. Use the Read button instead.");

      // Create the server-side pending order, then ask the provider to pay.
      const uid = userId ?? "";
      if (!uid) throw new Error("Sign in to start checkout.");
      const order = await createPaymentOrder({
        userId: uid,
        provider: getPaymentProvider().id,
        discount,
        taxRate,
        couponId,
        items: paidBooks.map((b: any) => ({
          bookId: b.id,
          titleEn: b.title_en ?? null,
          titleBn: b.title_bn ?? null,
          price: Number(b.price),
        })),
      });

      const result = await getPaymentProvider().createPayment({
        orderId: order.id,
        userId: uid,
        items: order.items,
        amount: order.total,
        discount: order.discount,
        tax: order.tax,
        currency: order.currency,
        successUrl: `${getServerSiteUrl()}/checkout/success`,
        cancelUrl: `${getServerSiteUrl()}/cart?checkout=cancel`,
        couponId,
      });

      if (result.kind === "redirect") return { url: result.url };
      return { simulated: true, orderId: result.orderId, amount: result.amount };
    },
  );

/* ─── Complete a simulated checkout ────────────────────────────── */

/**
 * Complete a checkout whose payment was verified through the SIMULATED
 * provider: fulfills the server-side pending order (grants purchases, clears
 * the cart, notifies). With the simulated provider the user never leaves the
 * site, so this server fn plays the role the webhook plays for redirect
 * providers — it is the "payment verified" signal.
 *
 * If no `orderId` is supplied (legacy /checkout route), a pending order is
 * created from the current cart first, then fulfilled.
 *
 * NOTE: only valid when the active provider is `simulated`; redirect
 * providers are completed via `/api/payments/webhook` instead.
 */
export const completeMockCheckout = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: any; userId: string | null };
      data: unknown;
    }) => {
      const { userId } = context;
      const input = data as {
        userId?: string;
        orderId?: string;
        discount?: number;
        taxRate?: number;
      };

      if (getPaymentProvider().id !== "simulated") {
        throw new Error(
          "This checkout is completed by the payment gateway. Complete payment at the gateway instead.",
        );
      }

      // Mock trust boundary: server functions in mock mode have no real
      // JWT, so the client passes the demo userId for attribution. The
      // cart UI already requires a signed-in user, so require it here too.
      const uid = userId ?? input.userId;
      if (!uid) throw new Error("Sign in to complete checkout.");

      let orderId = input.orderId;

      // Legacy path (no order initiated yet — e.g. the /checkout page):
      // build a pending order from the current cart, then fulfill it.
      if (!orderId) {
        const cart = await mockGetCart();
        if (cart.itemCount === 0) throw new Error("Your cart is empty.");
        const order = await createPaymentOrder({
          userId: uid,
          provider: "simulated",
          discount: input.discount ?? 0,
          taxRate: input.taxRate ?? 0,
          items: cart.items.map((i) => ({
            bookId: i.book_id,
            titleEn: i.book_title_en,
            titleBn: i.book_title_bn,
            price: Number(i.book_price),
          })),
        });
        orderId = order.id;
      }

      const result = await fulfillOrder(orderId);
      if (!result.order) throw new Error("Order not found. Please start checkout again.");

      return {
        order: result.order,
        itemCount: result.order.items.length,
        total: result.order.total,
      };
    },
  );
