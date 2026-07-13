import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeClient } from "@/integrations/stripe/server";
import {
  CHECKOUT_CART_SUCCESS_URL,
  CHECKOUT_CART_CANCEL_URL,
  STRIPE_PRICE_CURRENCY,
} from "@/integrations/stripe/config";

interface CheckoutItem {
  bookId: string;
  bookSlug: string;
  title: string;
  price: number;
}

/**
 * Create a Stripe Checkout Session for one or more books.
 *
 * Accepts either:
 *   - { bookId, bookSlug } (single-book checkout from books.tsx / books.$slug.tsx)
 *   - { items: CheckoutItem[] } (multi-item cart checkout from cart.tsx)
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context, data }: { context: { userId: string; supabase: any }; data: unknown }) => {
      const { userId, supabase } = context;
      const input = data as { bookId?: string; bookSlug?: string; items?: CheckoutItem[] };

      let items: CheckoutItem[] = [];
      let metadata: Record<string, string> = { user_id: userId };

      if (input.items && input.items.length > 0) {
        // Multi-item cart checkout — store all book IDs as comma-separated for webhook
        items = input.items;
        metadata.cart_checkout = "true";
        metadata.item_count = String(items.length);
        metadata.book_ids = items.map((i) => i.bookId).join(",");
      } else if (input.bookId) {
        // Single-book checkout (backward compatible)
        const { data: book } = await supabase
          .from("books")
          .select("id, title_en, title_bn, price, is_free, slug")
          .eq("id", input.bookId)
          .maybeSingle();

        if (!book) throw new Error("Book not found.");
        if (book.is_free)
          throw new Error("This book is free. Use the direct purchase button instead.");

        const title = book.title_en || book.title_bn || "Book";
        const price = Number(book.price);
        if (price <= 0) throw new Error("Invalid book price.");

        items = [{ bookId: book.id, bookSlug: book.slug || input.bookSlug || "", title, price }];
        metadata.book_id = book.id;
      } else {
        throw new Error("No items to checkout.");
      }

      // Build line items
      const line_items = items.map((item) => ({
        price_data: {
          currency: STRIPE_PRICE_CURRENCY,
          product_data: { name: item.title },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      }));

      const stripe = getStripeClient();

      const firstSlug = items[0]?.bookSlug || "";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: userId,
        metadata,
        line_items,
        success_url: CHECKOUT_CART_SUCCESS_URL(firstSlug),
        cancel_url: CHECKOUT_CART_CANCEL_URL(firstSlug),
      });

      return { url: session.url };
    },
  );
