/** Reading page theme — mirrors the PdfViewer/reader surfaces (light/dark/sepia). */
export type ReadingMode = "light" | "sepia" | "dark";

/** Article / reader measure — narrow (compact), normal, wide (expansive). */
export type ReadingWidth = "narrow" | "normal" | "wide";

export type UserPreferences = {
  /** Display theme override. "system" defers to OS preference. */
  theme: "light" | "dark" | "system";
  /** Content locale preference. */
  locale: "en" | "bn";
  /** Master toggle for email notifications (comments, newsletters, etc.). */
  email_notifications: boolean;
  /** Site-wide motion reduction — kills CSS animations/transitions. */
  reduced_motion: boolean;
  /** Reading experience preferences. */
  reading: {
    font_size: "sm" | "md" | "lg";
    line_spacing: "normal" | "relaxed" | "wide";
    /** Article / reader measure. */
    width: ReadingWidth;
    /** Default reader theme (light / sepia / dark). */
    mode: ReadingMode;
    /** Persist reading progress + reading history. */
    save_progress: boolean;
  };
  /** Per-topic email notification toggles. */
  notifications: {
    /** New reflections / content. */
    content: boolean;
    /** Book / reading recommendations. */
    recommendations: boolean;
    /** Comment replies. */
    comments: boolean;
    /** Review activity. */
    reviews: boolean;
    /** Order / purchase updates. */
    orders: boolean;
    /** Newsletter. */
    newsletter: boolean;
  };
  /** Visibility of the user's activity to other readers. */
  privacy: {
    public_profile: boolean;
    show_reading_activity: boolean;
    show_reviews: boolean;
    show_comments: boolean;
    show_recommendations: boolean;
  };
};

/** Per-topic notification preference keys (the six toggles on /settings). */
export type NotificationTopic = keyof UserPreferences["notifications"];

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  locale: "en",
  email_notifications: true,
  reduced_motion: false,
  reading: {
    font_size: "md",
    line_spacing: "normal",
    width: "normal",
    mode: "light",
    save_progress: true,
  },
  notifications: {
    content: true,
    recommendations: true,
    comments: true,
    reviews: true,
    orders: true,
    newsletter: true,
  },
  privacy: {
    public_profile: true,
    show_reading_activity: true,
    show_reviews: true,
    show_comments: true,
    show_recommendations: true,
  },
};

const isOneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v);

const asBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

/**
 * Article / reader measure (max-width) per ReadingWidth. "normal" matches
 * the current article column (~48rem); "narrow" tightens the measure for a
 * comfortable long-form read; "wide" removes the cap entirely (full column).
 */
export const READING_WIDTH_MAX: Record<ReadingWidth, string | undefined> = {
  narrow: "38rem",
  normal: "48rem",
  wide: undefined,
};

/**
 * Normalize an arbitrary stored `preferences` payload (from the mock profile
 * store or Supabase `profiles.preferences`) into a complete, valid
 * `UserPreferences`. Handles two legacy shapes:
 *
 * 1. Pre-subgroup prefs where `public_profile` / `show_reading_activity`
 *    lived at the TOP level (the old settings page spread them into the
 *    saved object) — those are folded into `privacy.*`.
 * 2. Pre-extension `reading` objects missing `width` / `mode` / `save_progress`.
 *
 * Unknown/invalid values fall back to `DEFAULT_PREFERENCES` per-field, so a
 * partially-saved or hand-edited payload can never produce an invalid shape.
 */
export function migratePreferences(raw: unknown): UserPreferences {
  const r = (raw ?? {}) as Record<string, unknown>;
  const reading = (r.reading ?? {}) as Record<string, unknown>;
  const notifications = (r.notifications ?? {}) as Record<string, unknown>;
  const privacy = (r.privacy ?? {}) as Record<string, unknown>;
  const d = DEFAULT_PREFERENCES;

  return {
    theme: isOneOf(r.theme, ["light", "dark", "system"] as const) ? r.theme : d.theme,
    locale: r.locale === "bn" ? "bn" : d.locale,
    email_notifications: asBool(r.email_notifications, d.email_notifications),
    reduced_motion: asBool(r.reduced_motion, d.reduced_motion),
    reading: {
      font_size: isOneOf(reading.font_size, ["sm", "md", "lg"] as const)
        ? reading.font_size
        : d.reading.font_size,
      line_spacing: isOneOf(reading.line_spacing, ["normal", "relaxed", "wide"] as const)
        ? reading.line_spacing
        : d.reading.line_spacing,
      width: isOneOf(reading.width, ["narrow", "normal", "wide"] as const)
        ? reading.width
        : d.reading.width,
      mode: isOneOf(reading.mode, ["light", "sepia", "dark"] as const)
        ? reading.mode
        : d.reading.mode,
      save_progress: asBool(reading.save_progress, d.reading.save_progress),
    },
    notifications: {
      content: asBool(notifications.content, d.notifications.content),
      recommendations: asBool(notifications.recommendations, d.notifications.recommendations),
      comments: asBool(notifications.comments, d.notifications.comments),
      reviews: asBool(notifications.reviews, d.notifications.reviews),
      orders: asBool(notifications.orders, d.notifications.orders),
      newsletter: asBool(notifications.newsletter, d.notifications.newsletter),
    },
    privacy: {
      // Legacy top-level keys fold into privacy.* (old settings spread them).
      public_profile: asBool(
        privacy.public_profile ?? r.public_profile,
        d.privacy.public_profile,
      ),
      show_reading_activity: asBool(
        privacy.show_reading_activity ?? r.show_reading_activity,
        d.privacy.show_reading_activity,
      ),
      show_reviews: asBool(privacy.show_reviews, d.privacy.show_reviews),
      show_comments: asBool(privacy.show_comments, d.privacy.show_comments),
      show_recommendations: asBool(
        privacy.show_recommendations,
        d.privacy.show_recommendations,
      ),
    },
  };
}
