import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** Check if a user has admin or super_admin role. Used inside server functions. */
async function isAdminUser(supabase: ReturnType<typeof createClient<Database>>, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .maybeSingle();
  return !!data;
}

export type CommentResult = {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
};

export const addCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { post_id: string; user_name: string; comment_text: string; parent_id?: string | null };

    if (!input.comment_text?.trim()) throw new Error("Comment text is required");
    if (input.comment_text.trim().length > 2000) throw new Error("Comment is too long (max 2000 characters)");

    const { data: result, error } = await supabase
      .from("comments")
      .insert({
        post_id: input.post_id,
        user_id: userId,
        user_name: input.user_name.trim() || "Reader",
        comment_text: input.comment_text.trim(),
        parent_id: input.parent_id || null,
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result as unknown as CommentResult;
  });

export const updateCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { id: string; comment_text: string };

    if (!input.comment_text?.trim()) throw new Error("Comment text is required");
    if (input.comment_text.trim().length > 2000) throw new Error("Comment is too long (max 2000 characters)");

    // Ownership check: only the comment author can edit
    const { data: existing } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", input.id)
      .single();

    if (!existing) throw new Error("Comment not found");
    if (existing.user_id !== userId) throw new Error("You can only edit your own comments");

    const { data: result, error } = await supabase
      .from("comments")
      .update({ comment_text: input.comment_text.trim(), updated_at: new Date().toISOString() } as never)
      .eq("id", input.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result as unknown as CommentResult;
  });

export const deleteCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { id: string };

    // Check ownership or admin/moderator role
    const { data: existing } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", input.id)
      .single();

    if (!existing) throw new Error("Comment not found");

    const isAdmin = await isAdminUser(supabase, userId);
    if (existing.user_id !== userId && !isAdmin) {
      throw new Error("You don't have permission to delete this comment");
    }

    const { error } = await supabase.from("comments").delete().eq("id", input.id);
    if (error) throw new Error(error.message);

    return { success: true };
  });
