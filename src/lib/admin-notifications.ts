import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { supabase } from "@/integrations/supabase/client";

export interface AdminNotification {
  id: string;
  type: "new_comment" | "comment_reply" | "contact_message" | "new_purchase";
  message: string;
  link: string | null;
  created_at: string;
  read: boolean;
}

const db = supabase as any;

/** Fetch all admin notifications (admin) */
export const fetchAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const { data, error } = await db
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as AdminNotification[];
  });

/** Mark a notification as read */
export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { error } = await db
      .from("admin_notifications")
      .update({ read: true })
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

/** Mark all notifications as read */
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const { error } = await db
      .from("admin_notifications")
      .update({ read: true })
      .eq("read", false);
    if (error) throw error;
    return { success: true };
  });

/** Delete a notification */
export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { error } = await db
      .from("admin_notifications")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

/** Create an admin notification (server-side only) */
export async function createAdminNotification(
  type: AdminNotification["type"],
  message: string,
  link?: string,
): Promise<void> {
  const { error } = await db
    .from("admin_notifications")
    .insert({ type, message, link: link || null });
  if (error) {
    console.error("[admin-notifications] Failed to create notification:", error);
  }
}
