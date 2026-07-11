import { Link, useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

interface Crumb {
  label: string;
  to?: string;
}

const breadcrumbMap: Record<string, Omit<Crumb, "to"> & { parent?: string }> = {
  "/admin": { label: "Dashboard" },
  "/admin/new": { label: "New Post", parent: "/admin" },
  "/admin/books": { label: "Books", parent: "/admin" },
  "/admin/videos": { label: "Videos", parent: "/admin" },
  "/admin/courses": { label: "Courses", parent: "/admin" },
  "/admin/pages": { label: "Pages", parent: "/admin" },
  "/admin/media": { label: "Media Library", parent: "/admin" },
  "/admin/comments": { label: "Moderation", parent: "/admin" },
  "/admin/navigation": { label: "Navigation", parent: "/admin" },
  "/admin/taxonomy": { label: "Taxonomy", parent: "/admin" },
  "/admin/users": { label: "Users & Roles", parent: "/admin" },
  "/admin/audit": { label: "Audit Log", parent: "/admin" },
  "/admin/settings": { label: "Settings", parent: "/admin" },
};

export function AdminBreadcrumbs() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const crumbs: Crumb[] = [];

  for (const [path, info] of Object.entries(breadcrumbMap)) {
    if (currentPath === path || currentPath.startsWith(path + "/")) {
      if (info.parent) {
        const parent = breadcrumbMap[info.parent];
        if (parent) {
          crumbs.push({ label: parent.label, to: info.parent });
        }
      }
      crumbs.push({ label: info.label });
      break;
    }
  }

  if (crumbs.length === 0) {
    if (currentPath.startsWith("/admin/courses")) {
      crumbs.push({ label: "Courses", to: "/admin/courses" });
    }
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.to && i < crumbs.length - 1 ? (
                <Link to={crumb.to as any} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <BreadcrumbLink>{crumb.label}</BreadcrumbLink>
                </Link>
              ) : (
                <BreadcrumbPage className="text-xs font-medium">{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
