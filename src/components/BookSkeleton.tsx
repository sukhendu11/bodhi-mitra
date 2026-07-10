import { Skeleton } from "@/components/ui/skeleton";

interface BookSkeletonProps {
  /** Number of skeleton cards to render (default 8) */
  count?: number;
}

export function BookSkeleton({ count = 8 }: BookSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-border/50 overflow-hidden">
          {/* Cover placeholder */}
          <Skeleton className="aspect-[3/4] skeleton-shimmer rounded-none" />
          {/* Info */}
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
            <Skeleton className="h-3 w-1/2 skeleton-shimmer" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-2.5 w-16 skeleton-shimmer" />
              <Skeleton className="h-2.5 w-12 skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="grid md:grid-cols-[320px_1fr] gap-10 md:gap-14">
        {/* Cover skeleton */}
        <div>
          <Skeleton className="aspect-[3/4] w-full rounded-xl skeleton-shimmer" />
        </div>
        {/* Details skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4 skeleton-shimmer" />
          <Skeleton className="h-4 w-1/3 skeleton-shimmer" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full skeleton-shimmer" />
            <Skeleton className="h-3 w-full skeleton-shimmer" />
            <Skeleton className="h-3 w-5/6 skeleton-shimmer" />
            <Skeleton className="h-3 w-4/5 skeleton-shimmer" />
          </div>
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 w-36 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-10 w-36 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
