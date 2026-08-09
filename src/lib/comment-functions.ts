import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireAuthOrMock } from "@/lib/mock-auth";
import { DEMO_ACCOUNTS } from "@/lib/mock-session";
import { isMockId } from "@/lib/utils";
import {
  mockAddComment,
  mockDeleteComment,
  mockGetComment,
  mockUpdateComment,
} from "@/lib/mock-comments";
import { mockAddNotification } from "@/lib/mock-notifications";
import type { Database } from "@/integrations/supabase/types";

type SupabaseClient = ReturnType<typeof createClient<Database>>;

/** Check if a user has admin or super_admin role. Used inside server functions. */
async function isAdminUser(supabase: SupabaseClient, userId: string) {
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
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: SupabaseClient | null; userId: string | null };
      data: unknown;
    }) => {
      const { supabase, userId } = context;
      const input = data as {
        post_id: string;
        user_name: string;
        comment_text: string;
        parent_id?: string | null;
        /** Author id passed by the client — used only in mock mode for attribution. */
        userId?: string;
      };

      if (!input.comment_text?.trim()) throw new Error("Comment text is required");
      if (input.comment_text.trim().length > 2000)
        throw new Error("Comment is too long (max 2000 characters)");

      const commentText = input.comment_text.trim();
      const parentId = input.parent_id || null;

      // Mock path — mock auth (no Supabase) OR the post is a mock post (its
      // string id can't be written into the UUID post_id column).
      //
      // Trust note: `input.userId` is ONLY used for comment attribution in
      // mock mode (dev-only seam, no real DB writes). In the real path the
      // author id always comes from the validated session JWT, never the
      // client payload.
      if (!supabase || !userId || isMockId(input.post_id)) {
        const authorId = userId ?? input.userId ?? DEMO_ACCOUNTS.user.id;
        const comment = mockAddComment({
          post_id: input.post_id,
          user_id: authorId,
          user_name: input.user_name.trim() || "Reader",
          comment_text: commentText,
          parent_id: parentId,
        }) as CommentResult;
        // Notify the admin moderator — mirrors the admin_notifications
        // insert that would fire on a real new comment (mock posts have
        // no owner, so the moderator is the audience).
        mockAddNotification({
          userId: DEMO_ACCOUNTS.admin.id,
          type: parentId ? "comment_reply" : "new_comment",
          message: `${comment.user_name} commented on a reflection: “${commentText.slice(0, 80)}${commentText.length > 80 ? "…" : ""}”`,
          link: "/reflections",
        });
        return comment;
      }

      const { data: result, error } = await supabase
        .from("comments")
        .insert({
          post_id: input.post_id,
          user_id: userId,
          user_name: input.user_name.trim() || "Reader",
          comment_text: commentText,
          parent_id: parentId,
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as unknown as CommentResult;
    },
  );

export const updateCommentFn = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: SupabaseClient | null; userId: string | null };
      data: unknown;
    }) => {
      const { supabase, userId } = context;
      const input = data as {
        id: string;
        comment_text: string;
        /** Author id passed by the client — used only in mock mode. */
        userId?: string;
      };

      if (!input.comment_text?.trim()) throw new Error("Comment text is required");
      if (input.comment_text.trim().length > 2000)
        throw new Error("Comment is too long (max 2000 characters)");

      const commentText = input.comment_text.trim();

      // Mock path — mock comment id (or mock auth mode)
      if (!supabase || !userId || isMockId(input.id)) {
        const authorId = userId ?? input.userId ?? null;
        if (authorId) {
          const target = mockGetComment(input.id);
          if (!target) throw new Error("Comment not found");
          if (target.user_id !== authorId)
            throw new Error("You can only edit your own comments");
        }
        return mockUpdateComment(input.id, commentText) as CommentResult;
      }

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
        .update({
          comment_text: commentText,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as unknown as CommentResult;
    },
  );

export const deleteCommentFn = createServerFn({ method: "POST" })
  .middleware([requireAuthOrMock])
  .handler(
    async ({
      context,
      data,
    }: {
      context: { supabase: SupabaseClient | null; userId: string | null };
      data: unknown;
    }) => {
      const { supabase, userId } = context;
      const input = data as {
        id: string;
        /** Author id passed by the client — used only in mock mode. */
        userId?: string;
      };

      // Mock path — mock comment id (or mock auth mode). Demo admin can
      // delete anything; otherwise only the comment author.
      //
      // Trust note: `input.userId` is trusted ONLY in mock mode (dev-only).
      // In the real path authorization comes from the session JWT below.
      if (!supabase || !userId || isMockId(input.id)) {
        const authorId = userId ?? input.userId ?? null;
        if (authorId && authorId !== DEMO_ACCOUNTS.admin.id) {
          const target = mockGetComment(input.id);
          if (!target) throw new Error("Comment not found");
          if (target.user_id !== authorId) {
            throw new Error("You don't have permission to delete this comment");
          }
        }
        mockDeleteComment(input.id);
        return { success: true };
      }

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
    },
  );
