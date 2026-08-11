/**
 * Mock session & profile store — M1 Identity seam (ROADMAP.md).
 *
 * Provides the signed-in state for the offline demo: two demo accounts
 * (regular user + super_admin), a persisted mock session, and a mock
 * `profiles` store mirroring the Supabase `profiles` table. localStorage
 * on the client, in-memory on the server (server functions have no
 * localStorage) — same pattern as mock-cart.ts / newsletter.ts.
 */
import type { Session, User } from "@supabase/supabase-js";

export const MOCK_SESSION_KEY = "sabbe-satta-mock-session";
export const MOCK_PROFILES_KEY = "sabbe-satta-mock-profiles";
/** Custom window event fired on mock sign-in/sign-out (same-tab reactivity). */
export const MOCK_AUTH_EVENT = "sabbe-satta:mock-auth-change";

export interface DemoAccount {
  id: string;
  email: string;
  password: string;
  role: "user" | "super_admin";
  displayName: string;
}

/** Demo accounts — passwords fixed for the offline demo. */
export const DEMO_ACCOUNTS: Record<"user" | "admin", DemoAccount> = {
  user: {
    id: "demo-user",
    email: "demo@sabbe-satta.test",
    password: "demo1234",
    role: "user",
    displayName: "Demo Reader",
  },
  admin: {
    id: "demo-admin",
    email: "admin@sabbe-satta.test",
    password: "admin1234",
    role: "super_admin",
    displayName: "Demo Admin",
  },
};

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    role: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  };
}

/* ─── Session store ────────────────────────────────────────────── */

// SSR-safe in-memory fallback (server functions / no window)
let memorySession: MockSession | null = null;

function readRawSession(): MockSession | null {
  if (typeof window === "undefined") return memorySession;
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    return raw ? (JSON.parse(raw) as MockSession) : null;
  } catch {
    return null;
  }
}

function writeRawSession(session: MockSession | null) {
  if (typeof window === "undefined") {
    memorySession = session;
    return;
  }
  if (session) localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(MOCK_SESSION_KEY);
}

export function getMockSession(): MockSession | null {
  return readRawSession();
}

export function isMockSignedIn(): boolean {
  return !!getMockSession();
}

/** Resolve the signed-in mock user's app role (null if not signed in). */
export function getMockUserRole(): string | null {
  return getMockSession()?.user.role ?? null;
}

function emitMockAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MOCK_AUTH_EVENT));
}

function makeMockSession(account: DemoAccount): MockSession {
  return {
    access_token: `mock-${account.id}-${Date.now()}`,
    refresh_token: `mock-refresh-${account.id}`,
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
    user: {
      id: account.id,
      email: account.email,
      role: account.role,
      display_name: account.displayName,
      avatar_url: null,
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

/** Seed a default profile row so profile/settings pages have data. */
function ensureMockProfile(account: DemoAccount) {
  const existing = mockGetProfile(account.id);
  if (existing) return;
  mockUpsertProfile(account.id, { display_name: account.displayName });
}

/** Validate email/password against the demo accounts and sign in. Sync. */
export function signInWithMock(email: string, password: string): { error?: string } {
  const account = Object.values(DEMO_ACCOUNTS).find(
    (a) => a.email === email.trim().toLowerCase(),
  );
  if (!account || account.password !== password) {
    return { error: "Invalid login credentials" };
  }
  writeRawSession(makeMockSession(account));
  ensureMockProfile(account);
  emitMockAuthChange();
  return {};
}

/** One-click demo sign-in ("Continue as demo user/admin"). */
export function signInAsDemo(role: "user" | "admin") {
  const account = DEMO_ACCOUNTS[role];
  writeRawSession(makeMockSession(account));
  ensureMockProfile(account);
  emitMockAuthChange();
}

export function signOutMock() {
  writeRawSession(null);
  emitMockAuthChange();
}

/**
 * Update the signed-in mock user's avatar (mirrors `supabase.auth.updateUser`
 * in real mode). The header reads `user.user_metadata.avatar_url`, so keeping
 * the session store in sync is what propagates a newly uploaded avatar to the
 * header + mobile nav. Emits the auth-change event to refresh useAuthSession.
 * No-op if the given userId isn't the current signed-in user.
 */
export function mockSetSessionAvatar(userId: string, avatarUrl: string | null) {
  const session = getMockSession();
  if (!session || session.user.id !== userId) return;
  session.user = { ...session.user, avatar_url: avatarUrl };
  writeRawSession(session);
  emitMockAuthChange();
}

/* ─── Session → Supabase shape ─────────────────────────────────── */

/** Convert a mock session into a Supabase-compatible Session object. */
export function mockSessionToSupabaseSession(session: MockSession | null): Session | null {
  if (!session) return null;
  const { user } = session;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      email_confirmed_at: user.created_at,
      phone: "",
      confirmed_at: user.created_at,
      last_sign_in_at: user.created_at,
      created_at: user.created_at,
      updated_at: user.created_at,
      identities: [],
      app_metadata: { provider: "mock", role: user.role },
      user_metadata: {
        display_name: user.display_name,
        ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
      },
    } as User,
  } as Session;
}

/* ─── Mock profiles store (mirrors Supabase `profiles`) ────────── */

export interface MockProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  preferences: Record<string, unknown> | null;
  updated_at: string;
}

const memoryProfiles = new Map<string, MockProfile>();

function readRawProfiles(): Record<string, MockProfile> {
  if (typeof window === "undefined") return Object.fromEntries(memoryProfiles);
  try {
    return JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeRawProfiles(map: Record<string, MockProfile>) {
  if (typeof window === "undefined") {
    memoryProfiles.clear();
    for (const [k, v] of Object.entries(map)) memoryProfiles.set(k, v);
    return;
  }
  localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(map));
}

export function mockGetProfile(userId: string): MockProfile | null {
  return readRawProfiles()[userId] ?? null;
}

export function mockUpsertProfile(
  userId: string,
  patch: Partial<MockProfile>,
): MockProfile {
  const map = readRawProfiles();
  const existing = map[userId] ?? {
    user_id: userId,
    display_name: null,
    avatar_url: null,
    bio: null,
    created_at: new Date().toISOString(),
    preferences: null,
    updated_at: new Date().toISOString(),
  };
  const next: MockProfile = { ...existing, ...patch, updated_at: new Date().toISOString() };
  map[userId] = next;
  writeRawProfiles(map);
  return next;
}

export function mockDeleteProfile(userId: string) {
  const map = readRawProfiles();
  delete map[userId];
  writeRawProfiles(map);
}
