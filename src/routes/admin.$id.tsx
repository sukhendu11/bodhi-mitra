import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { fetchPostById, updatePost } from "@/lib/posts";

import type { PostInput } from "@/lib/posts";
import { FormSkeleton } from "@/components/FormSkeleton";
const PostForm = lazy(() => import("@/components/PostForm").then((m) => ({ default: m.PostForm })));

export const Route = createFileRoute("/admin/$id")({
  component: EditPostPage,
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
      toast.success("Post updated");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!post) return <p className="text-sm text-muted-foreground">Post not found.</p>;

  return (
    <div>
      <h2 className="font-serif text-2xl mb-8">Edit post</h2>
      <Suspense fallback={<FormSkeleton />}>
        <PostForm initial={post} submitting={mutation.isPending} onSubmit={(input) => mutation.mutate(input)} />
      </Suspense>
    </div>
  );
}
