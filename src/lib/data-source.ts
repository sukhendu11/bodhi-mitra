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
  // "auto" = mock-first unless real Supabase credentials are configured
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return !url || !key;
}
