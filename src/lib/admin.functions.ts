import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { createClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ── Dashboard stats types ────────────────────────────────────── */

export interface DashboardStats {
  posts: { total: number; published: number; draft: number };
  pages: { total: number };
  books: { total: number; published: number; draft: number; archived: number; free: number };
  users: { total: number };
  recentPosts: {
    id: string;
    title_en: string | null;
    title_bn: string | null;
    status: string;
    slug: string;
    created_at: string;
  }[];
}

/** Fetch all dashboard stats in a single server-to-database call.
 *  Consolidates post, page, book, and user counts — replaces 4 separate client queries.
 *  Uses `(supabase as any)` to bypass strict typed-table constraints for count queries. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const db = supabase as any;

    // Run all counts and recent posts in parallel
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalPages,
      totalBooks,
      publishedBooks,
      draftBooks,
      archivedBooks,
      freeBooks,
      totalUsers,
      recentPosts,
    ] = await Promise.all([
      db.from("posts").select("*", { count: "exact", head: true }),
      db.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      db.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
      db.from("pages").select("*", { count: "exact", head: true }),
      db.from("books").select("*", { count: "exact", head: true }),
      db.from("books").select("*", { count: "exact", head: true }).eq("status", "published"),
      db.from("books").select("*", { count: "exact", head: true }).eq("status", "draft"),
      db.from("books").select("*", { count: "exact", head: true }).eq("status", "archived"),
      db.from("books").select("*", { count: "exact", head: true }).eq("is_free", true),
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("posts")
        .select("id, title_en, title_bn, status, slug, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Log errors (safe: count queries never throw — count is null on error)
    for (const r of [totalPosts, publishedPosts, draftPosts, totalPages, totalBooks, publishedBooks, draftBooks, archivedBooks, freeBooks, totalUsers]) {
      if (r.error) console.error("[getDashboardStats] count error:", r.error.message);
    }

    return {
      posts: {
        total: totalPosts.count ?? 0,
        published: publishedPosts.count ?? 0,
        draft: draftPosts.count ?? 0,
      },
      pages: { total: totalPages.count ?? 0 },
      books: {
        total: totalBooks.count ?? 0,
        published: publishedBooks.count ?? 0,
        draft: draftBooks.count ?? 0,
        archived: archivedBooks.count ?? 0,
        free: freeBooks.count ?? 0,
      },
      users: { total: totalUsers.count ?? 0 },
      recentPosts: (recentPosts.data ?? []) as DashboardStats["recentPosts"],
    };
  });

/* ── Audit log helper ─────────────────────────────────────────── */

interface AuditLogEntry {
  actor_id: string;
  action: string;
  target_user_id?: string | null;
  details?: Record<string, Json>;
}

async function logAuditEvent(entry: AuditLogEntry) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      actor_id: entry.actor_id,
      action: entry.action,
      target_user_id: entry.target_user_id ?? null,
      details: (entry.details ?? {}) as Json,
    });
  } catch {
    // Audit logging is non-critical — never throw or break the main action
    console.error("[audit] Failed to log event:", entry.action);
  }
}

/* ── Audit log types ──────────────────────────────────────────── */

export type AuditLogRow = {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, Json>;
  created_at: string;
  actor_email?: string | null;
  actor_display_name?: string | null;
  target_email?: string | null;
  target_display_name?: string | null;
};

/** Fetch the audit log with pagination. Only accessible by super_admin. */
export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify caller is super_admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin"])
      .maybeSingle();
    if (!callerRole) {
      throw new Error("Only super admins can view the audit log");
    }

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    // Enrich with actor/target info
    const userIds = new Set<string>();
    (data ?? []).forEach((row) => {
      if (row.actor_id) userIds.add(row.actor_id);
      if (row.target_user_id) userIds.add(row.target_user_id);
    });

    const userMap: Record<string, { email: string | null; display_name: string | null }> = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", Array.from(userIds));
      if (profiles) {
        for (const p of profiles) {
          userMap[p.user_id] = { email: p.email ?? null, display_name: p.display_name ?? null };
        }
      }
    }

    const enriched: AuditLogRow[] = (data ?? []).map((r: Record<string, unknown>) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        actor_id: row.actor_id as string,
        action: row.action as string,
        target_user_id: (row.target_user_id as string | null) ?? null,
        details: (row.details ?? {}) as Record<string, Json>,
        created_at: row.created_at as string,
        actor_email: userMap[row.actor_id as string]?.email ?? null,
        actor_display_name: userMap[row.actor_id as string]?.display_name ?? null,
        target_email: row.target_user_id
          ? userMap[row.target_user_id as string]?.email ?? null
          : null,
        target_display_name: row.target_user_id
          ? userMap[row.target_user_id as string]?.display_name ?? null
          : null,
      } as AuditLogRow;
    });

    return enriched;
  });

