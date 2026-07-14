/**
 * Centralized site URL utility.
 * Returns the base URL from process.env.SITE_URL or falls back to a default.
 * Used by sitemap, emails, structured data, social sharing, etc.
 */

export function getSiteBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

/** Get the site URL for server-side use (emails, sitemap, etc.) */
export function getServerSiteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}
