import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock TanStack Start (server functions need runtime context) ─── */

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: any = (args: any) => builder._handler(args);
    builder.method = () => builder;
    builder.middleware = () => builder;
    builder.handler = (handlerFn: any) => {
      builder._handler = handlerFn;
      return builder;
    };
    builder.validator = () => builder;
    return builder;
  },
}));

/* ─── Supabase client — throws on first call to force the mock path ── */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      throw new Error("fetch failed: Supabase unreachable");
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
});

const { submitContactMessage, mockGetContactMessages } = (await import(
  "../contact-messages"
)) as any;
const { mockGetNotifications } = (await import("../mock-notifications")) as any;
const { DEMO_ACCOUNTS } = (await import("../mock-session")) as any;

describe("submitContactMessage mock fallback", () => {
  it("stores a contact message offline and reports success", async () => {
    const result = await submitContactMessage({
      data: { name: "Maya", email: "maya@example.com", message: "Hello team" },
    });
    expect(result.stored).toBe(true);
    expect(result.id).toMatch(/^contact-/);

    const list = mockGetContactMessages();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Maya");
    expect(list[0].email).toBe("maya@example.com");
  });

  it("persists to localStorage", async () => {
    await submitContactMessage({
      data: { name: "Maya", email: "maya@example.com", message: "Persisted message" },
    });
    expect(localStorage.getItem("sabbe-satta-mock-contact")).toContain("Persisted message");
  });

  it("creates an admin notification for the contact", async () => {
    await submitContactMessage({
      data: { name: "Maya", email: "maya@example.com", message: "Can you help with an order?" },
    });
    const adminList = await mockGetNotifications(DEMO_ACCOUNTS.admin.id);
    expect(adminList.some((n: any) => n.type === "contact_message")).toBe(true);
  });

  it("validates required fields and email format", async () => {
    await expect(
      submitContactMessage({ data: { name: "", email: "", message: "" } }),
    ).rejects.toThrow("Missing required fields.");

    await expect(
      submitContactMessage({
        data: { name: "X", email: "not-an-email", message: "hi" },
      }),
    ).rejects.toThrow("Please enter a valid email address.");
  });
});