/** Check if the current user has admin or super_admin role. */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    return { isAdmin: !!data, role: (data?.role as string | null) ?? null };
  });

export type UserRoleRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
};

/** Get all users with their roles. Only accessible by admin/super_admin (enforced server-side via RPC). */
export const getUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("get_user_roles", { _admin_id: userId });
    if (error) throw new Error(error.message);
    return (data ?? []) as UserRoleRow[];
  });

export interface SetRoleResult {
  ok: boolean;
  error?: string;
  role?: string;
}

/** Set a user's role. Permission checks enforced server-side by the RPC function. */
export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { targetUserId: string; newRole: string };
    const { data: result, error } = await supabase.rpc("set_user_role", {
      _admin_id: userId,
      _target_user_id: input.targetUserId,
      _new_role: input.newRole,
    });
    if (error) throw new Error(error.message);
    const res = (result ?? { ok: true }) as unknown as SetRoleResult;

    // Audit log
    if (res.ok) {
      logAuditEvent({
        actor_id: userId,
        action: "role_changed",
        target_user_id: input.targetUserId,
        details: { new_role: input.newRole },
      });
    }

    return res;
  });

export interface InviteUserResult {
  ok: boolean;
  error?: string;
  userId?: string;
}

/** Invite a new user by email. Sends an invitation email via Supabase Auth,
 *  creates the user, and assigns a default role. Only accessible by admin/super_admin. */
export const inviteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { email: string; role: string; displayName?: string };

    const email = input.email?.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    // Only admin/super_admin can invite
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!callerRole) throw new Error("Only admins can invite users");

    // Send invitation email via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: input.displayName?.trim() || email.split("@")[0] },
    });

    if (inviteError) throw new Error(inviteError.message);
    if (!inviteData?.user?.id) throw new Error("Failed to invite user");

    const newUserId = inviteData.user.id;

    // Assign role
    const { error: roleError } = await supabase.rpc("set_user_role", {
      _admin_id: userId,
      _target_user_id: newUserId,
      _new_role: input.role || "user",
    });

    if (roleError) {
      // Clean up: delete the auth user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(roleError.message);
    }

    // Audit log
    logAuditEvent({
      actor_id: userId,
      action: "user_invited",
      target_user_id: newUserId,
      details: { email, role: input.role || "user" },
    });

    return { ok: true, userId: newUserId } as InviteUserResult;
  });

export interface DeleteUserResult {
  ok: boolean;
  error?: string;
}

/** Delete a user from the system. Removes them from auth.users and user_roles.
 *  Only accessible by admin/super_admin. Cannot delete yourself. */
export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { targetUserId: string };

    if (input.targetUserId === userId) {
      return { ok: false, error: "You cannot delete your own account." } as DeleteUserResult;
    }

    // Check caller is admin/super_admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!callerRole) {
      return { ok: false, error: "Only admins can delete users." } as DeleteUserResult;
    }

    // Get target info for audit before deleting
    const { data: targetInfo } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", input.targetUserId)
      .maybeSingle();
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", input.targetUserId)
      .maybeSingle();

    // Prevent deleting the last super_admin
    if (targetInfo?.role === "super_admin") {
      const { count } = await supabase
        .from("user_roles")
        .select("role", { count: "exact", head: true })
        .eq("role", "super_admin");
      if (count !== null && count <= 1) {
        return { ok: false, error: "Cannot delete the last super_admin." } as DeleteUserResult;
      }
    }

    // Delete from user_roles first (FK constraint safety)
    const { error: roleDeleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", input.targetUserId);
    if (roleDeleteError) {
      return { ok: false, error: roleDeleteError.message } as DeleteUserResult;
    }

    // Delete from auth via Admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(input.targetUserId);
    if (authDeleteError) {
      return { ok: false, error: authDeleteError.message } as DeleteUserResult;
    }

    // Audit log
    logAuditEvent({
      actor_id: userId,
      action: "user_deleted",
      target_user_id: input.targetUserId,
      details: {
        email: targetProfile?.email ?? null,
        display_name: targetProfile?.display_name ?? null,
        role: targetInfo?.role ?? null,
      },
    });

    return { ok: true } as DeleteUserResult;
  });

