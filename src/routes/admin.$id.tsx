import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { fetchPostById, updatePost } from "@/lib/posts";

import type { PostInput } from "@/lib/posts";
import { FormSkeleton } from "@/components/FormSkeleton";
import { ArrowLeft } from "lucide-react";
import { ErrorPage } from "@/components/error-page";
const PostForm = lazy(() => import("@/components/PostForm").then((m) => ({ default: m.PostForm })));

export const Route = createFileRoute("/admin/$id")({
  component: EditPostPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function EditPostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ["admin-post", id],
    queryFn: () => fetchPostById(id),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof updatePost>[1]) => updatePost(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-post", id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      toast.success("Post updated");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="h-4 w-32 bg-secondary/60 animate-pulse rounded mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-8 bg-secondary/40 animate-pulse rounded-lg" />
          <div>
            <div className="h-6 w-40 bg-secondary/60 animate-pulse rounded" />
            <div className="h-3 w-24 bg-secondary/40 animate-pulse rounded mt-2" />
          </div>
        </div>
        <FormSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Post not found.</p>
        <Link to="/admin" className="inline-flex items-center gap-1 mt-4 text-xs font-medium text-foreground hover:underline">
          ← Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/admin" className="hover:text-foreground transition-colors">Posts</Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {post.title_en || post.title || post.title_bn || "Untitled"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/admin"
          className="p-2 rounded-lg border border-border/60 hover:bg-secondary/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight truncate">
              Edit Post
            </h1>
            <span
              className={`text-[0.55rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border shrink-0 ${
                post.status === "published"
                  ? "border-green-300/50 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : "border-amber-300/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              }`}
            >
              {post.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {post.category} · Created {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<FormSkeleton />}>
        <PostForm initial={post} submitting={mutation.isPending} onSubmit={(input) => mutation.mutate(input)} />
      </Suspense>
    </div>
  );
}
