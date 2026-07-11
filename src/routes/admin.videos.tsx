import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import {
  fetchAllVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  getVideoStats,
  getYoutubeId,
  type Video,
  type VideoInput,
} from "@/lib/videos";
import {
  Video as VideoIcon,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { videoSchema, type VideoFormValues } from "@/lib/schemas";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { useCrudManager } from "@/hooks/useCrudManager";
import {
  DataTable,
  StatusBadge,
  DateCell,
} from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { FormDrawer } from "@/components/admin/form-drawer";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideosPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminVideosPage() {
  const queryClient = useQueryClient();

  const crud = useCrudManager({
    queryKey: ["admin-videos"],
    queryFn: (params) =>
      fetchAllVideos(params.page, params.pageSize, {
        status: params.filter as "draft" | "published" | undefined,
        search: params.search,
      }),
    pageSize: 20,
    initialFilter: "all",
    additionalInvalidateKeys: [["video-stats"], ["public-videos"]],
    create: {
      mutationFn: createVideo,
      successMessage: "Video created",
    },
    update: {
      mutationFn: ({ id, input }) => updateVideo(id, input),
      successMessage: "Video updated",
    },
    delete: {
      mutationFn: deleteVideo,
      successMessage: "Video deleted",
    },
  });

  const form = useForm<VideoFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(videoSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      thumbnail_url: "",
      youtube_url: "",
      sort_order: 0,
      status: "draft",
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["video-stats"],
    queryFn: getVideoStats,
    staleTime: 30_000,
  });

  const videos = crud.data as Video[];
  const total = crud.total;

  const columnHelper = createColumnHelper<Video>();

  const videoColumns = useMemo(
    () => [
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
                  alt=""
                  className="w-16 h-9 rounded object-cover border border-border/40 shrink-0"
                />
              ) : ytId ? (
                <img
                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt=""
                  className="w-16 h-9 rounded object-cover border border-border/40 shrink-0"
                />
              ) : (
                <div className="w-16 h-9 rounded bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
                  <VideoIcon className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-sm font-medium line-clamp-1">
                  {v.title}
                </span>
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
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
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
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        enableSorting: true,
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => crud.confirmDelete(row.original.id)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      }),
    ],
    [],
  );

  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      thumbnail_url: "",
      youtube_url: "",
      sort_order: 0,
      status: "draft",
    });
  };

  const handleEdit = (video: Video) => {
    form.reset({
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail_url,
      youtube_url: video.youtube_url,
      sort_order: video.sort_order,
      status: video.status,
    });
    crud.openEditForm(video.id);
  };

  const handleSubmit = () => {
    form.handleSubmit(
      (values) => {
        if (crud.mode === "edit") {
          crud.updateMutation!.mutate({
            id: crud.editingId!,
            input: values,
          });
        } else {
          crud.createMutation!.mutate(values);
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
  };

  const youtubeUrl = form.watch("youtube_url");
  const thumbnailUrl = form.watch("thumbnail_url");

  useUnsavedChanges(crud.showForm && form.formState.isDirty);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VideoIcon className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Videos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your YouTube video collection
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            crud.openCreateForm();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Video
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={VideoIcon}
            label="Total"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Published"
            value={stats.published}
            color="green"
          />
          <StatCard
            icon={Edit3}
            label="Drafts"
            value={stats.draft}
            color="amber"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => crud.setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                crud.filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-48">
          <input
            type="text"
            value={crud.search}
            onChange={(e) => crud.setSearch(e.target.value)}
            placeholder="Search videos…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {crud.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse"
            />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <VideoIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No videos found.</p>
        </div>
      ) : (
        <DataTable
          columns={videoColumns}
          data={videos}
          searchPlaceholder="Search videos…"
          pageSize={15}
          onBulkDelete={async (ids) => {
            for (const id of ids) {
              try {
                await deleteVideo(id);
              } catch {
                // continue with remaining
              }
            }
            crud.invalidate();
            toast.success(`${ids.length} video(s) deleted`);
          }}
        />
      )}

      {/* Form drawer */}
      <FormDrawer
        open={crud.showForm}
        onClose={() => {
          resetForm();
          crud.closeForm();
        }}
        title={crud.mode === "edit" ? "Edit Video" : "Add New Video"}
        description={crud.mode === "edit" ? "Update video details." : "Add a new video to the library."}
        isPending={
          (crud.createMutation?.isPending ?? false) ||
          (crud.updateMutation?.isPending ?? false)
        }
        submitLabel={crud.mode === "edit" ? "Update Video" : "Create Video"}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                  Title
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Video title" />
                </FormControl>
                {fieldState.error && (
                  <FormMessage className="text-[0.65rem]" />
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="youtube_url"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                  YouTube URL
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </FormControl>
                {field.value && getYoutubeId(field.value) && (
                  <p className="text-[0.55rem] text-green-600 dark:text-green-400 mt-1">
                    ✓ Valid YouTube URL
                  </p>
                )}
                {fieldState.error && (
                  <FormMessage className="text-[0.65rem]" />
                )}
              </FormItem>
            )}
          />

          <div>
            <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
              Thumbnail URL{" "}
              <span className="text-muted-foreground/50">
                (optional — uses YouTube thumbnail if empty)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <Input
                value={thumbnailUrl || ""}
                onChange={(e) => form.setValue("thumbnail_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            {thumbnailUrl && (
              <div className="mt-2 relative w-32 aspect-video rounded-lg overflow-hidden border border-border/60">
                <img
                  src={thumbnailUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => form.setValue("thumbnail_url", "")}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    placeholder="Short description of the video…"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                    Sort Order
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                    Status
                  </FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full text-xs border border-border/60 rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:border-foreground/40"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </FormDrawer>

      {/* Delete confirmation */}
      <ConfirmDelete
        open={!!crud.deletingId}
        onConfirm={() => crud.deleteMutation!.mutate(crud.deletingId!)}
        onCancel={crud.cancelDelete}
        isPending={crud.deleteMutation?.isPending ?? false}
        title="Delete video"
        description="Are you sure you want to delete this video? This action cannot be undone."
      />
    </div>
  );
}
