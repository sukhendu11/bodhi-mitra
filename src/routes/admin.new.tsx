import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostForm } from "@/components/PostForm";
import { createPost } from "@/lib/posts";

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
      toast.success("Post published");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h2 className="font-serif text-2xl mb-8">New post</h2>
      <PostForm submitting={mutation.isPending} onSubmit={(input) => mutation.mutate(input)} />
    </div>
  );
}
