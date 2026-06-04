import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SiteAssetUploadInput = z.object({
  kind: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  filename: z.string().min(1).max(180),
  contentType: z.string().min(1).max(120).regex(/^image\//),
});

const extensionFrom = (filename: string, contentType: string) => {
  const fromName = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  const subtype = contentType.split("/")[1]?.split(";")[0]?.replace(/[^a-z0-9]/g, "");
  return subtype || "png";
};

export const createSiteAssetUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SiteAssetUploadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!role) throw new Error("Only admins can upload site assets.");

    const ext = extensionFrom(data.filename, data.contentType);
    const path = `${data.kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await supabase.storage
      .from("site-assets")
      .createSignedUploadUrl(path);

    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
    return { path, token: signed.token, publicUrl: pub.publicUrl };
  });
