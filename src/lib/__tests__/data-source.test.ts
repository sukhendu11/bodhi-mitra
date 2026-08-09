import { describe, it, expect, afterEach } from "vitest";
import { isMockMode, setMockModeOverride, DATA_SOURCE } from "@/lib/data-source";
import { mockClearSettings, mockUpdateSettings } from "@/lib/mock-settings";
import { fetchPublishedBooks, fetchBookById } from "@/lib/books";
import { fetchPosts } from "@/lib/posts";
import { fetchPublishedVideos } from "@/lib/videos";
import { fetchSiteSettings } from "@/lib/siteSettings";

// Services read isMockMode() at call time (not import time), so top-level
// imports are safe — no module-cache concerns with these seams.

afterEach(() => {
  setMockModeOverride(null);
  mockClearSettings();
});

/**
 * E6.2 Swap drill — the `VITE_DATA_SOURCE` flag (or its test seam) must be
 * the ONLY thing that decides which data path a service takes. Flipping it
 * must not change the UI or require code changes.
 */
describe("data-source seam (M6 E6.2 swap drill)", () => {
  it("isMockMode respects the test override", () => {
    setMockModeOverride(true);
    expect(isMockMode()).toBe(true);
    setMockModeOverride(false);
    expect(isMockMode()).toBe(false);
    setMockModeOverride(null);
    // Falls back to flag/env behavior — deterministic in CI without a
    // configured Supabase project (auto → mock-first).
    expect(typeof isMockMode()).toBe("boolean");
  });

  it("the build flag is one of the four documented values", () => {
    expect(["mock", "strapi", "supabase", "auto"]).toContain(DATA_SOURCE);
  });

  it("mock mode is the fast path — services short-circuit without network", async () => {
    setMockModeOverride(true);

    const [books, posts, videos, settings] = await Promise.all([
      fetchPublishedBooks(1, 5),
      fetchPosts(undefined, 1, 5),
      fetchPublishedVideos(1, 5),
      fetchSiteSettings(),
    ]);
    expect(books.data.length).toBeGreaterThan(0);
    expect(posts.data.length).toBeGreaterThan(0);
    expect(videos.data.length).toBeGreaterThan(0);
    expect(settings.branding.site_name_en.length).toBeGreaterThan(0);

    // The reader-route read (previously a Supabase probe) also resolves from mock
    const byId = await fetchBookById(books.data[0].id);
    expect(byId?.id).toBe(books.data[0].id);
  });

  it("mock overrides are applied in mock mode (site settings seam)", async () => {
    setMockModeOverride(true);
    mockUpdateSettings({ branding: { site_name_en: "Swap Drill Name" } });
    const settings = await fetchSiteSettings();
    expect(settings.branding.site_name_en).toBe("Swap Drill Name");
  });
});
