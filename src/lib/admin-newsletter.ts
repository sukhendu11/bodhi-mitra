import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { supabase } from "@/integrations/supabase/client";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  active: boolean;
  created_at: string;
  unsubscribed_at: string | null;
}

const db = supabase as any;

/** Fetch all newsletter subscribers (admin) */
export const fetchNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const page = data?.page || 1;
    const pageSize = data?.pageSize || 25;
    const search = data?.search || "";
    const activeOnly = data?.activeOnly ?? false;

    let query = db.from("newsletter_subscribers").select("*", { count: "exact" });

    if (search) {
      query = query.ilike("email", `%${search}%`);
    }
    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data: items, error, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { data: items as NewsletterSubscriber[], total: count || 0 };
  });

/** Get newsletter stats (admin) */
export const getNewsletterStats = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const [totalResult, activeResult, unsubscribedResult, newWeekResult] = await Promise.all([
      db.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
      db.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("active", true),
      db.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("active", false),
      db.from("newsletter_subscribers").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      unsubscribed: unsubscribedResult.count || 0,
      newThisWeek: newWeekResult.count || 0,
    };
  });

/** Delete a newsletter subscriber (admin) */
export const deleteNewsletterSubscriber = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { error } = await db.from("newsletter_subscribers").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });
