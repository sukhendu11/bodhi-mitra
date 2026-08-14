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
  BookOpen,
  FileText,
  FolderTree,
  ListTree,
  Receipt,
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
];

export function getResourceDef(name: string): ResourceDef | undefined {
  return ADMIN_RESOURCE_DEFS.find((r) => r.name === name);
}
