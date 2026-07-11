// ─── Categories ───────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  icon: string;
  color: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  slug: string;
  name_en: string;
  name_bn?: string;
  description_en?: string;
  description_bn?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  visible?: boolean;
}

// ─── Tags ─────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  color: string;
  created_at: string;
}

export interface TagInput {
  slug: string;
  name_en: string;
  name_bn?: string;
  color?: string;
}

import { slugifyTaxonomy as cmsSlugifyTaxonomy } from "@/lib/cms-engine";

/** @deprecated Use slugifyTaxonomy from @/lib/cms-engine instead */
export function slugifyTaxonomy(title: string): string {
  return cmsSlugifyTaxonomy(title);
}
