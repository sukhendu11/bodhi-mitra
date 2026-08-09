import { describe, it, expect, beforeEach } from "vitest";
import {
  DEMO_ACCOUNTS,
  MOCK_SESSION_KEY,
  MOCK_PROFILES_KEY,
  getMockSession,
  getMockUserRole,
  isMockSignedIn,
  mockDeleteProfile,
  mockGetProfile,
  mockSessionToSupabaseSession,
  mockUpsertProfile,
  signInAsDemo,
  signInWithMock,
  signOutMock,
} from "@/lib/mock-session";

beforeEach(() => {
  localStorage.clear();
});

describe("signInWithMock", () => {
  it("signs in with the demo user credentials", () => {
    const { error } = signInWithMock(DEMO_ACCOUNTS.user.email, DEMO_ACCOUNTS.user.password);
    expect(error).toBeUndefined();
    const session = getMockSession();
    expect(session?.user.email).toBe(DEMO_ACCOUNTS.user.email);
    expect(session?.user.role).toBe("user");
    expect(isMockSignedIn()).toBe(true);
  });

  it("signs in with the demo admin credentials (super_admin role)", () => {
    const { error } = signInWithMock(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.password);
    expect(error).toBeUndefined();
    expect(getMockUserRole()).toBe("super_admin");
  });

  it("normalizes email casing/whitespace", () => {
    const { error } = signInWithMock("  DEMO@Sabbe-Satta.Test  ", "demo1234");
    expect(error).toBeUndefined();
    expect(getMockSession()?.user.email).toBe("demo@sabbe-satta.test");
  });

  it("rejects a wrong password", () => {
    const { error } = signInWithMock(DEMO_ACCOUNTS.user.email, "wrong-password");
    expect(error).toBeDefined();
    expect(isMockSignedIn()).toBe(false);
  });

  it("rejects an unknown email", () => {
    const { error } = signInWithMock("nobody@example.com", "whatever123");
    expect(error).toBeDefined();
    expect(isMockSignedIn()).toBe(false);
  });

  it("seeds a default profile row on sign-in", () => {
    signInAsDemo("user");
    const profile = mockGetProfile(DEMO_ACCOUNTS.user.id);
    expect(profile?.display_name).toBe(DEMO_ACCOUNTS.user.displayName);
  });
});

describe("signInAsDemo / signOutMock", () => {
  it("one-click demo admin sign-in sets super_admin", () => {
    signInAsDemo("admin");
    const session = getMockSession();
    expect(session?.user.email).toBe(DEMO_ACCOUNTS.admin.email);
    expect(getMockUserRole()).toBe("super_admin");
  });

  it("signOutMock clears the session", () => {
    signInAsDemo("user");
    signOutMock();
    expect(getMockSession()).toBeNull();
    expect(getMockUserRole()).toBeNull();
    expect(localStorage.getItem(MOCK_SESSION_KEY)).toBeNull();
  });
});

describe("mockSessionToSupabaseSession", () => {
  it("maps a mock session into a Supabase-compatible Session", () => {
    signInAsDemo("admin");
    const session = mockSessionToSupabaseSession(getMockSession());
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe(DEMO_ACCOUNTS.admin.id);
    expect(session!.user.email).toBe(DEMO_ACCOUNTS.admin.email);
    expect((session!.user.app_metadata as Record<string, unknown>).role).toBe("super_admin");
    expect(session!.token_type).toBe("bearer");
  });

  it("returns null for a null mock session", () => {
    expect(mockSessionToSupabaseSession(null)).toBeNull();
  });
});

describe("mock profile store", () => {
  it("upserts and reads a profile", () => {
    mockUpsertProfile("u-1", { display_name: "Maya", bio: "Reader" });
    const profile = mockGetProfile("u-1");
    expect(profile?.display_name).toBe("Maya");
    expect(profile?.bio).toBe("Reader");
    expect(profile?.user_id).toBe("u-1");
  });

  it("merges partial updates without clobbering other fields", () => {
    mockUpsertProfile("u-2", { display_name: "Ananda" });
    mockUpsertProfile("u-2", { bio: "Meditator", preferences: { theme: "dark" } });
    const profile = mockGetProfile("u-2");
    expect(profile?.display_name).toBe("Ananda");
    expect(profile?.bio).toBe("Meditator");
    expect(profile?.preferences).toEqual({ theme: "dark" });
  });

  it("returns null for a missing profile", () => {
    expect(mockGetProfile("nope")).toBeNull();
  });

  it("deletes a profile", () => {
    mockUpsertProfile("u-3", { display_name: "Temp" });
    mockDeleteProfile("u-3");
    expect(mockGetProfile("u-3")).toBeNull();
    expect(localStorage.getItem(MOCK_PROFILES_KEY)).not.toContain("u-3");
  });
});
