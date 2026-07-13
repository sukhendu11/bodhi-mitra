import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleBookmark, getBookmarkStatus, type ResourceType } from "@/lib/bookmarks";
import { useAuthSession } from "@/hooks/useAuth";
import { Bookmark, BookmarkCheck, Loader2, BookOpen, FileText } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  resourceId: string;
  resourceType?: ResourceType;
  /** Show compact variant (icon-only, suitable for cards) */
  compact?: boolean;
  /** Optional className override */
  className?: string;
}

export function BookmarkButton({
  resourceId,
  resourceType = "post",
  compact = false,
  className,
}: BookmarkButtonProps) {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doToggle = useServerFn(toggleBookmark);
  const doStatus = useServerFn(getBookmarkStatus);

  const queryKey = ["bookmark-status", resourceType, resourceId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => (doStatus as any)({ data: { resourceId, resourceType } }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => (doToggle as any)({ data: { resourceId, resourceType } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["user-bookmarks"] });
    },
  });

  if (!user) {
    if (compact) return null;
    return (
      <button
        onClick={() => {
          navigate({
            to: "/login",
            search: {
              message: `Sign in to bookmark ${resourceType === "book" ? "books" : "posts"}`,
              redirect: "",
            } as any,
          });
        }}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors",
          className,
        )}
        title={`Sign in to bookmark this ${resourceType}`}
      >
        <Bookmark className="h-3.5 w-3.5" />
        Bookmark
      </button>
    );
  }

  const bookmarked = data?.bookmarked ?? false;

  if (compact) {
    return (
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || isLoading}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          bookmarked
            ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/30"
            : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/40",
          mutation.isPending && "opacity-50",
          className,
        )}
        title={bookmarked ? "Remove bookmark" : `Bookmark this ${resourceType}`}
      >
        {mutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : bookmarked ? (
          <BookmarkCheck className="h-3.5 w-3.5 fill-amber-500" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || isLoading}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] transition-colors disabled:opacity-50",
        bookmarked
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      title={bookmarked ? "Remove bookmark" : `Bookmark this ${resourceType}`}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : bookmarked ? (
        <BookmarkCheck className="h-3.5 w-3.5 fill-amber-500" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" />
      )}
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
