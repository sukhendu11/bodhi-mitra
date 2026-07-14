import { createFileRoute, Outlet, Link, redirect, isRedirect } from "@tanstack/react-router";
import { Refine } from "@refinedev/core";
import { isHardcodedAdmin, useAuthSession, useUserRole, canManageUsers } from "@/hooks/useAuth";
import { checkAdminAccess } from "@/lib/admin.functions";
import { ErrorPage } from "@/components/error-page";
import { CommandPalette } from "@/components/admin/command-palette";
import {
  useAdminKeyboardShortcuts,
  KeyboardShortcutsHelp,
} from "@/components/admin/keyboard-shortcuts";
import { AdminSidebar, type NavSection } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-topbar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminInspector } from "@/components/admin/admin-inspector";
import { AdminStatusBar } from "@/components/admin/admin-status-bar";
import { PreferencesPanel } from "@/components/admin/preferences-panel";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentItems } from "@/hooks/useRecentItems";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  refineDataProvider,
  refineAuthProvider,
  refineAccessControlProvider,
  refineResources,
} from "@/integrations/refine";
import { createContext, useContext, useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  ImageIcon,
  Video,
  Menu,
  ShoppingCart,
  Users,
  Settings,
  MessageSquare,
  FolderTree,
  Activity,
  Globe,
  Layers,
  Palette,
  Shield,
  History,
  ArrowRightLeft,
  Ticket,
  type LucideIcon,
  X,
} from "lucide-react";

/* ─── Command palette context ────────────────────────────────────── */

const CommandContext = createContext<{ open: () => void }>({ open: () => {} });

export function useCommandPalette() {
  return useContext(CommandContext);
}

/* ─── Route ──────────────────────────────────────────────────────── */

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

/* ─── Navigation config ──────────────────────────────────────────── */

function buildNavSections(
  userRole: string | null | undefined,
  isSuperAdmin: boolean,
): NavSection[] {
  const showUsers = canManageUsers(userRole) || isSuperAdmin;
  return [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
    },
    {
      label: "Content",
      icon: FileText,
      items: [
        { to: "/admin/posts", label: "All Posts", icon: FileText, exact: false },
        { to: "/admin/pages", label: "Pages", icon: Globe, exact: false },
        { to: "/admin/media", label: "Media", icon: ImageIcon, exact: false },
        { to: "/admin/content-types", label: "Content Types", icon: Layers, exact: false },
        { to: "/admin/collections/types", label: "Collections", icon: Layers, exact: false },
      ],
    },
    {
      label: "Books",
      icon: BookOpen,
      items: [{ to: "/admin/books", label: "All Books", icon: BookOpen, exact: false }],
    },
    {
      label: "Videos",
      icon: Video,
      items: [{ to: "/admin/videos", label: "All Videos", icon: Video, exact: false }],
    },
    {
      label: "Courses",
      icon: BookOpen,
      items: [{ to: "/admin/courses", label: "All Courses", icon: BookOpen, exact: false }],
    },
    {
      label: "Navigation",
      icon: Menu,
      items: [{ to: "/admin/navigation", label: "Menu Builder", icon: Menu, exact: false }],
    },
    ...(showUsers
      ? [
          {
            label: "Users" as const,
            icon: Users as LucideIcon,
            items: [
              {
                to: "/admin/users",
                label: "Users & Roles",
                icon: Users as LucideIcon,
                exact: false,
              },
            ],
          },
        ]
      : []),
    {
      label: "Settings",
      icon: Settings,
      items: [{ to: "/admin/settings", label: "General", icon: Settings, exact: false }],
    },
    {
      label: "Commerce",
      icon: ShoppingCart,
      items: [
        { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
        { to: "/admin/coupons", label: "Coupons", icon: Ticket, exact: false },
      ],
    },
    {
      label: "Tools",
      icon: Activity,
      items: [
        { to: "/admin/comments", label: "Moderation", icon: MessageSquare, exact: false },
        { to: "/admin/taxonomy", label: "Taxonomy", icon: FolderTree, exact: false },
        { to: "/admin/security", label: "Security", icon: History, exact: false },
        { to: "/admin/audit", label: "Audit Log", icon: Activity, exact: false },
        { to: "/admin/permissions", label: "Permissions", icon: Shield, exact: false },
        { to: "/admin/redirects", label: "Redirects", icon: ArrowRightLeft, exact: false },
        { to: "/admin/tokens", label: "Design Tokens", icon: Palette, exact: false },
      ],
    },
  ].filter((s) => s.items.length > 0);
}

