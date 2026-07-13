import { useSiteSettings } from "@/lib/siteSettings";

type FeatureFlag = keyof import("@/lib/siteSettings").SiteConfig["features"];

/** Check if a single feature flag is enabled. */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const config = useSiteSettings();
  return config.features[flag] ?? false;
}

/** Get all feature flags as a record. */
export function useFeatureFlags(): Record<FeatureFlag, boolean> {
  const config = useSiteSettings();
  return config.features;
}
