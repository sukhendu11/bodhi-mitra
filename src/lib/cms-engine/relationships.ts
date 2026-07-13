import type { ContentTypeDefinition } from "./content-type";

/* ─── Relationship Types ──────────────────────────────────────────── */

export type RelationshipType =
  | "belongs_to" // Foreign key on this table (e.g., post belongs to category)
  | "has_many" // Foreign key on other table (e.g., course has many lessons)
  | "has_one" // One-to-one via foreign key on other table
  | "many_to_many"; // Junction table (e.g., posts and tags via post_tags)

/* ─── Relationship Definition ─────────────────────────────────────── */

export interface RelationshipDef {
  /** Machine name (e.g., 'category', 'lessons', 'tags') */
  name: string;
  /** Relationship type */
  type: RelationshipType;
  /** The related content type name (must be registered) */
  relatedType: string;
  /** Foreign key field on this table (for belongs_to) */
  foreignKey?: string;
  /** Foreign key field on the related table (for has_many, has_one) */
  relatedForeignKey?: string;
  /** Junction table name (for many_to_many) */
  through?: string;
  /** This table's key in the junction table (for many_to_many) */
  throughThisKey?: string;
  /** Related table's key in the junction table (for many_to_many) */
  throughRelatedKey?: string;
  /** Human-readable label */
  label: string;
  /** Whether this relationship is required */
  required?: boolean;
  /** Whether it can have multiple values */
  multiple?: boolean;
  /** Description / help text */
  description?: string;
}

/* ─── Relationship Registry ───────────────────────────────────────── */

const relationshipRegistry = new Map<string, Map<string, RelationshipDef>>();

/**
 * Register relationships for a content type.
 */
export function registerRelationships(
  contentTypeName: string,
  relationships: RelationshipDef[],
): void {
  const map = new Map<string, RelationshipDef>();
  for (const rel of relationships) {
    map.set(rel.name, rel);
  }
  relationshipRegistry.set(contentTypeName, map);
}

/**
 * Get all relationships for a content type.
 */
export function getRelationships(contentTypeName: string): RelationshipDef[] {
  return Array.from(relationshipRegistry.get(contentTypeName)?.values() ?? []);
}

/**
 * Get a specific relationship by name.
 */
export function getRelationship(
  contentTypeName: string,
  relationshipName: string,
): RelationshipDef | undefined {
  return relationshipRegistry.get(contentTypeName)?.get(relationshipName);
}

/**
 * Get all content types that relate to the given content type.
 * Useful for building backlinks and reference lists.
 */
export function getRelatedContentTypes(
  contentTypeName: string,
): { contentType: string; relationship: RelationshipDef }[] {
  const result: { contentType: string; relationship: RelationshipDef }[] = [];
  for (const [name, rels] of relationshipRegistry) {
    for (const [, rel] of rels) {
      if (rel.relatedType === contentTypeName) {
        result.push({ contentType: name, relationship: rel });
      }
    }
  }
  return result;
}

/* ─── Relationship Query Builders ─────────────────────────────────── */

export interface RelationshipQuery {
  /** Supabase/RQL filter expression */
  filter?: Record<string, unknown>;
  /** Select query */
  select?: string;
}

/**
 * Build a query config for fetching related data based on relationship definition.
 */
export function buildRelationshipQuery(rel: RelationshipDef, parentId?: string): RelationshipQuery {
  switch (rel.type) {
    case "belongs_to":
      return {
        filter: rel.foreignKey ? { [rel.foreignKey]: parentId } : undefined,
        select: "*",
      };

    case "has_many":
    case "has_one":
      return {
        filter: rel.relatedForeignKey ? { [rel.relatedForeignKey]: parentId } : undefined,
        select: "*",
      };

    case "many_to_many":
      // For many-to-many, you need a join query
      return {
        filter: rel.throughThisKey ? { [rel.throughThisKey]: parentId } : undefined,
        select: `*, ${rel.through}(*)`,
      };

    default:
      return {};
  }
}

/* ─── Common Relationship Definitions ─────────────────────────────── */

/**
 * Pre-built relationship for taxonomy (category, tags).
 */
export const CATEGORY_RELATIONSHIP: RelationshipDef = {
  name: "category",
  type: "belongs_to",
  relatedType: "category",
  foreignKey: "category",
  label: "Category",
  description: "The primary category for this content",
};

export const TAGS_RELATIONSHIP: RelationshipDef = {
  name: "tags",
  type: "many_to_many",
  relatedType: "tag",
  through: "post_tags",
  throughThisKey: "post_id",
  throughRelatedKey: "tag_id",
  label: "Tags",
  multiple: true,
  description: "Tags for this content",
};

/**
 * Pre-built relationship for content that belongs to an author/user.
 */
export function authorRelationship(authorField = "author_name"): RelationshipDef {
  return {
    name: "author",
    type: "belongs_to",
    relatedType: "user",
    foreignKey: authorField,
    label: "Author",
    description: "The author of this content",
  };
}

/**
 * Pre-built relationship for content that has children (e.g., course has lessons).
 */
export function childrenRelationship(
  childType: string,
  foreignKey: string,
  label?: string,
): RelationshipDef {
  return {
    name: childType,
    type: "has_many",
    relatedType: childType,
    relatedForeignKey: foreignKey,
    label: label ?? childType,
    multiple: true,
  };
}
