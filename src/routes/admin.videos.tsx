import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { createColumnHelper } from "@tanstack/react-table";
import { toast } from "sonner";
import { Video as VideoIcon, Edit3, CheckCircle, ExternalLink, ImagePlus } from "lucide-react";
import { videoSchema, type VideoFormValues } from "@/lib/schemas";
import { deleteVideo, getVideoStats, getYoutubeId, type Video } from "@/lib/videos";
import { ResourceListPage, registerResource } from "@/components/admin/resource-engine";
import { StatusBadge, DateCell } from "@/components/admin/data-table";
import { FormRenderer } from "@/components/admin/form-engine";
import { MediaPicker } from "@/components/admin/media-engine";
import { ErrorPage } from "@/components/error-page";

/* ─── Resource Definition ────────────────────────────────────────── */

const columnHelper = createColumnHelper<Video>();

const columns = [
  columnHelper.accessor("title", {
    header: "Title",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original;
      const ytId = getYoutubeId(v.youtube_url);
      return (
        <div className="flex items-center gap-3 min-w-0">
          {v.thumbnail_url ? (
            <img
            src={v.thumbnail_url}
            alt={v.title || "Video thumbnail"}
              className="w-16 h-9 rounded object-cover border border-border/40 shrink-0"
            />
          ) : ytId ? (
            <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt={v.title || "Video thumbnail"}
              className="w-16 h-9 rounded object-cover border border-border/40 shrink-0"
            />
          ) : (
            <div className="w-16 h-9 rounded bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
              <VideoIcon className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium line-clamp-1">{v.title}</span>
            {v.description && (
              <span className="text-[0.6rem] text-muted-foreground line-clamp-1 block">
                {v.description}
              </span>
            )}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("youtube_url", {
    header: "YouTube",
    enableSorting: false,
    cell: ({ getValue }) => (
      <a
        href={getValue()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[0.55rem] font-medium text-red-600 dark:text-red-400 hover:underline"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        Watch
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  columnHelper.accessor("sort_order", {
    header: "Order",
    enableSorting: true,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || "—"}</span>,
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    enableSorting: true,
    cell: ({ getValue }) => <DateCell date={getValue()} />,
  }),
];

/* ─── Video Form (using Form Engine) ──────────────────────────────── */

const VIDEO_FIELDS = [
  {
    type: "text" as const,
    name: "title" as const,
    label: "Title",
    placeholder: "Video title",
  },
  {
    type: "url" as const,
    name: "youtube_url" as const,
    label: "YouTube URL",
    placeholder: "https://youtube.com/watch?v=...",
  },
  {
    type: "textarea" as const,
    name: "description" as const,
    label: "Description",
    placeholder: "Short description of the video…",
    rows: 3,
  },
  {
    type: "select" as const,
    name: "status" as const,
    label: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
    ],
  },
];

const VIDEO_FORM_GROUPS = [
  { fields: VIDEO_FIELDS.slice(0, 2) },
  { fields: [VIDEO_FIELDS[2]] },
  {
    columns: 2 as const,
    fields: [
      VIDEO_FIELDS[3],
      { type: "number" as const, name: "sort_order" as const, label: "Sort Order", min: 0 },
    ],
  },
];

function VideoFormContent({ form }: { form: ReturnType<typeof useForm<VideoFormValues>> }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const youtubeUrl = form.watch("youtube_url");
  const thumbnailUrl = form.watch("thumbnail_url");

  return (
    <FormRenderer form={form} groups={VIDEO_FORM_GROUPS}>
      {/* YouTube URL validation indicator */}
      {youtubeUrl && getYoutubeId(youtubeUrl) && (
        <p className="text-[0.55rem] text-green-600 dark:text-green-400 mt-1 -mt-4">
          ✓ Valid YouTube URL
        </p>
      )}

      {/* Thumbnail — using MediaPicker */}
      <div>
        <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
          Thumbnail <span className="text-muted-foreground/50">(optional)</span>
        </label>
        {thumbnailUrl ? (
          <div className="relative w-32 aspect-video rounded-lg overflow-hidden border border-border/60 mb-2">
            <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => form.setValue("thumbnail_url", "")}
              className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {thumbnailUrl ? "Replace" : "Browse Media Library"}
          </button>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        options={{
          title: "Select Thumbnail",
          bucket: "blog-images",
          allowedFileTypes: ["image/*"],
        }}
        onSelect={(result) => {
          form.setValue("thumbnail_url", result.url);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </FormRenderer>
  );
}

const videoResource = registerResource<Video, VideoFormValues>({
  name: "videos",
  label: "Video",
  labelPlural: "Videos",
  description: "Manage your YouTube video collection",
  icon: VideoIcon,
  columns,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: videoSchema as any,
  defaultValues: {
    title: "",
    description: "",
    thumbnail_url: "",
    youtube_url: "",
    sort_order: 0,
    status: "draft",
  },
  FormContent: VideoFormContent as any,
  filterField: "status",
  searchField: "title",
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
  pageSize: 20,
  stats: {
    fetch: getVideoStats,
    cards: (data) => [
      { icon: VideoIcon, label: "Total", value: data.total, color: "blue" },
      { icon: CheckCircle, label: "Published", value: data.published, color: "green" },
      { icon: Edit3, label: "Drafts", value: data.draft, color: "amber" },
    ],
  },
  filters: [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
  ],
  onBulkDelete: async (ids) => {
    for (const id of ids) {
      try {
        await deleteVideo(id);
      } catch {
        /* continue */
      }
    }
    toast.success(`${ids.length} video(s) deleted`);
  },
});

/* ─── Route ──────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideosPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminVideosPage() {
  return <ResourceListPage resource={videoResource} />;
}
