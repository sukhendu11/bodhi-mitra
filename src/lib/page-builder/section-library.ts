// ============================================================================
// Page Builder — Section Library (Cross-Page Reusable Components)
// ============================================================================
//
// Stores saved sections and global components in localStorage.
// Can be upgraded to Supabase by replacing this module's storage backend.
// ============================================================================

import { generateId } from "./defaults";
import { serializeTree, deserializeTree, deepClone, regenerateIds } from "./utils";
import type { BuilderComponentNode } from "./types";

/* ─── Types ────────────────────────────────────────────────────────── */

export interface SectionFolder {
  id: string;
  name: string;
  icon?: string;
  /** Array of section IDs belonging to this folder */
  sectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedSection {
  id: string;
  name: string;
  description: string;
  /** Serialized component tree */
  tree: string;
  /** Whether this is a global component (changes propagate across all uses) */
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  /** Component type for display */
  type: string;
  /** Preview thumbnail (base64 or URL) */
  thumbnail?: string;
}

/* ─── Storage Keys ────────────────────────────────────────────────── */

const STORAGE_KEY = "bodhi-page-sections-v1";
const FOLDER_KEY = "bodhi-page-folders-v1";

/* ─── Helpers ─────────────────────────────────────────────────────── */

function loadAll(): SavedSection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(sections: SavedSection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // localStorage full — silently ignore
  }
}

/* ─── Folder Operations ──────────────────────────────────────────── */

