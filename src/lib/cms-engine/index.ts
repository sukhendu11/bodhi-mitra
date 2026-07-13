/* ─── Register content types (side-effect) ────────────────────────── */

import "./register-content-types";

/* ─── Content Type ────────────────────────────────────────────────── */

export {
  registerContentType,
  getContentType,
  getAllContentTypes,
  getContentTypesByTable,
  getContentTypesWithWorkflow,
  isValidTransition,
  getValidNextStatuses,
  getStatusLabel,
  getStatusColor,
  BASIC_WORKFLOW,
  EXTENDED_WORKFLOW,
  BILINGUAL_TITLE_FIELDS,
  BILINGUAL_DESCRIPTION_FIELDS,
  SEO_METADATA_FIELDS,
  TIMESTAMP_FIELDS,
} from "./content-type";

export type {
  ContentTypeDefinition,
  MetadataFieldDef,
  MetadataFieldType,
  WorkflowDef,
  SlugDef,
  RouteDef,
} from "./content-type";

/* ─── Metadata ────────────────────────────────────────────────────── */

export {
  getFormFields,
  getSeoFields,
  getSystemFields,
  getRequiredFields,
  getBilingualFields,
  mergeFields,
  groupFields,
  getDefaultValues,
} from "./metadata";

export type { FieldGroup } from "./metadata";

/* ─── Slug ────────────────────────────────────────────────────────── */

export {
  slugify,
  validateSlug,
  autoGenerateSlug,
  ensureUniqueSlug,
  slugifyBook,
  slugifyTaxonomy,
  slugifyPage,
  slugifyPost,
} from "./slug";

export type { SlugOptions, SlugValidation } from "./slug";

/* ─── Workflow ────────────────────────────────────────────────────── */

export {
  getWorkflowActions,
  isPubliclyVisible,
  getDefaultStatus,
  getAvailableStatuses,
  buildStatusConfig,
  validateTransition,
} from "./workflow";

export type { WorkflowAction, StatusConfig, WorkflowValidation } from "./workflow";

/* ─── Relationships ───────────────────────────────────────────────── */

export {
  registerRelationships,
  getRelationships,
  getRelationship,
  getRelatedContentTypes,
  buildRelationshipQuery,
  CATEGORY_RELATIONSHIP,
  TAGS_RELATIONSHIP,
  authorRelationship,
  childrenRelationship,
} from "./relationships";

export type { RelationshipDef, RelationshipType, RelationshipQuery } from "./relationships";

/* ─── Revisions ───────────────────────────────────────────────────── */

export {
  computeDiff,
  summarizeChanges,
  supportsRevisions,
  createRevisionSnapshot,
  buildRevision,
} from "./revisions";

export type { Revision, FieldDiff, ContentDiff } from "./revisions";

/* ─── SEO ─────────────────────────────────────────────────────────── */

export { extractSeoData, generateMetaTags, buildRouteMeta, extractBilingualSeoData } from "./seo";

export type { MetaTag, SeoData, RouteMeta, BilingualSeoData } from "./seo";
