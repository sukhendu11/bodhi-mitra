import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string; supabase: any }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { bookId: string };

    // Verify book exists
    const { data: book } = await supabase
      .from("books")
      .select("id, is_free, price")
      .eq("id", input.bookId)
      .maybeSingle();

    if (!book) throw new Error("Book not found.");
    if (book.is_free) throw new Error("Free books are automatically accessible. Use the Read button instead.");

    const cartId = await getOrCreateCart(supabase, userId);

    // Insert cart item (unique constraint handles duplicates)
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
  });

/* ─── Remove from cart ─────────────────────────────────────────── */

export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string; supabase: any }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { cartItemId: string };

    // Verify the cart item belongs to this user
    const { data: item } = await supabase
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", input.cartItemId)
      .maybeSingle();

    if (!item) throw new Error("Cart item not found.");

    const { data: cart } = await supabase
      .from("carts")
      .select("user_id")
      .eq("id", item.cart_id)
      .single();

    if (cart?.user_id !== userId) throw new Error("Not authorized.");

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", input.cartItemId);

    if (error) throw new Error(error.message);
    return { message: "Removed from cart." };
  });

/* ─── Clear cart ───────────────────────────────────────────────── */

export const clearCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId: string; supabase: any } }) => {
    const { supabase, userId } = context;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cart) return { message: "Cart is already empty." };

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (error) throw new Error(error.message);
    return { message: "Cart cleared." };
  });

/* ─── Get cart with enriched book data ─────────────────────────── */

export const getCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId: string; supabase: any } }) => {
    const { supabase, userId } = context;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId: string; supabase: any } }) => {
    const { supabase, userId } = context;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cart) return { count: 0 };

    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("cart_id", cart.id);

    return { count: count ?? 0 };
  });

/* ─── Cart checkout (create Stripe Checkout Session for all items) ─── */

export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { userId: string; supabase: any } }) => {
    const { supabase, userId } = context;

    // Get cart with items
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

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
    if (paidBooks.length === 0) throw new Error("All items in your cart are free. Use the Read button instead.");

    // Create Stripe Checkout Session with all items
    const { createCheckoutSession } = await import("@/lib/stripe-checkout");
    const result = await (createCheckoutSession as any)({
      data: { items: paidBooks.map((b: any) => ({ bookId: b.id, bookSlug: b.slug, title: b.title_en || b.title_bn || "Book", price: b.price })) },
    });

    return { url: result.url };
  });
