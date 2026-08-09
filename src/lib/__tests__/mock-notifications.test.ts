import { describe, it, expect, beforeEach } from "vitest";
import {
  mockAddNotification,
  mockEnsureWelcome,
  mockGetAllNotifications,
  mockGetNotifications,
  mockGetUnreadCount,
  mockMarkAllRead,
  mockMarkRead,
} from "@/lib/mock-notifications";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

beforeEach(() => {
  localStorage.clear();
});

describe("mock notifications store", () => {
  it("seeds welcome notifications for demo accounts", async () => {
    const user = await mockGetNotifications(DEMO_ACCOUNTS.user.id);
    expect(user.length).toBeGreaterThan(0);
    expect(user.some((n) => n.type === "welcome")).toBe(true);

    const admin = await mockGetNotifications(DEMO_ACCOUNTS.admin.id);
    expect(admin.some((n) => n.type === "welcome")).toBe(true);
  });

  it("is idempotent — re-seeding doesn't duplicate", async () => {
    await mockGetNotifications(DEMO_ACCOUNTS.user.id);
    const count = (await mockGetNotifications(DEMO_ACCOUNTS.user.id)).length;
    await mockGetNotifications(DEMO_ACCOUNTS.user.id);
    expect((await mockGetNotifications(DEMO_ACCOUNTS.user.id)).length).toBe(count);
  });

  it("scopes notifications per user", async () => {
    mockAddNotification({
      userId: DEMO_ACCOUNTS.user.id,
      type: "new_purchase",
      message: "Your order is ready",
    });
    const userList = await mockGetNotifications(DEMO_ACCOUNTS.user.id);
    const adminList = await mockGetNotifications(DEMO_ACCOUNTS.admin.id);
    expect(userList.some((n) => n.message === "Your order is ready")).toBe(true);
    expect(adminList.some((n) => n.message === "Your order is ready")).toBe(false);
  });

  it("tracks unread counts", async () => {
    mockAddNotification({
      userId: DEMO_ACCOUNTS.user.id,
      type: "new_comment",
      message: "New comment",
    });
    const unread = await mockGetUnreadCount(DEMO_ACCOUNTS.user.id);
    const total = (await mockGetNotifications(DEMO_ACCOUNTS.user.id)).length;
    // All newly added notifications start unread
    expect(unread).toBe(total);
  });

  it("marks individual notifications read", async () => {
    const n = mockAddNotification({
      userId: DEMO_ACCOUNTS.user.id,
      type: "contact_message",
      message: "Contact form",
    });
    await mockMarkRead(DEMO_ACCOUNTS.user.id, n.id);
    const list = await mockGetNotifications(DEMO_ACCOUNTS.user.id);
    expect(list.find((x) => x.id === n.id)?.read).toBe(true);
  });

  it("marks all read for a user only", async () => {
    mockAddNotification({ userId: DEMO_ACCOUNTS.user.id, type: "welcome", message: "u1" });
    mockAddNotification({ userId: DEMO_ACCOUNTS.admin.id, type: "welcome", message: "u2" });
    await mockMarkAllRead(DEMO_ACCOUNTS.user.id);
    expect(await mockGetUnreadCount(DEMO_ACCOUNTS.user.id)).toBe(0);
    expect(await mockGetUnreadCount(DEMO_ACCOUNTS.admin.id)).toBeGreaterThan(0);
  });

  it("ensures welcome idempotently", async () => {
    mockEnsureWelcome(DEMO_ACCOUNTS.user.id);
    // Wait a microtask tick for the promise chain
    await new Promise((r) => setTimeout(r, 0));
    const first = (await mockGetNotifications(DEMO_ACCOUNTS.user.id)).filter(
      (n) => n.type === "welcome",
    ).length;
    mockEnsureWelcome(DEMO_ACCOUNTS.user.id);
    await new Promise((r) => setTimeout(r, 0));
    const second = (await mockGetNotifications(DEMO_ACCOUNTS.user.id)).filter(
      (n) => n.type === "welcome",
    ).length;
    expect(second).toBe(first);
  });

  it("sorts newest first", async () => {
    mockAddNotification({ userId: "u1", type: "welcome", message: "old", link: null });
    await new Promise((r) => setTimeout(r, 5));
    mockAddNotification({ userId: "u1", type: "new_comment", message: "new", link: null });
    const list = await mockGetNotifications("u1");
    expect(list[0].message).toBe("new");
  });

  it("persists to localStorage", async () => {
    mockAddNotification({
      userId: DEMO_ACCOUNTS.user.id,
      type: "new_purchase",
      message: "persisted",
    });
    expect(localStorage.getItem("sabbe-satta-mock-notifications")).toContain("persisted");
  });

  it("mockGetAllNotifications returns every account's rows (M5 admin)", async () => {
    await mockGetNotifications(DEMO_ACCOUNTS.user.id); // seed
    mockAddNotification({
      userId: "another-user",
      type: "contact_message",
      message: "admin inbox row",
    });
    const all = await mockGetAllNotifications();
    expect(all.some((n) => n.message === "admin inbox row")).toBe(true);
    expect(all.some((n) => n.userId === DEMO_ACCOUNTS.admin.id)).toBe(true);
    // Newest first
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].createdAt >= all[i].createdAt).toBe(true);
    }
  });
});
