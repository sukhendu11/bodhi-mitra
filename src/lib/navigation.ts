import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */

export type NavItemType = "internal" | "external" | "dropdown";

export interface NavItem {
  id: string;
  parent_id: string | null;
  type: NavItemType;
  label_en: string;
  label_bn: string;
  url: string;
  slug: string;
  icon: string;
  sort_order: number;
  visible: boolean;
  location: string;
  created_at: string;
  updated_at: string;
}

export type NavLocation = "header" | "footer";

export interface NavItemInput {
  parent_id?: string | null;
  type: NavItemType;
  label_en: string;
  label_bn?: string;
  url?: string;
  slug?: string;
  icon?: string;
  sort_order?: number;
  visible?: boolean;
  location?: NavLocation;
}

/** Flat DB row extended with computed children array (tree form). */
export interface NavTreeNode extends NavItem {
  children: NavTreeNode[];
}

/* ─── Query helpers ─────────────────────────────────────────────── */

const NAV_SELECT =
  "id, parent_id, type, label_en, label_bn, url, slug, icon, sort_order, visible, location, created_at, updated_at";

function mapRow(r: any): NavItem {
  return {
    id: r.id,
    parent_id: r.parent_id,
    type: r.type,
    label_en: r.label_en,
    label_bn: r.label_bn ?? "",
    url: r.url ?? "",
    slug: r.slug ?? "",
    icon: r.icon ?? "",
    sort_order: r.sort_order ?? 0,
    visible: r.visible ?? true,
    created_at: r.created_at,
    updated_at: r.updated_at,
    location: r.location ?? "header",
  };
}

/* ─── Safety constants ─────────────────────────────────────────── */

const VALID_TYPES = new Set<NavItemType>(["internal", "external", "dropdown"]);
const MAX_NAV_DEPTH = 3;

/* ─── Item validation ──────────────────────────────────────────── */

/**
 * Validate a raw nav item object.
 * Rejects items with missing/invalid id, type, or label.
 * Broken items are SKIPPED — never break the entire menu.
 */
function validateNavItem(item: unknown): item is NavItem {
  if (!item || typeof item !== "object") return false;
  const r = item as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return false;
  if (!VALID_TYPES.has(r.type as NavItemType)) return false;
  if (typeof r.label_en !== "string" || !r.label_en.trim()) return false;
  return true;
}

/**
 * Filter an array of raw items to only valid NavItems.
 * Also normalizes each item through mapRow for type safety.
 */
function sanitizeNavItems(items: unknown[]): NavItem[] {
  return items.filter(validateNavItem).map(mapRow);
}

/* ─── Safe tree builder ────────────────────────────────────────── */

/**
 * Build a tree with depth limit and cycle protection.
 * - Items are filtered through sanitizeNavItems first
 * - Tree depth is capped at MAX_NAV_DEPTH (3 levels)
 * - Circular references are broken (parent_id chain cycle detection)
 */
export function safeBuildNavTree(items: unknown[]): NavTreeNode[] {
  const valid = sanitizeNavItems(items);
  if (valid.length === 0) return [];

  const map = new Map<string, NavTreeNode>();
  const roots: NavTreeNode[] = [];
  const parentRefs = new Map<string, string | null>();

  // Create nodes, track parent refs for cycle detection
  for (const item of valid) {
    map.set(item.id, { ...item, children: [] });
    parentRefs.set(item.id, item.parent_id);
  }

  // Detect simple cycles (A → B → A):
  // If an item's parent chain eventually circles back to the item itself, break the chain.
  const hasCycle = (id: string): boolean => {
    const visited = new Set<string>();
    let current: string | null = id;
    while (current) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = parentRefs.get(current) ?? null;
      if (current === id) return true;
    }
    return false;
  };

  // Link children
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id) && !hasCycle(node.id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    } else {
      // Orphaned child (parent not found or cycle detected) — promote to root
      roots.push(node);
    }
  }

  // Apply depth limit (crop children beyond MAX_NAV_DEPTH levels)
  const limitDepth = (nodes: NavTreeNode[], depth: number): NavTreeNode[] => {
    if (depth >= MAX_NAV_DEPTH) {
      return nodes.map((n) => ({ ...n, children: [] }));
    }
    return nodes.map((n) => ({
      ...n,
      children: limitDepth(n.children, depth + 1),
    }));
  };

  // Sort each level
  const sortChildren = (nodes: NavTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return limitDepth(roots, 0);
}

/**
 * Build a tree from a flat NavItem array (original — for admin UI use).
 * Items are assumed pre-validated; no safety constraints applied.
 */
export function buildNavTree(items: NavItem[]): NavTreeNode[] {
  const map = new Map<string, NavTreeNode>();
  const roots: NavTreeNode[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: NavTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

/* ─── Navigation Cache ─────────────────────────────────────────── */

const CACHE_KEY = "bodhi-nav-cache-v1";
let memoryCache: NavTreeNode[] | null = null;

/**
 * Get the last-known-valid nav tree from cache.
 * Tries memory first, then localStorage.
 */
export function getNavCache(): NavTreeNode[] | null {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = parsed as NavTreeNode[];
        return memoryCache;
      }
    }
  } catch {
    // localStorage unavailable or corrupt — silently ignore
  }
  return null;
}

/** Save the current valid nav tree to cache. */
export function setNavCache(tree: NavTreeNode[]): void {
  memoryCache = tree;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tree));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Clear the nav cache (call when admin modifies nav items). */
export function clearNavCache(): void {
  memoryCache = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // silently ignore
  }
}

/* ─── CRUD (admin — authenticated via RLS) ─────────────────── */

/** Fetch only visible items (for public rendering), optionally by location. */
export async function fetchPublicNavItems(location?: NavLocation): Promise<NavItem[]> {
  let query = (supabase as any)
    .from("navigation_items")
    .select(NAV_SELECT)
    .eq("visible", true)
    .order("sort_order", { ascending: true });
  if (location) query = query.eq("location", location);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Update an existing navigation item. */
export async function updateNavItem(id: string, input: Partial<NavItemInput>): Promise<NavItem> {
  const payload: Record<string, any> = {};
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id;
  if (input.type !== undefined) payload.type = input.type;
  if (input.label_en !== undefined) payload.label_en = input.label_en;
  if (input.label_bn !== undefined) payload.label_bn = input.label_bn;
  if (input.url !== undefined) payload.url = input.url;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;
  if (input.visible !== undefined) payload.visible = input.visible;

  const { data, error } = await (supabase as any)
    .from("navigation_items")
    .update(payload)
    .eq("id", id)
    .select(NAV_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}
