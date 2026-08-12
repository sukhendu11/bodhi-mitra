import { describe, it, expect, beforeEach } from "vitest";
import { mapReadingPrefs, typoCssVars, type TypoSettings } from "@/components/TypographyControls";
import { mockGetProfile, mockUpsertProfile } from "@/lib/mock-session";
import {
  DEFAULT_PREFERENCES,
  migratePreferences,
  type UserPreferences,
} from "@/lib/user-preferences";

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
      ...DEFAULT_PREFERENCES,
      theme: "dark",
      locale: "bn",
      email_notifications: false,
      reading: { ...DEFAULT_PREFERENCES.reading, font_size: "lg", line_spacing: "wide" },
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

describe("typoCssVars", () => {
  it("maps typography choices onto the CSS custom properties .prose-mitra reads", () => {
    expect(typoCssVars({ fontSize: "sm", lineHeight: "tight" })).toEqual({
      "--article-font-size": "0.95rem",
      "--article-line-height": "1.6",
    });
    expect(typoCssVars({ fontSize: "lg", lineHeight: "wide" })).toEqual({
      "--article-font-size": "1.4rem",
      "--article-line-height": "2.25",
    });
  });

  it("settings reading prefs plug straight into the preview without remapping", () => {
    // /settings passes prefs.reading values directly to typoCssVars — the
    // subset values are valid FontSize/LineHeight choices.
    const prefs = { font_size: "lg" as const, line_spacing: "wide" as const };
    const vars = typoCssVars({
      fontSize: prefs.font_size,
      lineHeight: prefs.line_spacing,
    });
    expect(vars).toEqual({
      "--article-font-size": "1.4rem",
      "--article-line-height": "2.25",
    });
  });
});

describe("migratePreferences", () => {
  it("returns full defaults for an empty payload", () => {
    expect(migratePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(migratePreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(migratePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("preserves valid values and fills missing subgroups with defaults", () => {
    const migrated = migratePreferences({
      theme: "dark",
      locale: "bn",
      email_notifications: false,
      reading: { font_size: "lg", line_spacing: "wide" },
    });
    expect(migrated).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: "dark",
      locale: "bn",
      email_notifications: false,
      reading: {
        ...DEFAULT_PREFERENCES.reading,
        font_size: "lg",
        line_spacing: "wide",
      },
    });
  });

  it("folds legacy top-level public_profile / show_reading_activity into privacy.*", () => {
    // The old settings page spread these at the TOP level of the saved object.
    const migrated = migratePreferences({
      public_profile: false,
      show_reading_activity: false,
    });
    expect(migrated.privacy.public_profile).toBe(false);
    expect(migrated.privacy.show_reading_activity).toBe(false);
    // New privacy subgroups fall back to defaults
    expect(migrated.privacy.show_reviews).toBe(DEFAULT_PREFERENCES.privacy.show_reviews);
    expect(migrated.privacy.show_comments).toBe(DEFAULT_PREFERENCES.privacy.show_comments);
    expect(migrated.privacy.show_recommendations).toBe(
      DEFAULT_PREFERENCES.privacy.show_recommendations,
    );
  });

  it("prefers nested privacy.* when both old top-level and new nested keys exist", () => {
    const migrated = migratePreferences({
      public_profile: false,
      privacy: { public_profile: true },
    });
    expect(migrated.privacy.public_profile).toBe(true);
  });

  it("rejects invalid values with a field-level fallback to defaults", () => {
    const migrated = migratePreferences({
      theme: "neon",
      locale: "fr",
      reduced_motion: "yes",
      reading: { font_size: "xl", mode: "hologram", width: "mega" },
      notifications: { content: 42 },
    } as unknown);
    expect(migrated.theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(migrated.locale).toBe(DEFAULT_PREFERENCES.locale);
    expect(migrated.reduced_motion).toBe(DEFAULT_PREFERENCES.reduced_motion);
    expect(migrated.reading.font_size).toBe(DEFAULT_PREFERENCES.reading.font_size);
    expect(migrated.reading.mode).toBe(DEFAULT_PREFERENCES.reading.mode);
    expect(migrated.reading.width).toBe(DEFAULT_PREFERENCES.reading.width);
    expect(migrated.notifications.content).toBe(DEFAULT_PREFERENCES.notifications.content);
  });

  it("accepts the new reading mode / width / save_progress values", () => {
    const migrated = migratePreferences({
      reading: { width: "narrow", mode: "sepia", save_progress: false },
    });
    expect(migrated.reading.width).toBe("narrow");
    expect(migrated.reading.mode).toBe("sepia");
    expect(migrated.reading.save_progress).toBe(false);
  });
});
