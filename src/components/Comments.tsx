import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fetchComments, addComment, deleteComment, updateComment, type Comment } from "@/lib/comments";
import { useAuthSession, useIsAdmin } from "@/hooks/useAuth";
import { LetterAvatar } from "@/components/LetterAvatar";


function snippet(text: string, max = 140) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

export function Comments({ postId }: { postId: string }) {
  const { user } = useAuthSession();
  const { data: isAdmin = false } = useIsAdmin(user);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const commentsById = useMemo(() => {
    const m = new Map<string, Comment>();
    for (const c of comments) m.set(c.id, c);
    return m;
  }, [comments]);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: Comment[] = [];
    const repliesByParent = new Map<string, Comment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = repliesByParent.get(c.parent_id) ?? [];
        arr.push(c);
        repliesByParent.set(c.parent_id, arr);
      } else {
        roots.push(c);
      }
    }
    return { roots, repliesByParent };
  }, [comments]);

  const userDisplayName = () => {
    if (!user) return "Reader";
    return (
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Reader"
    );
  };

  const postMutation = useMutation({
    mutationFn: async (payload: { text: string; parent_id: string | null }) => {
      if (!user) throw new Error("Not signed in");
      return addComment({
        post_id: postId,
        user_id: user.id,
        user_name: userDisplayName(),
        comment_text: payload.text.trim(),
        parent_id: payload.parent_id,
      });
    },
    onSuccess: (_d, vars) => {
      if (vars.parent_id) {
        setReplyText("");
        setReplyTo(null);
        toast.success("Reply posted");
      } else {
        setText("");
        toast.success("Comment posted");
      }
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: (vars: { id: string; text: string }) => updateComment(vars.id, vars.text.trim()),
    onSuccess: () => {
      setEditingId(null);
      setEditingText("");
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditingText(c.comment_text);
  };

  const renderComment = (c: Comment, isReply = false) => {
    const replies = repliesByParent.get(c.id) ?? [];
    const canDelete = user && (user.id === c.user_id || isAdmin);
    const canEdit = user && (user.id === c.user_id || isAdmin);
    const canReply = isAdmin && !isReply;
    const isEditing = editingId === c.id;

    return (
      <li key={c.id} className={isReply ? "" : "border-b border-border/60 pb-6 last:border-0"}>
        <div className="flex items-start gap-3">
          <LetterAvatar name={c.user_name} size={36} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-4 mb-1.5">
              <p className="font-serif text-base">
                {c.user_name}
                {isReply && (
                  <span className="ml-2 text-[0.6rem] uppercase tracking-[0.18em] bg-foreground text-background px-1.5 py-0.5 align-middle">
                    Admin
                  </span>
                )}
              </p>
              <time className="text-xs text-muted-foreground shrink-0">
                {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {c.updated_at && new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1500 && (
                  <span className="ml-2 italic">
                    (edited {new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                  </span>
                )}
              </time>
            </div>


        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingText.trim().length === 0) return;
              editMutation.mutate({ id: c.id, text: editingText });
            }}
            className="space-y-2"
          >
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full border border-border bg-background px-3 py-2 text-sm font-sans focus:outline-none focus:border-foreground/60 resize-y"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setEditingId(null); setEditingText(""); }}
                className="px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] border border-border hover:border-foreground/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending || editingText.trim().length === 0}
                className="px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 disabled:opacity-40"
              >
                {editMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{c.comment_text}</p>
        )}

        {!isEditing && (
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            {canReply && (
              <button
                onClick={() => {
                  setReplyTo(replyTo?.id === c.id ? null : c);
                  setReplyText("");
                }}
                className="hover:text-foreground"
              >
                {replyTo?.id === c.id ? "Cancel" : "Reply"}
              </button>
            )}
            {canEdit && (
              <button onClick={() => startEdit(c)} className="hover:text-foreground">
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => deleteMutation.mutate(c.id)} className="hover:text-foreground">
                Delete
              </button>
            )}
          </div>
        )}

        {replyTo?.id === c.id && isAdmin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (replyText.trim().length === 0) return;
              postMutation.mutate({ text: replyText, parent_id: c.id });
            }}
            className="mt-4 space-y-2 pl-4 border-l-2 border-foreground/30"
          >
            <div className="bg-secondary/40 border-l-2 border-foreground/40 px-3 py-2 text-xs text-muted-foreground italic">
              <span className="not-italic font-medium text-foreground/70">Replying to {c.user_name}: </span>
              "{snippet(c.comment_text)}"
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply as admin…"
              rows={3}
              maxLength={2000}
              autoFocus
              className="w-full border border-border bg-background px-3 py-2 text-sm font-sans focus:outline-none focus:border-foreground/60 resize-y"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={postMutation.isPending || replyText.trim().length === 0}
                className="px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 disabled:opacity-40"
              >
                {postMutation.isPending ? "Posting…" : "Reply"}
              </button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <ul className="mt-5 pl-5 border-l-2 border-border space-y-5">
            {replies.map((r) => {
              const parent = r.parent_id ? commentsById.get(r.parent_id) : null;
              return (
                <li key={r.id}>
                  {parent && (
                    <div className="mb-2 bg-secondary/40 border-l-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground italic">
                      <span className="not-italic font-medium text-foreground/70">↳ {parent.user_name}: </span>
                      "{snippet(parent.comment_text, 100)}"
                    </div>
                  )}
                  {renderComment(r, true)}
                </li>
              );
            })}
          </ul>
        )}
          </div>
        </div>
      </li>

    );
  };

  return (
    <section className="mt-20 pt-12 border-t border-border">
      <h2 className="font-serif text-2xl mb-8 text-center">Reflections</h2>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground italic mb-10">
          No reflections yet. Be the first to share.
        </p>
      ) : (
        <ul className="space-y-8 mb-12">{roots.map((c) => renderComment(c))}</ul>
      )}

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length === 0) return;
            postMutation.mutate({ text, parent_id: null });
          }}
          className="space-y-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a thought…"
            rows={4}
            maxLength={2000}
            className="w-full border border-border bg-background px-4 py-3 text-sm font-sans focus:outline-none focus:border-foreground/60 resize-y"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Signed in as {user.email}</p>
            <button
              type="submit"
              disabled={postMutation.isPending || text.trim().length === 0}
              className="px-6 py-2 text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 disabled:opacity-40"
            >
              {postMutation.isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 border border-border/60 bg-secondary/20">
          <p className="text-sm text-muted-foreground mb-4">Sign in to share a reflection.</p>
          <Link
            to="/login"
            search={{ message: "", redirect: "/" }}
            className="inline-block px-6 py-2 text-xs uppercase tracking-[0.2em] border border-foreground/60 hover:bg-foreground hover:text-background"
          >
            Sign in
          </Link>
        </div>
      )}
    </section>
  );
}
