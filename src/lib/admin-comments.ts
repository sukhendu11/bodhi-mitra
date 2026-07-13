import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const db = () => supabase as any;

// ─── Comments ──────────────────────────────────────────────────────────

export interface CommentWithPost {
  id: string;
  post_id: string;
  post_title: string | null;
  post_slug: string | null;
  user_id: string;
  user_name: string;
  comment_text: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedComments {
  data: CommentWithPost[];
  total: number;
}

/** Fetch all comments across all posts for admin moderation (with post info). */
export async function fetchAllComments(
  page = 1,
  pageSize = 50,
  options?: { search?: string; postId?: string },
): Promise<PaginatedComments> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db()
    .from("comments")
    .select(`*, posts(slug, title_en, title_bn, title)`)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.postId) query = query.eq("post_id", options.postId);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.or(`comment_text.ilike.*${q}*,user_name.ilike.*${q}*`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped = ((data ?? []) as any[]).map((row: any) => ({
    id: row.id,
    post_id: row.post_id,
    post_title: row.posts?.title_en || row.posts?.title || row.posts?.title_bn || null,
    post_slug: row.posts?.slug || null,
    user_id: row.user_id,
    user_name: row.user_name,
    comment_text: row.comment_text,
    parent_id: row.parent_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as CommentWithPost[];

  return { data: mapped, total: count ?? 0 };
}

/** Get comment stats. */
export async function getCommentStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  withReplies: number;
}> {
  const dbc = db();
  const { count: total } = await dbc.from("comments").select("*", { count: "exact", head: true });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: today } = await dbc
    .from("comments")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const { count: thisWeek } = await dbc
    .from("comments")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekStart.toISOString());

  const { count: withReplies } = await dbc
    .from("comments")
    .select("*", { count: "exact", head: true })
    .not("parent_id", "is", null);

  return {
    total: total ?? 0,
    today: today ?? 0,
    thisWeek: thisWeek ?? 0,
    withReplies: withReplies ?? 0,
  };
}

/** Admin: delete any comment (bypasses RLS via service role). */
export const adminDeleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { id: string };
    const { error } = await supabaseAdmin.from("comments").delete().eq("id", input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Admin: edit any comment text (bypasses RLS via service role). */
export const adminUpdateComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { id: string; comment_text: string };
    if (!input.comment_text?.trim()) throw new Error("Comment text is required");
    if (input.comment_text.trim().length > 2000)
      throw new Error("Comment is too long (max 2000 characters)");
    const { error } = await supabaseAdmin
      .from("comments")
      .update({ comment_text: input.comment_text.trim(), updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Contact Messages ──────────────────────────────────────────────────

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface PaginatedContactMessages {
  data: ContactMessage[];
  total: number;
}

/** Fetch contact form submissions (admin only). */
export async function fetchContactMessages(
  page = 1,
  pageSize = 50,
  options?: { unreadOnly?: boolean; search?: string },
): Promise<PaginatedContactMessages> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = db()
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (options?.unreadOnly) query = query.eq("read", false);
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) query = query.or(`name.ilike.*${q}*,email.ilike.*${q}*,message.ilike.*${q}*`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as ContactMessage[], total: count ?? 0 };
}

/** Mark a contact message as read. */
export async function markContactMessageRead(id: string): Promise<void> {
  const { error } = await db().from("contact_messages").update({ read: true }).eq("id", id);
  if (error) throw error;
}

/** Delete a contact message (bypasses RLS via service role). */
export const deleteContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { id: string };
    const { error } = await (supabaseAdmin as any)
      .from("contact_messages")
      .delete()
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/** Get contact message stats. */
export async function getContactMessageStats(): Promise<{ total: number; unread: number }> {
  const dbc = db();
  const { count: total } = await dbc
    .from("contact_messages")
    .select("*", { count: "exact", head: true });
  const { count: unread } = await dbc
    .from("contact_messages")
    .select("*", { count: "exact", head: true })
    .eq("read", false);
  return { total: total ?? 0, unread: unread ?? 0 };
}
