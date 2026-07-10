import { createFileRoute, Outlet, Link, redirect, isRedirect, useRouterState  } from "@tanstack/react-router";
import { signOut, isHardcodedAdmin, useAuthSession, useUserRole } from "@/hooks/useAuth";
import { canManageUsers } from "@/hooks/useRole";
import { checkAdminAccess } from "@/lib/admin.functions";
import { ErrorPage } from "@/components/error-page";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, PlusCircle, BookOpen, ImageIcon, Video, Menu, Palette, Users, Settings, MessageSquare, FolderTree, Activity, Globe, Search, LogOut, PanelLeftClose, PanelLeft, ChevronDown, type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Dashboard — Bodhi Mitra CMS" }] }),
  beforeLoad: async ({ location }) => {
    try {
      await checkAdminAccess();
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({
        to: "/login",
        search: { message: "Please sign in as an admin to continue.", redirect: location.href },
      });
    }
  },
  component: AdminLayout,
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
});

/* ─── Navigation config ─────────────────────────────────────────────── */

interface NavSection {
  label: string;
  icon: LucideIcon;
  items: {
    to: string;
    label: string;
    icon: LucideIcon;
    exact: boolean;
    requires?: string;
  }[];
}

/* ─── Admin Layout ────────────────────────────────────────────────── */

function AdminLayout() {
  const { user } = useAuthSession();
  const { data: userRole } = useUserRole(user);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isSuperAdmin = isHardcodedAdmin(user) || userRole === "super_admin";
  const showUsers = canManageUsers(userRole) || isSuperAdmin;

  const navSections: NavSection[] = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      ],
    },
    {
      label: "Content",
      icon: FileText,
      items: [
        { to: "/admin", label: "Posts", icon: FileText, exact: true },
        { to: "/admin/new", label: "New Post", icon: PlusCircle, exact: false },
        { to: "/admin/pages", label: "Pages", icon: Globe, exact: false },
        { to: "/admin/media", label: "Media Library", icon: ImageIcon, exact: false },
      ],
    },
    {
      label: "Books",
      icon: BookOpen,
      items: [
        { to: "/admin/books", label: "All Books", icon: BookOpen, exact: false },
      ],
    },
    {
      label: "Videos",
      icon: Video,
      items: [
        { to: "/admin/videos", label: "All Videos", icon: Video, exact: false },
      ],
    },
    {
      label: "Courses",
      icon: BookOpen,
      items: [
        { to: "/admin/courses", label: "All Courses", icon: BookOpen, exact: false },
      ],
    },
    {
      label: "Navigation",
      icon: Menu,
      items: [
        { to: "/admin/navigation", label: "Menu Builder", icon: Menu, exact: false },
      ],
    },
    {
      label: "Appearance",
      icon: Palette,
      items: [
        { to: "/admin/settings", label: "Theme Settings", icon: Palette, exact: false },
      ],
    },
    ...(showUsers
      ? [
          {
            label: "Users" as const,
            icon: Users as LucideIcon,
            items: [
              { to: "/admin/users" as const, label: "Users & Roles" as const, icon: Users as LucideIcon, exact: false },
            ],
          },
        ]
      : []),
    {
      label: "Settings",
      icon: Settings,
      items: [
        { to: "/admin/settings", label: "General", icon: Settings, exact: false },
      ],
    },
    {
      label: "Tools",
      icon: Activity,
      items: [
        { to: "/admin/comments", label: "Moderation", icon: MessageSquare, exact: false },
        { to: "/admin/taxonomy", label: "Taxonomy", icon: FolderTree, exact: false },
        { to: "/admin/audit", label: "Audit Log", icon: Activity, exact: false },
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
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside
          className={cn(
            "hidden md:flex md:flex-col border-r border-border/60 bg-white dark:bg-zinc-900 transition-all duration-300 z-20",
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
              <Link to="/admin" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                  <span className="text-[0.5rem] font-bold text-background">BM</span>
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight leading-tight">Bodhi Mitra</h1>
                  <p className="text-[0.55rem] text-muted-foreground leading-tight">CMS Dashboard</p>
                </div>
              </Link>
            )}
            {sidebarCollapsed && (
              <Link to="/admin" className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                <span className="text-[0.5rem] font-bold text-background">BM</span>
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
            {navSections.map((section) => {
              const SectionIcon = section.icon;
              const sectionActive = section.items.some((item) => isActive(item.to, item.exact));
              return (
                <div key={section.label}>
                  <div className={cn(
                    "flex items-center gap-2 px-2 mb-1.5",
                    sidebarCollapsed ? "justify-center" : "",
                  )}>
                    <SectionIcon className={cn(
                      "h-3 w-3",
                      sectionActive ? "text-foreground" : "text-muted-foreground/40",
                    )} />
                    {!sidebarCollapsed && (
                      <p className={cn(
                        "text-[0.55rem] uppercase tracking-[0.12em] font-semibold",
                        sectionActive ? "text-foreground/70" : "text-muted-foreground/50",
                      )}>
                        {section.label}
                      </p>
                    )}
                  </div>
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
                            "flex items-center gap-3 rounded-lg text-sm transition-all duration-150 relative group",
                            sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                            active
                              ? "bg-foreground/5 text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                          )}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          {active && !sidebarCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground rounded-full" />
                          )}
                          <Icon className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            active ? "text-foreground" : "text-muted-foreground/60 group-hover:scale-110",
                          )} />
                          {!sidebarCollapsed && <span className="text-xs">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="border-t border-border/60 px-3 py-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5 mx-auto" /> : <><PanelLeftClose className="h-3.5 w-3.5" /> Collapse</>}
            </button>
          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* ── Top Bar ─────────────────────────────────────────────── */}
          <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-border/60">
            <div className="flex items-center justify-between px-4 md:px-6 h-14">
              {/* Left: Mobile menu + page title */}
              <div className="flex items-center gap-3">
                {/* Mobile nav toggle */}

                {/* Page title */}
                <CurrentPageLabel currentPath={currentPath} />
              </div>

              {/* Center: Search (desktop) */}
              <div className="hidden md:flex relative max-w-xs flex-1 mx-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <input
                  type="text"
                  readOnly
                  placeholder="Search anything…"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border/50 rounded-lg bg-secondary/30 cursor-not-allowed opacity-70"
                  title="Global search coming soon"
                />
              </div>

              {/* Right: Actions + User */}
              <div className="flex items-center gap-2">
                {/* Notifications bell */}
                <NotificationBell />

                {/* View site */}
                <Link
                  to="/"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:border-border hover:bg-secondary/40 transition-all"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Site
                </Link>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-foreground/80 to-foreground/40 flex items-center justify-center text-[0.55rem] font-semibold text-background shrink-0">
                      {userInitial}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-medium leading-tight truncate max-w-[120px]">{user?.email ?? "Unknown"}</p>
                      <p className="text-[0.5rem] text-muted-foreground leading-tight mt-0.5">
                        {isSuperAdmin ? "Super Admin" : userRole || "User"}
                      </p>
                    </div>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-muted-foreground/50 transition-transform",
                      showUserMenu ? "rotate-180" : "",
                    )} />
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-lg overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-border/40">
                        <p className="text-xs font-medium truncate">{user?.email ?? "Unknown"}</p>
                        <p className="text-[0.55rem] text-muted-foreground mt-0.5">
                          {isSuperAdmin ? "Super Admin" : userRole || "User"}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to="/"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Site
                        </Link>
                      </div>
                      <div className="border-t border-border/40 p-1.5">
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile search (below top bar) */}
            <div className="md:hidden px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <input
                  type="text"
                  readOnly
                  placeholder="Search anything…"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border/50 rounded-lg bg-secondary/30 cursor-not-allowed opacity-70"
                  title="Global search coming soon"
                />
              </div>
            </div>


            {/* Mobile bottom nav */}
            <div className="md:hidden border-t border-border/40 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-around px-2 py-1.5 overflow-x-auto gap-1">
                <MobileNavLink to="/admin" label="Dashboard" icon={LayoutDashboard} exact />
                <MobileNavLink to="/admin/books" label="Books" icon={BookOpen} />
                <MobileNavLink to="/admin/videos" label="Videos" icon={Video} />
                <MobileNavLink to="/admin/courses" label="Courses" icon={BookOpen} />
                <MobileNavLink to="/admin/pages" label="Pages" icon={Globe} />
                <MobileNavLink to="/admin/media" label="Media" icon={ImageIcon} />
                <MobileNavLink to="/admin/navigation" label="Nav" icon={Menu} />
                <MobileNavLink to="/admin/comments" label="Mod" icon={MessageSquare} />
                <MobileNavLink to="/admin/settings" label="Settings" icon={Settings} />
              </div>
            </div>
          </header>

          {/* ── Quick actions floating bar ─────────────────────────────── */}

          {/* Page content */}
          <main className="px-4 md:px-6 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile nav link ─────────────────────────────────────────────── */

