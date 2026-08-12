import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBookmarkCount, getBookmarkCountClient } from "@/lib/bookmarks";
import { isMockMode } from "@/lib/data-source";
import { callFn } from "@/lib/call-fn";

/**
 * Shared bookmark count — powers badges in the avatar dropdown, the mobile
 * drawer, and the desktop header bookmarks icon. Same pattern as the cart
 * badge: a single `["bookmark-count"]` query key so every consumer shares one
 * cache entry, invalidated after any bookmark toggle (see BookmarkButton and
 * the bookmarks page mutations).
 *
 * Mock mode uses the client wrapper so the count reads the localStorage
 * store (the server-side mock store is memory-only and would reset on reload).
 */
export function useBookmarkCount(userId?: string): number {
  const isMock = isMockMode();
  const doGetBookmarkCount = useServerFn(getBookmarkCount);

  const { data } = useQuery({
    queryKey: ["bookmark-count", userId],
    queryFn: () =>
      isMock
        ? getBookmarkCountClient(userId)
        : callFn(doGetBookmarkCount, { userId }),
    enabled: !!userId,
    staleTime: 30_000,
  });

  return data ?? 0;
}
