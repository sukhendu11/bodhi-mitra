import { z } from "zod";

/* ─── Post Schemas ────────────────────────────────────────────────── */

export const postSchema = z.object({
  title_en: z.string().min(1, "English title is required"),
  title_bn: z.string().min(1, "Bangla title is required"),
  content_en: z.string().min(1, "English content is required"),
  content_bn: z.string().min(1, "Bangla content is required"),
  excerpt_en: z.string().default(""),
  excerpt_bn: z.string().default(""),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  cover_image: z.string().default(""),
  category: z.enum(["Buddhist Psychology", "Wisdom", "Books"]),
  author_name: z.string().default(""),
  author_image: z.string().default(""),
  status: z.enum(["draft", "published"]),
  tags: z.array(z.string()).default([]),
  meta_description_en: z.string().default(""),
  meta_description_bn: z.string().default(""),
});

export type PostFormValues = z.infer<typeof postSchema>;

/* ─── Page Schemas ────────────────────────────────────────────────── */

export const pageSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title_en: z.string().min(1, "English title is required"),
  title_bn: z.string().min(1, "Bangla title is required"),
  header_en: z.string().default(""),
  header_bn: z.string().default(""),
  body_en: z.string().default(""),
  body_bn: z.string().default(""),
  banner_url: z.string().default(""),
  meta_description_en: z.string().default(""),
  meta_description_bn: z.string().default(""),
  visible: z.boolean().default(true),
  sort_order: z.number().default(0),
});

export type PageFormValues = z.infer<typeof pageSchema>;

/* ─── Book Schemas ────────────────────────────────────────────────── */

export const bookSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title_en: z.string().min(1, "English title is required"),
  title_bn: z.string().min(1, "Bangla title is required"),
  author_name: z.string().default(""),
  description_en: z.string().default(""),
  description_bn: z.string().default(""),
  cover_image: z.string().default(""),
  pdf_url: z.string().default(""),
  pdf_file_size: z.number().default(0),
  price: z.number().default(0),
  is_free: z.boolean().default(true),
  pages: z.number().default(0),
  isbn: z.string().default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  category: z.string().default("general"),
  meta_description_en: z.string().default(""),
  meta_description_bn: z.string().default(""),
  sort_order: z.number().default(0),
});

export type BookFormValues = z.infer<typeof bookSchema>;

/* ─── Video Schemas ───────────────────────────────────────────────── */

export const videoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  thumbnail_url: z.string().default(""),
  youtube_url: z.string().min(1, "YouTube URL is required").url("Must be a valid URL"),
  sort_order: z.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

/* ─── Navigation Item Schema ─────────────────────────────────────── */

export const navItemSchema = z
  .object({
    type: z.enum(["internal", "external", "dropdown"]),
    label_en: z.string().min(1, "English label is required"),
    label_bn: z.string().default(""),
    slug: z.string().default("/"),
    url: z.string().default(""),
    visible: z.boolean().default(true),
    location: z.enum(["header", "footer"]).default("header"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "internal" && !data.slug?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Path is required for internal links",
        path: ["slug"],
      });
    }
    if (data.type === "external" && !data.url?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL is required for external links",
        path: ["url"],
      });
    }
  });

export type NavItemFormValues = z.infer<typeof navItemSchema>;

/* ─── Taxonomy Schemas ────────────────────────────────────────────── */

export const categorySchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  name_en: z.string().min(1, "English name is required"),
  name_bn: z.string().default(""),
  description_en: z.string().default(""),
  description_bn: z.string().default(""),
  icon: z.string().default(""),
  color: z.string().default("#d35400"),
  sort_order: z.number().default(0),
  visible: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const tagSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  name_en: z.string().min(1, "English name is required"),
  name_bn: z.string().default(""),
  color: z.string().default("#666"),
});

export type TagFormValues = z.infer<typeof tagSchema>;
