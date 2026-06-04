import { Skeleton } from "@/components/ui/skeleton";

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      {/* Category */}
      <div className="mb-14 text-center">
        <Skeleton className="h-3 w-24 mx-auto mb-5 skeleton-shimmer" />

        {/* Title */}
        <Skeleton className="h-10 w-3/4 mx-auto mb-3 skeleton-shimmer" />
        <Skeleton className="h-10 w-1/2 mx-auto mb-6 skeleton-shimmer" />

        {/* Author + date */}
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full skeleton-shimmer" />
          <Skeleton className="h-3 w-48 skeleton-shimmer" />
        </div>

        {/* Tags */}
        <div className="flex justify-center gap-2 mt-5">
          <Skeleton className="h-5 w-16 rounded-full skeleton-shimmer" />
          <Skeleton className="h-5 w-20 rounded-full skeleton-shimmer" />
          <Skeleton className="h-5 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>

      {/* Cover image */}
      <Skeleton className="aspect-[16/9] mb-14 rounded-md skeleton-shimmer" />

      {/* Article body - multiple paragraphs */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-4 w-5/6 skeleton-shimmer" />
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-4 w-4/5 skeleton-shimmer" />
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
        <Skeleton className="h-4 w-full skeleton-shimmer" />
        <Skeleton className="h-4 w-5/6 skeleton-shimmer" />
        <Skeleton className="h-4 w-full skeleton-shimmer" />
      </div>

      {/* Related reflections section */}
      <div className="mt-20 pt-10 border-t border-border">
        <Skeleton className="h-3 w-40 mb-6 skeleton-shimmer" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-64 skeleton-shimmer" />
          <Skeleton className="h-5 w-48 skeleton-shimmer" />
          <Skeleton className="h-5 w-56 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
