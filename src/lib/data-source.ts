/**
 * Data-source seam — M0 foundation (ROADMAP.md).
 *
 * A single config flag decides which backend the services use, so the
 * real-backend hookup later is a config swap, not a rewrite:
 *
 *   VITE_DATA_SOURCE=mock       → always take the deterministic offline path
 *   VITE_DATA_SOURCE=strapi     → Strapi-first (content)
 *   VITE_DATA_SOURCE=supabase   → Supabase-first (app data)
 *   VITE_DATA_SOURCE=auto       → mock when Supabase is not configured
 *
 * Default: "auto" (falls back to mock-first when no Supabase env is present).
 */

export type DataSource = "mock" | "strapi" | "supabase" | "auto";

export const DATA_SOURCE: DataSource =
  (import.meta.env.VITE_DATA_SOURCE as DataSource) ?? "auto";

/**
 * Test seam — lets unit tests force mock / real mode regardless of the
 * build-time flag (vitest may load .env, so `DATA_SOURCE` alone is not
 * deterministic in tests). Pass `null` to restore flag-based behavior.
 */
let _mockModeOverride: boolean | null = null;
export function setMockModeOverride(value: boolean | null) {
  _mockModeOverride = value;
}

/** True when the mock path should be taken. */
export function isMockMode(): boolean {
  if (_mockModeOverride !== null) return _mockModeOverride;
  if (DATA_SOURCE === "mock") return true;
  if (DATA_SOURCE !== "auto") return false;
  // "auto" = mock-first unless real Supabase credentials are configured.
  // Placeholder values (copied from .env.example, e.g. your-project / your-anon-key)
  // count as NOT configured — otherwise a GitHub-backed Vercel deploy with the
  // example env still present would silently leave demo mode (and hide the
  // "Continue as demo user/admin" buttons on /login).
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return !url || !key || isPlaceholder(url) || isPlaceholder(key);
}

// Anchored to the exact .env.example placeholders — broad substrings like
// `your-` or `xxx` could theoretically match a real base64 key, so keep the
// detection to the concrete values users actually copy from the template.
const PLACEHOLDER_RE = /your-project\.supabase\.co|your-anon-key|example\.com|^your-|^xxx/i;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_RE.test(value);
}
