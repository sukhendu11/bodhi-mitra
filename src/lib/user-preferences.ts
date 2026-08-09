export type UserPreferences = {
  /** Display theme override. "system" defers to OS preference. */
  theme: "light" | "dark" | "system";
  /** Content locale preference. */
  locale: "en" | "bn";
  /** Master toggle for email notifications (comments, newsletters, etc.). */
  email_notifications: boolean;
  /** Reading experience preferences. */
  reading: {
    font_size: "sm" | "md" | "lg";
    line_spacing: "normal" | "relaxed" | "wide";
  };
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  locale: "en",
  email_notifications: true,
  reading: {
    font_size: "md",
    line_spacing: "normal",
  },
};
