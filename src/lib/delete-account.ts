import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: { supabase: ReturnType<any>; userId: string } }) => {
    const { supabase, userId } = context;

    const tables = [
      "bookmarks",
      "reading_progress",
      "book_ratings",
      "cart_items",
      "purchases",
      "comments",
      "user_roles",
      "course_enrollments",
      "lesson_progress",
      "newsletter_subscribers",
      "contact_messages",
      "search_analytics",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) console.error(`[delete-account] Failed to clean ${table}:`, error.message);
    }

    const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (profileError) {
      return { ok: false, error: profileError.message } as DeleteAccountResult;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      return { ok: false, error: authError.message } as DeleteAccountResult;
    }

    return { ok: true } as DeleteAccountResult;
  });
