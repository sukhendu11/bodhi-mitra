import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadFile,
  deleteFile,
  createPresignedUploadUrl,
  getR2Config,
  isR2Available,
} from "@/lib/r2";

/* ─── Helpers ──────────────────────────────────────────────────── */

function base64ToBuffer(base64: string): Buffer {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  return Buffer.from(raw, "base64");
}

function generateKey(prefix: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const safeName = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 60);
  return `${prefix}/${timestamp}-${random}-${safeName}.${ext}`;
}

/* ─── Check R2 availability ────────────────────────────────────── */

export const checkR2Available = createServerFn({ method: "GET" })
  .handler(async () => {
    return { available: await isR2Available() };
  });

/* ─── Upload small file via base64 (server uploads to R2) ──────── */

export const uploadAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    prefix: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    base64: z.string(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!role) throw new Error("Only admins can upload files.");

    const key = generateKey(data.prefix, data.filename);
    const buffer = base64ToBuffer(data.base64);
    const result = await uploadFile(key, buffer, data.contentType);
    return { key: result.key, url: result.url, publicUrl: result.publicUrl, size: result.size };
  });

/* ─── Get presigned URL for large file upload (client uploads directly to R2) ── */

export const getPresignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    prefix: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!role) throw new Error("Only admins can upload files.");

    const key = generateKey(data.prefix, data.filename);
    const presignedUrl = await createPresignedUploadUrl(key, data.contentType);
    const config = getR2Config();
    const publicUrl = config ? `${config.publicUrlBase}/${key}` : "";
    return { key, presignedUrl, publicUrl };
  });

/* ─── Delete file by key ────────────────────────────────────────── */

export const deleteAssetByKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!role) throw new Error("Only admins can delete files.");
    await deleteFile(data.key);
    return { deleted: true };
  });
