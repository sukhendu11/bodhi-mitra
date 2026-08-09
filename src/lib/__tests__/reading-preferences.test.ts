import { describe, it, expect, beforeEach } from "vitest";
import { mapReadingPrefs, type TypoSettings } from "@/components/TypographyControls";
import { mockGetProfile, mockUpsertProfile } from "@/lib/mock-session";
import type { UserPreferences } from "@/lib/user-preferences";

beforeEach(() => {
  localStorage.clear();
});

describe("mapReadingPrefs", () => {
  it("maps all font sizes and line spacings onto the article typography", () => {
    const cases: Array<{
      prefs: NonNullable<Parameters<typeof mapReadingPrefs>[0]>;
      expected: Partial<TypoSettings>;
    }> = [
      { prefs: { font_size: "sm", line_spacing: "normal" }, expected: { fontSize: "sm", lineHeight: "normal" } },
      { prefs: { font_size: "md", line_spacing: "relaxed" }, expected: { fontSize: "md", lineHeight: "relaxed" } },
      { prefs: { font_size: "lg", line_spacing: "wide" }, expected: { fontSize: "lg", lineHeight: "wide" } },
    ];
    for (const { prefs, expected } of cases) {
      expect(mapReadingPrefs(prefs)).toEqual(expected);
    }
  });

  it("returns undefined when no valid preference is provided", () => {
    expect(mapReadingPrefs(undefined)).toBeUndefined();
    expect(mapReadingPrefs({})).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mapReadingPrefs({ font_size: "xl", line_spacing: "tight" } as any)).toBeUndefined();
  });

  it("seeds only the provided dimension (partial preferences)", () => {
    expect(mapReadingPrefs({ font_size: "lg" })).toEqual({ fontSize: "lg" });
    expect(mapReadingPrefs({ line_spacing: "wide" })).toEqual({ lineHeight: "wide" });
  });
});

describe("settings → post-page reading preference round-trip (mock profile store)", () => {
  it("saved reading preferences survive the store and map onto the article seed", () => {
    // What /settings persists (mock mode): prefsToSave includes reading.
    const saved: UserPreferences = {
      theme: "dark",
      locale: "bn",
      email_notifications: false,
      reading: { font_size: "lg", line_spacing: "wide" },
    };
    mockUpsertProfile("demo-user", { preferences: saved as unknown as Record<string, unknown> });

    // What posts.$slug reads: mockGetProfile(...).preferences.reading → mapReadingPrefs
    const profile = mockGetProfile("demo-user");
    const seed = mapReadingPrefs(
      profile?.preferences?.reading as {
        font_size?: "sm" | "md" | "lg";
        line_spacing?: "normal" | "relaxed" | "wide";
      },
    );
    expect(seed).toEqual({ fontSize: "lg", lineHeight: "wide" });
  });

  it("editing display name does not wipe saved reading preferences", () => {
    mockUpsertProfile("demo-user", {
      preferences: { reading: { font_size: "lg", line_spacing: "relaxed" } },
    });
    // Profile page saves only the display name — mockUpsertProfile merges.
    mockUpsertProfile("demo-user", { display_name: "Maya" });
    const profile = mockGetProfile("demo-user");
    expect(profile?.display_name).toBe("Maya");
    expect(
      mapReadingPrefs(
        profile?.preferences?.reading as {
          font_size?: "sm" | "md" | "lg";
          line_spacing?: "normal" | "relaxed" | "wide";
        },
      ),
    ).toEqual({
      fontSize: "lg",
      lineHeight: "relaxed",
    });
  });
});
