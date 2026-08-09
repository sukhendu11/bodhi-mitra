import { mockFetchCategories } from "@/lib/mock-data";

// ─── Categories ───────────────────────────────────────────────────────────

/** Localized label for a raw category name (e.g. post.category / book.category). */
const CATEGORY_BN_LABELS: Record<string, string> = {
  "Meditation": "ধ্যান",
  "Mindfulness": "মাইন্ডফুলনেস",
  "Mental Health": "মানসিক স্বাস্থ্য",
  "Philosophy": "দর্শন",
  "Buddhist Psychology": "বৌদ্ধ মনোবিজ্ঞান",
  "Teachings": "শিক্ষা",
  "Psychology": "মনোবিজ্ঞান",
  "Wisdom": "প্রজ্ঞা",
  "Guided Meditation": "নির্দেশিত ধ্যান",
  "Silent Sitting": "নীরব বসা",
  "Walking Meditation": "হাঁটার ধ্যান",
  "Breath Awareness": "শ্বাস সচেতনতা",
  "Loving-Kindness": "মৈত্রী",
  "Morning Practice": "সকালের অনুশীলন",
  "Mindful Eating": "সচেতন খাদ্য গ্রহণ",
  "Mindful Communication": "সচেতন যোগাযোগ",
  "Anxiety & Stress": "উদ্বেগ ও চাপ",
  "Emotional Resilience": "আবেগগত স্থিতিস্থাপকতা",
  "The Four Noble Truths": "চারটি আর্যসত্য",
  "The Eightfold Path": "অষ্টাঙ্গিক পথ",
};

export function localizeCategoryName(name: string | null | undefined, lang: "en" | "bn"): string {
  if (!name) return "";
  if (lang === "bn") return CATEGORY_BN_LABELS[name] ?? name;
  return name;
}

// ─── Book & post author names ─────────────────────────────────────────────

/** Bengali transliterations for the recurring library author names. */
const AUTHOR_BN_LABELS: Record<string, string> = {
  "Siddhartha Gautama": "সিদ্ধার্থ গৌতম",
  "Ananda Bhikkhu": "আনন্দ ভিক্ষু",
  "Maya Karuna": "মায়া করুণা",
  "Dr. Sarah Weiss": "ডা. সারা ওয়াইস",
};

/** Localized display name for an author (English remains as-is in EN mode). */
export function localizeAuthorName(name: string | null | undefined, lang: "en" | "bn"): string {
  if (!name) return "";
  if (lang === "bn") return AUTHOR_BN_LABELS[name] ?? name;
  return name;
}

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
  parent_id?: string | null;
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

export async function fetchCategories(): Promise<Category[]> {
  return mockFetchCategories();
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

export async function fetchTags(): Promise<Tag[]> {
  return [];
}

import { slugifyTaxonomy as cmsSlugifyTaxonomy } from "@/lib/cms-engine";

/** @deprecated Use slugifyTaxonomy from @/lib/cms-engine instead */
export function slugifyTaxonomy(title: string): string {
  return cmsSlugifyTaxonomy(title);
}
