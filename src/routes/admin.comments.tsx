import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllComments,
  fetchContactMessages,
  getCommentStats,
  getContactMessageStats,
  adminDeleteComment,
  adminUpdateComment,
  markContactMessageRead,
  deleteContactMessage,
  type CommentWithPost,
  type ContactMessage,
} from "@/lib/admin-comments";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageSquare,
  Mail,
  Trash2,
  Edit3,
  Search,
  MessageCircle,
  Clock,
  Inbox,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";

export const Route = createFileRoute("/admin/comments")({
  component: AdminCommentsPage,
});

function AdminCommentsPage() {
  const [activeTab, setActiveTab] = useState("comments");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
        <div>
          <h2 className="text-lg font-semibold">Moderation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moderate comments, replies, and contact form messages
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/60 px-1 pt-1">
            <TabsList className="flex h-auto bg-transparent gap-0.5">
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-foreground/5 data-[state=active]:shadow-none rounded-md px-4 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Comments
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="data-[state=active]:bg-foreground/5 data-[state=active]:shadow-none rounded-md px-4 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" /> Contact Messages
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="comments" className="mt-0">
              <CommentModerator />
            </TabsContent>
            <TabsContent value="contact" className="mt-0">
              <ContactMessageInbox />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/* ─── Comment Moderator ────────────────────────────────────────────── */

function CommentModerator() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-comments", page, search],
    queryFn: () => fetchAllComments(page, pageSize, { search: search || undefined }),
    staleTime: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-comment-stats"],
    queryFn: getCommentStats,
    staleTime: 30_000,
  });

  const comments = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const doDelete = useServerFn(adminDeleteComment);
  const doEdit = useServerFn(adminUpdateComment);

  const invalidatePublicComments = () => {
    queryClient.invalidateQueries({ queryKey: ["comments"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (doDelete as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-comment-stats"] });
      invalidatePublicComments();
      toast.success("Comment deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => (doEdit as any)({ data: { id, comment_text: text } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      invalidatePublicComments();
      setEditingId(null);
      toast.success("Comment updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStartEdit = (c: CommentWithPost) => {
    setEditingId(c.id);
    setEditText(c.comment_text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) { toast.error("Comment text is required"); return; }
    editMutation.mutate({ id, text: editText });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={MessageCircle} label="Total" value={stats.total} color="blue" />
          <StatCard icon={Clock} label="Today" value={stats.today} color="green" />
          <StatCard icon={Inbox} label="This Week" value={stats.thisWeek} color="purple" />
          <StatCard icon={MessageSquare} label="Replies" value={stats.withReplies} color="amber" />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search comments…"
          className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-secondary/20 animate-pulse rounded-xl border border-border/60" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No comments match your search." : "No comments yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden"
            >
              <div className="px-5 py-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-foreground/60 to-foreground/30 flex items-center justify-center text-[0.5rem] font-semibold text-background shrink-0">
                      {c.user_name[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.user_name}</p>
                      <p className="text-[0.55rem] text-muted-foreground">
                        {c.post_slug ? (
                          <Link to="/posts/$slug" params={{ slug: c.post_slug }}
                            className="hover:text-foreground underline truncate inline-block max-w-[200px] align-bottom"
                            title={c.post_title || "Unknown post"}>
                            {c.post_title || "Unknown post"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/50 italic">{c.post_title || "Deleted post"}</span>
                        )}
                        {' · '}
                        <span title={new Date(c.created_at).toLocaleString()}>
                          {formatDate(c.created_at)}
                        </span>
                        {c.parent_id && <span className="ml-2 italic text-[0.5rem]">(reply)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this comment?")) deleteMutation.mutate(c.id); }}
                      className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Comment text / editor */}
                {editingId === c.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full border border-border bg-background px-3 py-2 text-xs font-sans focus:outline-none focus:border-foreground/60 rounded-lg resize-y"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-[0.55rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(c.id)}
                        disabled={editMutation.isPending || !editText.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.55rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {editMutation.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/85 leading-relaxed mt-1 whitespace-pre-wrap line-clamp-3">
                    {c.comment_text}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">← Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Contact Message Inbox ────────────────────────────────────────── */

function ContactMessageInbox() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-messages", page, search, unreadOnly],
    queryFn: () => fetchContactMessages(page, pageSize, { unreadOnly: unreadOnly || undefined, search: search || undefined }),
    staleTime: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-contact-stats"],
    queryFn: getContactMessageStats,
    staleTime: 30_000,
  });

  const messages = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedMsg = selectedId ? messages.find((m) => m.id === selectedId) || null : null;

  const markReadMutation = useMutation({
    mutationFn: markContactMessageRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-contact-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doDeleteMessage = useServerFn(deleteContactMessage);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (doDeleteMessage as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-contact-stats"] });
      setSelectedId(null);
      toast.success("Message deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelect = (msg: ContactMessage) => {
    setSelectedId(msg.id);
    if (!msg.read) markReadMutation.mutate(msg.id);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Mail} label="Total Messages" value={stats.total} color="blue" />
          <StatCard icon={Inbox} label="Unread" value={stats.unread} color="amber" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search messages…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
          />
          <span className="text-[0.55rem] font-medium text-muted-foreground">Unread only</span>
        </label>
      </div>

      {/* Message list + detail panel */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* List */}
        <div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-secondary/20 animate-pulse rounded-xl border border-border/60" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
              <Mail className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {unreadOnly ? "No unread messages." : "No messages yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden cursor-pointer transition-all hover:border-foreground/30 ${
                    selectedId === msg.id ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border/60"
                  } ${!msg.read ? "border-l-2 border-l-amber-500" : ""}`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${msg.read ? "bg-muted-foreground/30" : "bg-amber-500"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{msg.name}</p>
                          <p className="text-[0.55rem] text-muted-foreground truncate">{msg.email}</p>
                        </div>
                      </div>
                      <span className="text-[0.5rem] text-muted-foreground shrink-0">
                        {new Date(msg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 line-clamp-1">{msg.message}</p>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">←</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">→</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          {selectedMsg ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedMsg.name}</p>
                  <a href={`mailto:${selectedMsg.email}`} className="text-[0.6rem] text-foreground hover:underline">
                    {selectedMsg.email}
                  </a>
                </div>
                <span className={`text-[0.5rem] font-medium px-2 py-0.5 rounded-full border ${
                  selectedMsg.read
                    ? "bg-green-50 text-green-700 border-green-300/50 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-amber-50 text-amber-700 border-amber-300/50 dark:bg-amber-950/30 dark:text-amber-400"
                }`}>
                  {selectedMsg.read ? "Read" : "New"}
                </span>
              </div>

              <p className="text-[0.55rem] text-muted-foreground">
                {new Date(selectedMsg.created_at).toLocaleString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>

              <div className="border-t border-border/40 pt-4">
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{selectedMsg.message}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <a
                  href={`mailto:${selectedMsg.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.55rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <Mail className="h-3 w-3" /> Reply via Email
                </a>
                <button
                  onClick={() => { if (confirm("Delete this message?")) deleteMutation.mutate(selectedMsg.id); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.55rem] font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors ml-auto"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-xs">Select a message to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

