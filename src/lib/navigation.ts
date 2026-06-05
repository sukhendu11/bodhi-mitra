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
  created_at: string;
  updated_at: string;
}

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
}

/** Flat DB row extended with computed children array (tree form). */
export interface NavTreeNode extends NavItem {
  children: NavTreeNode[];
}

/* ─── Query helpers ─────────────────────────────────────────────── */

const NAV_SELECT = "id, parent_id, type, label_en, label_bn, url, slug, icon, sort_order, visible, created_at, updated_at";

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
  };
}

/* ─── Tree builder ────────────────────────────────────────────── */

/**
 * Build a forest (list of root nodes) from a flat NavItem array.
 * Children are sorted by sort_order.
 */
export function buildNavTree(items: NavItem[]): NavTreeNode[] {
  const map = new Map<string, NavTreeNode>();
  const roots: NavTreeNode[] = [];

  // Create nodes
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  // Link children
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  }

  // Sort each level
  const sortChildren = (nodes: NavTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

/** Flatten a tree back to a flat array (for DB writes). */
export function flattenTree(nodes: NavTreeNode[]): NavItem[] {
  const result: NavItem[] = [];
  const walk = (list: NavTreeNode[]) => {
    for (const n of list) {
      const { children, ...item } = n;
      result.push(item);
      walk(children);
    }
  };
  walk(nodes);
  return result;
}

/* ─── CRUD (admin — authenticated via RLS) ─────────────────── */

/** Fetch all navigation items flat (for admin editing). */
export async function fetchAllNavItems(): Promise<NavItem[]> {
  const { data, error } = await (supabase as any)
    .from("navigation_items")
    .select(NAV_SELECT)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Fetch only visible items (for public rendering). */
export async function fetchPublicNavItems(): Promise<NavItem[]> {
  const { data, error } = await (supabase as any)
    .from("navigation_items")
    .select(NAV_SELECT)
    .eq("visible", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Get a single item by id. */
export async function fetchNavItem(id: string): Promise<NavItem | null> {
  const { data, error } = await (supabase as any)
    .from("navigation_items")
    .select(NAV_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

/** Create a new navigation item. Returns the created item. */
export async function createNavItem(input: NavItemInput): Promise<NavItem> {
  const { data, error } = await (supabase as any)
    .from("navigation_items")
    .insert({
      parent_id: input.parent_id ?? null,
      type: input.type,
      label_en: input.label_en,
      label_bn: input.label_bn ?? "",
      url: input.url ?? "",
      slug: input.slug ?? "",
      icon: input.icon ?? "",
      sort_order: input.sort_order ?? 0,
      visible: input.visible ?? true,
    })
    .select(NAV_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
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

/** Delete a navigation item (cascades to children). */
export async function deleteNavItem(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("navigation_items")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Batch-update the sort_order and parent_id for many items at once.
 * Used after a drag-and-drop reorder.
 */
export async function batchUpdateNavItems(
  updates: { id: string; sort_order: number; parent_id: string | null }[],
): Promise<void> {
  // Supabase doesn't support batch update, so we do individual updates
  for (const u of updates) {
    const { error } = await (supabase as any)
      .from("navigation_items")
      .update({ sort_order: u.sort_order, parent_id: u.parent_id })
      .eq("id", u.id);
    if (error) throw new Error(error.message);
  }
}
