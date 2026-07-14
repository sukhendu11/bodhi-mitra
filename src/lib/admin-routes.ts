/**
 * Shared utility for deriving human-readable labels from admin route paths.
 * Used by AdminInspector, AdminStatusBar, and any other component that needs
 * to display the current admin section name.
 */

export function getAdminSection(path: string): string {
  if (path === "/admin" || path === "/admin/") return "Dashboard";
  if (path.startsWith("/admin/posts")) return "Posts";
  if (path.startsWith("/admin/books")) return "Books";
  if (path.startsWith("/admin/videos")) return "Videos";
  if (path.startsWith("/admin/courses")) return "Courses";
  if (path.startsWith("/admin/pages")) return "Pages";
  if (path.startsWith("/admin/media")) return "Media Library";
  if (path.startsWith("/admin/new")) return "New Post";
  if (path.startsWith("/admin/comments")) return "Moderation";
  if (path.startsWith("/admin/navigation")) return "Navigation";
  if (path.startsWith("/admin/taxonomy")) return "Taxonomy";
  if (path.startsWith("/admin/users")) return "Users & Roles";
  if (path.startsWith("/admin/orders")) return "Orders";
  if (path.startsWith("/admin/coupons")) return "Coupons";
  if (path.startsWith("/admin/redirects")) return "Redirects";
  if (path.startsWith("/admin/security")) return "Security";
  if (path.startsWith("/admin/permissions")) return "Permissions";
  if (path.startsWith("/admin/tokens")) return "Design Tokens";
  if (path.startsWith("/admin/content-types")) return "Content Types";
  if (path.startsWith("/admin/collections")) return "Collections";
  if (path.startsWith("/admin/audit")) return "Audit Log";
  if (path.startsWith("/admin/settings")) return "Settings";
  return "Admin";
}
