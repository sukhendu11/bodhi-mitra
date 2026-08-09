import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, requireMinRole } from "@/lib/permissions";

export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context }) => {
    return { ok: true };
  });

export const logLoginEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context, data }: { context: { supabase: any; userId: string }; data: unknown }) => {
      const { supabase, userId } = context;
      const input = data as {
        email?: string;
        ip_address?: string;
        user_agent?: string;
        sign_in_method?: string;
      };
      const db = supabase;
      await db.from("login_history").insert({
        user_id: userId,
        email: input.email ?? null,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        sign_in_method: input.sign_in_method ?? "email",
      });
      return { ok: true };
    },
  );