/* ─── Admin Layout ───────────────────────────────────────────────── */

function AdminLayout() {
  const { user } = useAuthSession();
  const { data: userRole } = useUserRole(user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const { favorites, toggleFavorite, isFavorite, removeFavorite, reorderFavorites, clearAllFavorites } =
    useFavorites();
  const { recentItems, clearRecent } = useRecentItems();

  useEffect(() => {
    setBannerDismissed(localStorage.getItem("admin-banner-dismissed") === "true");
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("admin-banner-dismissed", "true");
  };

  const openCommandPalette = () => setCommandOpen(true);

  const { showHelp, setShowHelp } = useAdminKeyboardShortcuts(openCommandPalette);

  const isSuperAdmin = isHardcodedAdmin(user) || userRole === "super_admin";
  const navSections = buildNavSections(userRole, isSuperAdmin);

  return (
    <CommandContext.Provider value={{ open: openCommandPalette }}>
      <TooltipProvider delayDuration={300}>
        <CommandPalette />
        <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
        <PreferencesPanel
          open={preferencesOpen}
          onClose={() => setPreferencesOpen(false)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarCollapsedChange={setSidebarCollapsed}
          inspectorCollapsed={inspectorCollapsed}
          onInspectorCollapsedChange={setInspectorCollapsed}
          onClearRecent={clearRecent}
          onClearFavorites={clearAllFavorites}
        />
        <Refine
          dataProvider={refineDataProvider}
          authProvider={refineAuthProvider}
          accessControlProvider={refineAccessControlProvider}
          resources={refineResources}
          options={{
            syncWithLocation: false,
            warnWhenUnsavedChanges: true,
            mutationMode: "pessimistic",
            disableTelemetry: true,
          }}
        >
          <div className="min-h-screen bg-background">
            {/* Demo banner */}
            {!bannerDismissed && (
              <div className="relative border-b border-amber-400/20 bg-gradient-to-r from-amber-50/90 to-amber-100/70 dark:from-amber-950/15 dark:to-amber-900/10 px-4 py-2">
                <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <span className="text-[0.5rem] uppercase tracking-[0.18em] font-semibold text-amber-700 dark:text-amber-400 bg-amber-200/50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                      Demo
                    </span>
                    <p className="text-[0.6rem] text-amber-700/70 dark:text-amber-300/60">
                      Data may be reset at any time.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[0.5rem] text-amber-600/50 dark:text-amber-400/40 font-mono hidden sm:block">
                      admin@bodhimitra.test
                    </p>
                    <button
                      onClick={dismissBanner}
                      className="p-0.5 rounded text-amber-600/40 hover:text-amber-700 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
                      aria-label="Dismiss banner"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3-column layout */}
            <div className="flex">
              {/* Left: Sidebar */}
              <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                sections={navSections}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                recentItems={recentItems}
                onOpenPreferences={() => setPreferencesOpen(true)}
              />

              {/* Center & Right: Workspace + Inspector */}
              <div className="flex-1 min-w-0 flex flex-col min-h-screen">
                {/* Top bar */}
                <AdminTopBar
                  user={user}
                  userRole={userRole}
                  isSuperAdmin={isSuperAdmin}
                  openCommandPalette={openCommandPalette}
                />

                {/* Mobile nav */}
                <AdminMobileNav collapsed={sidebarCollapsed} />

                {/* Main content area + Inspector */}
                <div className="flex flex-1">
                  {/* Center: Workspace */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8">
                      <Outlet />
                    </main>
                    {/* Status Bar */}
                    <AdminStatusBar
                      userEmail={user?.email}
                      userRole={userRole}
                    />
                  </div>

                  {/* Right: Inspector (desktop only) */}
                  <AdminInspector
                    collapsed={inspectorCollapsed}
                    onToggle={() => setInspectorCollapsed(!inspectorCollapsed)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Refine>
      </TooltipProvider>
    </CommandContext.Provider>
  );
}
