import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleBookmark, getBookmarkStatus } from "@/lib/bookmarks";
import { useAuthSession } from "@/hooks/useAuth";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface BookmarkButtonProps {
  postId: string;
}

export function BookmarkButton({ postId }: BookmarkButtonProps) {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doToggle = useServerFn(toggleBookmark);
  const doStatus = useServerFn(getBookmarkStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["bookmark-status", postId],
    queryFn: () => (doStatus as any)({ data: { postId } }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => (doToggle as any)({ data: { postId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-status", postId] });
      queryClient.invalidateQueries({ queryKey: ["user-bookmarks"] });
    },
  });

  if (!user) return null;

  const bookmarked = data?.bookmarked ?? false;

  return (
    <button
      onClick={() => {
        if (!user) {
          navigate({ to: "/login", search: { message: "Sign in to bookmark posts", redirect: "" } as any });
          return;
        }
        mutation.mutate();
      }}
      disabled={mutation.isPending || isLoading}
      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      title={bookmarked ? "Remove bookmark" : "Bookmark this post"}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : bookmarked ? (
        <BookmarkCheck className="h-3.5 w-3.5" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" />
      )}
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
