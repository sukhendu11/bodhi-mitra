import type { MetadataFieldDef, ContentTypeDefinition } from "./content-type";

/* ─── Filter Helpers ──────────────────────────────────────────────── */

/** Get all non-system, non-SEO metadata fields for a content type (form fields) */
export function getFormFields(def: ContentTypeDefinition): MetadataFieldDef[] {
  return (def.fields ?? []).filter((f) => !f.system && !f.seo);
}

/** Get SEO-specific fields */
export function getSeoFields(def: ContentTypeDefinition): MetadataFieldDef[] {
  return (def.fields ?? []).filter((f) => f.seo);
}

/** Get system-managed fields (auto-populated, hidden from forms) */
export function getSystemFields(def: ContentTypeDefinition): MetadataFieldDef[] {
  return (def.fields ?? []).filter((f) => f.system);
}

/** Get required fields (for validation summaries) */
export function getRequiredFields(def: ContentTypeDefinition): MetadataFieldDef[] {
  return (def.fields ?? []).filter((f) => f.required);
}

/** Get bilingual fields (title_en/title_bn pairs) */
export function getBilingualFields(def: ContentTypeDefinition): MetadataFieldDef[] {
  return (def.fields ?? []).filter(
    (f) => f.type === "bilingual" || f.type === "bilingual-textarea",
  );
}

/* ─── Field Merge Helpers ─────────────────────────────────────────── */

/**
 * Merge base content fields with optional extra fields.
 * Used to build complete field lists for a content type.
 */
export function mergeFields(
  ...fieldArrays: (MetadataFieldDef[] | undefined)[]
): MetadataFieldDef[] {
  const merged = new Map<string, MetadataFieldDef>();
  for (const arr of fieldArrays) {
    if (!arr) continue;
    for (const field of arr) {
      merged.set(field.name, field);
    }
  }
  return Array.from(merged.values());
}

/* ─── Field Grouping ──────────────────────────────────────────────── */

export interface FieldGroup {
  title?: string;
  fields: MetadataFieldDef[];
}

/**
 * Group metadata fields into logical sections.
 * Useful for rendering multi-tab or multi-section forms.
 */
export function groupFields(
  fields: MetadataFieldDef[],
  groups?: { title?: string; fieldNames: string[] }[],
): FieldGroup[] {
  if (!groups || groups.length === 0) {
    return [{ fields }];
  }

  const assigned = new Set<string>();
  const result: FieldGroup[] = [];

  for (const group of groups) {
    const groupFields = fields.filter(
      (f) => group.fieldNames.includes(f.name),
    );
    for (const f of groupFields) assigned.add(f.name);
    result.push({ title: group.title, fields: groupFields });
  }

  // Collect unassigned fields into a catch-all group
  const unassigned = fields.filter((f) => !assigned.has(f.name));
  if (unassigned.length > 0) {
    result.push({ title: "Other", fields: unassigned });
  }

  return result;
}



/* ─── Default Values ──────────────────────────────────────────────── */

/**
 * Generate default values object from metadata fields.
 * Useful for initializing forms with useForm's defaultValues.
 */
export function getDefaultValues(
  fields: MetadataFieldDef[],
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.system) continue;
    defaults[field.name] = overrides?.[field.name] ?? field.default ?? "";
  }
  return { ...defaults, ...overrides };
}
