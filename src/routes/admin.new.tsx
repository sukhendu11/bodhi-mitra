import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { createPost } from "@/lib/posts";

import type { PostInput } from "@/lib/posts";
import { FormSkeleton } from "@/components/FormSkeleton";
import { ArrowLeft, FileText } from "lucide-react";
const PostForm = lazy(() => import("@/components/PostForm").then((m) => ({ default: m.PostForm })));

export const Route = createFileRoute("/admin/new")({
  component: NewPostPage,
});

function NewPostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/admin" className="hover:text-foreground transition-colors">Posts</Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground font-medium">New Post</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/admin"
          className="p-2 rounded-lg border border-border/60 hover:bg-secondary/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Post</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create a bilingual journal entry</p>
        </div>
      </div>

      {/* Form */}
      <Suspense fallback={<FormSkeleton />}>
        <PostForm submitting={mutation.isPending} onSubmit={(input) => mutation.mutate(input)} />
      </Suspense>
    </div>
  );
}
