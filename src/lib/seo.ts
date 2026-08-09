const DEFAULT_SITE_URL = "https://sabbesatta.com";
const DEFAULT_OG_IMAGE = "/og-default.png";

interface SeoOptions {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  siteName?: string;
  siteUrl?: string;
  scripts?: Array<{ type: string; JSON: unknown }>;
}

export function seoHead(opts: SeoOptions) {
  const siteName = opts.siteName || "Sabbe Satta";
  const siteUrl = opts.siteUrl || DEFAULT_SITE_URL;
  const canonical = `${siteUrl}${opts.path}`;
  const fullTitle = `${opts.title} — ${siteName}`;

  const links: Record<string, string>[] = [
    { rel: "canonical", href: canonical },
    { rel: "alternate", hrefLang: "en", href: canonical },
    { rel: "alternate", hrefLang: "bn", href: canonical },
    { rel: "alternate", hrefLang: "x-default", href: canonical },
  ];

  const meta: Record<string, string>[] = [
    { title: fullTitle },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: canonical },
    { property: "og:type", content: opts.ogType || "website" },
    { property: "og:site_name", content: siteName },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];

  if (opts.ogImage) {
    meta.push(
      { property: "og:image", content: opts.ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: opts.ogImage },
    );
  } else {
    // Always have a fallback OG image for social sharing
    meta.push(
      { property: "og:image", content: `${siteUrl}${DEFAULT_OG_IMAGE}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: `${siteUrl}${DEFAULT_OG_IMAGE}` },
    );
  }

  if (opts.noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const result: { meta: Record<string, string>[]; links: Record<string, string>[]; scripts?: Array<{ type: string; JSON: unknown }> } = { meta, links };
  if (opts.scripts?.length) {
    result.scripts = opts.scripts;
  }
  return result;
}

/* Server-side SEO helpers (sitemap, robots.txt) live in seo.server.ts —
   they touch supabaseAdmin and must never be imported by client code. */
