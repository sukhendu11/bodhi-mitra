/**
 * Shared Supabase-unavailability detection.
 *
 * Distinguishes "Supabase is genuinely unavailable" (missing env vars,
 * network failure, table not migrated) from real DB errors (RLS, schema
 * violations) — the former trigger the mock-mode fallback path, the
 * latter must surface. Used by newsletter.ts, comments.ts, and
 * contact-messages.ts.
 */
export function isSupabaseUnavailableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  // Relation does not exist — Supabase reachable but tables not migrated
  if (err?.code === "42P01") return true;
  const message = err?.message ?? (error instanceof Error ? error.message : "");
  return (
    message.includes("Missing Supabase environment variable") ||
    /fetch|network|econnrefused|connection (failed|reset|refused|closed|terminated)/i.test(
      message,
    )
  );
}
