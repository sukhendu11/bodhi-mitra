/**
 * Mock orders & purchases — M2 Commerce seam (ROADMAP.md).
 *
 * Mirrors the Supabase `orders` / `purchases` tables for the offline demo:
 *   - Orders: one row per checkout (id, userId, items, total, status "paid")
 *   - Purchases: unique (user_id × book_id), amount_paid, purchase_date
 *
 * localStorage on the client, in-memory on the server (server functions
 * have no localStorage) — same pattern as mock-cart.ts / mock-session.ts.
 * Seeded state for the demo user: 2 purchased books + 1 order, so the
 * /purchases page and premium reader gating are demoable immediately.
 */
import { mockFetchPublishedBooks } from "@/lib/mock-data";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";
import { mockAddNotification } from "@/lib/mock-notifications";

const STORE_KEY = "sabbe-satta-mock-commerce";

export interface MockOrderItem {
  bookId: string;
  titleEn: string | null;
  titleBn: string | null;
  price: number;
}

/**
 * Order lifecycle status (mirrors the provider-agnostic payment abstraction):
 *   pending    → created server-side, awaiting payment
 *   paid       → payment verified, purchases granted
 *   failed     → payment failed / verification rejected
 *   cancelled  → user cancelled at the gateway
 */
export type MockOrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface MockOrder {
  id: string;
  userId: string;
  items: MockOrderItem[];
  /** Coupon discount applied to the order (0 when none). */
  discount: number;
  /** Sales tax amount included in the order total (0 when none). */
  tax: number;
  total: number;
  status: MockOrderStatus;
  /** Provider id that initiated this order ("simulated" | "piprapay"). */
  provider: string;
  /** Provider-side reference (e.g. PipraPay TrxID) once known. */
  gatewayReference?: string | null;
  /** Coupon id that was applied (for redemption incrementing). */
  couponId?: string | null;
  createdAt: string;
  /** When the order was transitioned to a terminal state. */
  completedAt?: string | null;
}

export interface MockPurchase {
  id: string;
  userId: string;
  bookId: string;
  amountPaid: number;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockCommerceStore {
  orders: MockOrder[];
  purchases: MockPurchase[];
}

/* ─── Store ────────────────────────────────────────────────────── */

const memoryStore: MockCommerceStore = { orders: [], purchases: [] };
// In-flight guard so concurrent first reads can't double-seed.
let seedPromise: Promise<void> | null = null;

function readStore(): MockCommerceStore {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { orders: [], purchases: [] };
    return JSON.parse(raw) as MockCommerceStore;
  } catch {
    return { orders: [], purchases: [] };
  }
}

