import { createFileRoute } from "@tanstack/react-router";
import { getStripeClient } from "@/integrations/stripe/server";
import { STRIPE_WEBHOOK_SECRET } from "@/integrations/stripe/config";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPurchaseConfirmation } from "@/lib/purchase-emails";
import { incrementRedemption } from "@/lib/coupons";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const sig = request.headers.get("stripe-signature");
        if (!sig) {
          return new Response("Missing stripe-signature header", { status: 400 });
        }

        let event;
        try {
          const stripe = getStripeClient();
          event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET());
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as any;
          const userId = session.metadata?.user_id;
          const bookId = session.metadata?.book_id;
          const isCartCheckout = session.metadata?.cart_checkout === "true";
          const amountPaid = (session.amount_total ?? 0) / 100;

          const db = supabaseAdmin as any;

          const purchasedBookIds: string[] = [];

          if (isCartCheckout && userId) {
            // Cart checkout: purchase all books using book_ids from metadata
            const bookIdsStr = session.metadata?.book_ids;
            if (bookIdsStr) {
              const bookIdList = bookIdsStr.split(",");
              const perItemAmount =
                bookIdList.length > 0
                  ? Math.round((amountPaid / bookIdList.length) * 100) / 100
                  : amountPaid;

              for (const bid of bookIdList) {
                const { error } = await db.from("purchases").insert({
                  user_id: userId,
                  book_id: bid,
                  amount_paid: perItemAmount,
                  purchase_date: new Date().toISOString(),
                });
                if (error && error.code !== "23505") {
                  console.error("[stripe-webhook] cart checkout item insert failed", error);
                } else if (!error) {
                  purchasedBookIds.push(bid);
                }
              }
            }

            // Clear the user's cart after successful checkout
            const { data: cart } = await db
              .from("carts")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();
            if (cart) {
              await db.from("cart_items").delete().eq("cart_id", cart.id);
            }
          } else if (userId && bookId) {
            // Single-book checkout (backward compatible)
            const { error } = await db.from("purchases").insert({
              user_id: userId,
              book_id: bookId,
              amount_paid: amountPaid,
              purchase_date: new Date().toISOString(),
            });
            if (error && error.code !== "23505") {
              console.error("[stripe-webhook] purchase insert failed", error);
            } else if (!error) {
              purchasedBookIds.push(bookId);
            }
          }

          // Send purchase confirmation emails (fire-and-forget — don't block response)
          if (userId && purchasedBookIds.length > 0) {
            for (const pid of purchasedBookIds) {
              sendPurchaseConfirmation({
                userId,
                bookId: pid,
                amountPaid: amountPaid / purchasedBookIds.length,
                isFree: false,
              }).catch((err) => {
                console.error("[stripe-webhook] Failed to send purchase email:", err);
              });
            }
          }

          // Increment coupon redemption count if coupon was used
          const couponId = session.metadata?.coupon_id;
          if (couponId) {
            incrementRedemption(couponId).catch((err) => {
              console.error("[stripe-webhook] Failed to increment coupon redemption:", err);
            });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
