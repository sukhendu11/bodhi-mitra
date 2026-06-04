/** Skeleton shown while PostForm (with TipTap editor) is loading. */
export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-16 bg-secondary" />
      <div className="h-10 w-full bg-secondary" />
      <div className="h-4 w-16 bg-secondary" />
      <div className="h-10 w-full bg-secondary" />
      <div className="h-4 w-24 bg-secondary" />
      <div className="h-48 w-full bg-secondary" />
      <div className="h-10 w-24 bg-secondary" />
    </div>
  );
}
