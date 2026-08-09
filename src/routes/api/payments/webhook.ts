/**
 * Payment webhook / IPN endpoint — provider-agnostic.
 *
 * POST /api/payments/webhook
 *
 * Dispatches the raw callback body to the ACTIVE payment provider's verifier
 * (simulated during dev, PipraPay when deployed). A verified callback is then
 * applied to the server-side order:
 *
 *   status paid      → fulfillOrder (grant purchases, clear cart, emails)
 *   status failed    → failOrder
 *   status cancelled → cancelOrder
 *
 * Duplicate callbacks are safe: the order store only transitions
 * `pending → X`, so repeated deliveries are idempotent no-ops that still
 * return 200 (so the gateway stops retrying).
 *
 * Route convention: TanStack Start `createFileRoute` + `server.handlers`
 * (same as /api/stripe-webhook and /api/chat).
 */
import { createFileRoute } from "@tanstack/react-router";
import { getPaymentProvider } from "@/lib/payments";
import {
  cancelOrder,
  failOrder,
  fulfillOrder,
} from "@/lib/payments/orders";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const provider = getPaymentProvider();

        // 1) Verify the callback (signature / payload) with the active provider.
        const verified = await provider.verifyWebhook(body, request.headers);
        if (!verified) {
          return new Response("Unverified payment callback", { status: 400 });
        }

        // 2) Apply to the server-side order.
        try {
          if (verified.status === "paid") {
            const result = await fulfillOrder(verified.orderId, {
              gatewayReference: verified.gatewayReference,
              amountPaid: verified.amountPaid,
            });
            if (!result.order) {
              return new Response("Unknown order", { status: 404 });
            }
            if (result.rejected === "amount-mismatch") {
              // Signed callback, but the paid amount doesn't match the order
              // total — refuse fulfillment (order already marked failed).
              return new Response(
                JSON.stringify({
                  ok: false,
                  rejected: "amount-mismatch",
                  orderId: verified.orderId,
                }),
                {
                  status: 422,
                  headers: { "content-type": "application/json" },
                },
              );
            }
            return new Response(
              JSON.stringify({
                ok: true,
                orderId: verified.orderId,
                fulfilled: result.fulfilled,
                alreadyProcessed: result.alreadyProcessed,
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          }

          if (verified.status === "failed") {
            await failOrder(verified.orderId, {
              gatewayReference: verified.gatewayReference,
            });
          } else {
            await cancelOrder(verified.orderId, {
              gatewayReference: verified.gatewayReference,
            });
          }

          return new Response(
            JSON.stringify({
              ok: true,
              orderId: verified.orderId,
              status: verified.status,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        } catch (error) {
          console.error("[payments/webhook] processing error", error);
          return new Response("Webhook processing failed", { status: 500 });
        }
      },
    },
  },
});
