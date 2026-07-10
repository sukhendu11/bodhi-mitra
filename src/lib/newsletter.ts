import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
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

    return { subscribed: true, alreadySubscribed: false };
  });
