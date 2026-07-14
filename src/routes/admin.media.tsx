import { createFileRoute } from "@tanstack/react-router";
import { useList, useCreate, useDelete, useUpdate } from "@refinedev/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getMediaStats, type MediaAsset } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { UppyUploader, type UploadResult } from "@/components/admin/uppy-uploader";
import { MEDIA_BUCKETS, formatFileSize } from "@/components/admin/media-engine";
import { ErrorPage } from "@/components/error-page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getMediaFolders,
  createMediaFolder,
  deleteMediaFolder,
  renameAsset,
  moveAsset,
  duplicateAsset,
  updateAssetMetadata,
  getMediaTags,
  createMediaTag,
  getAssetTags,
  setAssetTags,
  toggleFavorite,
  getFavoriteIds,
  getAssetVersions,
  getAssetUsage,
  getUnusedAssets,
  type MediaFolder,
  type MediaTag,
  type MediaAssetVersion,
  type MediaUsage,
} from "@/lib/media-assets";
import {
  Image,
  Upload,
  Trash2,
  Search,
  FileText,
  Copy,
  ExternalLink,
  Grid3X3,
  List,
  Replace,
  Check,
  Loader2,
  Filter,
  FolderIcon,
  FolderPlus,
  Music,
  Video,
  FileType,
  Palette,
  Heart,
  Link2,
  AlertTriangle,
  Pencil,
  X,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Save,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/media")({
  component: MediaLibraryPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const FILE_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "application/pdf", label: "PDFs" },
  { value: "font", label: "Fonts" },
  { value: "image/svg", label: "SVGs" },
] as const;

