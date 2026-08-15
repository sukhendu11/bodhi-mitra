/**
 * Admin resource registry — P2 custom admin (AD-029).
 *
 * Schema-driven: one config per resource (columns for the list, fields for
 * the create/edit form) so a single generic list + form component powers
 * every resource. Labels are bilingual (EN/BN) per the app's i18n rules.
 *
 * Real mode maps `name` directly onto the Supabase table of the same name
 * (unified schema — see PROJECT.md §18 P1). Mock mode reads/writes the
 * per-domain mock stores through `src/lib/admin/data-provider.ts`.
 */
import type { ComponentType } from "react";
import {
  Bell,
  BookOpen,
  FileText,
  FolderTree,
  ListTree,
  Receipt,
  Settings2,
  Tag,
  Users,
  Video,
} from "lucide-react";
import type { AdminResource } from "./data-provider";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "tags"
  | "url";

export interface ResourceField {
  key: string;
  labelEn: string;
  labelBn: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** When true the field is shown but read-only in the form. */
  readOnly?: boolean;
  /**
   * Optional grouping header rendered above the field (e.g. "SEO" for a
   * settings form) — a header appears when the section changes between
   * consecutive fields.
   */
  section?: string;
}

export interface ResourceColumn {
  key: string;
  labelEn: string;
  labelBn: string;
  /** Optional accessor override (e.g. nested path via a formatter). */
  format?: (row: Record<string, unknown>) => string | number | boolean | null;
}

export interface ResourceDef {
  name: AdminResource;
  labelEn: string;
  labelBn: string;
  icon: ComponentType<{ className?: string }>;
  columns: ResourceColumn[];
  fields: ResourceField[];
  /** Single-row resources (site settings) — no New/Delete, edit only. */
  singleRow?: boolean;
}

/* ─── Books ─────────────────────────────────────────────────────── */

const BOOK_FIELDS: ResourceField[] = [
  { key: "title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text", required: true },
  { key: "title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
  { key: "author_name", labelEn: "Author", labelBn: "লেখক", type: "text" },
  { key: "category", labelEn: "Category", labelBn: "বিভাগ", type: "select", options: ["Meditation", "Mindfulness", "Mental Health", "Philosophy", "Buddhist Psychology"] },
  { key: "price", labelEn: "Price (BDT)", labelBn: "মূল্য (টাকা)", type: "number" },
  { key: "is_free", labelEn: "Free", labelBn: "বিনামূল্যে", type: "boolean" },
  { key: "status", labelEn: "Status", labelBn: "অবস্থা", type: "select", options: ["draft", "published", "archived"] },
  { key: "featured", labelEn: "Featured", labelBn: "বৈশিষ্ট্যযুক্ত", type: "boolean" },
  { key: "pages", labelEn: "Pages", labelBn: "পৃষ্ঠা", type: "number" },
  { key: "cover_image", labelEn: "Cover URL", labelBn: "প্রচ্ছদ URL", type: "url" },
  { key: "pdf_url", labelEn: "PDF URL", labelBn: "PDF URL", type: "url" },
  { key: "description_en", labelEn: "Description (EN)", labelBn: "বর্ণনা (ইংরেজি)", type: "textarea" },
  { key: "description_bn", labelEn: "Description (BN)", labelBn: "বর্ণনা (বাংলা)", type: "textarea" },
  { key: "tags", labelEn: "Tags", labelBn: "ট্যাগ", type: "tags" },
  { key: "sort_order", labelEn: "Sort", labelBn: "ক্রম", type: "number" },
  { key: "seo_title", labelEn: "SEO Title", labelBn: "SEO শিরোনাম", type: "text", section: "SEO" },
  { key: "meta_description_en", labelEn: "SEO Description (EN)", labelBn: "SEO বর্ণনা (ইংরেজি)", type: "textarea" },
  { key: "meta_description_bn", labelEn: "SEO Description (BN)", labelBn: "SEO বর্ণনা (বাংলা)", type: "textarea" },
];

/* ─── Posts ─────────────────────────────────────────────────────── */

const POST_FIELDS: ResourceField[] = [
  { key: "title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text", required: true },
  { key: "title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
  { key: "category", labelEn: "Category", labelBn: "বিভাগ", type: "select", options: ["Meditation", "Mindfulness", "Mental Health", "Philosophy", "Buddhist Psychology"] },
  { key: "author_name", labelEn: "Author", labelBn: "লেখক", type: "text" },
  { key: "status", labelEn: "Status", labelBn: "অবস্থা", type: "select", options: ["draft", "published"] },
  { key: "excerpt_en", labelEn: "Excerpt (EN)", labelBn: "উদ্ধৃতি (ইংরেজি)", type: "textarea" },
  { key: "excerpt_bn", labelEn: "Excerpt (BN)", labelBn: "উদ্ধৃতি (বাংলা)", type: "textarea" },
  { key: "content_en", labelEn: "Content (EN)", labelBn: "বিষয়বস্তু (ইংরেজি)", type: "textarea" },
  { key: "content_bn", labelEn: "Content (BN)", labelBn: "বিষয়বস্তু (বাংলা)", type: "textarea" },
  { key: "cover_image", labelEn: "Cover URL", labelBn: "প্রচ্ছদ URL", type: "url" },
  { key: "tags", labelEn: "Tags", labelBn: "ট্যাগ", type: "tags" },
  { key: "seo_title", labelEn: "SEO Title", labelBn: "SEO শিরোনাম", type: "text", section: "SEO" },
  { key: "seo_description", labelEn: "SEO Description", labelBn: "SEO বর্ণনা", type: "textarea" },
];

/* ─── Videos ────────────────────────────────────────────────────── */

const VIDEO_FIELDS: ResourceField[] = [
  { key: "title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text", required: true },
  { key: "title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
  { key: "category", labelEn: "Category", labelBn: "বিভাগ", type: "select", options: ["Meditation", "Mindfulness", "Mental Health", "Philosophy", "Buddhist Psychology"] },
  { key: "youtube_url", labelEn: "YouTube URL", labelBn: "ইউটিউব URL", type: "url" },
  { key: "thumbnail_url", labelEn: "Thumbnail URL", labelBn: "থাম্বনেইল URL", type: "url" },
  { key: "duration", labelEn: "Duration (s)", labelBn: "সময় (সেকেন্ড)", type: "number" },
  { key: "description_en", labelEn: "Description (EN)", labelBn: "বর্ণনা (ইংরেজি)", type: "textarea" },
  { key: "description_bn", labelEn: "Description (BN)", labelBn: "বর্ণনা (বাংলা)", type: "textarea" },
  { key: "sort_order", labelEn: "Sort", labelBn: "ক্রম", type: "number" },
];

/* ─── Pages (read-only in mock) ─────────────────────────────────── */

const PAGE_FIELDS: ResourceField[] = [
  { key: "title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text" },
  { key: "title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
  { key: "slug", labelEn: "Slug", labelBn: "স্লাগ", type: "text", readOnly: true },
  { key: "visible", labelEn: "Visible", labelBn: "দৃশ্যমান", type: "boolean" },
  { key: "sort_order", labelEn: "Sort", labelBn: "ক্রম", type: "number" },
  { key: "meta_description_en", labelEn: "SEO Description (EN)", labelBn: "SEO বর্ণনা (ইংরেজি)", type: "textarea", section: "SEO" },
  { key: "meta_description_bn", labelEn: "SEO Description (BN)", labelBn: "SEO বর্ণনা (বাংলা)", type: "textarea" },
];

/* ─── Categories (read-only in mock) ────────────────────────────── */

const CATEGORY_FIELDS: ResourceField[] = [
  { key: "name_en", labelEn: "Name (EN)", labelBn: "নাম (ইংরেজি)", type: "text" },
  { key: "name_bn", labelEn: "Name (BN)", labelBn: "নাম (বাংলা)", type: "text" },
  { key: "slug", labelEn: "Slug", labelBn: "স্লাগ", type: "text", readOnly: true },
  { key: "color", labelEn: "Color", labelBn: "রঙ", type: "text" },
];

/* ─── Navigation (read-only in mock) ────────────────────────────── */

const NAV_FIELDS: ResourceField[] = [
  { key: "label_en", labelEn: "Label (EN)", labelBn: "লেবেল (ইংরেজি)", type: "text" },
  { key: "label_bn", labelEn: "Label (BN)", labelBn: "লেবেল (বাংলা)", type: "text" },
  { key: "url", labelEn: "URL", labelBn: "URL", type: "text", readOnly: true },
  { key: "type", labelEn: "Type", labelBn: "ধরন", type: "select", options: ["internal", "external", "dropdown"] },
  { key: "sort_order", labelEn: "Sort", labelBn: "ক্রম", type: "number" },
  { key: "visible", labelEn: "Visible", labelBn: "দৃশ্যমান", type: "boolean" },
];

/* ─── Orders (read-only in mock) ────────────────────────────────── */

const ORDER_FIELDS: ResourceField[] = [
  { key: "id", labelEn: "ID", labelBn: "আইডি", type: "text", readOnly: true },
  { key: "status", labelEn: "Status", labelBn: "অবস্থা", type: "select", options: ["pending", "paid", "failed", "cancelled"] },
  { key: "total", labelEn: "Total (BDT)", labelBn: "মোট (টাকা)", type: "number", readOnly: true },
  { key: "currency", labelEn: "Currency", labelBn: "মুদ্রা", type: "text", readOnly: true },
];

/* ─── Profiles (read-only in mock) ──────────────────────────────── */

const PROFILE_FIELDS: ResourceField[] = [
  { key: "display_name", labelEn: "Name", labelBn: "নাম", type: "text" },
  { key: "user_id", labelEn: "User ID", labelBn: "ব্যবহারকারী আইডি", type: "text", readOnly: true },
  { key: "bio", labelEn: "Bio", labelBn: "বায়ো", type: "textarea" },
  { key: "avatar_url", labelEn: "Avatar URL", labelBn: "অবতার URL", type: "url" },
];

/* ─── Registry ──────────────────────────────────────────────────── */

export const ADMIN_RESOURCE_DEFS: ResourceDef[] = [
  {
    name: "books",
    labelEn: "Books",
    labelBn: "বই",
    icon: BookOpen,
    columns: [
      { key: "title_en", labelEn: "Title", labelBn: "শিরোনাম" },
      { key: "author_name", labelEn: "Author", labelBn: "লেখক" },
      { key: "category", labelEn: "Category", labelBn: "বিভাগ" },
      { key: "price", labelEn: "Price", labelBn: "মূল্য", format: (r) => (r.is_free ? "Free" : `BDT ${Number(r.price) ?? 0}`) },
      { key: "status", labelEn: "Status", labelBn: "অবস্থা" },
      { key: "featured", labelEn: "Featured", labelBn: "বৈশিষ্ট্যযুক্ত", format: (r) => (r.featured ? "✓" : "") },
    ],
    fields: BOOK_FIELDS,
  },
  {
    name: "posts",
    labelEn: "Reflections",
    labelBn: "প্রতিফলন",
    icon: FileText,
    columns: [
      { key: "title_en", labelEn: "Title", labelBn: "শিরোনাম" },
      { key: "category", labelEn: "Category", labelBn: "বিভাগ" },
      { key: "author_name", labelEn: "Author", labelBn: "লেখক" },
      { key: "status", labelEn: "Status", labelBn: "অবস্থা" },
    ],
    fields: POST_FIELDS,
  },
  {
    name: "videos",
    labelEn: "Videos",
    labelBn: "ভিডিও",
    icon: Video,
    columns: [
      { key: "title_en", labelEn: "Title", labelBn: "শিরোনাম" },
      { key: "category", labelEn: "Category", labelBn: "বিভাগ" },
      { key: "duration", labelEn: "Duration", labelBn: "সময়", format: (r) => (Number(r.duration) ? `${r.duration}s` : "") },
    ],
    fields: VIDEO_FIELDS,
  },
  {
    name: "pages",
    labelEn: "Pages",
    labelBn: "পৃষ্ঠা",
    icon: FileText,
    columns: [
      { key: "title_en", labelEn: "Title", labelBn: "শিরোনাম" },
      { key: "slug", labelEn: "Slug", labelBn: "স্লাগ" },
      { key: "visible", labelEn: "Visible", labelBn: "দৃশ্যমান", format: (r) => (r.visible ? "✓" : "") },
    ],
    fields: PAGE_FIELDS,
  },
  {
    name: "categories",
    labelEn: "Categories",
    labelBn: "বিভাগসমূহ",
    icon: FolderTree,
    columns: [
      { key: "name_en", labelEn: "Name", labelBn: "নাম" },
      { key: "slug", labelEn: "Slug", labelBn: "স্লাগ" },
      { key: "color", labelEn: "Color", labelBn: "রঙ" },
    ],
    fields: CATEGORY_FIELDS,
  },
  {
    name: "navigation_items",
    labelEn: "Navigation",
    labelBn: "নেভিগেশন",
    icon: ListTree,
    columns: [
      { key: "label_en", labelEn: "Label", labelBn: "লেবেল" },
      { key: "url", labelEn: "URL", labelBn: "URL" },
      { key: "type", labelEn: "Type", labelBn: "ধরন" },
      { key: "sort_order", labelEn: "Sort", labelBn: "ক্রম" },
      { key: "visible", labelEn: "Visible", labelBn: "দৃশ্যমান", format: (r) => (r.visible ? "✓" : "") },
    ],
    fields: NAV_FIELDS,
  },
  {
    name: "orders",
    labelEn: "Orders",
    labelBn: "অর্ডার",
    icon: Receipt,
    columns: [
      { key: "id", labelEn: "ID", labelBn: "আইডি", format: (r) => String(r.id).slice(0, 8) },
      { key: "status", labelEn: "Status", labelBn: "অবস্থা" },
      { key: "total", labelEn: "Total", labelBn: "মোট", format: (r) => `BDT ${Number(r.total) ?? 0}` },
      { key: "createdAt", labelEn: "Created", labelBn: "তৈরি", format: (r) => String(r.createdAt ?? r.created_at ?? "").slice(0, 10) },
    ],
    fields: ORDER_FIELDS,
  },
  {
    name: "profiles",
    labelEn: "Users",
    labelBn: "ব্যবহারকারী",
    icon: Users,
    columns: [
      { key: "display_name", labelEn: "Name", labelBn: "নাম" },
      { key: "user_id", labelEn: "User ID", labelBn: "ব্যবহারকারী আইডি", format: (r) => String(r.user_id ?? "").slice(0, 8) },
      { key: "created_at", labelEn: "Joined", labelBn: "যোগদান", format: (r) => String(r.created_at ?? "").slice(0, 10) },
    ],
    fields: PROFILE_FIELDS,
  },
  {
    name: "site_settings",
    labelEn: "Site Settings",
    labelBn: "সাইট সেটিংস",
    icon: Settings2,
    singleRow: true,
    columns: [
      { key: "branding.site_name_en", labelEn: "Site Name", labelBn: "সাইটের নাম" },
      { key: "branding.tagline_en", labelEn: "Tagline", labelBn: "ট্যাগলাইন" },
      { key: "theme.accent_color", labelEn: "Accent", labelBn: "অ্যাকসেন্ট" },
      { key: "theme.mode", labelEn: "Mode", labelBn: "মোড" },
      { key: "maintenance.enabled", labelEn: "Maintenance", labelBn: "রক্ষণাবেক্ষণ", format: (r) => (r["maintenance.enabled"] ? "ON" : "off") },
    ],
    fields: [
      // Branding
      { key: "branding.site_name_en", labelEn: "Site Name (EN)", labelBn: "সাইটের নাম (ইংরেজি)", type: "text", section: "Branding" },
      { key: "branding.site_name_bn", labelEn: "Site Name (BN)", labelBn: "সাইটের নাম (বাংলা)", type: "text" },
      { key: "branding.tagline_en", labelEn: "Tagline (EN)", labelBn: "ট্যাগলাইন (ইংরেজি)", type: "text" },
      { key: "branding.tagline_bn", labelEn: "Tagline (BN)", labelBn: "ট্যাগলাইন (বাংলা)", type: "text" },
      // Hero
      { key: "hero.visible", labelEn: "Show Hero", labelBn: "হিরো দেখান", type: "boolean", section: "Hero" },
      { key: "hero.image_url", labelEn: "Image URL", labelBn: "ছবির URL", type: "url" },
      { key: "hero.eyebrow_en", labelEn: "Eyebrow (EN)", labelBn: "আইব্রো (ইংরেজি)", type: "text" },
      { key: "hero.title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text" },
      { key: "hero.title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
      { key: "hero.desc_en", labelEn: "Description (EN)", labelBn: "বর্ণনা (ইংরেজি)", type: "textarea" },
      { key: "hero.desc_bn", labelEn: "Description (BN)", labelBn: "বর্ণনা (বাংলা)", type: "textarea" },
      { key: "hero.cta_label", labelEn: "CTA Label (EN)", labelBn: "CTA লেবেল (ইংরেজি)", type: "text" },
      { key: "hero.cta_label_bn", labelEn: "CTA Label (BN)", labelBn: "CTA লেবেল (বাংলা)", type: "text" },
      { key: "hero.cta_url", labelEn: "CTA URL", labelBn: "CTA URL", type: "text" },
      // Theme
      { key: "theme.preset", labelEn: "Preset", labelBn: "প্রিসেট", type: "select", options: ["Warm Saffron", "Cool Indigo", "Forest Green", "Minimal Gray", "Elegant Serif", "Modern Clean"], section: "Theme" },
      { key: "theme.accent_color", labelEn: "Accent Color", labelBn: "অ্যাকসেন্ট রঙ", type: "text" },
      { key: "theme.accent_hover", labelEn: "Accent Hover", labelBn: "অ্যাকসেন্ট হোভার", type: "text" },
      { key: "theme.mode", labelEn: "Mode", labelBn: "মোড", type: "select", options: ["light", "dark"] },
      { key: "theme.font_size_base", labelEn: "Base Font Size (px)", labelBn: "বেস ফন্ট সাইজ (px)", type: "number" },
      { key: "theme.radius_scale", labelEn: "Radius Scale", labelBn: "রেডিয়াস স্কেল", type: "number" },
      { key: "theme.custom_css", labelEn: "Custom CSS", labelBn: "কাস্টম CSS", type: "textarea" },
      // SEO
      { key: "seo.meta_desc_en", labelEn: "Meta Description (EN)", labelBn: "মেটা বর্ণনা (ইংরেজি)", type: "textarea", section: "SEO" },
      { key: "seo.meta_desc_bn", labelEn: "Meta Description (BN)", labelBn: "মেটা বর্ণনা (বাংলা)", type: "textarea" },
      { key: "seo.og_image_url", labelEn: "OG Image URL", labelBn: "OG ছবি URL", type: "url" },
      { key: "seo.google_analytics_id", labelEn: "Google Analytics ID", labelBn: "গুগল অ্যানালিটিক্স আইডি", type: "text" },
      { key: "seo.enable_sitemap", labelEn: "Enable Sitemap", labelBn: "সাইটম্যাপ চালু করুন", type: "boolean" },
      { key: "seo.site_url", labelEn: "Site URL", labelBn: "সাইট URL", type: "text" },
      // Social
      { key: "social.facebook", labelEn: "Facebook", labelBn: "ফেসবুক", type: "url", section: "Social" },
      { key: "social.twitter", labelEn: "Twitter / X", labelBn: "টুইটার / X", type: "url" },
      { key: "social.instagram", labelEn: "Instagram", labelBn: "ইনস্টাগ্রাম", type: "url" },
      { key: "social.linkedin", labelEn: "LinkedIn", labelBn: "লিংকডইন", type: "url" },
      { key: "social.youtube", labelEn: "YouTube", labelBn: "ইউটিউব", type: "url" },
      // Contact
      { key: "contact.email", labelEn: "Contact Email", labelBn: "যোগাযোগ ইমেইল", type: "text", section: "Contact" },
      { key: "contact.phone", labelEn: "Phone", labelBn: "ফোন", type: "text" },
      { key: "contact.location", labelEn: "Location", labelBn: "অবস্থান", type: "text" },
      { key: "contact.title_en", labelEn: "Title (EN)", labelBn: "শিরোনাম (ইংরেজি)", type: "text" },
      { key: "contact.title_bn", labelEn: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", type: "text" },
      { key: "contact.intro_en", labelEn: "Intro (EN)", labelBn: "ভূমিকা (ইংরেজি)", type: "textarea" },
      { key: "contact.intro_bn", labelEn: "Intro (BN)", labelBn: "ভূমিকা (বাংলা)", type: "textarea" },
      { key: "contact.success_text_en", labelEn: "Success Text (EN)", labelBn: "সাফল্য বার্তা (ইংরেজি)", type: "textarea" },
      { key: "contact.success_text_bn", labelEn: "Success Text (BN)", labelBn: "সাফল্য বার্তা (বাংলা)", type: "textarea" },
      { key: "contact.address_en", labelEn: "Address (EN)", labelBn: "ঠিকানা (ইংরেজি)", type: "textarea" },
      { key: "contact.address_bn", labelEn: "Address (BN)", labelBn: "ঠিকানা (বাংলা)", type: "textarea" },
      { key: "contact.map_embed_url", labelEn: "Map Embed URL", labelBn: "ম্যাপ এমবেড URL", type: "url" },
      // Footer
      { key: "footer.copyright_en", labelEn: "Copyright (EN)", labelBn: "কপিরাইট (ইংরেজি)", type: "text", section: "Footer" },
      { key: "footer.text_en", labelEn: "Footer Text (EN)", labelBn: "ফুটার টেক্সট (ইংরেজি)", type: "textarea" },
      { key: "footer.explore_title_en", labelEn: "Explore Title (EN)", labelBn: "এক্সপ্লোর শিরোনাম (ইংরেজি)", type: "text" },
      // Article (post-page widgets)
      { key: "article.show_author_bio", labelEn: "Show Author Bio", labelBn: "লেখকের বায়ো দেখান", type: "boolean", section: "Article" },
      { key: "article.show_related_posts", labelEn: "Show Related Posts", labelBn: "সম্পর্কিত পোস্ট দেখান", type: "boolean" },
      { key: "article.sidebar_title_en", labelEn: "Sidebar Title (EN)", labelBn: "সাইডবার শিরোনাম (ইংরেজি)", type: "text" },
      { key: "article.sidebar_title_bn", labelEn: "Sidebar Title (BN)", labelBn: "সাইডবার শিরোনাম (বাংলা)", type: "text" },
      { key: "article.sidebar_text_en", labelEn: "Sidebar Text (EN)", labelBn: "সাইডবার টেক্সট (ইংরেজি)", type: "textarea" },
      { key: "article.sidebar_text_bn", labelEn: "Sidebar Text (BN)", labelBn: "সাইডবার টেক্সট (বাংলা)", type: "textarea" },
      { key: "article.newsletter_title_en", labelEn: "Newsletter Title (EN)", labelBn: "নিউজলেটার শিরোনাম (ইংরেজি)", type: "text" },
      { key: "article.newsletter_title_bn", labelEn: "Newsletter Title (BN)", labelBn: "নিউজলেটার শিরোনাম (বাংলা)", type: "text" },
      { key: "article.newsletter_text_en", labelEn: "Newsletter Text (EN)", labelBn: "নিউজলেটার টেক্সট (ইংরেজি)", type: "textarea" },
      { key: "article.newsletter_text_bn", labelEn: "Newsletter Text (BN)", labelBn: "নিউজলেটার টেক্সট (বাংলা)", type: "textarea" },
      { key: "article.pullout_title_en", labelEn: "Pullout Title (EN)", labelBn: "পুলআউট শিরোনাম (ইংরেজি)", type: "text" },
      { key: "article.pullout_title_bn", labelEn: "Pullout Title (BN)", labelBn: "পুলআউট শিরোনাম (বাংলা)", type: "text" },
      { key: "article.pullout_text_en", labelEn: "Pullout Text (EN)", labelBn: "পুলআউট টেক্সট (ইংরেজি)", type: "textarea" },
      { key: "article.pullout_text_bn", labelEn: "Pullout Text (BN)", labelBn: "পুলআউট টেক্সট (বাংলা)", type: "textarea" },
      // Reader
      { key: "reader.sign_in_prompt_title", labelEn: "Sign-in Prompt Title", labelBn: "সাইন-ইন প্রম্পট শিরোনাম", type: "text", section: "Reader" },
      { key: "reader.sign_in_prompt_message", labelEn: "Sign-in Prompt Message", labelBn: "সাইন-ইন প্রম্পট বার্তা", type: "textarea" },
      { key: "reader.default_theme", labelEn: "Default Theme", labelBn: "ডিফল্ট থিম", type: "select", options: ["light", "sepia", "dark"] },
      { key: "reader.default_font_size", labelEn: "Default Font Size", labelBn: "ডিফল্ট ফন্ট সাইজ", type: "number" },
      { key: "reader.default_line_height", labelEn: "Default Line Height", labelBn: "ডিফল্ট লাইন হাইট", type: "number" },
      { key: "reader.show_page_numbers", labelEn: "Show Page Numbers", labelBn: "পৃষ্ঠা নম্বর দেখান", type: "boolean" },
      { key: "reader.allow_download", labelEn: "Allow Download", labelBn: "ডাউনলোড অনুমতি", type: "boolean" },
      { key: "reader.allow_print", labelEn: "Allow Print", labelBn: "প্রিন্ট অনুমতি", type: "boolean" },
      { key: "reader.bookmarks_tab_label_en", labelEn: "Bookmarks Tab (EN)", labelBn: "বুকমার্ক ট্যাব (ইংরেজি)", type: "text" },
      { key: "reader.bookmarks_tab_label_bn", labelEn: "Bookmarks Tab (BN)", labelBn: "বুকমার্ক ট্যাব (বাংলা)", type: "text" },
      { key: "reader.notes_tab_label_en", labelEn: "Notes Tab (EN)", labelBn: "নোট ট্যাব (ইংরেজি)", type: "text" },
      { key: "reader.notes_tab_label_bn", labelEn: "Notes Tab (BN)", labelBn: "নোট ট্যাব (বাংলা)", type: "text" },
      { key: "reader.search_tab_label_en", labelEn: "Search Tab (EN)", labelBn: "অনুসন্ধান ট্যাব (ইংরেজি)", type: "text" },
      { key: "reader.search_tab_label_bn", labelEn: "Search Tab (BN)", labelBn: "অনুসন্ধান ট্যাব (বাংলা)", type: "text" },
      { key: "reader.bookmarks_empty_en", labelEn: "Bookmarks Empty (EN)", labelBn: "বুকমার্ক খালি (ইংরেজি)", type: "text" },
      { key: "reader.bookmarks_empty_bn", labelEn: "Bookmarks Empty (BN)", labelBn: "বুকমার্ক খালি (বাংলা)", type: "text" },
      { key: "reader.notes_empty_en", labelEn: "Notes Empty (EN)", labelBn: "নোট খালি (ইংরেজি)", type: "text" },
      { key: "reader.notes_empty_bn", labelEn: "Notes Empty (BN)", labelBn: "নোট খালি (বাংলা)", type: "text" },
      { key: "reader.no_pdf_message_en", labelEn: "No PDF Message (EN)", labelBn: "PDF নেই বার্তা (ইংরেজি)", type: "text" },
      { key: "reader.no_pdf_message_bn", labelEn: "No PDF Message (BN)", labelBn: "PDF নেই বার্তা (বাংলা)", type: "text" },
      { key: "reader.open_reader_failed_en", labelEn: "Open Failed (EN)", labelBn: "খুলতে ব্যর্থ (ইংরেজি)", type: "text" },
      { key: "reader.open_reader_failed_bn", labelEn: "Open Failed (BN)", labelBn: "খুলতে ব্যর্থ (বাংলা)", type: "text" },
      // Commerce
      { key: "commerce.currency", labelEn: "Currency Code", labelBn: "মুদ্রা কোড", type: "text", section: "Commerce" },
      { key: "commerce.currency_symbol", labelEn: "Currency Symbol", labelBn: "মুদ্রা প্রতীক", type: "text" },
      { key: "commerce.tax_rate", labelEn: "Tax Rate (%)", labelBn: "কর হার (%)", type: "number" },
      { key: "commerce.proceed_checkout_label_en", labelEn: "Checkout Button (EN)", labelBn: "চেকআউট বোতাম (ইংরেজি)", type: "text" },
      { key: "commerce.proceed_checkout_label_bn", labelEn: "Checkout Button (BN)", labelBn: "চেকআউট বোতাম (বাংলা)", type: "text" },
      { key: "commerce.checkout_notice_en", labelEn: "Checkout Notice (EN)", labelBn: "চেকআউট নোটিশ (ইংরেজি)", type: "textarea" },
      { key: "commerce.checkout_notice_bn", labelEn: "Checkout Notice (BN)", labelBn: "চেকআউট নোটিশ (বাংলা)", type: "textarea" },
      { key: "commerce.cart_empty_en", labelEn: "Cart Empty (EN)", labelBn: "কার্ট খালি (ইংরেজি)", type: "text" },
      { key: "commerce.cart_empty_bn", labelEn: "Cart Empty (BN)", labelBn: "কার্ট খালি (বাংলা)", type: "text" },
      { key: "commerce.cart_sign_in_desc_en", labelEn: "Cart Sign-in (EN)", labelBn: "কার্ট সাইন-ইন (ইংরেজি)", type: "text" },
      { key: "commerce.cart_sign_in_desc_bn", labelEn: "Cart Sign-in (BN)", labelBn: "কার্ট সাইন-ইন (বাংলা)", type: "text" },
      { key: "commerce.subtotal_label_en", labelEn: "Subtotal (EN)", labelBn: "সাবটোটাল (ইংরেজি)", type: "text" },
      { key: "commerce.subtotal_label_bn", labelEn: "Subtotal (BN)", labelBn: "সাবটোটাল (বাংলা)", type: "text" },
      { key: "commerce.cart_title_en", labelEn: "Cart Title (EN)", labelBn: "কার্ট শিরোনাম (ইংরেজি)", type: "text" },
      { key: "commerce.cart_title_bn", labelEn: "Cart Title (BN)", labelBn: "কার্ট শিরোনাম (বাংলা)", type: "text" },
      { key: "commerce.refund_policy_en", labelEn: "Refund Policy (EN)", labelBn: "ফেরত নীতি (ইংরেজি)", type: "textarea" },
      { key: "commerce.refund_policy_bn", labelEn: "Refund Policy (BN)", labelBn: "ফেরত নীতি (বাংলা)", type: "textarea" },
      // Book grid
      { key: "book_grid.page_size", labelEn: "Books per Page", labelBn: "প্রতি পৃষ্ঠায় বই", type: "number", section: "Book Grid" },
      { key: "book_grid.columns_mobile", labelEn: "Columns (Mobile)", labelBn: "কলাম (মোবাইল)", type: "select", options: ["1", "2"] },
      { key: "book_grid.columns_tablet", labelEn: "Columns (Tablet)", labelBn: "কলাম (ট্যাবলেট)", type: "select", options: ["2", "3", "4"] },
      { key: "book_grid.columns_desktop", labelEn: "Columns (Desktop)", labelBn: "কলাম (ডেস্কটপ)", type: "select", options: ["3", "4", "5"] },
      { key: "book_grid.gap", labelEn: "Grid Gap (px)", labelBn: "গ্রিড গ্যাপ (px)", type: "number" },
      // Maintenance
      { key: "maintenance.enabled", labelEn: "Maintenance Mode", labelBn: "রক্ষণাবেক্ষণ মোড", type: "boolean", section: "Maintenance" },
      { key: "maintenance.title_en", labelEn: "Maintenance Title (EN)", labelBn: "রক্ষণাবেক্ষণ শিরোনাম (ইংরেজি)", type: "text" },
      { key: "maintenance.message_en", labelEn: "Maintenance Message (EN)", labelBn: "রক্ষণাবেক্ষণ বার্তা (ইংরেজি)", type: "textarea" },
    ],
  },
  {
    name: "tags",
    labelEn: "Tags",
    labelBn: "ট্যাগ",
    icon: Tag,
    columns: [
      { key: "name_en", labelEn: "Name", labelBn: "নাম" },
      { key: "slug", labelEn: "Slug", labelBn: "স্লাগ" },
      { key: "color", labelEn: "Color", labelBn: "রঙ" },
    ],
    fields: [
      { key: "name_en", labelEn: "Name (EN)", labelBn: "নাম (ইংরেজি)", type: "text" },
      { key: "name_bn", labelEn: "Name (BN)", labelBn: "নাম (বাংলা)", type: "text" },
      { key: "slug", labelEn: "Slug", labelBn: "স্লাগ", type: "text", readOnly: true },
      { key: "color", labelEn: "Color", labelBn: "রঙ", type: "text" },
    ],
  },
  {
    name: "notifications",
    labelEn: "Notifications",
    labelBn: "বিজ্ঞপ্তি",
    icon: Bell,
    columns: [
      { key: "message", labelEn: "Message", labelBn: "বার্তা" },
      { key: "type", labelEn: "Type", labelBn: "ধরন" },
      { key: "userId", labelEn: "User", labelBn: "ব্যবহারকারী", format: (r) => String(r.userId ?? "").slice(0, 8) },
      { key: "read", labelEn: "Read", labelBn: "পঠিত", format: (r) => (r.read ? "✓" : "") },
      { key: "createdAt", labelEn: "Created", labelBn: "তৈরি", format: (r) => String(r.createdAt ?? "").slice(0, 10) },
    ],
    fields: [
      { key: "message", labelEn: "Message", labelBn: "বার্তা", type: "textarea" },
      { key: "type", labelEn: "Type", labelBn: "ধরন", type: "select", options: ["new_comment", "comment_reply", "contact_message", "new_purchase", "new_content", "recommendation", "welcome"] },
      { key: "link", labelEn: "Link", labelBn: "লিংক", type: "text" },
      { key: "read", labelEn: "Read", labelBn: "পঠিত", type: "boolean" },
      { key: "userId", labelEn: "User ID", labelBn: "ব্যবহারকারী আইডি", type: "text", readOnly: true },
    ],
  },
];

export function getResourceDef(name: string): ResourceDef | undefined {
  return ADMIN_RESOURCE_DEFS.find((r) => r.name === name);
}
