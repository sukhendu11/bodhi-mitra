import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminClaimStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("get_admin_claim_status");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      adminExists: !!row?.admin_exists,
      isAdmin: !!row?.is_admin,
      userId,
    };
  });

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_admin_role");
    if (error) throw new Error(error.message);
    const result = (data ?? {}) as { ok?: boolean; alreadyAdmin?: boolean };
    return { ok: result.ok ?? true, alreadyAdmin: !!result.alreadyAdmin };
  });
