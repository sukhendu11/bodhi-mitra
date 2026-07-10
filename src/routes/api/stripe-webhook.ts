import { createFileRoute } from "@tanstack/react-router";
import { getStripeClient } from "@/integrations/stripe/server";
import { STRIPE_WEBHOOK_SECRET } from "@/integrations/stripe/config";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
          const amountPaid = (session.amount_total ?? 0) / 100;

          if (userId && bookId) {
            const db = supabaseAdmin as any;
            const { error } = await db.from("purchases").insert({
              user_id: userId,
              book_id: bookId,
              amount_paid: amountPaid,
              purchase_date: new Date().toISOString(),
            });
            if (error && error.code !== "23505") {
              console.error("[stripe-webhook] purchase insert failed", error);
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
