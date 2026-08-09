/**
 * Contact messages — M4 Community seam (ROADMAP.md E4.4).
 *
 * Mirrors the Supabase `contact_messages` table: name / email / message
 * with a created_at timestamp. Writes go through a server function that
 * tries Supabase first and falls back to a localStorage-backed mock store
 * when Supabase is unavailable (offline demo) — same pattern as
 * newsletter.ts. In mock mode a `contact_message` notification is also
 * created for the demo admin (the mock "admin notification" for contact).
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";
import { mockAddNotification } from "@/lib/mock-notifications";
import { isMockMode } from "@/lib/data-source";
import { isSupabaseUnavailableError } from "@/lib/supabase-unavailable";

const MOCK_CONTACT_KEY = "sabbe-satta-mock-contact";

export interface MockContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

const memoryMessages: MockContactMessage[] = [];

function readMockMessages(): MockContactMessage[] {
  if (typeof window === "undefined") return [...memoryMessages];
  try {
    return JSON.parse(localStorage.getItem(MOCK_CONTACT_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeMockMessages(list: MockContactMessage[]) {
  if (typeof window === "undefined") {
    memoryMessages.length = 0;
    memoryMessages.push(...list);
    return;
  }
  localStorage.setItem(MOCK_CONTACT_KEY, JSON.stringify(list));
}

/** Exposed for tests + the mock admin panel (M5). */
export function mockGetContactMessages(): MockContactMessage[] {
  return readMockMessages();
}

function mockStoreContact(input: {
  name: string;
  email: string;
  message: string;
}): MockContactMessage {
  const row: MockContactMessage = {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
  writeMockMessages([...readMockMessages(), row]);

  // Mock admin notification for the new contact message
  mockAddNotification({
    userId: DEMO_ACCOUNTS.admin.id,
    type: "contact_message",
    message: `New contact message from ${row.name}: “${row.message.slice(0, 80)}${row.message.length > 80 ? "…" : ""}”`,
    link: "/contact",
  });
  return row;
}

export interface ContactMessageResult {
  id: string;
  stored: boolean;
}

export const submitContactMessage = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }): Promise<ContactMessageResult> => {
    const input = data as { name: string; email: string; message: string };
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const message = input.message?.trim();

    if (!name || !email || !message) throw new Error("Missing required fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (message.length > 5000) throw new Error("Message is too long (max 5000 characters).");

    // Mock mode → direct mock store (no network probe in dev)
    if (isMockMode()) {
      const row = mockStoreContact({ name, email, message });
      return { id: row.id, stored: true };
    }

    // Try Supabase first
    try {
      const { data: row, error } = await supabase
        .from("contact_messages")
        .insert({ name, email, message })
        .select("id")
        .single();
      if (error) throw error;
      return { id: row.id as string, stored: true };
    } catch (err) {
      // Missing env vars or network failure → mock mode. Real errors rethrow.
      if (isSupabaseUnavailableError(err)) {
        const row = mockStoreContact({ name, email, message });
        return { id: row.id, stored: true };
      }
      throw err;
    }
  },
);
