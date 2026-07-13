import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";

// ============================================================================
// Types
// ============================================================================

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  bucket: string;
  path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface MediaAssetVersion {
  id: string;
  asset_id: string;
  url: string;
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  version_number: number;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MediaUsage {
  id: string;
  asset_id: string;
  resource_type: string;
  resource_id: string;
  field_name: string | null;
  created_at: string;
}

// ============================================================================
// Folder CRUD
// ============================================================================

export const createMediaFolder = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { name, parent_id, bucket } = data as {
      name: string;
      parent_id?: string | null;
      bucket?: string;
    };

    const { data: result, error } = await supabase
      .from("media_folders")
      .insert({
        name,
        parent_id: parent_id || null,
        bucket: bucket || "blog-images",
        created_by: context.user?.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create folder: ${error.message}`);
    return result;
  });

export const updateMediaFolder = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, ...updates } = data as {
      id: string;
      name?: string;
      parent_id?: string | null;
      sort_order?: number;
    };

    const { data: result, error } = await supabase
      .from("media_folders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update folder: ${error.message}`);
    return result;
  });

export const deleteMediaFolder = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };

    // Move all assets in this folder to root
    await supabase.from("media_assets").update({ folder_id: null }).eq("folder_id", id);

    // Move child folders up one level
    const parent = await supabase
      .from("media_folders")
      .select("parent_id")
      .eq("id", id)
      .single();
    const parentId = parent.data?.parent_id || null;
    await supabase.from("media_folders").update({ parent_id: parentId }).eq("parent_id", id);

    const { error } = await supabase.from("media_folders").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete folder: ${error.message}`);
    return { success: true };
  });

export const getMediaFolders = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("media_folders")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to fetch folders: ${error.message}`);
    return (data || []) as MediaFolder[];
  });

// ============================================================================
// Asset Actions
// ============================================================================

export const renameAsset = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, filename } = data as { id: string; filename: string };

    const { data: result, error } = await supabase
      .from("media_assets")
      .update({ filename })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to rename asset: ${error.message}`);
    return result;
  });

export const moveAsset = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, folder_id, bucket } = data as {
      id: string;
      folder_id?: string | null;
      bucket?: string;
    };

    const updates: Record<string, unknown> = {};
    if (folder_id !== undefined) updates.folder_id = folder_id;
    if (bucket !== undefined) updates.bucket = bucket;

    const { data: result, error } = await supabase
      .from("media_assets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to move asset: ${error.message}`);
    return result;
  });

export const duplicateAsset = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };

    // Fetch original
    const { data: original, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !original) throw new Error("Asset not found");

    // Generate new path
    const ext = original.filename.split(".").pop() || "bin";
    const baseName = original.filename.replace(`.${ext}`, "");
    const newFilename = `${baseName} (Copy).${ext}`;

    // Copy storage object
    const { error: copyError } = await supabase.storage
      .from(original.bucket)
      .copy(original.path, `${original.path.replace(/\.[^.]+$/, "")}-copy.${ext}`);

    if (copyError) throw new Error(`Failed to copy file: ${copyError.message}`);

    const newPath = `${original.path.replace(/\.[^.]+$/, "")}-copy.${ext}`;
    const { data: pubData } = supabase.storage.from(original.bucket).getPublicUrl(newPath);

    // Insert new record
    const { data: result, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        url: pubData.publicUrl,
        path: newPath,
        filename: newFilename,
        file_size: original.file_size,
        mime_type: original.mime_type,
        bucket: original.bucket,
        folder_id: original.folder_id,
        alt_text: original.alt_text,
        caption: original.caption,
        description: original.description,
        is_private: original.is_private,
        uploaded_by: context.user?.id,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to duplicate asset: ${insertError.message}`);
    return result;
  });

export const updateAssetMetadata = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, ...metadata } = data as {
      id: string;
      alt_text?: string | null;
      caption?: string | null;
      description?: string | null;
      is_private?: boolean;
    };

    const { data: result, error } = await supabase
      .from("media_assets")
      .update(metadata)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update metadata: ${error.message}`);
    return result;
  });

// ============================================================================
// Tags
// ============================================================================

export const getMediaTags = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("media_tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to fetch tags: ${error.message}`);
    return (data || []) as MediaTag[];
  });

export const createMediaTag = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { name, color } = data as { name: string; color?: string };
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: result, error } = await supabase
      .from("media_tags")
      .insert({ name, slug, color: color || "#6b7280" })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tag: ${error.message}`);
    return result;
  });

export const deleteMediaTag = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };
    const { error } = await supabase.from("media_tags").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete tag: ${error.message}`);
    return { success: true };
  });

export const setAssetTags = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { asset_id, tag_ids } = data as { asset_id: string; tag_ids: string[] };

    // Remove existing tags
    await supabase.from("media_asset_tags").delete().eq("asset_id", asset_id);

    // Insert new tags
    if (tag_ids.length > 0) {
      const inserts = tag_ids.map((tag_id) => ({ asset_id, tag_id }));
      const { error } = await supabase.from("media_asset_tags").insert(inserts);
      if (error) throw new Error(`Failed to set tags: ${error.message}`);
    }

    return { success: true };
  });

