/**
 * P2 admin — RBAC matrix tests (AD-029).
 *
 * Pins the role → resource permission contract that drives the Refine
 * admin's sidebar, action buttons, and form gating: which roles can enter
 * the admin, which resources each role can view, and which write actions
 * (create/update/delete) are allowed.
 */
import { describe, it, expect } from "vitest";
import {
  can,
  canCreateResource,
  canDeleteResource,
  canEnterAdmin,
  canUpdateResource,
  canViewResource,
  getVisibleResources,
  ADMIN_ENTRY_ROLE,
} from "@/lib/admin/rbac";
import { ADMIN_RESOURCES } from "@/lib/admin/data-provider";

const ALL_RESOURCES = ADMIN_RESOURCES as readonly (typeof ADMIN_RESOURCES)[number][];

describe("admin RBAC entry gate", () => {
  it("admits editor and above, blocks author/moderator/user", () => {
    expect(canEnterAdmin("super_admin")).toBe(true);
    expect(canEnterAdmin("admin")).toBe(true);
    expect(canEnterAdmin("editor")).toBe(true);
    expect(canEnterAdmin(ADMIN_ENTRY_ROLE)).toBe(true);
    expect(canEnterAdmin("author")).toBe(false);
    expect(canEnterAdmin("moderator")).toBe(false);
    expect(canEnterAdmin("user")).toBe(false);
    expect(canEnterAdmin(null)).toBe(false);
    expect(canEnterAdmin(undefined)).toBe(false);
  });
});

describe("admin RBAC matrix", () => {
  it("super_admin can view + CRUD every resource", () => {
    for (const r of ALL_RESOURCES) {
      expect(canViewResource("super_admin", r as never)).toBe(true);
      expect(canCreateResource("super_admin", r as never)).toBe(true);
      expect(canUpdateResource("super_admin", r as never)).toBe(true);
      expect(canDeleteResource("super_admin", r as never)).toBe(true);
    }
  });

  it("admin can CRUD content, edit structure, view orders — but NOT profiles", () => {
    for (const r of ["books", "posts", "videos"] as const) {
      expect(can("admin", r, "create")).toBe(true);
      expect(can("admin", r, "delete")).toBe(true);
    }
    for (const r of ["pages", "categories", "navigation_items"] as const) {
      expect(can("admin", r, "view")).toBe(true);
      expect(can("admin", r, "update")).toBe(true);
      expect(can("admin", r, "create")).toBe(false);
      expect(can("admin", r, "delete")).toBe(false);
    }
    expect(can("admin", "orders", "view")).toBe(true);
    expect(can("admin", "orders", "update")).toBe(true);
    expect(can("admin", "orders", "create")).toBe(false);
    expect(canViewResource("admin", "profiles")).toBe(false);
  });

  it("editor matches admin except orders are hidden", () => {
    for (const r of ["books", "posts", "videos"] as const) {
      expect(can("editor", r, "create")).toBe(true);
      expect(can("editor", r, "update")).toBe(true);
      expect(can("editor", r, "delete")).toBe(true);
    }
    for (const r of ["pages", "categories", "navigation_items"] as const) {
      expect(can("editor", r, "view")).toBe(true);
      expect(can("editor", r, "update")).toBe(true);
      expect(can("editor", r, "create")).toBe(false);
    }
    expect(canViewResource("editor", "orders")).toBe(false);
    expect(canViewResource("editor", "profiles")).toBe(false);
  });

  it("author views content and edits posts only", () => {
    for (const r of ["books", "videos", "pages", "categories", "navigation_items"] as const) {
      expect(canViewResource("author", r)).toBe(true);
      expect(can("author", r, "create")).toBe(false);
      expect(can("author", r, "update")).toBe(false);
      expect(can("author", r, "delete")).toBe(false);
    }
    expect(can("author", "posts", "view")).toBe(true);
    expect(can("author", "posts", "create")).toBe(true);
    expect(can("author", "posts", "update")).toBe(true);
    expect(can("author", "posts", "delete")).toBe(false);
    expect(canViewResource("author", "orders")).toBe(false);
    expect(canViewResource("author", "profiles")).toBe(false);
  });

  it("moderator is view-only with orders visibility, no profiles", () => {
    for (const r of ["books", "posts", "videos", "pages", "categories", "navigation_items"] as const) {
      expect(canViewResource("moderator", r)).toBe(true);
      expect(can("moderator", r, "create")).toBe(false);
      expect(can("moderator", r, "update")).toBe(false);
      expect(can("moderator", r, "delete")).toBe(false);
    }
    expect(canViewResource("moderator", "orders")).toBe(true);
    expect(can("moderator", "orders", "update")).toBe(false);
    expect(canViewResource("moderator", "profiles")).toBe(false);
  });

  it("user has no admin resources", () => {
    for (const r of ALL_RESOURCES) {
      expect(canViewResource("user", r)).toBe(false);
      expect(can("user", r, "update")).toBe(false);
    }
    expect(getVisibleResources("user")).toEqual([]);
  });

  it("getVisibleResources reflects the matrix per role", () => {
    const admin = getVisibleResources("admin");
    expect(admin).toContain("books");
    expect(admin).toContain("orders");
    expect(admin).not.toContain("profiles");

    const editor = getVisibleResources("editor");
    expect(editor).toContain("posts");
    expect(editor).not.toContain("orders");
    expect(editor).not.toContain("profiles");

    const superAdmin = getVisibleResources("super_admin");
    expect(superAdmin).toHaveLength(ALL_RESOURCES.length);
    expect(superAdmin).toContain("profiles");
  });
});
