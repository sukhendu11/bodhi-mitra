import { createFileRoute, Outlet, Link, redirect, isRedirect, useRouterState } from "@tanstack/react-router";
import { signOut, isHardcodedAdmin, useAuthSession, useUserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { canManageUsers } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import {
  FileText, PlusCircle, BookOpen, ImageIcon, FolderTree, Globe, MessageSquare, Users, Settings, Activity, Menu,
  LogOut, PanelLeftClose, PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Dashboard — Bodhi Mitra CMS" }] }),
  beforeLoad: async ({ location }) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        throw redirect({
          to: "/login",
          search: { message: "Please sign in as an admin to continue.", redirect: location.href },
        });
      }
      if (isHardcodedAdmin(userData.user)) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();
      if (!roleRow) {
        throw redirect({
          to: "/login",
          search: { message: "You don't have permission to access the admin panel.", redirect: location.href },
        });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({
        to: "/login",
        search: { message: "Please sign in as an admin to continue.", redirect: location.href },
      });
    }
  },
  component: AdminLayout,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-semibold mb-3">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 text-sm font-medium border border-border hover:bg-secondary rounded-lg transition-colors">
        Try again
      </button>
    </div>
  ),
});

/* ─── Navigation config ─────────────────────────────────────────────── */

interface NavSection {
  label: string;
  items: {
    to: string;
    label: string;
    icon: LucideIcon;
    exact: boolean;
    requires?: string;
  }[];
}

