import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  toggleBookmark,
  getBookmarkStatus,
  getBookmarkStatusClient,
  toggleBookmarkClient,
  type ResourceType,
} from "@/lib/bookmarks";
import { useAuthSession } from "@/hooks/useAuth";
import { callFn } from "@/lib/call-fn";
import { isMockMode } from "@/lib/data-source";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn, ACTION_PILL_CLS } from "@/lib/utils";

/**
 * Save-after-login intent: when a signed-out user clicks Bookmark we store
 * which resource they wanted, send them to /login, and once they sign in and
 * land back on the page the pending bookmark is applied automatically.
 */
const PENDING_BOOKMARK_KEY = "sabbe-satta-pending-bookmark";

function readPendingBookmark(): { resourceId: string; resourceType: ResourceType } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_BOOKMARK_KEY);
    return raw
      ? (JSON.parse(raw) as { resourceId: string; resourceType: ResourceType })
      : null;
  } catch {
    return null;
  }
}

interface BookmarkButtonProps {
  resourceId: string;
  resourceType?: ResourceType;
  /** Optional className override */
  className?: string;
}

export function BookmarkButton({
  resourceId,
  resourceType = "post",
  className,
}: BookmarkButtonProps) {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doToggle = useServerFn(toggleBookmark);
  const doStatus = useServerFn(getBookmarkStatus);
  const isMock = isMockMode();

  const queryKey = ["bookmark-status", resourceType, resourceId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      isMock
        ? getBookmarkStatusClient({ resourceId, resourceType, userId: user?.id })
        : callFn(doStatus, { resourceId, resourceType, userId: user?.id }),
    enabled: !!user,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      isMock
        ? toggleBookmarkClient({ resourceId, resourceType, userId: user?.id })
        : callFn(doToggle, { resourceId, resourceType, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["user-bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark-count"] });
    },
  });

  // Save-after-login: apply the pending intent once the user is back.
  useEffect(() => {
    if (!user) return;
    const pending = readPendingBookmark();
    if (
      !pending ||
      pending.resourceId !== resourceId ||
      pending.resourceType !== resourceType
    ) {
      return;
    }
    try {
      sessionStorage.removeItem(PENDING_BOOKMARK_KEY);
    } catch {
      /* noop */
    }
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resourceId, resourceType]);

  if (!user) {
    return (
      <button
        onClick={() => {
          try {
            sessionStorage.setItem(
              PENDING_BOOKMARK_KEY,
              JSON.stringify({ resourceId, resourceType }),
            );
          } catch {
            /* noop */
          }
          navigate({
            to: "/login",
            search: {
              message: `Sign in to bookmark ${resourceType === "book" ? "books" : "posts"}`,
              redirect: typeof window !== "undefined" ? window.location.pathname : "",
            } as any,
          });
        }}
        className={cn(ACTION_PILL_CLS, className)}
        title={`Sign in to bookmark this ${resourceType}`}
      >
        <Bookmark className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Bookmark</span>
      </button>
    );
  }

  const bookmarked = data?.bookmarked ?? false;

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || isLoading}
      className={cn(
        ACTION_PILL_CLS,
        "disabled:opacity-50",
        bookmarked
          ? "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500/70 hover:bg-amber-100 dark:hover:bg-amber-950/50"
          : "",
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
      <span className="hidden sm:inline">{bookmarked ? "Bookmarked" : "Bookmark"}</span>
    </button>
  );
}
