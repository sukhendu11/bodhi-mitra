/**
 * Mock site-settings overrides — M5 E5.4 (ROADMAP.md).
 *
 * Mirrors the Supabase `site_settings.config` JSON for the offline demo.
 * Admin edits persist here as a raw partial patch; `fetchSiteSettings()`
 * (in `siteSettings.tsx`) merges it over `DEFAULT_CONFIG` in mock mode, so
 * `SiteSettingsProvider` re-applies the theme / branding / book-grid CSS
 * variables live across the whole site.
 *
 * Only a type import from `siteSettings.tsx` — no runtime dependency — so
 * there is no import cycle between the two modules (siteSettings.tsx owns
 * the merge against DEFAULT_CONFIG).
 *
 * localStorage on the client, in-memory on the server — same pattern as
 * mock-cms.ts / mock-commerce.ts. Writes dispatch a custom event so open
 * admin views re-read reactively.
 */
import type { SiteConfig } from "@/lib/siteSettings";

const STORE_KEY = "sabbe-satta-mock-settings";
/** Custom window event fired on settings writes (same-tab reactivity). */
export const MOCK_SETTINGS_EVENT = "sabbe-satta:mock-settings-change";

/** Recursively optional version of SiteConfig (sections may be partial). */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Stored shape: a deep partial patch (only the sections the admin touched). */
export type SiteConfigPatch = DeepPartial<SiteConfig>;

let memoryPatch: SiteConfigPatch | null = null;

function readRaw(): SiteConfigPatch | null {
  if (typeof window === "undefined") return memoryPatch;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SiteConfigPatch) : null;
  } catch {
    return null;
  }
}

function writeRaw(patch: SiteConfigPatch | null) {
  if (typeof window === "undefined") {
    memoryPatch = patch;
    return;
  }
  if (patch) localStorage.setItem(STORE_KEY, JSON.stringify(patch));
  else localStorage.removeItem(STORE_KEY);
  window.dispatchEvent(new CustomEvent(MOCK_SETTINGS_EVENT));
}

/** The currently persisted partial overrides, or null. */
export function mockGetSettings(): SiteConfigPatch | null {
  return readRaw();
}

/** Deep-merge patch onto target (objects merged recursively, primitives replaced). */
function deepMerge(target: unknown, patch: unknown): unknown {
  if (
    patch &&
    typeof patch === "object" &&
    !Array.isArray(patch) &&
    target &&
    typeof target === "object" &&
    !Array.isArray(target)
  ) {
    const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      out[key] = deepMerge(out[key], value);
    }
    return out;
  }
  return patch === undefined ? target : patch;
}

/**
 * Deep-merge a partial patch onto any previously stored overrides and
 * persist. Returns the new stored patch.
 */
export function mockUpdateSettings(patch: SiteConfigPatch): SiteConfigPatch {
  const base = readRaw() ?? {};
  const next = deepMerge(base, patch) as SiteConfigPatch;
  writeRaw(next);
  return next;
}

/** Reset all overrides (test seam / "reset demo data"). */
export function mockClearSettings() {
  writeRaw(null);
}