function AdminLayout() {
  const { user } = useAuthSession();
  const { data: userRole } = useUserRole(user);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isSuperAdmin = isHardcodedAdmin(user) || userRole === "super_admin";
  const showUsers = canManageUsers(userRole) || isSuperAdmin;

  const navSections: NavSection[] = [
    {
      label: "Content",
      items: [
        { to: "/admin", label: "Posts", icon: FileText, exact: true },
        { to: "/admin/new", label: "New Post", icon: PlusCircle, exact: false },
        { to: "/admin/books", label: "Books", icon: BookOpen, exact: false },
        { to: "/admin/pages", label: "Pages", icon: Globe, exact: false },
        { to: "/admin/media", label: "Media", icon: ImageIcon, exact: false },
      ],
    },
    {
      label: "Community",
      items: [
        { to: "/admin/comments", label: "Moderation", icon: MessageSquare, exact: false },
        { to: "/admin/navigation", label: "Navigation", icon: Menu, exact: false },
        { to: "/admin/taxonomy", label: "Taxonomy", icon: FolderTree, exact: false },
        ...(showUsers ? [{ to: "/admin/users" as const, label: "Users" as const, icon: Users as LucideIcon, exact: false }] : []),
      ],
    },
    {
      label: "Management",
      items: [
        { to: "/admin/audit" as const, label: "Audit Log" as const, icon: Activity as LucideIcon, exact: false },
        { to: "/admin/settings" as const, label: "Settings" as const, icon: Settings as LucideIcon, exact: false },
      ],
    },
  ].filter((s) => s.items.length > 0);

  const isActive = (to: string, exact: boolean) =>
    exact ? currentPath === to : currentPath.startsWith(to + (to === "/admin" ? "" : "/")) || currentPath === to;

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-950">
      {/* Demo banner */}
      <div className="border-b border-amber-400/20 bg-amber-50/90 dark:bg-amber-950/15 px-4 py-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[0.55rem] uppercase tracking-[0.2em] font-semibold text-amber-700 dark:text-amber-400 shrink-0">⚠ Demo</span>
            <p className="text-[0.6rem] text-amber-700/70 dark:text-amber-300/60 truncate">Data may be reset at any time.</p>
          </div>
          <p className="text-[0.5rem] text-amber-600/50 dark:text-amber-400/40 font-mono shrink-0 hidden sm:block">admin@bodhimitra.test</p>
        </div>
      </div>

      <div className="flex">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "hidden md:flex md:flex-col border-r border-border/60 bg-white dark:bg-zinc-900 transition-all duration-300",
            sidebarCollapsed ? "md:w-16" : "md:w-60",
          )}
          style={{ height: "calc(100vh - 2rem)", position: "sticky", top: 0 }}
        >
          {/* Brand area */}
          <div className={cn(
            "flex items-center border-b border-border/60 px-4 py-4",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-semibold tracking-tight">Bodhi Mitra</h1>
                <p className="text-[0.6rem] text-muted-foreground mt-0.5">CMS Dashboard</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <p className="px-2 mb-2 text-[0.6rem] uppercase tracking-[0.15em] font-semibold text-muted-foreground/60">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.to, item.exact);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        activeOptions={{ exact: item.exact }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                          sidebarCollapsed ? "justify-center px-2" : "",
                          active
                            ? "bg-foreground/5 text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-foreground" : "text-muted-foreground/60")} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User area */}
          <div className={cn(
            "border-t border-border/60 p-3",
            sidebarCollapsed ? "flex flex-col items-center gap-2" : "",
          )}>
            <div className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              sidebarCollapsed ? "flex-col px-0" : "hover:bg-secondary/40 transition-colors",
            )}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-foreground/80 to-foreground/40 flex items-center justify-center text-[0.65rem] font-semibold text-background shrink-0">
                {userInitial}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate leading-tight">{user?.email ?? "Unknown"}</p>
                  <p className="text-[0.6rem] text-muted-foreground truncate leading-tight mt-0.5">
                    {isSuperAdmin ? "Super Admin" : userRole || "User"}
                  </p>
                </div>
              )}
            </div>
            {sidebarCollapsed && (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            )}
          </div>
        </aside>

        {/* ── Main area ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Top bar (mobile and desktop) */}
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border/60">
            <div className="flex items-center justify-between px-4 md:px-8 h-14">
              {/* Mobile hamburger-style nav */}
              <div className="md:hidden flex items-center gap-4">
                <h1 className="text-sm font-semibold">Admin</h1>
              </div>
              <div className="md:hidden flex items-center gap-3 text-xs">
                <Link to="/admin" activeOptions={{ exact: true }} className="px-2 py-1 text-muted-foreground hover:text-foreground">Posts</Link>
                <Link to="/admin/new" className="px-2 py-1 text-muted-foreground hover:text-foreground">New</Link>
                <Link to="/admin/books" className="px-2 py-1 text-muted-foreground hover:text-foreground">Books</Link>
                <Link to="/admin/pages" className="px-2 py-1 text-muted-foreground hover:text-foreground">Pages</Link>
                <Link to="/admin/media" className="px-2 py-1 text-muted-foreground hover:text-foreground">Media</Link>
                <Link to="/admin/comments" className="px-2 py-1 text-muted-foreground hover:text-foreground">Mod</Link>
                <Link to="/admin/navigation" className="px-2 py-1 text-muted-foreground hover:text-foreground">Nav</Link>
                <Link to="/admin/taxonomy" className="px-2 py-1 text-muted-foreground hover:text-foreground">Tax</Link>
                {showUsers && <Link to="/admin/users" className="px-2 py-1 text-muted-foreground hover:text-foreground">Users</Link>}
                <Link to="/admin/audit" className="px-2 py-1 text-muted-foreground hover:text-foreground">Audit</Link>
                <Link to="/admin/settings" className="px-2 py-1 text-muted-foreground hover:text-foreground">Settings</Link>
                <button onClick={() => signOut()} className="px-2 py-1 text-muted-foreground hover:text-foreground">Exit</button>
              </div>

              {/* Desktop breadcrumb area */}
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground/60">Dashboard</span>
                <CurrentPageLabel currentPath={currentPath} />
              </div>

              {/* Right area */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View site →
                </Link>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

/** Show the current page label in the top bar breadcrumb. */
function CurrentPageLabel({ currentPath }: { currentPath: string }) {
  const labels: Record<string, string> = {
    "/admin": "Posts",
    "/admin/new": "New Post",
    "/admin/books": "Books",
    "/admin/pages": "Pages",
    "/admin/media": "Media",
    "/admin/comments": "Moderation",
    "/admin/navigation": "Navigation",
    "/admin/taxonomy": "Taxonomy",
    "/admin/users": "Users",
    "/admin/audit": "Audit Log",
    "/admin/settings": "Settings",
  };
  const label = labels[currentPath] || Object.entries(labels).find(([path]) =>
    currentPath.startsWith(path + (path === "/admin" ? "" : "/")),
  )?.[1];
  if (!label) return null;
  return (
    <>
      <span className="text-muted-foreground/30 mx-1">/</span>
      <span className="font-medium">{label}</span>
    </>
  );
}