function MobileNavLink({ to, label, icon: Icon, exact }: { to: string; label: string; icon: LucideIcon; exact?: boolean }) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? currentPath === to : currentPath.startsWith(to + (to === "/admin" ? "" : "/")) || currentPath === to;

  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className={cn(
        "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors shrink-0",
        active ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[0.45rem] font-medium uppercase tracking-[0.05em]">{label}</span>
    </Link>
  );
}

/* ─── Current Page Label ──────────────────────────────────────────── */

/** Show the current page label in the top bar breadcrumb. */
function CurrentPageLabel({ currentPath }: { currentPath: string }) {
  const labels: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/new": "New Post",
    "/admin/books": "Books",
    "/admin/videos": "Videos",
    "/admin/courses": "Courses",
    "/admin/pages": "Pages",
    "/admin/media": "Media Library",
    "/admin/comments": "Moderation",
    "/admin/navigation": "Navigation",
    "/admin/taxonomy": "Taxonomy",
    "/admin/users": "Users & Roles",
    "/admin/audit": "Audit Log",
    "/admin/settings": "Settings",
  };
  const label = labels[currentPath] || Object.entries(labels).find(([path]) =>
    currentPath.startsWith(path + (path === "/admin" ? "" : "/")),
  )?.[1];
  if (!label) return null;
  return (
    <h1 className="text-sm font-semibold tracking-tight truncate max-w-[200px]">
      {label}
    </h1>
  );
}
