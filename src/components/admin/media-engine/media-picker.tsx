import { useState, useCallback, useEffect, useRef } from "react";
import { useList, useCreate } from "@refinedev/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UppyUploader, type UploadResult } from "@/components/admin/uppy-uploader";
import { MEDIA_BUCKETS, formatFileSize } from "./types";
import type { MediaPickerResult, MediaPickerOptions } from "./types";
import type { MediaAsset } from "@/lib/media";
import {
  Image,
  Search,
  FileText,
  Upload,
  X,
  Check,
  Loader2,
} from "lucide-react";

/* ─── Props ──────────────────────────────────────────────────────── */

interface MediaPickerProps {
  open: boolean;
  options: MediaPickerOptions | null;
  onSelect: (result: MediaPickerResult) => void;
  onClose: () => void;
}

/* ─── Media Picker ───────────────────────────────────────────────── */

export function MediaPicker({
  open,
  options,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [tab, setTab] = useState<"browse" | "upload">("browse");
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState(options?.bucket ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 12;
  const uploadCompleteRef = useRef<((result: UploadResult) => void) | null>(null);

  // Sync bucket from options
  useEffect(() => {
    if (options?.bucket) setBucket(options.bucket);
  }, [options?.bucket]);

  /* ── Fetch assets via Refine ───────────────────────────────────── */

  const { query, result } = useList<MediaAsset>({
    resource: "media_assets",
    pagination: { currentPage: 1, pageSize },
    sorters: [{ field: "created_at", order: "desc" }],
    filters: [
      ...(bucket ? [{ field: "bucket", operator: "eq" as const, value: bucket }] : []),
      ...(search ? [{ field: "q", operator: "eq" as const, value: search }] : []),
    ],
    queryOptions: { enabled: open && tab === "browse" },
  });

  const assets = result?.data ?? [];
  const isLoading = query?.isLoading ?? false;

  /* ── Create via Refine ──────────────────────────────────────────── */

  const { mutate: createMutate } = useCreate();

  const handleUploadComplete = useCallback(
    (uploadResult: UploadResult) => {
      // Create media_asset record
      createMutate(
        {
          resource: "media_assets",
          values: {
            url: uploadResult.url,
            path: uploadResult.path,
            filename: uploadResult.name,
            file_size: uploadResult.size,
            mime_type: uploadResult.type,
            bucket: uploadResult.bucket,
          },
        },
        {
          onSuccess: () => {
            toast.success(`Uploaded ${uploadResult.name}`);
            // Auto-select the uploaded asset
            onSelect({
              url: uploadResult.url,
              path: uploadResult.path,
              name: uploadResult.name,
              size: uploadResult.size,
              type: uploadResult.type,
              bucket: uploadResult.bucket,
            });
          },
          onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
        },
      );
    },
    [createMutate, onSelect],
  );

  /* ── Confirm selection ──────────────────────────────────────────── */

  const handleConfirm = useCallback(() => {
    if (!selectedId) return;
    const asset = assets.find((a) => a.id === selectedId);
    if (!asset) return;
    onSelect({
      url: asset.url,
      path: asset.path,
      name: asset.filename,
      size: asset.file_size,
      type: asset.mime_type,
      bucket: asset.bucket,
      id: asset.id,
    });
  }, [selectedId, assets, onSelect]);

  if (!open) return null;

  const targetBucket = options?.bucket || bucket || "blog-images";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <h3 className="text-sm font-semibold">
            {options?.title || "Select Media"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-6 pt-3 shrink-0">
          <button
            onClick={() => setTab("browse")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === "browse"
                ? "bg-foreground/5 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === "upload"
                ? "bg-foreground/5 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3 w-3 inline mr-1" />
            Upload
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "upload" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-[0.55rem] font-medium text-muted-foreground uppercase tracking-[0.05em]">
                  Upload to:
                </label>
                <select
                  value={targetBucket}
                  onChange={(e) => setBucket(e.target.value)}
                  className="text-xs border border-border/60 rounded-lg px-2 py-1.5 bg-background focus:outline-none"
                >
                  {MEDIA_BUCKETS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border border-border/60 rounded-lg p-4 bg-secondary/10">
                <UppyUploader
                  bucket={targetBucket}
                  pathPrefix="media"
                  onUploadComplete={handleUploadComplete}
                  allowedFileTypes={options?.allowedFileTypes || ["image/*"]}
                  maxFileSize={options?.maxFileSize}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search + bucket filter */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search media…"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40 transition-colors"
                    autoFocus
                  />
                </div>
                {!options?.bucket && (
                  <select
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    className="text-xs border border-border/60 rounded-lg px-2 py-2 bg-background focus:outline-none"
                  >
                    <option value="">All Buckets</option>
                    {MEDIA_BUCKETS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Asset grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-16">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No assets match your search." : "No assets yet."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {assets.map((asset) => {
                    const isSelected = selectedId === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedId(isSelected ? null : asset.id)}
                        className={`group relative bg-white dark:bg-zinc-800 rounded-xl border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? "border-foreground ring-2 ring-foreground/20"
                            : "border-border/60 hover:border-foreground/30 hover:shadow-sm"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center overflow-hidden">
                          {asset.mime_type?.startsWith("image/") ? (
                            <img
                              src={asset.url}
                              alt={asset.alt_text || asset.filename}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                              <FileText className="h-6 w-6" />
                              <span className="text-[0.45rem] uppercase">
                                {asset.mime_type?.split("/")[1] || "file"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Selection checkmark */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        {/* Filename */}
                        <div className="px-2.5 py-2">
                          <p className="text-[0.55rem] font-medium truncate">
                            {asset.filename}
                          </p>
                          <p className="text-[0.45rem] text-muted-foreground mt-0.5">
                            {formatFileSize(asset.file_size)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 shrink-0">
          <p className="text-[0.55rem] text-muted-foreground">
            {tab === "browse"
              ? selectedId
                ? "Click confirm to select this asset"
                : "Click an asset to select it"
              : "Upload a file to use it immediately"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            {tab === "browse" && (
              <button
                onClick={handleConfirm}
                disabled={!selectedId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Check className="h-3.5 w-3.5" />
                Select Asset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