function loadFolders(): SectionFolder[] {
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFolders(folders: SectionFolder[]): void {
  try {
    localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
  } catch {
    // localStorage full — silently ignore
  }
}

/** Get all folders. */
export function getFolders(): SectionFolder[] {
  return loadFolders();
}

/** Create a new folder. */
export function createFolder(name: string): SectionFolder {
  const folders = loadFolders();
  const now = new Date().toISOString();
  const folder: SectionFolder = {
    id: generateId(),
    name,
    sectionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  folders.push(folder);
  saveFolders(folders);
  return folder;
}

/** Rename a folder. */
export function renameFolder(id: string, name: string): SectionFolder | null {
  const folders = loadFolders();
  const idx = folders.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  folders[idx].name = name;
  folders[idx].updatedAt = new Date().toISOString();
  saveFolders(folders);
  return folders[idx];
}

/** Delete a folder (sections inside are NOT deleted, just uncategorized). */
export function deleteFolder(id: string): void {
  const folders = loadFolders().filter((f) => f.id !== id);
  saveFolders(folders);
}

/** Add a section ID to a folder. */
export function addSectionToFolder(folderId: string, sectionId: string): SectionFolder | null {
  // Remove section from any other folder first
  const folders = loadFolders();
  for (const f of folders) {
    const prevLen = f.sectionIds.length;
    f.sectionIds = f.sectionIds.filter((id) => id !== sectionId);
    if (f.sectionIds.length !== prevLen) f.updatedAt = new Date().toISOString();
  }
  // Add to target folder
  const target = folders.find((f) => f.id === folderId);
  if (!target) {
    saveFolders(folders);
    return null;
  }
  if (!target.sectionIds.includes(sectionId)) {
    target.sectionIds.push(sectionId);
    target.updatedAt = new Date().toISOString();
  }
  saveFolders(folders);
  return target;
}

/** Remove a section from whichever folder it belongs to (making it uncategorized). */
export function removeSectionFromFolder(sectionId: string): void {
  const folders = loadFolders();
  let changed = false;
  for (const f of folders) {
    const prevLen = f.sectionIds.length;
    f.sectionIds = f.sectionIds.filter((id) => id !== sectionId);
    if (f.sectionIds.length !== prevLen) {
      f.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveFolders(folders);
}

/** Get all sections that belong to a given folder. */
export function getSectionsByFolder(folderId: string): SavedSection[] {
  const folders = loadFolders();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return [];
  const allSections = loadAll();
  return allSections.filter((s) => folder.sectionIds.includes(s.id));
}

/** Get all sections that do NOT belong to any folder. */
export function getUncategorizedSections(allSections?: SavedSection[]): SavedSection[] {
  const sections = allSections || loadAll();
  const folders = loadFolders();
  const allFolderIds = new Set<string>();
  for (const f of folders) {
    for (const sid of f.sectionIds) allFolderIds.add(sid);
  }
  return sections.filter((s) => !allFolderIds.has(s.id));
}

/** Get the folder ID that a section belongs to (or null if uncategorized). */
export function getSectionFolderId(sectionId: string): string | null {
  const folders = loadFolders();
  for (const f of folders) {
    if (f.sectionIds.includes(sectionId)) return f.id;
  }
  return null;
}

/* ─── CRUD Operations ────────────────────────────────────────────── */

/** Get all saved sections (optionally filtered by type). */
export function getSavedSections(type?: string): SavedSection[] {
  const all = loadAll();
  if (type) return all.filter((s) => s.type === type);
  return all;
}

/** Get global components only. */
export function getGlobalComponents(): SavedSection[] {
  return loadAll().filter((s) => s.isGlobal);
}

/** Get reusable sections only (non-global). */
export function getReusableSections(): SavedSection[] {
  return loadAll().filter((s) => !s.isGlobal);
}

/** Save a component tree as a named section. */
export function saveSection(options: {
  name: string;
  description?: string;
  tree: BuilderComponentNode;
  isGlobal?: boolean;
  thumbnail?: string;
}): SavedSection {
  const sections = loadAll();
  const now = new Date().toISOString();
  const newSection: SavedSection = {
    id: generateId(),
    name: options.name,
    description: options.description || "",
    tree: serializeTree(options.tree),
    isGlobal: options.isGlobal || false,
    type: options.tree.type,
    createdAt: now,
    updatedAt: now,
    thumbnail: options.thumbnail,
  };
  sections.push(newSection);
  saveAll(sections);
  return newSection;
}

/** Update an existing saved section's tree (for global component sync). */
export function updateSectionTree(id: string, tree: BuilderComponentNode): SavedSection | null {
  const sections = loadAll();
  const idx = sections.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sections[idx].tree = serializeTree(tree);
  sections[idx].updatedAt = new Date().toISOString();
  saveAll(sections);
  return sections[idx];
}

/** Update a saved section's metadata (name, description). */
export function updateSectionMeta(
  id: string,
  meta: Partial<Pick<SavedSection, "name" | "description" | "thumbnail">>,
): SavedSection | null {
  const sections = loadAll();
  const idx = sections.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sections[idx] = { ...sections[idx], ...meta, updatedAt: new Date().toISOString() };
  saveAll(sections);
  return sections[idx];
}

/** Delete a saved section by ID. */
export function deleteSection(id: string): void {
  const sections = loadAll().filter((s) => s.id !== id);
  saveAll(sections);
}

/** Import a saved section into a page — deserializes with fresh IDs. */
export function importSection(id: string): BuilderComponentNode | null {
  const sections = loadAll();
  const section = sections.find((s) => s.id === id);
  if (!section) return null;
  try {
    const tree = deserializeTree(section.tree);
    const copy = regenerateIds(tree);
    copy.name = `${section.name} (Imported)`;
    return copy;
  } catch {
    return null;
  }
}

/** Get a saved section by ID (read-only, returns the tree deserialized). */
export function getSectionTree(id: string): BuilderComponentNode | null {
  const sections = loadAll();
  const section = sections.find((s) => s.id === id);
  if (!section) return null;
  try {
    return deserializeTree(section.tree);
  } catch {
    return null;
  }
}

/* ─── Export/Import ───────────────────────────────────────────────── */

/** JSON format metadata for exported sections. */
interface ExportMeta {
  format: string;
  exportedAt: string;
  name: string;
  description: string;
  isGlobal: boolean;
  type: string;
  tree: string;
}

interface BatchExportMeta {
  format: string;
  exportedAt: string;
  count: number;
  sections: ExportMeta[];
}

const SINGLE_FORMAT = "bodhi-section-v1";
const BATCH_FORMAT = "bodhi-sections-v1";

/** Export a single saved section as a downloadable JSON object. */
export function exportSectionToJson(id: string): ExportMeta | null {
  const sections = loadAll();
  const section = sections.find((s) => s.id === id);
  if (!section) return null;
  return {
    format: SINGLE_FORMAT,
    exportedAt: new Date().toISOString(),
    name: section.name,
    description: section.description,
    isGlobal: section.isGlobal,
    type: section.type,
    tree: section.tree,
  };
}

/** Export all saved sections as a batch JSON object. */
export function exportAllSectionsToJson(): BatchExportMeta {
  const sections = loadAll();
  return {
    format: BATCH_FORMAT,
    exportedAt: new Date().toISOString(),
    count: sections.length,
    sections: sections.map((s) => ({
      format: SINGLE_FORMAT,
      exportedAt: s.updatedAt,
      name: s.name,
      description: s.description,
      isGlobal: s.isGlobal,
      type: s.type,
      tree: s.tree,
    })),
  };
}

/** Import sections from a JSON string (single or batch format). Returns the number of sections imported. */
export function importSectionsFromJson(json: string): { success: boolean; count: number; errors: string[] } {
  const errors: string[] = [];
  let count = 0;

  try {
    const parsed = JSON.parse(json);

    if (!parsed || typeof parsed !== "object") {
      return { success: false, count: 0, errors: ["Invalid JSON: expected an object"] };
    }

    // Batch format: { format: "bodhi-sections-v1", sections: [...] }
    if (parsed.format === BATCH_FORMAT && Array.isArray(parsed.sections)) {
      const existing = loadAll();
      const now = new Date().toISOString();

      for (const item of parsed.sections) {
        if (!item.tree || !item.name) {
          errors.push(`Skipped section: missing name or tree`);
          continue;
        }
        try {
          // Validate that the tree is parseable
          JSON.parse(item.tree);
          const newSection: SavedSection = {
            id: generateId(),
            name: item.name,
            description: item.description || "",
            tree: item.tree,
            isGlobal: item.isGlobal || false,
            type: item.type || "container",
            createdAt: now,
            updatedAt: now,
          };
          existing.push(newSection);
          count++;
        } catch {
          errors.push(`Failed to import "${item.name || "unknown"}": invalid tree data`);
        }
      }

      saveAll(existing);
      return { success: count > 0 || errors.length === 0, count, errors };
    }

    // Single format: { format: "bodhi-section-v1", name: "...", tree: "..." }
    if (parsed.format === SINGLE_FORMAT) {
      if (!parsed.tree || !parsed.name) {
        return { success: false, count: 0, errors: ["Missing name or tree in section data"] };
      }
      try {
        JSON.parse(parsed.tree);
      } catch {
        return { success: false, count: 0, errors: ["Invalid tree data: malformed JSON"] };
      }
      const sections = loadAll();
      const now = new Date().toISOString();
      const newSection: SavedSection = {
        id: generateId(),
        name: parsed.name,
        description: parsed.description || "",
        tree: parsed.tree,
        isGlobal: parsed.isGlobal || false,
        type: parsed.type || "container",
        createdAt: now,
        updatedAt: now,
      };
      sections.push(newSection);
      saveAll(sections);
      return { success: true, count: 1, errors: [] };
    }

    // Unknown format — try minimal detection (has a tree property)
    if (parsed.tree && parsed.name) {
      // Treat as inline single section with no format marker
      const sections = loadAll();
      const now = new Date().toISOString();
      try {
        JSON.parse(parsed.tree);
        const newSection: SavedSection = {
          id: generateId(),
          name: parsed.name,
          description: parsed.description || "",
          tree: parsed.tree,
          isGlobal: parsed.isGlobal || false,
          type: parsed.type || "container",
          createdAt: now,
          updatedAt: now,
        };
        sections.push(newSection);
        saveAll(sections);
        return { success: true, count: 1, errors: [] };
      } catch {
        return { success: false, count: 0, errors: ["Invalid tree data in unknown format"] };
      }
    }

    // Try array of sections (raw array format)
    if (Array.isArray(parsed)) {
      const existing = loadAll();
      const now = new Date().toISOString();
      for (const item of parsed) {
        if (!item.tree || !item.name) {
          errors.push(`Skipped item: missing name or tree`);
          continue;
        }
        try {
          JSON.parse(item.tree);
          const newSection: SavedSection = {
            id: generateId(),
            name: item.name,
            description: item.description || "",
            tree: item.tree,
            isGlobal: item.isGlobal || false,
            type: item.type || "container",
            createdAt: now,
            updatedAt: now,
          };
          existing.push(newSection);
          count++;
        } catch {
          errors.push(`Failed to import item: invalid tree data`);
        }
      }
      saveAll(existing);
      return { success: count > 0, count, errors };
    }

    return {
      success: false,
      count: 0,
      errors: ["Unrecognized format. Expected a bodhi-section-v1 or bodhi-sections-v1 JSON."],
    };
  } catch {
    return { success: false, count: 0, errors: ["Invalid JSON: parse error"] };
  }
}

/** Check if a component is a global component reference (placeholder for future UUID linking). */
export function isGlobalComponent(node: BuilderComponentNode): boolean {
  return !!(node.props as any)?.__globalSectionId;
}

/** Create a global component reference node (links to the global source). */
export function createGlobalReference(sectionId: string): BuilderComponentNode {
  return {
    id: generateId(),
    type: "custom",
    name: "Global Component",
    visible: true,
    locked: true,
    children: [],
    styles: {},
    props: { __globalSectionId: sectionId },
  };
}
