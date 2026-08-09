/**
 * Mock notifications store — M4 Community seam (ROADMAP.md).
 *
 * Mirrors the Supabase `admin_notifications` table (type/message/link/
 * read/created_at, same type CHECK constraint) for the offline demo. The
 * real table is admin-scoped, so a `userId` is added here to scope the
 * header bell per signed-in demo account.
 *
 * localStorage on the client, in-memory on the server (server functions
 * have no localStorage) — same pattern as mock-cart.ts / mock-commerce.ts.
 * Writes dispatch a custom event so the header bell re-reads reactively.
 */
import { DEMO_ACCOUNTS } from "@/lib/mock-session";

const STORE_KEY = "sabbe-satta-mock-notifications";
/** Custom window event fired on notification writes (same-tab reactivity). */
export const MOCK_NOTIFICATIONS_EVENT = "sabbe-satta:mock-notifications-change";

export type MockNotificationType =
  | "new_comment"
  | "comment_reply"
  | "contact_message"
  | "new_purchase"
  | "welcome";

export interface MockNotification {
  id: string;
  /** Mock-only field — scopes the bell per demo account (real table is admin-wide). */
  userId: string;
  type: MockNotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface MockNotificationsStore {
  notifications: MockNotification[];
}

const memoryStore: MockNotificationsStore = { notifications: [] };
let seedPromise: Promise<void> | null = null;

function readStore(): MockNotificationsStore {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { notifications: [] };
    return JSON.parse(raw) as MockNotificationsStore;
  } catch {
    return { notifications: [] };
  }
}

function writeStore(store: MockNotificationsStore) {
  if (typeof window === "undefined") {
    memoryStore.notifications = store.notifications;
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(MOCK_NOTIFICATIONS_EVENT));
}

function generateId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Seed welcome notifications (ROADMAP §2.3: demo user has 2) ──── */

function seedOnce(): Promise<void> {
  // Idempotent — seeds only when the demo accounts have no welcome rows.
  const store = readStore();
  const hasWelcome = store.notifications.some(
    (n) => n.type === "welcome" && (n.userId === DEMO_ACCOUNTS.user.id || n.userId === DEMO_ACCOUNTS.admin.id),
  );
  if (!hasWelcome) seedPromise = null;
  if (!seedPromise) {
    seedPromise = Promise.resolve().then(doSeed);
  }
  return seedPromise;
}

async function doSeed() {
  const store = readStore();
  const hasWelcome = store.notifications.some(
    (n) => n.type === "welcome" && (n.userId === DEMO_ACCOUNTS.user.id || n.userId === DEMO_ACCOUNTS.admin.id),
  );
  if (hasWelcome) return;

  const now = new Date().toISOString();
  const welcomeUser: MockNotification = {
    id: generateId(),
    userId: DEMO_ACCOUNTS.user.id,
    type: "welcome",
    message: "Welcome to Sabbe Satta, Demo Reader. Enjoy your library!",
    link: "/books",
    read: false,
    createdAt: now,
  };
  const welcomeAdmin: MockNotification = {
    id: generateId(),
    userId: DEMO_ACCOUNTS.admin.id,
    type: "welcome",
    message: "Welcome to Sabbe Satta, Demo Admin. You can manage content from the admin panel.",
    link: "/admin",
    read: false,
    createdAt: now,
  };
  // Match the seeded purchases from mock-commerce: the demo user owns books.
  const purchaseNudge: MockNotification = {
    id: generateId(),
    userId: DEMO_ACCOUNTS.user.id,
    type: "new_purchase",
    message: "Your purchased books are ready to read in your library.",
    link: "/purchases",
    read: false,
    createdAt: now,
  };

  store.notifications = [...store.notifications, welcomeUser, welcomeAdmin, purchaseNudge];
  writeStore(store);
}

/* ─── Reads ────────────────────────────────────────────────────── */

export async function mockGetNotifications(userId: string): Promise<MockNotification[]> {
  await seedOnce();
  return readStore()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockGetUnreadCount(userId: string): Promise<number> {
  await seedOnce();
  return readStore().notifications.filter((n) => n.userId === userId && !n.read).length;
}

/** Admin view — every notification across all demo accounts (M5). */
export async function mockGetAllNotifications(): Promise<MockNotification[]> {
  await seedOnce();
  return [...readStore().notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/* ─── Writes ───────────────────────────────────────────────────── */

/**
 * Add a notification for a user. Mirror of the server-side insert that
 * would happen on real events (purchase, comment, contact).
 */
export function mockAddNotification(input: {
  userId: string;
  type: MockNotificationType;
  message: string;
  link?: string | null;
}): MockNotification {
  const store = readStore();
  const notification: MockNotification = {
    id: generateId(),
    userId: input.userId,
    type: input.type,
    message: input.message,
    link: input.link ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications = [...store.notifications, notification];
  writeStore(store);
  return notification;
}

/**
 * Ensure the welcome notification exists for a demo account (called on
 * mock sign-in — idempotent so repeated logins don't spam the bell).
 */
export function mockEnsureWelcome(userId: string) {
  void seedOnce().then(() => {
    const store = readStore();
    const hasWelcome = store.notifications.some(
      (n) => n.userId === userId && n.type === "welcome",
    );
    if (hasWelcome) return;
    const isAdmin = userId === DEMO_ACCOUNTS.admin.id;
    store.notifications = [
      ...store.notifications,
      {
        id: generateId(),
        userId,
        type: "welcome",
        message: isAdmin
          ? "Welcome back, Demo Admin."
          : "Welcome back, Demo Reader. Happy reading!",
        link: isAdmin ? "/admin" : "/books",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    writeStore(store);
  });
}

export async function mockMarkAllRead(userId: string): Promise<void> {
  await seedOnce();
  const store = readStore();
  store.notifications = store.notifications.map((n) =>
    n.userId === userId && !n.read ? { ...n, read: true } : n,
  );
  writeStore(store);
}

export async function mockMarkRead(userId: string, id: string): Promise<void> {
  await seedOnce();
  const store = readStore();
  store.notifications = store.notifications.map((n) =>
    n.userId === userId && n.id === id ? { ...n, read: true } : n,
  );
  writeStore(store);
}
