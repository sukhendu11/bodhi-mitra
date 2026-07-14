import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email/send";

export const subscribeToNewsletter = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as { email: string };
    const email = input.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    const db = supabase as any;

    const { error } = await db.from("newsletter_subscribers").insert({
      email,
    });

    if (error) {
      if (error.code === "23505") {
        return { subscribed: true, alreadySubscribed: true };
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
    const db = supabase as any;

    // Find subscriber by token
    const { data: subscriber, error: findError } = await db
      .from("newsletter_subscribers")
      .select("id, email, active")
      .eq("unsubscribe_token", input.token)
      .single();

    if (findError || !subscriber) {
      return { success: false, error: "Invalid unsubscribe link." };
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
