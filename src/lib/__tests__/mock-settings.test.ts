import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockClearSettings,
  mockGetSettings,
  mockUpdateSettings,
} from "@/lib/mock-settings";
import { DEFAULT_CONFIG, mergeConfig } from "@/lib/siteSettings";

beforeEach(() => {
  mockClearSettings();
  vi.resetModules();
});

describe("mock site-settings overrides (M5 E5.4)", () => {
  it("starts empty and returns null", () => {
    expect(mockGetSettings()).toBeNull();
  });

  it("persists a deep partial patch", () => {
    mockUpdateSettings({
      branding: { site_name_en: "Test Satta" },
      theme: { accent_color: "#123456" },
    });
    const stored = mockGetSettings();
    expect(stored?.branding?.site_name_en).toBe("Test Satta");
    expect(stored?.theme?.accent_color).toBe("#123456");
  });

  it("merges onto previous overrides (sections accumulate)", () => {
    mockUpdateSettings({ branding: { site_name_en: "One" } });
    mockUpdateSettings({ theme: { accent_color: "#abc123" } });
    const stored = mockGetSettings();
    expect(stored?.branding?.site_name_en).toBe("One");
    expect(stored?.theme?.accent_color).toBe("#abc123");
  });

  it("deep-merges nested objects instead of replacing sections", () => {
    mockUpdateSettings({ branding: { site_name_en: "A", tagline_en: "T" } });
    mockUpdateSettings({ branding: { site_name_bn: "ব" } });
    const stored = mockGetSettings();
    expect(stored?.branding?.site_name_en).toBe("A");
    expect(stored?.branding?.site_name_bn).toBe("ব");
    expect(stored?.branding?.tagline_en).toBe("T");
  });

  it("clears back to null", () => {
    mockUpdateSettings({ branding: { site_name_en: "X" } });
    mockClearSettings();
    expect(mockGetSettings()).toBeNull();
  });

  it("persists to localStorage", () => {
    mockUpdateSettings({ theme: { accent_color: "#ff0000" } });
    expect(localStorage.getItem("sabbe-satta-mock-settings")).toContain("#ff0000");
  });
});

describe("fetchSiteSettings merge (siteSettings.tsx)", () => {
  it("merges the stored patch over DEFAULT_CONFIG", async () => {
    mockUpdateSettings({
      branding: { site_name_en: "Custom Name" },
      theme: { accent_color: "#112233" },
    });
    const { fetchSiteSettings } = await import("@/lib/siteSettings");
    const config = await fetchSiteSettings();
    expect(config.branding.site_name_en).toBe("Custom Name");
    expect(config.theme.accent_color).toBe("#112233");
    // Untouched nested defaults survive
    expect(config.branding.site_name_bn).toBe(DEFAULT_CONFIG.branding.site_name_bn);
    expect(config.book_grid.page_size).toBe(DEFAULT_CONFIG.book_grid.page_size);
  });

  it("returns full defaults when no overrides exist", async () => {
    const { fetchSiteSettings } = await import("@/lib/siteSettings");
    const config = await fetchSiteSettings();
    expect(config.branding.site_name_en).toBe(DEFAULT_CONFIG.branding.site_name_en);
    expect(config.theme.accent_color).toBe(DEFAULT_CONFIG.theme.accent_color);
  });

  it("mergeConfig deep-merges partial over defaults (helper contract)", () => {
    const merged = mergeConfig({ theme: { accent_color: "#000000" } });
    expect(merged.theme.accent_color).toBe("#000000");
    expect(merged.theme.font_heading).toBe(DEFAULT_CONFIG.theme.font_heading);
    expect(merged.branding.site_name_en).toBe(DEFAULT_CONFIG.branding.site_name_en);
  });
});