export interface BulkActionResult {
  ok: boolean;
  error?: string;
  succeeded: number;
  failed: number;
  errors: { userId: string; error: string }[];
}

/** Bulk set role for multiple users. Validates the caller is admin and applies the role to each user. */
export const bulkSetRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { targetUserIds: string[]; newRole: string };

    if (!input.targetUserIds?.length) {
      return { ok: false, error: "No users selected.", succeeded: 0, failed: 0, errors: [] } as BulkActionResult;
    }
    if (!input.newRole) {
      return { ok: false, error: "No role specified.", succeeded: 0, failed: 0, errors: [] } as BulkActionResult;
    }

    // Check caller has admin permissions
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!callerRole) {
      return { ok: false, error: "Only admins can change user roles.", succeeded: 0, failed: 0, errors: [] } as BulkActionResult;
    }

    const errors: { userId: string; error: string }[] = [];
    let succeeded = 0;

    for (const targetUserId of input.targetUserIds) {
      if (targetUserId === userId) {
        errors.push({ userId: targetUserId, error: "Cannot change your own role here. Use the inline editor." });
        continue;
      }
      const { data: result, error: rpcError } = await supabase.rpc("set_user_role", {
        _admin_id: userId,
        _target_user_id: targetUserId,
        _new_role: input.newRole,
      });
      if (rpcError) {
        errors.push({ userId: targetUserId, error: rpcError.message });
      } else {
        const res = (result ?? {}) as Record<string, unknown>;
        if (res.ok === true) {
          succeeded++;
        } else {
          errors.push({ userId: targetUserId, error: (res.error as string) || "Failed" });
        }
      }
    }

    // Audit log (one entry for the bulk action)
    if (succeeded > 0) {
      logAuditEvent({
        actor_id: userId,
        action: "bulk_role_changed",
        details: {
          new_role: input.newRole,
          succeeded_count: succeeded,
          failed_count: errors.length,
          target_user_ids: input.targetUserIds,
        },
      });
    }

    return {
      ok: errors.length === 0 || succeeded > 0,
      succeeded,
      failed: errors.length,
      errors,
    } as BulkActionResult;
  });

/** Bulk delete multiple users. Validates each user (not self, not last super_admin) before deleting. */
export const bulkDeleteUsersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }; data: unknown }) => {
    const { supabase, userId } = context;
    const input = data as { targetUserIds: string[] };

    if (!input.targetUserIds?.length) {
      return { ok: false, error: "No users selected.", succeeded: 0, failed: 0, errors: [] } as BulkActionResult;
    }

    // Check caller is admin/super_admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!callerRole) {
      return { ok: false, error: "Only admins can delete users.", succeeded: 0, failed: 0, errors: [] } as BulkActionResult;
    }

    // Pre-validate: check self-delete and super_admin constraints
    const errors: { userId: string; error: string }[] = [];
    const validIds: string[] = [];

    for (const targetUserId of input.targetUserIds) {
      if (targetUserId === userId) {
        errors.push({ userId: targetUserId, error: "Cannot delete yourself." });
        continue;
      }

      const { data: targetRoleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (targetRoleData?.role === "super_admin") {
        const { count } = await supabase
          .from("user_roles")
          .select("role", { count: "exact", head: true })
          .eq("role", "super_admin");
        const othersInSelection = input.targetUserIds.filter(
          (id) => id !== targetUserId
        ).length;
        if (count !== null && count - othersInSelection <= 1) {
          errors.push({ userId: targetUserId, error: "Cannot delete the last super_admin." });
          continue;
        }
      }

      validIds.push(targetUserId);
    }

    // Process deletions in sequence for safety
    let succeeded = 0;
    for (const targetUserId of validIds) {
      const { error: roleDeleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (roleDeleteError) {
        errors.push({ userId: targetUserId, error: roleDeleteError.message });
        continue;
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authDeleteError) {
        errors.push({ userId: targetUserId, error: authDeleteError.message });
        continue;
      }

      succeeded++;
    }

    // Audit log (one entry for the bulk action)
    if (succeeded > 0) {
      logAuditEvent({
        actor_id: userId,
        action: "bulk_users_deleted",
        details: {
          succeeded_count: succeeded,
          failed_count: errors.length,
          target_user_ids: validIds,
        },
      });
    }

    return {
      ok: errors.length === 0 || succeeded > 0,
      succeeded,
      failed: errors.length,
      errors,
    } as BulkActionResult;
  });
