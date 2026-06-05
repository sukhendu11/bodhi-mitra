import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  fetchMediaAssets,
  deleteMediaAsset,
  trackUpload,
  getMediaStats,
  type MediaAsset,
} from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { useR2Upload } from "@/hooks/useR2Upload";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/media")({
  component: MediaLibraryPage,
});

const BUCKETS: { value: string; label: string; icon: typeof Image }[] = [
  { value: "blog-images", label: "Blog Images", icon: Image },
  { value: "site-assets", label: "Site Assets", icon: FileText },
  { value: "book-covers", label: "Book Covers", icon: Image },
  { value: "avatars", label: "Avatars", icon: Image },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const { uploadToR2 } = useR2Upload();
  const pageSize = 24;

  const { data, isLoading } = useQuery({
    queryKey: ["media-assets", page, bucket, search],
    queryFn: () =>
      fetchMediaAssets(page, pageSize, {
        bucket: bucket || undefined,
        search: search || undefined,
      }),
    staleTime: 10_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
    staleTime: 30_000,
  });

  const assets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const delMutation = useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      toast.success("Asset deleted");
      setSelectedAsset(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const targetBucket = bucket || "blog-images";
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        // Try R2 first
        const r2Result = await uploadToR2(`media/${targetBucket}`, file);
        if (r2Result) {
          await trackUpload({
            url: r2Result.url,
            path: r2Result.key,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            bucket: targetBucket,
            storageProvider: "r2",
          });
          successCount++;
          continue;
        }

        // Fallback to Supabase Storage
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(targetBucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        const { data: pubData } = supabase.storage.from(targetBucket).getPublicUrl(path);

        await trackUpload({
          url: pubData.publicUrl,
          path,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          bucket: targetBucket,
          storageProvider: "supabase",
        });

        successCount++;
      } catch (err) {
        console.error("[media] Upload failed:", file.name, err);
        toast.error(`Upload failed: ${file.name}`);
      }
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Bucket filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setBucket("")}
            className={`px-3 py-1.5 text-[0.55rem] font-medium rounded-lg border transition-colors ${
              !bucket ? "bg-foreground/5 text-foreground border-foreground/20" : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            }`}
          >
            All Buckets
          </button>
          {BUCKETS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBucket(b.value)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-[0.55rem] font-medium rounded-lg border transition-colors ${
                bucket === b.value ? "bg-foreground/5 text-foreground border-foreground/20" : "text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
              }`}
            >
              <b.icon className="h-3 w-3" />
              {b.label}
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

      {/* Grid/List view */}
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
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden cursor-pointer hover:border-foreground/30 hover:shadow-sm transition-all"
            >
              <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center overflow-hidden">
                {asset.mime_type.startsWith("image/") ? (
                  <img src={asset.url} alt={asset.alt_text || asset.filename} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                    <FileText className="h-8 w-8" />
                    <span className="text-[0.5rem] uppercase">{asset.mime_type.split("/")[1]}</span>
                  </div>
                )}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(asset.url); }}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground shadow-sm" title="Copy URL">
                  <Copy className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this asset?")) delMutation.mutate(asset.id); }}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-destructive/70 hover:text-destructive shadow-sm" title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[0.6rem] font-medium truncate">{asset.filename}</p>
                <p className="text-[0.5rem] text-muted-foreground mt-0.5">
                  {formatFileSize(asset.file_size)} · {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedAsset(asset)}>
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                {asset.mime_type.startsWith("image/") ? (
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
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${asset.filename}"?`)) delMutation.mutate(asset.id); }}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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

      {/* Detail sidebar */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-border/60 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <h3 className="text-sm font-semibold truncate">{selectedAsset.filename}</h3>
              <button onClick={() => setSelectedAsset(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">&times;</button>
            </div>
            <div className="px-6 py-5">
              {selectedAsset.mime_type.startsWith("image/") ? (
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
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => handleCopyUrl(selectedAsset.url)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </button>
                <a href={selectedAsset.url} target="_blank" rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
                <button onClick={() => { if (confirm(`Delete "${selectedAsset.filename}"?`)) delMutation.mutate(selectedAsset.id); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors ml-auto">
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
