import { createFileRoute } from "@tanstack/react-router";
import { createChatStream } from "@/lib/ai/chat";
import { createClient } from "@supabase/supabase-js";
import { isMockMode } from "@/lib/data-source";
import type { Database } from "@/integrations/supabase/types";

/**
 * Chat API — Server-side streaming endpoint for the "Ask Bodhi" assistant.
 *
 * POST /api/chat
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 * Response: SSE stream of text chunks
 *
 * Security: Requires a valid Supabase session token in the Authorization
 * header — unless the app is running in mock mode (`VITE_DATA_SOURCE=mock` or
 * Supabase not configured), where the request is accepted without a JWT so
 * the frontend-only workflow works, matching the `requireAuthOrMock`
 * server-function convention used by every other server function.
 *
 * Note: this route uses TanStack Start's `createFileRoute` + `server.handlers`
 * convention (like /api/stripe-webhook) — plain Nitro
 * `export async function` files in src/routes/api are not served by this
 * project's dev server.
 */

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ── Auth check: verify the user has a valid session ──────────
          // Mock trust boundary (mirrors requireAuthOrMock): in mock mode the
          // frontend signs in via mock accounts (no real Supabase JWT), so the
          // request is accepted without a token. Outside mock mode (production
          // with VITE_DATA_SOURCE=supabase/auto + real credentials), auth is
          // enforced strictly below.
          if (!isMockMode()) {
            const SUPABASE_URL = process.env.SUPABASE_URL;
            const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

            if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
              return new Response(
                JSON.stringify({ error: "Server configuration error" }),
                { status: 500, headers: { "content-type": "application/json" } },
              );
            }

            const authHeader = request.headers.get("authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
              return new Response(
                JSON.stringify({ error: "Unauthorized — no session token provided" }),
                { status: 401, headers: { "content-type": "application/json" } },
              );
            }

            const token = authHeader.replace("Bearer ", "");
            if (!token) {
              return new Response(
                JSON.stringify({ error: "Unauthorized — empty token" }),
                { status: 401, headers: { "content-type": "application/json" } },
              );
            }

            const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { persistSession: false, autoRefreshToken: false },
            });

            const { data: userData, error: authError } = await supabase.auth.getUser();
            if (authError || !userData?.user) {
              return new Response(
                JSON.stringify({ error: "Unauthorized — invalid session" }),
                { status: 401, headers: { "content-type": "application/json" } },
              );
            }
          }

          // ── Process chat request ─────────────────────────────────────
          const body = await request.json();
          const { messages } = body;

          // Extract the last user message
          const lastUserMsg = messages?.filter((m: any) => m.role === "user").pop()?.content;
          if (!lastUserMsg) {
            return new Response(
              JSON.stringify({ error: "No query provided" }),
              { status: 400, headers: { "content-type": "application/json" } },
            );
          }

          // Get the chat history (all messages except the last user one)
          const history = messages
            ?.slice(0, -1)
            .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));

          // Create streaming response
          const stream = await createChatStream(lastUserMsg, history);

          return new Response(stream, {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-vercel-ai-data-stream": "true",
              "cache-control": "no-cache",
            },
          });
        } catch (error) {
          console.error("[api/chat] Error:", error);
          // Surface a clear message when the LLM isn't configured so the chat
          // panel tells the user what to fix instead of a generic 500.
          if (error instanceof Error && /api key|OPENAI_API_KEY/i.test(error.message)) {
            return new Response(
              JSON.stringify({
                error: "AI chat is not configured — add OPENAI_API_KEY to your environment.",
              }),
              { status: 500, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
