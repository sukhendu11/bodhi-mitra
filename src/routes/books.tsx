import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for the books section.
 *
 * The catalog lives at `/books` (books.index.tsx) and the single-book
 * detail page at `/books/$slug` (books.$slug.tsx). The parent must
 * render <Outlet /> so the detail route's content actually appears —
 * previously the catalog rendered without an Outlet and silently
 * swallowed every detail page.
 */
export const Route = createFileRoute("/books")({
  component: () => <Outlet />,
});
