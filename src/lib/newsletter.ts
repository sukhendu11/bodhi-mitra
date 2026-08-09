import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email/send";
import { isSupabaseUnavailableError } from "@/lib/supabase-unavailable";

/* ─── Mock newsletter store ─────────────────────────────────────────
   localStorage-backed on the client, in-memory on the server (server
   functions have no localStorage). Mirrors the mock-cart pattern so the
   footer / sidebar signup keeps working fully offline with
   production-like feedback (success + duplicate detection). */

const MOCK_SUBSCRIBERS_KEY = "sabbe-satta-newsletter-subscribers";

interface MockSubscriber {
  email: string;
  token: string;
  active: boolean;
}

const memorySubscribers: MockSubscriber[] = [];

function readMockSubscribers(): MockSubscriber[] {
  if (typeof window === "undefined") return [...memorySubscribers];
  try {
    return JSON.parse(localStorage.getItem(MOCK_SUBSCRIBERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeMockSubscribers(list: MockSubscriber[]) {
  if (typeof window === "undefined") {
    memorySubscribers.length = 0;
    memorySubscribers.push(...list);
    return;
  }
  localStorage.setItem(MOCK_SUBSCRIBERS_KEY, JSON.stringify(list));
}

/** True when the error means "Supabase is not available" → route to mock. */
/** Mock subscribe — persists to localStorage (client) / memory (server). */
function mockSubscribe(email: string): { subscribed: boolean; alreadySubscribed: boolean } {
  const list = readMockSubscribers();
  if (list.some((s) => s.email === email)) {
    return { subscribed: true, alreadySubscribed: true };
  }
  list.push({
    email,
    // Deterministic token (dev-only mock) so unsubscribe works offline too
    token: `mock-${email}`,
    active: true,
  });
  writeMockSubscribers(list);
  return { subscribed: true, alreadySubscribed: false };
}

/** Mock unsubscribe — mirrors the real token lookup against the mock store. */
function mockUnsubscribe(
  token: string,
): { success: boolean; alreadyUnsubscribed?: boolean; error?: string } {
  const list = readMockSubscribers();
  const idx = list.findIndex((s) => s.token === token);
  if (idx === -1) return { success: false, error: "Invalid unsubscribe link." };
  if (!list[idx].active) return { success: true, alreadyUnsubscribed: true };
  list[idx] = { ...list[idx], active: false };
  writeMockSubscribers(list);
  return { success: true, alreadyUnsubscribed: false };
}

export const subscribeToNewsletter = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { email: string };
    const email = input.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    let result;
    try {
      result = await supabase.from("newsletter_subscribers").insert({ email });
    } catch (err) {
      // Missing env vars or network failure → mock mode. Real errors rethrow.
      if (isSupabaseUnavailableError(err)) return mockSubscribe(email);
      throw err;
    }

    const { error } = result;
    if (error) {
      if (error.code === "23505") {
        return { subscribed: true, alreadySubscribed: true };
      }
      // Table missing (42P01) or connection lost → mock mode
      if (isSupabaseUnavailableError(error)) {
        return mockSubscribe(email);
      }
      throw new Error("Something went wrong. Please try again later.");
    }

    // Send welcome email (best-effort)
    sendEmail({
      to: email,
      template: "newsletter-welcome",
      data: { email },
    }).catch((err) => console.warn("[newsletter] Welcome email failed:", err));

    return { subscribed: true, alreadySubscribed: false };
  },
);

/** Unsubscribe from newsletter using token */
export const unsubscribeFromNewsletter = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { token: string };
    const db = supabase;

    let subscriber: { id: string; email: string; active: boolean } | null = null;
    try {
      // Find subscriber by token
      const result = await db
        .from("newsletter_subscribers")
        .select("id, email, active")
        .eq("unsubscribe_token", input.token)
        .single();
      subscriber = result.data;
      const findError = result.error;
      if (findError || !subscriber) {
        // Table missing (42P01) / connection lost → mock mode
        if (isSupabaseUnavailableError(findError)) return mockUnsubscribe(input.token);
        return { success: false, error: "Invalid unsubscribe link." };
      }
    } catch (err) {
      // Missing env vars or network failure → mock mode. Real errors rethrow.
      if (isSupabaseUnavailableError(err)) return mockUnsubscribe(input.token);
      throw err;
    }

    if (!subscriber.active) {
      return { success: true, alreadyUnsubscribed: true };
    }

    // Mark as unsubscribed
    const { error: updateError } = await db
      .from("newsletter_subscribers")
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq("id", subscriber.id);

    if (updateError) {
      return { success: false, error: "Failed to unsubscribe. Please try again." };
    }

    // Send unsubscribe confirmation email (best-effort)
    sendEmail({
      to: subscriber.email,
      template: "newsletter-unsubscribe-confirm",
      data: { email: subscriber.email },
    }).catch((err) => console.warn("[newsletter] Unsubscribe confirmation email failed:", err));

    return { success: true, alreadyUnsubscribed: false };
  },
);
