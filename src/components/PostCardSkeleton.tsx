import { Skeleton } from "@/components/ui/skeleton";

export function PostCardSkeleton() {
  return (
    <div className="block rounded-xl">
      {/* Cover image placeholder */}
      <Skeleton className="aspect-[4/3] mb-5 rounded-lg skeleton-shimmer" />

      {/* Category line */}
      <Skeleton className="h-3 w-20 mb-3 skeleton-shimmer" />

      {/* Title - two lines */}
      <Skeleton className="h-6 w-full mb-2 skeleton-shimmer" />
      <Skeleton className="h-6 w-3/4 mb-3 skeleton-shimmer" />

      {/* Excerpt - two lines */}
      <Skeleton className="h-4 w-full mb-1.5 skeleton-shimmer" />
      <Skeleton className="h-4 w-2/3 mb-3 skeleton-shimmer" />

      {/* Tags */}
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-4 w-14 rounded-full skeleton-shimmer" />
        <Skeleton className="h-4 w-16 rounded-full skeleton-shimmer" />
      </div>

      {/* Author + Date */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-full skeleton-shimmer" />
        <Skeleton className="h-3 w-36 skeleton-shimmer" />
      </div>
    </div>
  );
}
