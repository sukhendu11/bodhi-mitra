/* ─── Media Picker Result ─────────────────────────────────────────── */

export interface MediaPickerResult {
  /** Public URL of the selected/uploaded asset */
  url: string;
  /** Storage path (for tracking) */
  path: string;
  /** Filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Storage bucket */
  bucket: string;
  /** Asset ID in media_assets table */
  id?: string;
}

/* ─── Media Picker Options ────────────────────────────────────────── */

export interface MediaPickerOptions {
  /** Title for the picker dialog */
  title?: string;
  /** Bucket filter (empty = all buckets) */
  bucket?: string;
  /** Allowed file types for the upload tab */
  allowedFileTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** (Optional) Callback when an asset is selected — prefer using the component's onSelect prop instead */
  onSelect?: (result: MediaPickerResult) => void;
  /** (Optional) Callback when picker is closed — prefer using the component's onClose prop instead */
  onClose?: () => void;
}

/* ─── Media Buckets ──────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";

export interface MediaBucketDef {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Default allowed file types for uploads to this bucket */
  allowedTypes?: string[];
}

import { Image, FileText, Music, Video, FileType, Palette } from "lucide-react";

export const MEDIA_BUCKETS: MediaBucketDef[] = [
  { value: "blog-images", label: "Blog Images", icon: Image, allowedTypes: ["image/*"] },
  {
    value: "site-assets",
    label: "Site Assets",
    icon: FileText,
    allowedTypes: ["image/*", ".pdf", ".svg"],
  },
  { value: "book-covers", label: "Book Covers", icon: Image, allowedTypes: ["image/*"] },
  { value: "avatars", label: "Avatars", icon: Image, allowedTypes: ["image/*"] },
  { value: "audio", label: "Audio", icon: Music, allowedTypes: ["audio/*"] },
  {
    value: "videos",
    label: "Videos",
    icon: Video,
    allowedTypes: ["video/*"],
  },
  {
    value: "documents",
    label: "Documents",
    icon: FileType,
    allowedTypes: ["application/pdf", "application/msword", "text/plain", "text/csv"],
  },
  { value: "fonts", label: "Fonts", icon: Palette, allowedTypes: ["font/*"] },
  { value: "icons", label: "Icons", icon: Image, allowedTypes: ["image/svg+xml", "image/png"] },
];

/* ─── File Size Format ────────────────────────────────────────────── */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
