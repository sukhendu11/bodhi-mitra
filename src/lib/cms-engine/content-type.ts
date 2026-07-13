import type { LucideIcon } from "lucide-react";
import type { ZodSchema } from "zod";

/* ─── Metadata Field Definition ───────────────────────────────────── */

export type MetadataFieldType =
  | "text"
  | "textarea"
  | "bilingual"
  | "bilingual-textarea"
  | "image"
  | "url"
  | "datetime"
  | "number"
  | "boolean"
  | "select"
  | "tags";

export interface MetadataFieldDef {
  /** Field name in the database */
  name: string;
  /** Human-readable label */
  label: string;
  /** Bengali label (for bilingual content) */
  labelBn?: string;
  /** Field type */
  type: MetadataFieldType;
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  default?: unknown;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select fields */
  options?: string[];
  /** Description/help text */
  description?: string;
  /** Whether this is an SEO field */
  seo?: boolean;
  /** Whether this is a system field (auto-managed, hidden from forms) */
  system?: boolean;
}

/* ─── Workflow Definition ─────────────────────────────────────────── */

export interface WorkflowDef {
  /** Available statuses, ordered by progression */
  statuses: string[];
  /** Default status for new content */
  defaultStatus: string;
  /** Valid status transitions: from -> [to] */
  transitions: Record<string, string[]>;
  /** Labels for each status (for display) */
  labels?: Record<string, string>;
  /** Colors for each status (for badges) */
  colors?: Record<string, string>;
}

/* ─── Slug Definition ─────────────────────────────────────────────── */

export interface SlugDef {
  /** Source fields to auto-generate slug from */
  sourceFields?: string[];
  /** Whether the slug must be unique across this content type */
  unique: boolean;
  /** Max length of the slug */
  maxLength?: number;
  /** Pattern validation regex */
  pattern?: RegExp;
  /** Pattern error message */
  patternMessage?: string;
  /** Character to use as separator (default: '-') */
  separator?: string;
}

/* ─── Route Definition ────────────────────────────────────────────── */

export interface RouteDef {
  /** Public URL pattern (e.g., '/posts/:slug') */
  public?: string;
  /** Admin list route (e.g., '/admin/books') */
  adminList?: string;
  /** Admin edit route with param (e.g., '/admin/:id') */
  adminEdit?: string;
  /** Route parameter name for public routes (default: 'slug') */
  param?: string;
}

/* ─── Content Type Definition ─────────────────────────────────────── */

export interface ContentTypeDefinition {
  /** Unique machine name (e.g., 'post', 'book', 'page') */
  name: string;
  /** Database table name (e.g., 'posts', 'books') */
  table: string;
  /** Human-readable label */
  label: string;
  /** Plural label */
  labelPlural: string;
  /** Description of this content type */
  description?: string;
  /** Icon for admin UI */
  icon?: LucideIcon;
  /** Slug configuration */
  slug?: SlugDef;
  /** Workflow configuration */
  workflow?: WorkflowDef;
  /** Custom metadata fields */
  fields?: MetadataFieldDef[];
  /** Route configuration */
  routes?: RouteDef;
  /** Whether this type supports revisions (default: false) */
  hasRevisions?: boolean;
  /** Whether this type supports SEO metadata (default: true) */
  hasSeo?: boolean;
  /** Whether this type supports tagging (default: false) */
  hasTags?: boolean;
  /** Zod schema for form validation */
  schema?: ZodSchema<any>;
  /** Default sort field for lists */
  defaultSortField?: string;
  /** Default sort direction */
  defaultSortOrder?: "asc" | "desc";
}

/* ─── Predefined Workflows ────────────────────────────────────────── */

export const BASIC_WORKFLOW: WorkflowDef = {
  statuses: ["draft", "published"],
  defaultStatus: "draft",
  transitions: {
    draft: ["published"],
    published: ["draft"],
  },
  labels: { draft: "Draft", published: "Published" },
  colors: { draft: "amber", published: "green" },
};

export const EXTENDED_WORKFLOW: WorkflowDef = {
  statuses: ["draft", "published", "archived"],
  defaultStatus: "draft",
  transitions: {
    draft: ["published", "archived"],
    published: ["draft", "archived"],
    archived: ["draft"],
  },
  labels: { draft: "Draft", published: "Published", archived: "Archived" },
  colors: { draft: "amber", published: "green", archived: "slate" },
};

/* ─── Predefined Metadata Fields ──────────────────────────────────── */

export const BILINGUAL_TITLE_FIELDS: MetadataFieldDef[] = [
  { name: "title_en", label: "Title (English)", type: "bilingual", required: true },
  { name: "title_bn", label: "Title (বাংলা)", type: "bilingual", required: true },
];

export const BILINGUAL_DESCRIPTION_FIELDS: MetadataFieldDef[] = [
  { name: "description_en", label: "Description (English)", type: "bilingual-textarea" },
  { name: "description_bn", label: "Description (বাংলা)", type: "bilingual-textarea" },
];

export const SEO_METADATA_FIELDS: MetadataFieldDef[] = [
  { name: "meta_description_en", label: "Meta Description (EN)", type: "textarea", seo: true },
  { name: "meta_description_bn", label: "Meta Description (BN)", type: "textarea", seo: true },
];

export const TIMESTAMP_FIELDS: MetadataFieldDef[] = [
  { name: "created_at", label: "Created", type: "datetime", system: true },
  { name: "updated_at", label: "Updated", type: "datetime", system: true },
];

/* ─── Content Type Registry ───────────────────────────────────────── */

const contentTypeRegistry = new Map<string, ContentTypeDefinition>();

export function registerContentType(def: ContentTypeDefinition): ContentTypeDefinition {
  if (contentTypeRegistry.has(def.name)) {
    throw new Error(`Content type "${def.name}" is already registered`);
  }
  contentTypeRegistry.set(def.name, def);
  return def;
}

export function getContentType(name: string): ContentTypeDefinition | undefined {
  return contentTypeRegistry.get(name);
}

export function getAllContentTypes(): ContentTypeDefinition[] {
  return Array.from(contentTypeRegistry.values());
}

export function getContentTypesByTable(table: string): ContentTypeDefinition | undefined {
  return Array.from(contentTypeRegistry.values()).find((ct) => ct.table === table);
}

export function getContentTypesWithWorkflow(status: string): ContentTypeDefinition[] {
  return Array.from(contentTypeRegistry.values()).filter((ct) =>
    ct.workflow?.statuses.includes(status),
  );
}

/* ─── Content Type Status Helpers ──────────────────────────────────── */

export function isValidTransition(def: ContentTypeDefinition, from: string, to: string): boolean {
  return def.workflow?.transitions[from]?.includes(to) ?? false;
}

export function getValidNextStatuses(def: ContentTypeDefinition, currentStatus: string): string[] {
  return def.workflow?.transitions[currentStatus] ?? [];
}

export function getStatusLabel(def: ContentTypeDefinition, status: string): string {
  return def.workflow?.labels?.[status] ?? status;
}

export function getStatusColor(def: ContentTypeDefinition, status: string): string {
  return def.workflow?.colors?.[status] ?? "slate";
}