export const getAssetTags = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data: input }: any) => {
    const { supabase } = context;
    const { asset_id } = input as { asset_id: string };

    const { data: tagRows, error } = await supabase
      .from("media_asset_tags")
      .select("tag_id, media_tags(*)")
      .eq("asset_id", asset_id);

    if (error) throw new Error(`Failed to fetch asset tags: ${error.message}`);
    return (tagRows || []).map((row: any) => row.media_tags).filter(Boolean);
  });

// ============================================================================
// Favorites
// ============================================================================

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data: input }: any) => {
    const { supabase } = context;
    const { asset_id } = input as { asset_id: string };
    const user_id = context.user?.id;

    // Check if already favorited
    const { data: existing } = await supabase
      .from("media_favorites")
      .select("asset_id")
      .eq("user_id", user_id)
      .eq("asset_id", asset_id)
      .maybeSingle();

    if (existing) {
      const { error: deleteError } = await supabase
        .from("media_favorites")
        .delete()
        .eq("user_id", user_id)
        .eq("asset_id", asset_id);
      if (deleteError) throw new Error(`Failed to remove favorite: ${deleteError.message}`);
      return { favorited: false };
    } else {
      const { error: insertError } = await supabase
        .from("media_favorites")
        .insert({ user_id, asset_id });
      if (insertError) throw new Error(`Failed to add favorite: ${insertError.message}`);
      return { favorited: true };
    }
  });

export const getFavoriteIds = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const user_id = context.user?.id;

    const { data, error } = await supabase
      .from("media_favorites")
      .select("asset_id")
      .eq("user_id", user_id);

    if (error) throw new Error(`Failed to fetch favorites: ${error.message}`);
    return (data || []).map((row: any) => row.asset_id);
  });

// ============================================================================
// Versions
// ============================================================================

export const getAssetVersions = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data: input }: any) => {
    const { supabase } = context;
    const { asset_id } = input as { asset_id: string };

    const { data: versions, error } = await supabase
      .from("media_asset_versions")
      .select("*")
      .eq("asset_id", asset_id)
      .order("version_number", { ascending: false });

    if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
    return (versions || []) as MediaAssetVersion[];
  });

export const restoreAssetVersion = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data: input }: any) => {
    const { supabase } = context;
    const { version_id } = input as { version_id: string };

    // Fetch version
    const { data: version, error: fetchError } = await supabase
      .from("media_asset_versions")
      .select("*")
      .eq("id", version_id)
      .single();

    if (fetchError || !version) throw new Error("Version not found");

    // Update asset to version's state
    const { data: result, error: updateError } = await supabase
      .from("media_assets")
      .update({
        url: version.url,
        path: version.path,
        filename: version.filename,
        file_size: version.file_size,
        mime_type: version.mime_type,
        width: version.width,
        height: version.height,
      })
      .eq("id", version.asset_id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to restore version: ${updateError.message}`);
    return result;
  });

// ============================================================================
// Usage Tracking
// ============================================================================

export const recordMediaUsage = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { asset_id, resource_type, resource_id, field_name } = data as {
      asset_id: string;
      resource_type: string;
      resource_id: string;
      field_name?: string;
    };

    const { error } = await supabase.from("media_usage").upsert(
      { asset_id, resource_type, resource_id, field_name: field_name || null },
      { onConflict: "asset_id,resource_type,resource_id,field_name" },
    );

    if (error) throw new Error(`Failed to record usage: ${error.message}`);
    return { success: true };
  });

export const removeMediaUsage = createServerFn({ method: "POST" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { asset_id, resource_type, resource_id } = data as {
      asset_id: string;
      resource_type: string;
      resource_id: string;
    };

    const { error } = await supabase
      .from("media_usage")
      .delete()
      .eq("asset_id", asset_id)
      .eq("resource_type", resource_type)
      .eq("resource_id", resource_id);

    if (error) throw new Error(`Failed to remove usage: ${error.message}`);
    return { success: true };
  });

export const getAssetUsage = createServerFn({ method: "GET" })
  .middleware([requireMinRole("editor")])
  .handler(async ({ context, data: input }: any) => {
    const { supabase } = context;
    const { asset_id } = input as { asset_id: string };

    const { data: usage, error } = await supabase
      .from("media_usage")
      .select("*")
      .eq("asset_id", asset_id);

    if (error) throw new Error(`Failed to fetch usage: ${error.message}`);
    return (usage || []) as MediaUsage[];
  });

export const getUnusedAssets = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;

    // Fetch all used asset IDs first, then filter unused ones
    const { data: usedRecords } = await supabase
      .from("media_usage")
      .select("asset_id");

    const usedIds = new Set((usedRecords || []).map((r: any) => r.asset_id));
    const cutoffDate = new Date(Date.now() - 86400000).toISOString();

    const { data, error } = await supabase
      .from("media_assets")
      .select("id, filename, file_size, mime_type, bucket, created_at")
      .lt("created_at", cutoffDate)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch unused assets: ${error.message}`);

    // Filter out used assets in memory
    const unused = (data || []).filter((a: any) => !usedIds.has(a.id));
    return unused;
  });
