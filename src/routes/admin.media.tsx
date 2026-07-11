import { createFileRoute } from "@tanstack/react-router";
import { useList, useCreate, useDelete, useUpdate } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getMediaStats, type MediaAsset } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { UppyUploader, type UploadResult } from "@/components/admin/uppy-uploader";
import { MEDIA_BUCKETS, formatFileSize } from "@/components/admin/media-engine";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/media")({
  component: MediaLibraryPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const FILE_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "application/pdf", label: "PDFs" },
] as const;

function MediaLibraryPage() {
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
  const pageSize = 24;

  /* ── List via Refine ───────────────────────────────────────────── */

  const { query, result } = useList<MediaAsset>({
    resource: "media_assets",
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: "created_at", order: "desc" }],
    filters: [
      ...(bucket ? [{ field: "bucket", operator: "eq" as const, value: bucket }] : []),
      ...(fileType ? [{ field: "mime_type", operator: "startswith" as const, value: fileType }] : []),
      ...(search ? [{ field: "q", operator: "eq" as const, value: search }] : []),
    ],
  });

  const assets = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = query?.isLoading ?? false;

  /* ── Stats (kept as-is, custom per-bucket query) ───────────────── */

  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
    staleTime: 30_000,
  });

  /* ── Delete via Refine ─────────────────────────────────────────── */

  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation?.isPending ?? false;

  const handleDelete = (asset: MediaAsset) => {
    if (!confirm(`Delete "${asset.filename}"?`)) return;
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
  };

  const handleBulkDelete = useCallback(() => {
    if (!confirmDeleteIds || confirmDeleteIds.size === 0) return;
    const ids = Array.from(confirmDeleteIds);
    // Delete from storage
    ids.forEach((id) => {
      const asset = assets.find((a) => a.id === id);
      if (asset) {
        supabase.storage.from(asset.bucket).remove([asset.path]).then(({ error: e }) => {
          if (e) console.warn("[media] Storage delete failed:", e.message);
        });
      }
    });
    // Delete from DB sequentially
    const deleteNext = (index: number) => {
      if (index >= ids.length) {
        toast.success(`${ids.length} asset(s) deleted`);
        setConfirmDeleteIds(null);
        setSelectedIds(new Set());
        return;
      }
      deleteMutate(
        { resource: "media_assets", id: ids[index] },
        {
          onSuccess: () => deleteNext(index + 1),
          onError: () => deleteNext(index + 1),
        },
      );
    };
    deleteNext(0);
  }, [confirmDeleteIds, assets, deleteMutate]);

  /* ── Replace via Refine ────────────────────────────────────────── */

  const { mutate: updateMutate } = useUpdate();

  const handleReplace = useCallback(
    async (asset: MediaAsset, file: File) => {
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const newPath = asset.path.replace(/\.\w+$/, `.${ext}`);
      const { error: uploadError } = await supabase.storage
        .from(asset.bucket)
        .upload(newPath, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) { toast.error(`Replace failed: ${uploadError.message}`); return; }
      const { data: pubData } = supabase.storage.from(asset.bucket).getPublicUrl(newPath);
      updateMutate(
        {
          resource: "media_assets",
          id: asset.id,
          values: { url: pubData.publicUrl, path: newPath, filename: file.name, file_size: file.size, mime_type: file.type },
        },
        {
          onSuccess: () => {
            toast.success(`Replaced: ${asset.filename}`);
            setShowReplaceFor(null);
          },
          onError: (e: any) => toast.error(e?.message ?? "Replace failed"),
        },
      );
    },
    [updateMutate],
  );

  /* ── Create via Refine ──────────────────────────────────────────── */

  const { mutate: createMutate } = useCreate();

  const handleUploadComplete = useCallback(
    (result: UploadResult) => {
      const values = {
        url: result.url,
        path: result.path,
        filename: result.name,
        file_size: result.size,
        mime_type: result.type,
        bucket: result.bucket,
      };
      createMutate(
        { resource: "media_assets", values },
        {
          onSuccess: () => toast.success(`Uploaded ${result.name}`),
          onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
        },
      );
    },
    [createMutate],
  );

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Media Library</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} assets across {stats?.length || 0} buckets
              {selectedIds.size > 0 && (
                <span className="ml-2 text-foreground font-medium">
                  · {selectedIds.size} selected
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Multi-select actions */}
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
              className={`p-1.5 rounded-md transition-colors ${
                view === "grid" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "list" ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
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
            allowedFileTypes={["image/*", ".pdf"]}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => { setBucket(""); setPage(1); }}
            className={`px-3 py-1.5 text-[0.55rem] font-medium rounded-lg border transition-colors ${
              !bucket ? "bg-foreground/5 text-foreground border-foreground/20" : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            }`}
          >
            All Buckets
          </button>
          {MEDIA_BUCKETS.map((b) => (
            <button
              key={b.value}
              onClick={() => { setBucket(b.value); setPage(1); }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-[0.55rem] font-medium rounded-lg border transition-colors ${
                bucket === b.value ? "bg-foreground/5 text-foreground border-foreground/20" : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
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
                fileType === f.value ? "bg-foreground/5 text-foreground border-foreground/20" : "text-muted-foreground border-border/60 hover:text-foreground"
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
            <p className="text-xs text-destructive">
              Delete {confirmDeleteIds.size} asset{confirmDeleteIds.size > 1 ? "s" : ""}? This cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDeleteIds(null)}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Loading / Empty / Content */}
      {isLoading ? (
        <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "space-y-2"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse ${view === "grid" ? "aspect-[4/3]" : "h-16"}`} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No assets match your search." : "No assets yet. Upload your first file."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <div
                key={asset.id}
                className={`group relative bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden cursor-pointer transition-all ${
                  isSelected
                    ? "border-foreground ring-2 ring-foreground/20"
                    : "border-border/60 hover:border-foreground/30 hover:shadow-sm"
                }`}
              >
                {/* Selection checkbox */}
                <div
                  className={`absolute top-2 left-2 z-10 rounded-md ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(asset.id)) next.delete(asset.id);
                      else next.add(asset.id);
                      return next;
                    });
                  }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-foreground border-foreground"
                      : "bg-background/80 border-white/80 hover:bg-background"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-background" />}
                  </div>
                </div>

                {/* Thumbnail — click opens detail panel */}
                <div onClick={() => setSelectedAsset(asset)} className="aspect-[4/3] bg-secondary/30 flex items-center justify-center overflow-hidden">
                  {asset.mime_type?.startsWith("image/") ? (
                    <img src={asset.url} alt={asset.alt_text || asset.filename} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                      <FileText className="h-8 w-8" />
                      <span className="text-[0.5rem] uppercase">{asset.mime_type?.split("/")[1]}</span>
                    </div>
                  )}
                </div>

                {/* Actions overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(asset.url); }}
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground shadow-sm" title="Copy URL">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowReplaceFor(asset); }}
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground shadow-sm" title="Replace">
                    <Replace className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-destructive/70 hover:text-destructive shadow-sm" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Info */}
                <div className="px-3 py-2.5">
                  <p className="text-[0.6rem] font-medium truncate">{asset.filename}</p>
                  <p className="text-[0.5rem] text-muted-foreground mt-0.5">
                    {formatFileSize(asset.file_size)} · {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
          {assets.map((asset) => (
            <div key={asset.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer ${
              selectedIds.has(asset.id) ? "bg-foreground/5" : ""
            }`} onClick={() => setSelectedAsset(asset)}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(asset.id)) next.delete(asset.id);
                    else next.add(asset.id);
                    return next;
                  });
                }}
                className="shrink-0"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedIds.has(asset.id)
                    ? "bg-foreground border-foreground"
                    : "border-border/60 hover:border-foreground/40"
                }`}>
                  {selectedIds.has(asset.id) && <Check className="h-2.5 w-2.5 text-background" />}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                {asset.mime_type?.startsWith("image/") ? (
                  <img src={asset.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{asset.filename}</p>
                <p className="text-[0.55rem] text-muted-foreground">{formatFileSize(asset.file_size)} · {asset.bucket}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(asset.url); }}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Copy URL">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a href={asset.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Open">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={(e) => { e.stopPropagation(); setShowReplaceFor(asset); }}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Replace">
                  <Replace className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">← Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">Next →</button>
          </div>
        </div>
      )}

      {/* Replace modal */}
      {showReplaceFor && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowReplaceFor(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Replace File</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Upload a new version of <span className="font-medium text-foreground">{showReplaceFor.filename}</span>. The URL will be updated.
            </p>
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-lg border-2 border-dashed border-border/60 hover:border-foreground/30 hover:bg-secondary/20 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">Click to choose a replacement file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReplace(showReplaceFor, file);
                }}
              />
            </label>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowReplaceFor(null)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-border/60 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <h3 className="text-sm font-semibold truncate">{selectedAsset.filename}</h3>
              <button onClick={() => setSelectedAsset(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">&times;</button>
            </div>
            <div className="px-6 py-5">
              {selectedAsset.mime_type?.startsWith("image/") ? (
                <img src={selectedAsset.url} alt={selectedAsset.alt_text || selectedAsset.filename}
                  className="w-full aspect-video object-cover rounded-lg border border-border/60" />
              ) : (
                <div className="w-full aspect-video rounded-lg border border-border/60 bg-secondary/30 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="px-6 pb-6 space-y-4">
              <DetailRow label="Filename" value={selectedAsset.filename} />
              <DetailRow label="File Size" value={formatFileSize(selectedAsset.file_size)} />
              <DetailRow label="Type" value={selectedAsset.mime_type} />
              <DetailRow label="Bucket" value={selectedAsset.bucket} />
              <DetailRow label="Uploaded" value={formatDistanceToNow(new Date(selectedAsset.created_at), { addSuffix: true })} />
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button onClick={() => { setShowReplaceFor(selectedAsset); setSelectedAsset(null); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                  <Replace className="h-3.5 w-3.5" /> Replace
                </button>
                <button onClick={() => handleCopyUrl(selectedAsset.url)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </button>
                <a href={selectedAsset.url} target="_blank" rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
                <button onClick={() => handleDelete(selectedAsset)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
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
