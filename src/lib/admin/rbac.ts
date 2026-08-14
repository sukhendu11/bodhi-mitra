/**
 * Refine admin RBAC — P2 (AD-029).
 *
 * Which roles can view/edit which admin resources. The permission matrix
 * below is the client-side enforcement layer (the admin UI filters tabs and
 * actions by role); server-side authorization is enforced separately via
 * `requireMinRole`/`requirePermission` server functions when real-mode
 * mutations are wired (P2 remaining — "never trust the client").
 *
 * Roles (AppRole, src/hooks/useAuth.ts): super_admin(100) > admin(80) >
 * editor(60) > author(40) > moderator(30) > user(10).
 *
 * Matrix intent:
 *   - super_admin — everything (incl. profiles/user management)
 *   - admin       — all content CRUD + structure edits + orders view
 *   - editor      — content CRUD (books/posts/videos) + structure view/edit
 *   - author      — view content + edit/create posts
 *   - moderator   — view-only content + orders view
 *   - user        — no admin resources
 */
import type { AppRole } from "@/hooks/useAuth";
import { useAuthSession, useUserRole } from "@/hooks/useAuth";
import { isMockMode } from "@/lib/data-source";
import { getMockUserRole } from "@/lib/mock-session";
import { ADMIN_RESOURCES, type AdminResource } from "@/lib/admin/data-provider";

/** Actions a role can perform on a resource. */
export type AdminPermission = "view" | "create" | "update" | "delete";

/** Minimum role that may enter the admin panel at all. */
export const ADMIN_ENTRY_ROLE: AppRole = "editor";

const FULL: readonly AdminPermission[] = ["view", "create", "update", "delete"];
const CONTENT_FULL: readonly AdminPermission[] = ["view", "create", "update", "delete"];
const STRUCTURE: readonly AdminPermission[] = ["view", "update"];
const VIEW: readonly AdminPermission[] = ["view"];

const CONTENT_RESOURCES: readonly AdminResource[] = ["books", "posts", "videos"];
const STRUCTURE_RESOURCES: readonly AdminResource[] = [
  "pages",
  "categories",
  "navigation_items",
];

/**
 * Per-role permission sets. Resources omitted from a role's map are not
 * visible to that role. `user` deliberately has no entries.
 */
const RBAC_MATRIX: Record<AppRole, Partial<Record<AdminResource, readonly AdminPermission[]>>> = {
  super_admin: {
    books: FULL,
    posts: FULL,
    videos: FULL,
    pages: FULL,
    categories: FULL,
    navigation_items: FULL,
    orders: FULL,
    profiles: FULL,
    site_settings: FULL,
    tags: FULL,
    notifications: FULL,
  },
  admin: {
    books: CONTENT_FULL,
    posts: CONTENT_FULL,
    videos: CONTENT_FULL,
    pages: STRUCTURE,
    categories: STRUCTURE,
    navigation_items: STRUCTURE,
    orders: ["view", "update"],
    site_settings: ["view", "update"],
    tags: CONTENT_FULL,
    notifications: ["view", "update"],
    // profiles intentionally absent — user management is super_admin-only
  },
  editor: {
    books: CONTENT_FULL,
    posts: CONTENT_FULL,
    videos: CONTENT_FULL,
    pages: STRUCTURE,
    categories: STRUCTURE,
    navigation_items: STRUCTURE,
    tags: ["view", "create", "update"],
    // orders/profiles/site_settings/notifications absent
  },
  author: {
    books: VIEW,
    posts: ["view", "create", "update"],
    videos: VIEW,
    pages: VIEW,
    categories: VIEW,
    navigation_items: VIEW,
    tags: VIEW,
    // orders/profiles/site_settings/notifications absent
  },
  moderator: {
    books: VIEW,
    posts: VIEW,
    videos: VIEW,
    pages: VIEW,
    categories: VIEW,
    navigation_items: VIEW,
    orders: VIEW,
    tags: VIEW,
    notifications: VIEW,
    // profiles/site_settings absent
  },
  user: {},
};

const ROLE_LEVELS: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  author: 40,
  moderator: 30,
  user: 10,
};

function roleLevel(role: string | null | undefined): number {
  return role ? (ROLE_LEVELS[role] ?? 0) : 0;
}

/** True when the role may reach the admin panel (editor or above). */
export function canEnterAdmin(role: string | null | undefined): boolean {
  return roleLevel(role) >= roleLevel(ADMIN_ENTRY_ROLE);
}

/** True when the role may perform `action` on `resource`. */
export function can(
  role: string | null | undefined,
  resource: AdminResource,
  action: AdminPermission,
): boolean {
  if (!role) return false;
  const perms = RBAC_MATRIX[role as AppRole]?.[resource];
  if (!perms) return false;
  return perms.includes(action);
}

export const canViewResource = (role: string | null | undefined, resource: AdminResource) =>
  can(role, resource, "view");
export const canCreateResource = (role: string | null | undefined, resource: AdminResource) =>
  can(role, resource, "create");
export const canUpdateResource = (role: string | null | undefined, resource: AdminResource) =>
  can(role, resource, "update");
export const canDeleteResource = (role: string | null | undefined, resource: AdminResource) =>
  can(role, resource, "delete");

/** Resources the role can view (drives sidebar + dashboard cards). */
export function getVisibleResources(role: string | null | undefined): AdminResource[] {
  if (!role) return [];
  return ADMIN_RESOURCES.filter((r) => canViewResource(role, r));
}

/**
 * Resolve the current admin's role. Mock mode reads the mock session (sync);
 * real mode reads the Supabase user_roles row (async, via the auth hooks).
 */
export function useAdminRole(): string | null {
  if (isMockMode()) return getMockUserRole();
  const { user } = useAuthSession();
  const { data: role } = useUserRole(user);
  return role ?? null;
}

/** Admin resources as a visible set for matrix tests. */
export const RBAC_RESOURCES = ADMIN_RESOURCES;
export { CONTENT_RESOURCES, STRUCTURE_RESOURCES };
