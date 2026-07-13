import type { ContentTypeDefinition } from "./content-type";

/* ─── Revision Types ──────────────────────────────────────────────── */

export interface Revision {
  id: string;
  /** Content type name (e.g., 'post') */
  content_type: string;
  /** The content item's ID */
  content_id: string;
  /** Snapshot of the content data at this revision */
  data: Record<string, unknown>;
  /** Which fields changed in this revision */
  changes: string[];
  /** User who made the change */
  changed_by?: string;
  /** Summary of what changed */
  summary?: string;
  /** When this revision was created */
  created_at: string;
  /** Revision number (sequential per content item) */
  version: number;
}

/* ─── Diff Types ──────────────────────────────────────────────────── */

export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  /** Whether the field changed */
  changed: boolean;
}

export interface ContentDiff {
  /** Content type name */
  content_type: string;
  /** Content item ID */
  content_id: string;
  /** Field-level diffs */
  fields: FieldDiff[];
  /** Number of changed fields */
  changeCount: number;
  /** Whether there are any changes */
  hasChanges: boolean;
}

/* ─── Revision Helpers ────────────────────────────────────────────── */

/**
 * Compute a diff between two sets of content data.
 * Only includes fields that are defined in the content type.
 */
export function computeDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  cmsDef?: ContentTypeDefinition,
): ContentDiff {
  const fields: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  // If we have a content type definition, only diff its fields
  const relevantKeys = cmsDef?.fields
    ? new Set([...allKeys].filter((k) => cmsDef.fields!.some((f) => f.name === k)))
    : allKeys;

  for (const key of relevantKeys) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);

    fields.push({
      field: key,
      oldValue: oldVal,
      newValue: newVal,
      changed,
    });
  }

  const changedFields = fields.filter((f) => f.changed);
  return {
    content_type: cmsDef?.name ?? "",
    content_id: (oldData.id as string) ?? (newData.id as string) ?? "",
    fields,
    changeCount: changedFields.length,
    hasChanges: changedFields.length > 0,
  };
}

/**
 * Generate a human-readable summary of changes.
 */
export function summarizeChanges(diff: ContentDiff): string {
  if (!diff.hasChanges) return "No changes";

  const changed = diff.fields.filter((f) => f.changed);
  const fieldNames = changed.map((f) => f.field);

  if (fieldNames.length <= 3) {
    return `Updated ${fieldNames.join(", ")}`;
  }

  return `Updated ${fieldNames.slice(0, 3).join(", ")} and ${fieldNames.length - 3} more fields`;
}

/**
 * Check if a content type supports revisions.
 */
export function supportsRevisions(def: ContentTypeDefinition): boolean {
  return def.hasRevisions ?? false;
}

/**
 * Create a revision snapshot from content data.
 * Returns the snapshot data and list of changed fields.
 */
export function createRevisionSnapshot(
  contentData: Record<string, unknown>,
  previousRevision?: Revision,
): { data: Record<string, unknown>; changedFields: string[] } {
  // Remove system fields from the snapshot
  const { id, created_at, updated_at, ...snapshot } = contentData as Record<string, unknown>;

  if (previousRevision) {
    const diff = computeDiff(previousRevision.data, snapshot);
    return {
      data: snapshot,
      changedFields: diff.fields.filter((f) => f.changed).map((f) => f.field),
    };
  }

  return {
    data: snapshot,
    changedFields: Object.keys(snapshot),
  };
}

/**
 * Build a revision summary from content data and metadata.
 */
export function buildRevision(
  contentTypeName: string,
  contentId: string,
  data: Record<string, unknown>,
  previousVersion: number,
  changedBy?: string,
  changedFields?: string[],
): Omit<Revision, "id" | "created_at"> {
  const snapshot = createRevisionSnapshot(data);
  return {
    content_type: contentTypeName,
    content_id: contentId,
    data: snapshot.data,
    changes: changedFields ?? snapshot.changedFields,
    changed_by: changedBy,
    summary: changedFields ? `Updated ${changedFields.length} field(s)` : "Initial revision",
    version: previousVersion + 1,
  };
}
