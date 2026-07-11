import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Redirect to the new unified Posts page at /admin/posts.
 * The ResourceListPage's FormDrawer handles both create and edit inline.
 */
export const Route = createFileRoute("/admin/new")({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: "/admin/posts" });
  },
});
