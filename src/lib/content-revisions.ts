import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { supabase } from "@/integrations/supabase/client";

export interface ContentRevision {
  id: string;
  content_type: string;
  content_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  changes: string[];
  summary: string;
  changed_by: string | null;
  version: number;
  created_at: string;
}

export interface ContentAuditEntry {
  id: string;
  content_type: string;
  content_id: string;
  action: string;
  actor_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  created_at: string;
}

const db = supabase as any;

/** Create a new revision for content */
export async function createRevision(params: {
  contentType: string;
  contentId: string;
  data: Record<string, unknown>;
  changes: string[];
  summary: string;
  changedBy: string;
}): Promise<ContentRevision | null> {
  try {
    // Get the latest version number
    const { data: latest } = await db
      .from("content_revisions")
      .select("version")
      .eq("content_type", params.contentType)
      .eq("content_id", params.contentId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latest?.version || 0) + 1;

    const { data, error } = await db
      .from("content_revisions")
      .insert({
        content_type: params.contentType,
        content_id: params.contentId,
        data: params.data,
        changes: params.changes,
        summary: params.summary,
        changed_by: params.changedBy,
        version: nextVersion,
      })
      .select()
      .single();

    if (error) {
      console.error("[content-revisions] Failed to create revision:", error);
      return null;
    }
    return data as ContentRevision;
  } catch (err) {
    console.error("[content-revisions] Error creating revision:", err);
    return null;
  }
}

/** Log a content audit event */
export async function logContentAudit(params: {
  contentType: string;
  contentId: string;
  action: string;
  actorId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.from("content_audit_log").insert({
      content_type: params.contentType,
      content_id: params.contentId,
      action: params.action,
      actor_id: params.actorId,
      details: params.details || {},
    });
  } catch (err) {
    console.error("[content-audit] Failed to log event:", err);
  }
}

/** Fetch revisions for content (admin) */
export const fetchRevisions = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { contentType, contentId } = data;
    const { data: revisions, error } = await db
      .from("content_revisions")
      .select("*")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("version", { ascending: false });
    if (error) throw error;
    return revisions as ContentRevision[];
  });

/** Fetch content audit log (admin) */
export const fetchContentAuditLog = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { contentType, contentId, limit } = data || {};
    let query = db.from("content_audit_log").select("*").order("created_at", { ascending: false });
    if (contentType) query = query.eq("content_type", contentType);
    if (contentId) query = query.eq("content_id", contentId);
    if (limit) query = query.limit(limit);
    else query = query.limit(50);

    const { data: entries, error } = await query;
    if (error) throw error;
    return entries as ContentAuditEntry[];
  });

/** Get comment moderation stats (admin) */
export const getCommentModerationStats = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const [totalResult, pendingResult, rejectedResult, spamResult] = await Promise.all([
      db.from("comments").select("*", { count: "exact", head: true }),
      db.from("comments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("comments").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      db.from("comments").select("*", { count: "exact", head: true }).eq("status", "spam"),
    ]);

    return {
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      rejected: rejectedResult.count || 0,
      spam: spamResult.count || 0,
    };
  });

/** Moderate a comment (admin) */
export const moderateComment = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { id, status } = data;
    if (!["pending", "approved", "rejected", "spam"].includes(status)) {
      throw new Error("Invalid status");
    }
    const { error } = await db
      .from("comments")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  });