function writeStore(store: MockCommerceStore) {
  if (typeof window === "undefined") {
    memoryStore.orders = store.orders;
    memoryStore.purchases = store.purchases;
    return;
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Seed demo purchases (ROADMAP §2.3: 2 purchased books) ─────── */

function seedOnce(): Promise<void> {
  // Idempotent — re-seeds only when the demo user has no purchases yet.
  // Store-based (not flag-based) so it stays correct when storage is
  // cleared/re-hydrated (e.g. between tests). The in-flight promise guards
  // against concurrent first reads double-seeding; if the store is later
  // emptied (tests, reset), the guard resets so seeding can run again.
  const store = readStore();
  const hasDemoPurchases = store.purchases.some(
    (p) => p.userId === DEMO_ACCOUNTS.user.id,
  );
  if (!hasDemoPurchases) seedPromise = null;
  if (!seedPromise) {
    seedPromise = doSeed();
  }
  return seedPromise;
}

async function doSeed() {
  const store = readStore();
  const hasDemoPurchases = store.purchases.some(
    (p) => p.userId === DEMO_ACCOUNTS.user.id,
  );
  if (hasDemoPurchases) return;

  const { data } = await mockFetchPublishedBooks(1, 100);
  const books = data.filter((b) => !b.is_free).slice(0, 2); // 2 paid books
  if (books.length === 0) return;

  const now = Date.now();
  const items: MockOrderItem[] = books.map((b) => ({
    bookId: b.id,
    titleEn: b.title_en,
    titleBn: b.title_bn,
    price: Number(b.price),
  }));

  const order: MockOrder = {
    id: `order-${now}`,
    userId: DEMO_ACCOUNTS.user.id,
    items,
    discount: 0,
    tax: 0,
    total: items.reduce((s, i) => s + i.price, 0),
    status: "paid",
    provider: "simulated",
    gatewayReference: null,
    couponId: null,
    createdAt: new Date(now).toISOString(),
    completedAt: new Date(now).toISOString(),
  };

  const purchases: MockPurchase[] = books.map((b) => ({
    id: `purchase-${now}-${b.id}`,
    userId: DEMO_ACCOUNTS.user.id,
    bookId: b.id,
    amountPaid: Number(b.price),
    purchaseDate: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }));

  store.orders = [...store.orders, order];
  store.purchases = [...store.purchases, ...purchases];
  writeStore(store);
}

/* ─── Reads ────────────────────────────────────────────────────── */

export async function mockGetOrders(userId: string): Promise<MockOrder[]> {
  await seedOnce();
  const store = readStore();
  return store.orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Look up a single order by id (any status). */
export async function mockGetOrderById(orderId: string): Promise<MockOrder | null> {
  await seedOnce();
  const store = readStore();
  return store.orders.find((o) => o.id === orderId) ?? null;
}

/* ─── Payment lifecycle (provider-agnostic order state) ────────── */

/**
 * Create a NEW pending order (server-side, before the payer reaches the
 * gateway). The order is NOT fulfilled — a later `mockTransitionOrderStatus`
 * to "paid" grants the purchases, mirroring the real webhook flow.
 */
export async function mockCreatePendingOrder(
  userId: string,
  items: MockOrderItem[],
  discount = 0,
  taxRate = 0,
  opts: { provider?: string; couponId?: string | null } = {},
): Promise<MockOrder> {
  await seedOnce();
  const store = readStore();

  const now = new Date().toISOString();
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * taxRate) / 100;
  const order: MockOrder = {
    id: generateId("order"),
    userId,
    items,
    discount,
    tax,
    total: Math.max(0, taxable + tax),
    status: "pending",
    provider: opts.provider ?? "simulated",
    gatewayReference: null,
    couponId: opts.couponId ?? null,
    createdAt: now,
    completedAt: null,
  };

  store.orders = [...store.orders, order];
  writeStore(store);
  return order;
}

/**
 * Transition a pending order to a terminal state (idempotent).
 *
 * - `pending → paid` grants purchases (mirrors a verified webhook).
 * - `pending → failed | cancelled` records the state, no purchases.
 * - Anything else (e.g. re-marking an already-paid order) is a no-op — this
 *   is the duplicate-callback protection.
 */
export async function mockTransitionOrderStatus(
  orderId: string,
  status: MockOrderStatus,
  opts: { gatewayReference?: string | null } = {},
): Promise<{ order: MockOrder | null; changed: boolean }> {
  await seedOnce();
  const store = readStore();

  const idx = store.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { order: null, changed: false };

  const current = store.orders[idx];
  // Duplicate-callback / invalid-transition guard: only pending may change.
  if (current.status !== "pending") return { order: current, changed: false };
  if (current.status === status) return { order: current, changed: false };

  const updated: MockOrder = {
    ...current,
    status,
    gatewayReference: opts.gatewayReference ?? current.gatewayReference ?? null,
    completedAt: new Date().toISOString(),
  };
  store.orders[idx] = updated;
  writeStore(store);
  return { order: updated, changed: true };
}

export async function mockGetPurchases(userId: string): Promise<MockPurchase[]> {
  await seedOnce();
  const store = readStore();
  return store.purchases
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
}

export async function mockHasPurchase(
  userId: string,
  bookId: string,
): Promise<boolean> {
  await seedOnce();
  return readStore().purchases.some(
    (p) => p.userId === userId && p.bookId === bookId,
  );
}

/* ─── Admin aggregates (M5 dashboard + orders view) ─────────────── */

export async function mockGetAllOrders(): Promise<MockOrder[]> {
  await seedOnce();
  return [...readStore().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockGetAllPurchases(): Promise<MockPurchase[]> {
  await seedOnce();
  return [...readStore().purchases].sort(
    (a, b) => b.purchaseDate.localeCompare(a.purchaseDate),
  );
}

/* ─── Writes ───────────────────────────────────────────────────── */

/**
 * Record a single-book purchase (idempotent). Returns `alreadyOwned`
 * when the user already owns the book — mirrors `purchaseBook()`.
 */
export async function mockPurchaseBook(
  userId: string,
  bookId: string,
  amountPaid = 0,
): Promise<{ alreadyOwned: boolean; purchase?: MockPurchase }> {
  await seedOnce();
  const store = readStore();

  const existing = store.purchases.find(
    (p) => p.userId === userId && p.bookId === bookId,
  );
  if (existing) return { alreadyOwned: true, purchase: existing };

  const now = new Date().toISOString();
  const purchase: MockPurchase = {
    id: generateId("purchase"),
    userId,
    bookId,
    amountPaid,
    purchaseDate: now,
    createdAt: now,
    updatedAt: now,
  };
  store.purchases = [...store.purchases, purchase];
  writeStore(store);
  mockAddNotification({
    userId,
    type: "new_purchase",
    message: "Purchase confirmed — the book is now in your library.",
    link: "/purchases",
  });
  return { alreadyOwned: false, purchase };
}

/**
 * Record a full cart checkout: creates one order + a purchase row per
 * item (skipping any already-owned books). Returns the order.
 *
 * @param discount - optional coupon discount subtracted from the order total
 *   (per-book purchase amounts keep their full price).
 * @param taxRate - optional sales-tax percentage (0–100) applied to the
 *   post-discount subtotal. The tax amount is stored on the order.
 */
export async function mockRecordOrder(
  userId: string,
  items: MockOrderItem[],
  discount = 0,
  taxRate = 0,
): Promise<MockOrder> {
  await seedOnce();
  const store = readStore();

  const now = new Date().toISOString();
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * taxRate) / 100;
  const order: MockOrder = {
    id: generateId("order"),
    userId,
    items,
    discount,
    tax,
    total: Math.max(0, taxable + tax),
    status: "paid",
    provider: "simulated",
    gatewayReference: null,
    couponId: null,
    createdAt: now,
    completedAt: now,
  };

  const purchases: MockPurchase[] = items
    .filter((i) => !store.purchases.some((p) => p.userId === userId && p.bookId === i.bookId))
    .map((i) => ({
      id: generateId("purchase"),
      userId,
      bookId: i.bookId,
      amountPaid: i.price,
      purchaseDate: now,
      createdAt: now,
      updatedAt: now,
    }));

  store.orders = [...store.orders, order];
  store.purchases = [...store.purchases, ...purchases];
  writeStore(store);
  if (purchases.length > 0) {
    mockAddNotification({
      userId,
      type: "new_purchase",
      message: `Your order (${items.length} book${items.length !== 1 ? "s" : ""}) is confirmed — added to your library.`,
      link: "/purchases",
    });
  }
  return order;
}
