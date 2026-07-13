/**
 * Chat API — Server-side streaming endpoint for the "Ask Bodhi" assistant.
 *
 * POST /api/chat
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 * Response: SSE stream of text chunks
 *
 * Security: Requires valid Supabase session token in Authorization header.
 */

import { createChatStream } from "@/lib/ai/chat";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function POST(request: Request) {
  try {
    // ── Auth check: verify the user has a valid session ──────────
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

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "content-type": "application/json" } },
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
