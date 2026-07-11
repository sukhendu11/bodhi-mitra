import { supabase } from "@/integrations/supabase/client";

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

/** Fetch a single page by slug. */
export async function fetchPageBySlug(slug: string): Promise<Page | null> {
  const { data, error } = await (supabase as any)
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
