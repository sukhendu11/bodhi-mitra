import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  getVideoStats,
  getYoutubeId,
  type Video,
  type VideoInput,
  type VideoStatus,
} from "@/lib/videos";
import {
  Video as VideoIcon,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/videos")({
  component: AdminVideosPage,
});

function AdminVideosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | VideoStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;

  // Form state
  const [form, setForm] = useState<VideoInput>({
    title: "",
    description: "",
    thumbnail_url: "",
    youtube_url: "",
    sort_order: 0,
    status: "draft",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-videos", page, filter],
    queryFn: () =>
      fetchAllVideos(page, pageSize, {
        status: filter === "all" ? undefined : filter,
        search: search || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["video-stats"],
    queryFn: getVideoStats,
    staleTime: 30_000,
  });

  const videos = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-stats"] });
      toast.success("Video created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<VideoInput> }) => updateVideo(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-stats"] });
      toast.success("Video updated");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-stats"] });
      toast.success("Video deleted");
      setDeletingId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: "", description: "", thumbnail_url: "", youtube_url: "", sort_order: 0, status: "draft" });
  };

  const handleEdit = (video: Video) => {
    setForm({
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail_url,
      youtube_url: video.youtube_url,
      sort_order: video.sort_order,
      status: video.status,
    });
    setEditingId(video.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.youtube_url.trim()) { toast.error("YouTube URL is required"); return; }

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

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
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Video
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={VideoIcon} label="Total" value={stats.total} color="blue" />
          <StatCard icon={CheckCircle} label="Published" value={stats.published} color="green" />
          <StatCard icon={Edit3} label="Drafts" value={stats.draft} color="amber" />
        </div>
      )}

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search videos…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
      </div>

      {/* Video grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse aspect-video" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <VideoIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No videos found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => {
            const ytId = getYoutubeId(video.youtube_url);
            return (
              <div
                key={video.id}
                className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden hover:border-foreground/30 hover:shadow-sm transition-all"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-secondary/20 flex items-center justify-center overflow-hidden relative">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <VideoIcon className="h-12 w-12 text-muted-foreground/20" />
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <svg className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`absolute top-2 left-2 text-[0.5rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${
                      video.status === "published"
                        ? "bg-green-50 text-green-700 border-green-300/50 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-amber-50 text-amber-700 border-amber-300/50 dark:bg-amber-950/30 dark:text-amber-400"
                    }`}
                  >
                    {video.status}
                  </span>

                  {/* Hover edit/delete actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(video)}
                      className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground shadow-sm"
                      title="Edit"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setDeletingId(video.id)}
                      className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-destructive/70 hover:text-destructive shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium line-clamp-1">{video.title}</p>
                  {video.description && (
                    <p className="text-[0.6rem] text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={video.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.55rem] font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      Watch on YouTube
                    </a>
                    {video.sort_order > 0 && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[0.5rem] text-muted-foreground">Order {video.sort_order}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">
              ← Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Video form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="min-h-screen flex items-start justify-center p-4 pt-12">
            <div
              className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-border/60">
                <h3 className="text-sm font-semibold">{editingId ? "Edit Video" : "Add New Video"}</h3>
              </div>
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title</label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Video title" />
                </div>

                {/* YouTube URL */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">YouTube URL</label>
                  <Input
                    value={form.youtube_url}
                    onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  {form.youtube_url && getYoutubeId(form.youtube_url) && (
                    <p className="text-[0.55rem] text-green-600 dark:text-green-400 mt-1">
                      ✓ Valid YouTube URL
                    </p>
                  )}
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
                    Thumbnail URL <span className="text-muted-foreground/50">(optional — uses YouTube thumbnail if empty)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={form.thumbnail_url || ""}
                      onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  {form.thumbnail_url && (
                    <div className="mt-2 relative w-32 aspect-video rounded-lg overflow-hidden border border-border/60">
                      <img src={form.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm((f) => ({ ...f, thumbnail_url: "" }))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Description</label>
                  <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Short description of the video…" />
                </div>

                {/* Sort order + status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Sort Order</label>
                    <Input type="number" min={0} value={form.sort_order || 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Status</label>
                    <select
                      value={form.status || "draft"}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VideoStatus }))}
                      className="w-full text-xs border border-border/60 rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:border-foreground/40"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
                  {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update Video" : "Create Video"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (deletingId) deleteMutation.mutate(deletingId); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  };
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
        <p className="text-[0.55rem] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
