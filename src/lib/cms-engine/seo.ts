import type { ContentTypeDefinition } from "./content-type";
import { getSeoFields } from "./metadata";

/* ─── SEO Meta Tag Types ──────────────────────────────────────────── */

export interface MetaTag {
  tag: "meta" | "link" | "script" | "title";
  attrs?: Record<string, string>;
  content?: string;
}

export interface SeoData {
  /** Page title */
  title?: string;
  /** Meta description */
  description?: string;
  /** Open Graph title */
  ogTitle?: string;
  /** Open Graph description */
  ogDescription?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Canonical URL */
  canonical?: string;
  /** JSON-LD structured data */
  jsonLd?: Record<string, unknown>;
}

/* ─── SEO Data Extraction ─────────────────────────────────────────── */

/**
 * Extract SEO data from content data using a content type's SEO fields.
 */
export function extractSeoData(
  contentData: Record<string, unknown>,
  def?: ContentTypeDefinition,
): SeoData {
  const seo: SeoData = {};

  if (def) {
    const seoFields = getSeoFields(def);

    // Extract SEO-specific fields
    for (const field of seoFields) {
      const value = contentData[field.name] as string | undefined;
      if (value) {
        if (field.name.includes("meta_description")) {
          seo.description = value;
        }
      }
    }

    // Extract standard fields used for SEO
    const title = (contentData.title_en ?? contentData.title ?? contentData.name_en ?? "") as string;
    if (title) {
      seo.title = title;
      seo.ogTitle = title;
    }

    // Extract cover/image for OG
    const image = (contentData.cover_image ?? contentData.banner_url ?? contentData.thumbnail_url ?? "") as string;
    if (image) {
      seo.ogImage = image;
    }

    // Extract description fallback
    const desc = (contentData.description_en ?? contentData.excerpt_en ?? contentData.body_en ?? "") as string;
    if (desc && !seo.description) {
      seo.description = desc.substring(0, 160);
      seo.ogDescription = seo.description;
    }
  }

  return seo;
}

/* ─── Meta Tag Generation ─────────────────────────────────────────── */

/**
 * Generate HTML meta tags from SEO data.
 */
export function generateMetaTags(seo: SeoData, baseUrl?: string): MetaTag[] {
  const tags: MetaTag[] = [];

  // Title
  if (seo.title) {
    tags.push({ tag: "title", content: seo.title });
  }

  // Meta description
  if (seo.description) {
    tags.push({
      tag: "meta",
      attrs: { name: "description", content: seo.description },
    });
  }

  // Open Graph
  if (seo.ogTitle) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:title", content: seo.ogTitle },
    });
  }

  if (seo.ogDescription) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:description", content: seo.ogDescription },
    });
  }

  if (seo.ogImage) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:image", content: seo.ogImage },
    });
  }

  // Canonical URL
  if (seo.canonical) {
    const href = baseUrl ? `${baseUrl}${seo.canonical}` : seo.canonical;
    tags.push({
      tag: "link",
      attrs: { rel: "canonical", href },
    });
  }

  // JSON-LD
  if (seo.jsonLd) {
    tags.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: JSON.stringify(seo.jsonLd),
    });
  }

  return tags;
}

/* ─── Route Meta Helpers ──────────────────────────────────────────── */

export interface RouteMeta {
  title: string;
  description?: string;
  image?: string;
}

/**
 * Build a TanStack Router-compatible `head` meta configuration
 * from content data and SEO fields.
 */
export function buildRouteMeta(
  seo: SeoData,
  siteName?: string,
): RouteMeta {
  return {
    title: seo.title
      ? `${seo.title}${siteName ? ` — ${siteName}` : ""}`
      : siteName ?? "",
    description: seo.description?.substring(0, 160),
    image: seo.ogImage,
  };
}

/* ─── Bilingual SEO Helpers ───────────────────────────────────────── */

export interface BilingualSeoData {
  en: SeoData;
  bn: SeoData;
}

/**
 * Extract bilingual SEO data from content with English/Bengali fields.
 */
export function extractBilingualSeoData(
  contentData: Record<string, unknown>,
): BilingualSeoData {
  return {
    en: {
      title: contentData.title_en as string,
      description: (contentData.meta_description_en as string) || (contentData.excerpt_en as string),
      ogImage: (contentData.cover_image as string) || (contentData.banner_url as string),
      canonical: contentData.slug as string,
    },
    bn: {
      title: contentData.title_bn as string,
      description: (contentData.meta_description_bn as string) || (contentData.excerpt_bn as string),
      ogImage: (contentData.cover_image as string) || (contentData.banner_url as string),
      canonical: contentData.slug as string,
    },
  };
}
