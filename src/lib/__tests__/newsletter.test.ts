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

/* ─── Mock Supabase client ─────────────────────────────────────── */

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

/* ─── Helper: build thenable chain mock ─────────────────────────── */

function makeChainable() {
  const chain: Record<string, any> = {};
  let resolveValue: any = { data: null, error: null };
  let currentPromise: Promise<any> | null = null;

  const getPromise = () => {
    if (!currentPromise) currentPromise = Promise.resolve(resolveValue);
    return currentPromise;
  };

  chain.then = (onfulfilled: any, onrejected: any) => getPromise().then(onfulfilled, onrejected);
  chain.catch = (onrejected: any) => getPromise().catch(onrejected);

  chain.__setResult = (data: any) => {
    resolveValue = data;
    currentPromise = null;
  };

  const methods = ["select", "eq", "in", "or", "order", "range", "maybeSingle", "single", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  chain.insert = vi.fn(() => chain);

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─── Import after mocks are set up ────────────────────────────── */

const { subscribeToNewsletter, unsubscribeFromNewsletter } = (await import("../newsletter")) as any;

/* ════════════════════════════════════════════════════════════════════
   subscribeToNewsletter
   ════════════════════════════════════════════════════════════════════ */

describe("subscribeToNewsletter", () => {
  it("subscribes a valid email successfully", async () => {
    const chain = makeChainable();
    chain.__setResult({ data: { email: "user@example.com" }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await subscribeToNewsletter({ data: { email: "user@example.com" } });
    expect(result).toEqual({ subscribed: true, alreadySubscribed: false });
    expect(mockFrom).toHaveBeenCalledWith("newsletter_subscribers");
  });

  it("trims whitespace and lowercases email", async () => {
    const chain = makeChainable();
    let insertedEmail = "";
    chain.insert = vi.fn((data: any) => {
      insertedEmail = data.email;
      return chain;
    });
    chain.__setResult({ data: { email: "user@example.com" }, error: null });
    mockFrom.mockReturnValue(chain);

    await subscribeToNewsletter({ data: { email: "  User@Example.COM  " } });
    expect(insertedEmail).toBe("user@example.com");
  });

  it("returns alreadySubscribed on duplicate email (23505)", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "23505", message: "duplicate key", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await subscribeToNewsletter({ data: { email: "existing@example.com" } });
    expect(result).toEqual({ subscribed: true, alreadySubscribed: true });
  });

  it("throws on invalid email formats", async () => {
    const invalidEmails = ["", "not-an-email", "@example.com", "user@", "user@.com", "  "];
    for (const email of invalidEmails) {
      await expect(subscribeToNewsletter({ data: { email } })).rejects.toThrow(
        "Please enter a valid email address.",
      );
    }
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws a generic error for real database errors (e.g. foreign key violation)", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "23503", message: "foreign key violation", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      subscribeToNewsletter({ data: { email: "test@example.com" } }),
    ).rejects.toThrow("Something went wrong. Please try again later.");
  });

  it("throws on database insert error with no code (real RLS/permission error)", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "42501", message: "new row violates row-level security policy", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      subscribeToNewsletter({ data: { email: "test@example.com" } }),
    ).rejects.toThrow("Something went wrong. Please try again later.");
  });

  /* ─── Mock fallback (Supabase unavailable → offline subscribe) ─── */

  it("falls back to mock subscribe when the table is missing (42P01)", async () => {
    const chain = makeChainable();
    chain.__setResult({
      data: null,
      error: { code: "42P01", message: "relation does not exist", details: "", hint: "" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await subscribeToNewsletter({ data: { email: "offline-42p01@example.com" } });
    expect(result).toEqual({ subscribed: true, alreadySubscribed: false });
  });

  it("falls back to mock subscribe when Supabase env vars are missing", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error(
        "Missing Supabase environment variable(s): SUPABASE_URL. Connect Supabase in Lovable Cloud.",
      );
    });

    const result = await subscribeToNewsletter({ data: { email: "offline-env@example.com" } });
    expect(result).toEqual({ subscribed: true, alreadySubscribed: false });
  });

  it("falls back to mock subscribe on network failure", async () => {
    mockFrom.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });

    const result = await subscribeToNewsletter({ data: { email: "offline-net@example.com" } });
    expect(result).toEqual({ subscribed: true, alreadySubscribed: false });
  });

  it("returns alreadySubscribed for a duplicate email in mock mode", async () => {
    mockFrom.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });

    const first = await subscribeToNewsletter({ data: { email: "dup@example.com" } });
    expect(first).toEqual({ subscribed: true, alreadySubscribed: false });

    const second = await subscribeToNewsletter({ data: { email: "dup@example.com" } });
    expect(second).toEqual({ subscribed: true, alreadySubscribed: true });
  });
});

/* ════════════════════════════════════════════════════════════════════
   unsubscribeFromNewsletter (mock path)
   ════════════════════════════════════════════════════════════════════ */

describe("unsubscribeFromNewsletter mock path", () => {
  it("unsubscribes a mock subscriber by token offline", async () => {
    mockFrom.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });

    await subscribeToNewsletter({ data: { email: "unsub-offline@example.com" } });
    const result = await unsubscribeFromNewsletter({
      data: { token: "mock-unsub-offline@example.com" },
    });
    expect(result).toEqual({ success: true, alreadyUnsubscribed: false });

    // Unsubscribing again reports alreadyUnsubscribed
    const again = await unsubscribeFromNewsletter({
      data: { token: "mock-unsub-offline@example.com" },
    });
    expect(again).toEqual({ success: true, alreadyUnsubscribed: true });
  });

  it("returns invalid unsubscribe link for an unknown mock token", async () => {
    mockFrom.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });

    const result = await unsubscribeFromNewsletter({ data: { token: "mock-nope@example.com" } });
    expect(result).toEqual({ success: false, error: "Invalid unsubscribe link." });
  });
});