function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState("");
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReplaceFor, setShowReplaceFor] = useState<MediaAsset | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<Set<string> | null>(null);

  // DAM-specific state
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);

  const pageSize = 24;

  /* ── Fetch folders ────────────────────────────────────────────── */
  const { data: folders = [] } = useQuery({
    queryKey: ["media-folders"],
    queryFn: () => (getMediaFolders as any)(),
  });

  /* ── Fetch tags ───────────────────────────────────────────────── */
  const { data: tags = [] } = useQuery({
    queryKey: ["media-tags"],
    queryFn: () => (getMediaTags as any)(),
  });

  /* ── Fetch favorite IDs (when filter active) ──────────────────── */
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["media-favorite-ids"],
    queryFn: () => (getFavoriteIds as any)(),
    enabled: favoritesOnly,
  });

  /* ── Unused assets count ──────────────────────────────────────── */
  const { data: unusedAssets = [] } = useQuery({
    queryKey: ["media-unused"],
    queryFn: () => (getUnusedAssets as any)(),
  });

  /* ── List via Refine ──────────────────────────────────────────── */
  const filters: any[] = [
    ...(bucket ? [{ field: "bucket", operator: "eq" as const, value: bucket }] : []),
    ...(fileType ? [{ field: "mime_type", operator: "startswith" as const, value: fileType }] : []),
    ...(search ? [{ field: "q", operator: "eq" as const, value: search }] : []),
    ...(currentFolderId ? [{ field: "folder_id", operator: "eq" as const, value: currentFolderId }] : []),
  ];

  if (favoritesOnly && favoriteIds.length > 0) {
    filters.push({ field: "id", operator: "in" as const, value: favoriteIds });
  }

  const { query, result } = useList<MediaAsset>({
    resource: "media_assets",
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: "created_at", order: "desc" }],
    filters,
    queryOptions: { enabled: !favoritesOnly || favoriteIds.length > 0 },
  });

  const assets = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = query?.isLoading ?? false;

  /* ── Stats ────────────────────────────────────────────────────── */
  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
    staleTime: 30_000,
  });

  /* ── Delete via Refine ────────────────────────────────────────── */
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation?.isPending ?? false;

  const handleDelete = (asset: MediaAsset) => {
    setDeleteTarget(asset);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const asset = deleteTarget;
    supabase.storage.from(asset.bucket).remove([asset.path]).then(({ error: storageError }) => {
      if (storageError) console.warn("[media] Storage delete failed:", storageError.message);
    });
    deleteMutate(
      { resource: "media_assets", id: asset.id },
      {
        onSuccess: () => {
          toast.success("Asset deleted");
          setSelectedAsset(null);
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(asset.id); return next; });
        },
        onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
      },
    );
    setDeleteTarget(null);
  };

  const handleBulkDelete = useCallback(() => {
    if (!confirmDeleteIds || confirmDeleteIds.size === 0) return;
    const ids = Array.from(confirmDeleteIds);
    ids.forEach((id) => {
      const asset = assets.find((a) => a.id === id);
      if (asset) {
        supabase.storage.from(asset.bucket).remove([asset.path]).then(({ error: e }) => {
          if (e) console.warn("[media] Storage delete failed:", e.message);
        });
      }
    });
    const deleteNext = (index: number) => {
      if (index >= ids.length) {
        toast.success(`${ids.length} asset(s) deleted`);
        setConfirmDeleteIds(null);
        setSelectedIds(new Set());
        return;
      }
      deleteMutate(
        { resource: "media_assets", id: ids[index] },
        { onSuccess: () => deleteNext(index + 1), onError: () => deleteNext(index + 1) },
      );
    };
    deleteNext(0);
  }, [confirmDeleteIds, assets, deleteMutate]);

  /* ── Replace via Refine ───────────────────────────────────────── */
  const { mutate: updateMutate } = useUpdate();

  const handleReplace = useCallback(
    async (asset: MediaAsset, file: File) => {
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const newPath = asset.path.replace(/\.\w+$/, `.${ext}`);
      const { error: uploadError } = await supabase.storage
        .from(asset.bucket).upload(newPath, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) { toast.error(`Replace failed: ${uploadError.message}`); return; }
      const { data: pubData } = supabase.storage.from(asset.bucket).getPublicUrl(newPath);
      updateMutate(
        {
          resource: "media_assets", id: asset.id,
          values: { url: pubData.publicUrl, path: newPath, filename: file.name, file_size: file.size, mime_type: file.type },
        },
        { onSuccess: () => { toast.success(`Replaced: ${asset.filename}`); setShowReplaceFor(null); }, onError: (e: any) => toast.error(e?.message ?? "Replace failed") },
      );
    },
    [updateMutate],
  );

  /* ── Create via Refine ────────────────────────────────────────── */
  const { mutate: createMutate } = useCreate();

  const handleUploadComplete = useCallback(
    (result: UploadResult) => {
      const values = {
        url: result.url, path: result.path, filename: result.name,
        file_size: result.size, mime_type: result.type, bucket: result.bucket,
        folder_id: currentFolderId,
      };
      createMutate(
        { resource: "media_assets", values },
        { onSuccess: () => toast.success(`Uploaded ${result.name}`), onError: (e: any) => toast.error(e?.message ?? "Upload failed") },
      );
    },
    [createMutate, currentFolderId],
  );

  /* ── Folder mutations ─────────────────────────────────────────── */
  const createFolderMut = useMutation<any, Error, string>({
    mutationFn: (name) => (createMediaFolder as any)({ data: { name, bucket: bucket || "blog-images" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-folders"] });
      toast.success("Folder created");
      setShowNewFolderInput(false);
      setNewFolderName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFolderMut = useMutation<any, Error, string>({
    mutationFn: (id) => (deleteMediaFolder as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-folders"] });
      setCurrentFolderId(null);
      toast.success("Folder deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Duplicate mutation ───────────────────────────────────────── */
  const duplicateMut = useMutation<any, Error, string>({
    mutationFn: (id) => (duplicateAsset as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
      toast.success("Asset duplicated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Rename state ─────────────────────────────────────────────── */
  const [renamingAsset, setRenamingAsset] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const renameMut = useMutation<any, Error, { id: string; filename: string }>({
    mutationFn: (params) =>
      (renameAsset as any)({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
      toast.success("Asset renamed");
      setRenamingAsset(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Move state ───────────────────────────────────────────────── */
  const [movingAsset, setMovingAsset] = useState<MediaAsset | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);

  const moveMut = useMutation<any, Error, { id: string; folder_id: string | null }>({
    mutationFn: (params) =>
      (moveAsset as any)({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
      toast.success("Asset moved");
      setMovingAsset(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Metadata edit ────────────────────────────────────────────── */
  const [editingMetadata, setEditingMetadata] = useState<{
    alt_text: string;
    caption: string;
    description: string;
  } | null>(null);

  const metadataMut = useMutation<any, Error, { id: string; alt_text?: string; caption?: string; description?: string }>({
    mutationFn: (params) =>
      (updateAssetMetadata as any)({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
      toast.success("Metadata updated");
      setEditingMetadata(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Tags for selected asset ──────────────────────────────────── */
  const { data: assetTags = [] } = useQuery({
    queryKey: ["asset-tags", selectedAsset?.id],
    queryFn: () => (getAssetTags as any)({ data: { asset_id: selectedAsset!.id } }),
    enabled: !!selectedAsset?.id,
  });

  const tagsMut = useMutation<any, Error, { asset_id: string; tag_ids: string[] }>({
    mutationFn: (params) =>
      (setAssetTags as any)({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-tags", selectedAsset?.id] });
      toast.success("Tags updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Favorite toggle ──────────────────────────────────────────── */
  const favMut = useMutation<any, Error, string>({
    mutationFn: (asset_id) => (toggleFavorite as any)({ data: { asset_id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-favorite-ids"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Versions for selected asset ──────────────────────────────── */
  const { data: versions = [] } = useQuery({
    queryKey: ["asset-versions", selectedAsset?.id],
    queryFn: () => (getAssetVersions as any)({ data: { asset_id: selectedAsset!.id } }),
    enabled: !!selectedAsset?.id,
  });

  /* ── Usage for selected asset ─────────────────────────────────── */
  const { data: usage = [] } = useQuery({
    queryKey: ["asset-usage", selectedAsset?.id],
    queryFn: () => (getAssetUsage as any)({ data: { asset_id: selectedAsset!.id } }),
    enabled: !!selectedAsset?.id,
  });

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  // Build folder tree
  const rootFolders = folders.filter((f: any) => !f.parent_id);
  const childFolders = (parentId: string) => folders.filter((f: any) => f.parent_id === parentId);

  return (
    <div className="flex gap-6 h-full">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      {showSidebar && (
        <div className="w-56 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Library</h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Bucket filters */}
          <div className="space-y-1">
            <button
              onClick={() => { setBucket(""); setPage(1); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                !bucket ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Image className="h-3.5 w-3.5" />
              All Assets
            </button>
            {MEDIA_BUCKETS.map((b) => (
              <button
                key={b.value}
                onClick={() => { setBucket(b.value); setPage(1); setCurrentFolderId(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  bucket === b.value ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <b.icon className="h-3.5 w-3.5" />
                {b.label}
              </button>
            ))}
          </div>

          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Folders</h3>
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="New Folder"
              >
                <FolderPlus className="h-3 w-3" />
              </button>
            </div>

            {showNewFolderInput && (
              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1 px-2 py-1 text-xs border border-border/60 rounded bg-background focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderName.trim()) createFolderMut.mutate(newFolderName.trim());
                    if (e.key === "Escape") { setShowNewFolderInput(false); setNewFolderName(""); }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => setCurrentFolderId(null)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                !currentFolderId ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <FolderIcon className="h-3.5 w-3.5" /> All Folders
            </button>            {rootFolders.map((folder: any) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                childFolders={childFolders}
                isActive={currentFolderId === folder.id}
                onSelect={setCurrentFolderId}
                onDelete={() => deleteFolderMut.mutate(folder.id)}
              />
            ))}
          </div>

          <div className="border-t border-border/40 pt-3 space-y-1">
            <button
              onClick={() => { setFavoritesOnly((v) => !v); setPage(1); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                favoritesOnly ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-red-400 text-red-400" : ""}`} />
              Favorites
            </button>

            {/* Tag filters */}
            {tags.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[0.5rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5 px-3">
                  Tags
                </h4>
                {tags.map((tag: any) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(tag.id)) next.delete(tag.id); else next.add(tag.id);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1 text-xs rounded-lg transition-colors ${
                      selectedTagIds.has(tag.id) ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-border/40 pt-2 mt-2">
              <button
                onClick={() => {
                  setFileType(""); setBucket(""); setCurrentFolderId(null);
                  setFavoritesOnly(false); setSelectedTagIds(new Set());
                  setSearch(""); setPage(1);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Clear Filters
              </button>
            </div>

            {/* Unused assets indicator */}
            {unusedAssets.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <button
                  onClick={() => toast.info(String(unusedAssets.length) + " unused asset(s) found (older than 24h)")}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[0.55rem] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {unusedAssets.length} unused
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <FolderIcon className="h-4 w-4" />
              </button>
            )}
            <Image className="h-5 w-5 text-muted-foreground/60" />
            <div>
              <h2 className="text-lg font-semibold">Media Library</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {total} assets · {stats?.length || 0} buckets
                {selectedIds.size > 0 && <span className="ml-2 text-foreground font-medium">· {selectedIds.size} selected</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => setConfirmDeleteIds(selectedIds)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <div className="flex items-center border border-border/60 rounded-lg p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowUploader((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-opacity ${
                showUploader ? "bg-foreground text-background" : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              {showUploader ? "Close" : "Upload"}
            </button>
          </div>
        </div>

        {showUploader && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-4">
            <UppyUploader
              bucket={bucket || "blog-images"}
              pathPrefix="media"
              onUploadComplete={handleUploadComplete}
              allowedFileTypes={["image/*", ".pdf", ".svg", "audio/*", "video/*", "font/*"]}
            />
          </div>
        )}

        {/* Bucket + file type filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {MEDIA_BUCKETS.filter((b) => !bucket || b.value === bucket).slice(0, 6).map((b) => (
              <button
                key={b.value}
                onClick={() => { setBucket(b.value === bucket ? "" : b.value); setPage(1); }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-[0.55rem] font-medium rounded-lg border transition-colors ${
                  bucket === b.value
                    ? "bg-foreground/5 text-foreground border-foreground/20"
                    : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
                }`}
              >
                <b.icon className="h-3 w-3" />
                {b.label}
              </button>
            ))}
          </div>
          {/* File type filter */}
          <div className="flex items-center gap-1 border-l border-border/40 pl-3 ml-1">
            <Filter className="h-3 w-3 text-muted-foreground/50" />
            {FILE_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFileType(f.value); setPage(1); }}
                className={`px-2 py-1 text-[0.5rem] font-medium rounded border transition-colors ${
                  fileType === f.value
                    ? "bg-foreground/5 text-foreground border-foreground/20"
                    : "text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search assets…"
              className="w-48 pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
        </div>

        {/* Bulk delete confirmation */}
        {confirmDeleteIds && confirmDeleteIds.size > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-4 w-4 text-destructive" />
              <p className="text-xs text-destructive">Delete {confirmDeleteIds.size} asset{confirmDeleteIds.size > 1 ? "s" : ""}? This cannot be undone.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmDeleteIds(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} disabled={isDeleting} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
                {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />} Delete
              </button>
            </div>
          </div>
        )}

        {/* Asset grid/list */}
        {isLoading ? (
          <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "space-y-2"}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse ${view === "grid" ? "aspect-[4/3]" : "h-16"}`} />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
            <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No assets match your search." : "No assets yet. Upload your first file."}</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <AssetGridCard
                key={asset.id}
                asset={asset}
                isSelected={selectedIds.has(asset.id)}
                isFavorited={favoriteIds.includes(asset.id)}
                onSelect={() => setSelectedAsset(asset)}
                onToggleSelect={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); return next; })}
                onCopyUrl={() => handleCopyUrl(asset.url)}
                onReplace={() => setShowReplaceFor(asset)}
                onDelete={() => handleDelete(asset)}
                onDuplicate={() => duplicateMut.mutate(asset.id)}
                onToggleFavorite={() => favMut.mutate(asset.id)}
                onRename={() => { setRenamingAsset(asset.id); setRenameValue(asset.filename); }}
                onMove={() => setMovingAsset(asset)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
            {assets.map((asset) => (
              <AssetListRow
                key={asset.id}
                asset={asset}
                isSelected={selectedIds.has(asset.id)}
                isFavorited={favoriteIds.includes(asset.id)}
                onSelect={() => setSelectedAsset(asset)}
                onToggleSelect={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(asset.id)) next.delete(asset.id); else next.add(asset.id); return next; })}
                onCopyUrl={() => handleCopyUrl(asset.url)}
                onReplace={() => setShowReplaceFor(asset)}
                onDelete={() => handleDelete(asset)}
                onDuplicate={() => duplicateMut.mutate(asset.id)}
                onToggleFavorite={() => favMut.mutate(asset.id)}
                onRename={() => { setRenamingAsset(asset.id); setRenameValue(asset.filename); }}
                onMove={() => setMovingAsset(asset)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">← Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Replace modal */}
      {showReplaceFor && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowReplaceFor(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Replace File</h3>
            <p className="text-xs text-muted-foreground mb-4">Upload a new version of <span className="font-medium text-foreground">{showReplaceFor.filename}</span>. The URL will be updated.</p>
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-lg border-2 border-dashed border-border/60 hover:border-foreground/30 hover:bg-secondary/20 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">Click to choose a replacement file</span>
              <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleReplace(showReplaceFor, file); }} />
            </label>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowReplaceFor(null)} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Move modal */}
      {movingAsset && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setMovingAsset(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Move File</h3>
            <p className="text-xs text-muted-foreground mb-4">Move <span className="font-medium text-foreground">{movingAsset.filename}</span> to a folder:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              <button onClick={() => setMoveTargetFolder(null)} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${!moveTargetFolder ? "bg-foreground/5 font-medium" : "hover:bg-secondary/40"}`}>
                (Root)
              </button>
              {folders.map((f: any) => (
                <button key={f.id} onClick={() => setMoveTargetFolder(f.id)} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${moveTargetFolder === f.id ? "bg-foreground/5 font-medium" : "hover:bg-secondary/40"}`}>
                  📁 {f.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMovingAsset(null)} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button
                onClick={() => moveMut.mutate({ id: movingAsset.id, folder_id: moveTargetFolder })}
                className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail/Editor Panel ──────────────────────────────────── */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => { setSelectedAsset(null); setEditingMetadata(null); }}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-border/60 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                {renamingAsset === selectedAsset.id ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="text-sm font-semibold border border-border/60 rounded px-2 py-1 w-48 bg-background focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renameValue.trim()) renameMut.mutate({ id: selectedAsset.id, filename: renameValue.trim() });
                        if (e.key === "Escape") setRenamingAsset(null);
                      }}
                      autoFocus
                    />
                    <button onClick={() => renameMut.mutate({ id: selectedAsset.id, filename: renameValue })} className="p-1 text-foreground"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setRenamingAsset(null)} className="p-1 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold truncate">{selectedAsset.filename}</h3>
                    <button onClick={() => { setRenamingAsset(selectedAsset.id); setRenameValue(selectedAsset.filename); }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => favMut.mutate(selectedAsset.id)}
                  className={`p-1.5 rounded-md transition-colors ${favoriteIds.includes(selectedAsset.id) ? "text-red-400" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${favoriteIds.includes(selectedAsset.id) ? "fill-red-400" : ""}`} />
                </button>
                <button onClick={() => { duplicateMut.mutate(selectedAsset.id); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setSelectedAsset(null); setEditingMetadata(null); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="px-6 py-5">
              <div className="w-full aspect-video rounded-lg border border-border/60 overflow-hidden bg-secondary/30 flex items-center justify-center">
                {selectedAsset.mime_type?.startsWith("image/") ? (
                  <img src={selectedAsset.url} alt={selectedAsset.alt_text || selectedAsset.filename} className="w-full h-full object-contain" />
                ) : selectedAsset.mime_type?.startsWith("video/") ? (
                  <video src={selectedAsset.url} controls className="w-full h-full object-contain" />
                ) : selectedAsset.mime_type?.startsWith("audio/") ? (
                  <div className="flex flex-col items-center gap-2 p-8">
                    <Music className="h-12 w-12 text-muted-foreground/30" />
                    <audio src={selectedAsset.url} controls className="w-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                    <FileText className="h-12 w-12" />
                    <span className="text-xs">{selectedAsset.mime_type}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata editor */}
            <div className="px-6 pb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Metadata</h4>
              {editingMetadata ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[0.55rem] font-medium text-muted-foreground">Alt Text</label>
                    <input
                      type="text" value={editingMetadata.alt_text}
                      onChange={(e) => setEditingMetadata({ ...editingMetadata, alt_text: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[0.55rem] font-medium text-muted-foreground">Caption</label>
                    <input
                      type="text" value={editingMetadata.caption}
                      onChange={(e) => setEditingMetadata({ ...editingMetadata, caption: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[0.55rem] font-medium text-muted-foreground">Description</label>
                    <textarea
                      value={editingMetadata.description}
                      onChange={(e) => setEditingMetadata({ ...editingMetadata, description: e.target.value })}
                      rows={3}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => metadataMut.mutate({ id: selectedAsset.id, ...editingMetadata })}
                      className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Save className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => setEditingMetadata(null)} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <DetailRow label="Alt Text" value={selectedAsset.alt_text || "—"} />
                  <DetailRow label="Caption" value={(selectedAsset as any).caption || "—"} />
                  <DetailRow label="Description" value={(selectedAsset as any).description || "—"} />
                  <button
                    onClick={() => setEditingMetadata({
                      alt_text: selectedAsset.alt_text || "",
                      caption: (selectedAsset as any).caption || "",
                      description: (selectedAsset as any).description || "",
                    })}
                    className="text-xs text-foreground/60 hover:text-foreground transition-colors mt-1"
                  >
                    ✏️ Edit metadata
                  </button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="px-6 pb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Tags</h4>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {assetTags.map((tag: any) => (
                  <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.5rem] rounded-full border border-border/60" style={{ borderColor: tag.color + "40", backgroundColor: tag.color + "15" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                ))}
              </div>
              <TagSelector
                allTags={tags}
                selectedIds={assetTags.map((t: any) => t.id)}
                onSave={(tag_ids) => tagsMut.mutate({ asset_id: selectedAsset.id, tag_ids })}
              />
            </div>

            {/* File info */}
            <div className="px-6 pb-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">File Info</h4>
              <DetailRow label="Filename" value={selectedAsset.filename} />
              <DetailRow label="File Size" value={formatFileSize(selectedAsset.file_size)} />
              <DetailRow label="Type" value={selectedAsset.mime_type} />
              <DetailRow label="Bucket" value={selectedAsset.bucket} />
              <DetailRow label="Uploaded" value={formatDistanceToNow(new Date(selectedAsset.created_at), { addSuffix: true })} />
            </div>

            {/* Usage */}
            {usage.length > 0 && (
              <div className="px-6 pb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">Used In</h4>
                <div className="space-y-1">
                  {usage.map((u: MediaUsage) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      {u.resource_type} · {u.resource_id.slice(0, 8)}
                      {u.field_name && <span className="text-[0.5rem] text-muted-foreground/60">({u.field_name})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Versions */}
            {versions.length > 0 && (
              <div className="px-6 pb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
                  Versions ({versions.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {versions.slice(0, 10).map((v: MediaAssetVersion) => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">v{v.version_number} · {formatFileSize(v.file_size)}</span>
                      <span className="text-[0.5rem] text-muted-foreground/60">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 pb-6 flex items-center gap-2 flex-wrap border-t border-border/60 pt-4">
              <button onClick={() => { setShowReplaceFor(selectedAsset); setSelectedAsset(null); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                <Replace className="h-3.5 w-3.5" /> Replace
              </button>
              <button onClick={() => handleCopyUrl(selectedAsset.url)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copy URL
              </button>
              <button onClick={() => { duplicateMut.mutate(selectedAsset.id); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button onClick={() => { setMovingAsset(selectedAsset); setSelectedAsset(null); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                <FolderIcon className="h-3.5 w-3.5" /> Move
              </button>
              <a href={selectedAsset.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
              <button onClick={() => handleDelete(selectedAsset)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.filename}&rdquo; from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FolderTreeItem({
  folder, childFolders, isActive, onSelect, onDelete,
}: {
  folder: MediaFolder;
  childFolders: (parentId: string) => MediaFolder[];
  isActive: boolean;
  onSelect: (id: string | null) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = childFolders(folder.id);

  return (
    <div>
      <div className="flex items-center group">
        {children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-muted-foreground/50 hover:text-foreground">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        {children.length === 0 && <div className="w-4" />}
        <button
          onClick={() => onSelect(folder.id)}
          className={`flex-1 flex items-center gap-2 px-2 py-1 text-xs rounded-lg transition-colors ${
            isActive ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <FolderIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive/60 hover:text-destructive transition-all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && children.length > 0 && (
        <div className="ml-4 border-l border-border/40 pl-2">
          {children.map((child) => (
            <FolderTreeItem key={child.id} folder={child} childFolders={childFolders} isActive={false} onSelect={onSelect} onDelete={() => onDelete()} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetGridCard({
  asset, isSelected, isFavorited, onSelect, onToggleSelect, onCopyUrl, onReplace, onDelete, onDuplicate, onToggleFavorite, onRename, onMove,
}: {
  asset: MediaAsset; isSelected: boolean; isFavorited: boolean;
  onSelect: () => void; onToggleSelect: () => void; onCopyUrl: () => void; onReplace: () => void;
  onDelete: () => void; onDuplicate: () => void; onToggleFavorite: () => void; onRename: () => void; onMove: () => void;
}) {
  return (
    <div className={`group relative bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-all ${isSelected ? "border-foreground ring-2 ring-foreground/20" : "border-border/60 hover:border-foreground/30 hover:shadow-sm"}`}>
      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 z-10 rounded-md ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-foreground border-foreground" : "bg-background/80 border-white/80 hover:bg-background"}`}>
          {isSelected && <Check className="h-3 w-3 text-background" />}
        </div>
      </div>

      {/* Favorite indicator */}
      {isFavorited && (
        <div className="absolute top-2 right-2 z-10">
          <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
        </div>
      )}

      {/* Thumbnail */}
      <div onClick={onSelect} className="aspect-[4/3] bg-secondary/30 flex items-center justify-center overflow-hidden">
        {asset.mime_type?.startsWith("image/") ? (
          <img src={asset.url} alt={asset.alt_text || asset.filename} className="w-full h-full object-cover" loading="lazy" />
        ) : asset.mime_type?.startsWith("video/") ? (
          <Video className="h-8 w-8 text-muted-foreground/50" />
        ) : asset.mime_type?.startsWith("audio/") ? (
          <Music className="h-8 w-8 text-muted-foreground/50" />
        ) : asset.mime_type?.includes("pdf") ? (
          <FileText className="h-8 w-8 text-muted-foreground/50" />
        ) : asset.mime_type?.includes("font") ? (
          <Palette className="h-8 w-8 text-muted-foreground/50" />
        ) : (
          <FileType className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className={`p-1.5 rounded-md bg-background/80 backdrop-blur-sm shadow-sm ${isFavorited ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`} title="Toggle Favorite">
          <Heart className={`h-3 w-3 ${isFavorited ? "fill-red-400" : ""}`} />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <p className="text-[0.6rem] font-medium truncate flex-1">{asset.filename}</p>
          <button onClick={onRename} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
            <Pencil className="h-2.5 w-2.5" />
          </button>
        </div>
        <p className="text-[0.5rem] text-muted-foreground mt-0.5">
          {formatFileSize(asset.file_size)} · {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function AssetListRow({
  asset, isSelected, isFavorited, onSelect, onToggleSelect, onCopyUrl, onReplace, onDelete, onDuplicate, onToggleFavorite, onRename, onMove,
}: {
  asset: MediaAsset; isSelected: boolean; isFavorited: boolean;
  onSelect: () => void; onToggleSelect: () => void; onCopyUrl: () => void; onReplace: () => void;
  onDelete: () => void; onDuplicate: () => void; onToggleFavorite: () => void; onRename: () => void; onMove: () => void;
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer ${isSelected ? "bg-foreground/5" : ""}`} onClick={onSelect}>
      <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} className="shrink-0">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-foreground border-foreground" : "border-border/60 hover:border-foreground/40"}`}>
          {isSelected && <Check className="h-2.5 w-2.5 text-background" />}
        </div>
      </div>
      <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
        {asset.mime_type?.startsWith("image/") ? (
          <img src={asset.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : asset.mime_type?.startsWith("video/") ? (
          <Video className="h-4 w-4 text-muted-foreground/50" />
        ) : asset.mime_type?.startsWith("audio/") ? (
          <Music className="h-4 w-4 text-muted-foreground/50" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium truncate">{asset.filename}</p>
          {isFavorited && <Heart className="h-2.5 w-2.5 fill-red-400 text-red-400 shrink-0" />}
        </div>
        <p className="text-[0.55rem] text-muted-foreground">{formatFileSize(asset.file_size)} · {asset.bucket}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onCopyUrl(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Copy URL"><Copy className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Rename"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMove(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Move"><FolderIcon className="h-3.5 w-3.5" /></button>
        <a href={asset.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
        <button onClick={(e) => { e.stopPropagation(); onReplace(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Replace"><Replace className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function TagSelector({ allTags, selectedIds, onSave }: { allTags: MediaTag[]; selectedIds: string[]; onSave: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => { setLocalSelected(new Set(selectedIds)); }, [selectedIds]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-xs text-foreground/60 hover:text-foreground transition-colors">
        {open ? "Close" : "Select tags..."}
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 bg-white dark:bg-zinc-800 border border-border/60 rounded-lg shadow-lg p-2 min-w-[160px]">
          {allTags.map((tag) => {
            const isChecked = localSelected.has(tag.id);
            return (
              <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-secondary/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setLocalSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(tag.id)) next.delete(tag.id); else next.add(tag.id);
                      return next;
                    });
                  }}
                  className="rounded border-border/60"
                />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </label>
            );
          })}
          <button
            onClick={() => { onSave(Array.from(localSelected)); setOpen(false); }}
            className="w-full mt-1 px-2 py-1 text-xs font-medium bg-foreground text-background rounded hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[0.55rem] font-medium text-muted-foreground uppercase tracking-[0.05em] shrink-0">{label}</span>
      <span className="text-xs text-right break-all">{value}</span>
    </div>
  );
}
