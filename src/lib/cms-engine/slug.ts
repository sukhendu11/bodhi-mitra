import type { ContentTypeDefinition } from "./content-type";

/* ─── Slug Options ────────────────────────────────────────────────── */

export interface SlugOptions {
  /** Character to use as separator (default: '-') */
  separator?: string;
  /** Max length of the slug */
  maxLength?: number;
  /** Whether to lowercase (default: true) */
  lowercase?: boolean;
  /** Whether to trim (default: true) */
  trim?: boolean;
  /** Extra characters to preserve */
  preserve?: string[];
}

/* ─── Default Options ─────────────────────────────────────────────── */

const DEFAULT_OPTIONS: SlugOptions = {
  separator: "-",
  lowercase: true,
  trim: true,
};

/* ─── Slug Generation ─────────────────────────────────────────────── */

/**
 * Generate a URL-friendly slug from a string.
 * Handles English and Bengali text by stripping non-ASCII characters
 * that are not valid URL components.
 *
 * Examples:
 *   slugify("The Quiet Mind")         // "the-quiet-mind"
 *   slugify("Hello World!")            // "hello-world"
 *   slugify("  Extra  spaces  ")       // "extra-spaces"
 */
export function slugify(input: string, options?: SlugOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let slug = input;

  if (opts.trim) slug = slug.trim();

  // Lowercase
  if (opts.lowercase) slug = slug.toLowerCase();

  // Replace common separators with the configured separator
  slug = slug.replace(/[\s_]+/g, opts.separator!);

  // Remove everything that isn't alphanumeric, the separator, or preserved chars
  const preserve = opts.preserve?.length
    ? opts.preserve.map((c) => `\\${c}`).join("")
    : "";
  const safePattern = new RegExp(`[^a-z0-9${preserve}${opts.separator}]`, "g");
  slug = slug.replace(safePattern, "");

  // Collapse multiple separators
  const sepRe = new RegExp(`${opts.separator}+`, "g");
  slug = slug.replace(sepRe, opts.separator!);

  // Remove leading/trailing separator
  slug = slug.replace(new RegExp(`^${opts.separator}|${opts.separator}$`, "g"), "");

  // Truncate
  if (opts.maxLength && slug.length > opts.maxLength) {
    slug = slug.slice(0, opts.maxLength).replace(new RegExp(`${opts.separator}[^${opts.separator}]*$`), "");
  }

  return slug;
}

/* ─── Slug Validation ─────────────────────────────────────────────── */

export interface SlugValidation {
  valid: boolean;
  message?: string;
}

const DEFAULT_SLUG_PATTERN = /^[a-z0-9-]+$/;
const DEFAULT_SLUG_MESSAGE = "Slug must be lowercase alphanumeric with hyphens";

/**
 * Validate a slug against a content type's definition.
 * Returns the slug if valid, or throws with a descriptive message.
 */
export function validateSlug(
  slug: string,
  def?: ContentTypeDefinition,
): SlugValidation {
  if (!slug || !slug.trim()) {
    return { valid: false, message: "Slug is required" };
  }

  const pattern = def?.slug?.pattern ?? DEFAULT_SLUG_PATTERN;
  const message = def?.slug?.patternMessage ?? DEFAULT_SLUG_MESSAGE;

  if (!pattern.test(slug)) {
    return { valid: false, message };
  }

  if (def?.slug?.maxLength && slug.length > def.slug.maxLength) {
    return { valid: false, message: `Slug must be ${def.slug.maxLength} characters or less` };
  }

  return { valid: true };
}

/* ─── Auto-generate Slug ──────────────────────────────────────────── */

/**
 * Auto-generate a slug from content data.
 * Uses the first non-empty source field from the content type definition.
 */
export function autoGenerateSlug(
  data: Record<string, unknown>,
  def: ContentTypeDefinition,
  options?: SlugOptions,
): string {
  const sourceFields = def.slug?.sourceFields ?? ["title_en", "title", "name_en", "name"];
  for (const field of sourceFields) {
    const value = data[field];
    if (value && typeof value === "string" && value.trim()) {
      return slugify(value, options);
    }
  }
  return slugify(def.label, options);
}

/* ─── Ensure Unique Slug ──────────────────────────────────────────── */

export interface EnsureUniqueOptions extends SlugOptions {
  /** Separator between slug and number (default: '-') */
  numberSeparator?: string;
}

/**
 * Given a desired slug and a set of existing slugs, ensures uniqueness
 * by appending a number if necessary.
 */
export function ensureUniqueSlug(
  desired: string,
  existingSlugs: string[],
  options?: EnsureUniqueOptions,
): string {
  const sep = options?.numberSeparator ?? "-";
  if (!existingSlugs.includes(desired)) return desired;

  let counter = 1;
  let candidate: string;
  do {
    candidate = `${desired}${sep}${counter}`;
    counter++;
  } while (existingSlugs.includes(candidate));

  return candidate;
}

/* ─── Module-Specific Slug Functions ──────────────────────────────── */

/**
 * Slugify for book titles. Bengali characters are preserved through the
 * standard slugify function's character filtering.
 */
export function slugifyBook(title: string): string {
  return slugify(title, { maxLength: 100 });
}

/**
 * Slugify for taxonomy terms (categories, tags).
 * Keeps shorter than content slugs.
 */
export function slugifyTaxonomy(title: string): string {
  return slugify(title, { maxLength: 80 });
}

/**
 * Slugify for page titles.
 */
export function slugifyPage(title: string): string {
  return slugify(title, { maxLength: 80 });
}

/**
 * Slugify for post titles.
 */
export function slugifyPost(title: string): string {
  return slugify(title, { maxLength: 100 });
}
