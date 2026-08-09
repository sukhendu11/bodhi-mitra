import { supabase } from "@/integrations/supabase/client";
import { getPageBySlug as strapiGetPageBySlug, getPages as strapiGetPages } from "@/lib/strapi-client";
import type { Page as StrapiPage } from "@/lib/strapi-client";
import { isMockMode } from "@/lib/data-source";
import { mockFetchPages, mockFetchPageBySlug } from "@/lib/mock-data";

/* ─── Section Types ───────────────────────────────────────────── */

export type SectionType = "hero" | "text" | "image" | "quote" | "video" | "cta";

export interface PageSection {
  id: string;
  type: SectionType;
  sort_order: number;
  content_en: Record<string, string>;
  content_bn: Record<string, string>;
}

export function getEmptySection(type: SectionType): PageSection {
  const defaults: Record<SectionType, Record<string, string>> = {
    hero: { heading: "", subheading: "", body: "", button_text: "", button_url: "" },
    text: { body: "" },
    image: { src: "", alt: "", caption: "" },
    quote: { text: "", attribution: "" },
    video: { url: "", caption: "" },
    cta: { heading: "", body: "", button_text: "", button_url: "" },
  };
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    sort_order: 0,
    content_en: { ...defaults[type] },
    content_bn: { ...defaults[type] },
  };
}

/* ─── Page Types ───────────────────────────────────────────────── */

export interface Page {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  header_en: string;
  header_bn: string;
  body_en: string;
  body_bn: string;
  banner_url: string;
  meta_description_en: string;
  meta_description_bn: string;
  visible: boolean;
  sort_order: number;
  sections: PageSection[];
  created_at: string;
  updated_at: string;
}

/** Map a Strapi Page to the app's Page type */
function mapStrapiPage(sp: StrapiPage): Page {
  return {
    id: String(sp.documentId),
    slug: sp.slug,
    title_en: sp.title_en,
    title_bn: sp.title_bn || "",
    header_en: sp.content_en ? JSON.stringify(sp.content_en) : "",
    header_bn: sp.content_bn ? JSON.stringify(sp.content_bn) : "",
    body_en: sp.content_en ? JSON.stringify(sp.content_en) : "",
    body_bn: sp.content_bn ? JSON.stringify(sp.content_bn) : "",
    banner_url: sp.banner_url || "",
    meta_description_en: sp.seo_description || "",
    meta_description_bn: "",
    visible: sp.visible ?? true,
    sort_order: sp.sort_order || 0,
    sections: Array.isArray(sp.sections) ? sp.sections as PageSection[] : [],
    created_at: sp.createdAt,
    updated_at: sp.updatedAt,
  };
}

/**
 * Fetch a single page by slug.
 * Mock mode reads from the mock pages store directly; otherwise tries
 * Strapi API first, falls back to Supabase, then mock pages.
 */
export async function fetchPageBySlug(slug: string): Promise<Page | null> {
  if (isMockMode()) return mockFetchPageBySlug(slug);

  // Try Strapi first
  try {
    const strapiRes = await strapiGetPageBySlug(slug);
    const items = Array.isArray(strapiRes.data) ? strapiRes.data : [strapiRes.data];
    return items[0] ? mapStrapiPage(items[0]) : null;
  } catch {
    // Strapi unavailable — fall through to Supabase
  }

  // Fallback to Supabase
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    sections: Array.isArray((data as any).sections) ? (data as any).sections : [],
  } as Page;
}

import { slugifyPage as cmsSlugifyPage } from "@/lib/cms-engine";

/** @deprecated Use slugifyPage from @/lib/cms-engine instead */
export function slugifyPage(title: string): string {
  return cmsSlugifyPage(title);
}
