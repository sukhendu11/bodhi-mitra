import { createFileRoute } from "@tanstack/react-router";

/**
 * Error Reporting API — receives client-side error reports via
 * `navigator.sendBeacon("/api/log-error", body)` from src/lib/errors.ts.
 *
 * POST /api/log-error
 * Body: { code, message, category, context?, stack? }
 * Response: 204 No Content (fire-and-forget)
 *
 * Note: this route uses TanStack Start's `createFileRoute` + `server.handlers`
 * convention (like /api/stripe-webhook) — plain Nitro
 * `export async function` files in src/routes/api are not served by this
 * project's dev server.
 */

export const Route = createFileRoute("/api/log-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          if (import.meta.env.DEV) {
            console.group("[Client Error]");
            console.error("Code:", body.code);
            console.error("Message:", body.message);
            console.error("Category:", body.category);
            if (body.context) console.error("Context:", body.context);
            if (body.stack) console.error("Stack:", body.stack);
            console.groupEnd();
          }

          return new Response(null, { status: 204 });
        } catch {
          return new Response(null, { status: 204 });
        }
      },
    },
  },
});
