/**
 * P2 admin — Refine accessControlProvider tests (AD-029).
 *
 * Refine's access-control API (advanced-tutorials/access-control/): the
 * provider's `can({resource, action})` is the single gate <CanAccess /> and
 * useCan call. These tests pin:
 *   - action vocabulary normalization (Refine's list/create/edit/show/delete
 *     AND our view/create/update/delete both land on the matrix)
 *   - mock-mode role resolution from the mock session
 *   - role→resource granting/denying for representative cases
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  canAccessAdminResource,
  normalizeAdminAction,
} from "@/lib/admin/access-control";
import { setMockModeOverride } from "@/lib/data-source";
import { MOCK_SESSION_KEY } from "@/lib/mock-session";

function seedSession(role: string) {
  localStorage.setItem(
    MOCK_SESSION_KEY,
    JSON.stringify({
      access_token: `t-${role}`,
      refresh_token: "r",
      expires_at: Date.now() + 3600000,
      user: {
        id: `demo-${role}`,
        email: `${role}@sabbe-satta.test`,
        role,
        display_name: `Demo ${role}`,
        avatar_url: null,
      },
    }),
  );
}

beforeEach(() => {
  setMockModeOverride(true);
  localStorage.clear();
});

describe("normalizeAdminAction", () => {
  it("maps Refine's canonical actions onto the matrix vocabulary", () => {
    expect(normalizeAdminAction("list")).toBe("view");
    expect(normalizeAdminAction("show")).toBe("view");
    expect(normalizeAdminAction("create")).toBe("create");
    expect(normalizeAdminAction("edit")).toBe("update");
    expect(normalizeAdminAction("delete")).toBe("delete");
  });

  it("passes our own vocabulary through unchanged", () => {
    expect(normalizeAdminAction("view")).toBe("view");
    expect(normalizeAdminAction("update")).toBe("update");
    expect(normalizeAdminAction("create")).toBe("create");
    expect(normalizeAdminAction("delete")).toBe("delete");
  });

  it("defaults unknown actions to view", () => {
    expect(normalizeAdminAction("")).toBe("view");
    expect(normalizeAdminAction("export")).toBe("view");
  });
});

describe("canAccessAdminResource (mock mode)", () => {
  it("grants super_admin full access to every resource + action", async () => {
    seedSession("super_admin");
    for (const resource of ["books", "orders", "profiles", "site_settings"]) {
      for (const action of ["list", "create", "edit", "show", "delete"]) {
        const res = await canAccessAdminResource({ resource, action });
        expect(res.can, `${resource}:${action}`).toBe(true);
      }
    }
  });

  it("denies user any admin resource", async () => {
    seedSession("user");
    for (const resource of ["books", "posts", "videos", "orders"]) {
      const res = await canAccessAdminResource({ resource, action: "list" });
      expect(res.can, resource).toBe(false);
      expect(res.reason).toBeTruthy();
    }
  });

  it("editor can create/edit books but not orders or profiles", async () => {
    seedSession("editor");
    const booksCreate = await canAccessAdminResource({ resource: "books", action: "create" });
    expect(booksCreate.can).toBe(true);
    const booksEdit = await canAccessAdminResource({ resource: "books", action: "edit" });
    expect(booksEdit.can).toBe(true);
    const ordersList = await canAccessAdminResource({ resource: "orders", action: "list" });
    expect(ordersList.can).toBe(false);
    const profilesList = await canAccessAdminResource({ resource: "profiles", action: "list" });
    expect(profilesList.can).toBe(false);
  });

  it("moderator may view orders but never create content", async () => {
    seedSession("moderator");
    const ordersList = await canAccessAdminResource({ resource: "orders", action: "list" });
    expect(ordersList.can).toBe(true);
    const booksCreate = await canAccessAdminResource({ resource: "books", action: "create" });
    expect(booksCreate.can).toBe(false);
    const booksDelete = await canAccessAdminResource({ resource: "books", action: "delete" });
    expect(booksDelete.can).toBe(false);
  });

  it("denies when no session exists", async () => {
    localStorage.clear();
    const res = await canAccessAdminResource({ resource: "books", action: "list" });
    expect(res.can).toBe(false);
  });
});
