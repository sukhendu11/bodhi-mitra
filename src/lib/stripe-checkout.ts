import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripeClient } from "@/integrations/stripe/server";
import { CHECKOUT_SUCCESS_URL, CHECKOUT_CANCEL_URL, STRIPE_PRICE_CURRENCY } from "@/integrations/stripe/config";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string; supabase: any }; data: unknown }) => {
    const { userId, supabase } = context;
    const input = data as { bookId: string; bookSlug: string };

    const { data: book } = await supabase
      .from("books")
      .select("id, title_en, title_bn, price, is_free, slug")
      .eq("id", input.bookId)
      .maybeSingle();

    if (!book) throw new Error("Book not found.");
    if (book.is_free) throw new Error("This book is free. Use the direct purchase button instead.");

    const title = book.title_en || book.title_bn || "Book";
    const unitAmount = Math.round(Number(book.price) * 100);
    if (unitAmount <= 0) throw new Error("Invalid book price.");

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: undefined,
      client_reference_id: userId,
      metadata: {
        book_id: book.id,
        user_id: userId,
      },
      line_items: [
        {
          price_data: {
            currency: STRIPE_PRICE_CURRENCY,
            product_data: { name: title },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: CHECKOUT_SUCCESS_URL(book.slug),
      cancel_url: CHECKOUT_CANCEL_URL(book.slug),
    });

    return { url: session.url };
  });
