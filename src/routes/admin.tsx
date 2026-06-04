import { createFileRoute, Outlet, Link, redirect, isRedirect, useRouterState } from "@tanstack/react-router";
import { signOut, isHardcodedAdmin, useAuthSession, useUserRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { canManageUsers } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin" }] }),
  beforeLoad: async ({ location }) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        throw redirect({
          to: "/login",
          search: { message: "Please sign in as an admin to continue.", redirect: location.href },
        });
      }
      // Hardcoded admin bypass — grant access without user_roles check
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
      <h1 className="font-serif text-2xl mb-3">Something went wrong in Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 text-xs uppercase tracking-wider border border-border hover:bg-secondary">
        Try again
      </button>
    </div>
  ),
});

const navItems = [
  { to: "/admin" as const, label: "Posts", icon: "◇", exact: true },
  { to: "/admin/new" as const, label: "New Post", icon: "+", exact: false },
  { to: "/admin/users" as const, label: "Users", icon: "◈", exact: false, requires: "manage_users" },
  { to: "/admin/settings" as const, label: "Settings", icon: "≡", exact: false },
];

function AdminLayout() {
  const { user } = useAuthSession();
  const { data: userRole } = useUserRole(user);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const isSuperAdmin = isHardcodedAdmin(user) || userRole === "super_admin";
  const showUsers = canManageUsers(userRole) || isSuperAdmin;

  return (
    <div className="min-h-screen bg-background">
      {/* Demo banner - compact */}
      <div className="border-b border-amber-400/30 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-2">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 dark:text-amber-400 text-[0.6rem] uppercase tracking-[0.2em] font-semibold shrink-0">
              ⚠ Demo
            </span>
            <p className="text-[0.65rem] text-amber-800 dark:text-amber-300/70 truncate">
              This is a demo environment. Data may be reset at any time.
            </p>
          </div>
          <p className="text-[0.55rem] text-amber-600 dark:text-amber-400/50 font-mono shrink-0 hidden sm:block">
            admin@bodhimitra.test
          </p>
        </div>
      </div>

      {/* Sidebar + Content layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-border md:min-h-[calc(100vh-2.5rem)] md:sticky md:top-0 md:self-start">
          {/* Brand */}
          <div className="px-6 pt-8 pb-6 border-b border-border">
            <h1 className="font-serif text-lg tracking-tight">Admin</h1>
            <p className="text-[0.65rem] text-muted-foreground mt-0.5">Bodhi Mitra CMS</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              if (item.requires === "manage_users" && !showUsers) return null;
              const active = item.exact
                ? currentPath === item.to
                : currentPath.startsWith(item.to + (item.to === "/admin" ? "" : "/")) || currentPath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs uppercase tracking-[0.15em] transition-colors",
                    active
                      ? "bg-foreground/5 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                  )}
                >
                  <span className="w-4 text-center text-sm opacity-60">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User area */}
          <div className="px-3 py-4 border-t border-border">
            <div className="px-3 py-2.5 flex items-center gap-3">
              {user?.email ? (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[0.6rem] font-medium text-muted-foreground">
                  {user.email[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{user?.email || "Unknown"}</p>
                <p className="text-[0.6rem] text-muted-foreground truncate">
                  {isSuperAdmin ? "Super Admin" : userRole || "User"}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground shrink-0"
                title="Sign out"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h1 className="font-serif text-base">Admin</h1>
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.15em]">
              <Link to="/admin" activeOptions={{ exact: true }} className="text-muted-foreground hover:text-foreground">
                Posts
              </Link>
              <Link to="/admin/new" className="text-muted-foreground hover:text-foreground">
                + New
              </Link>
              {showUsers && (
                <Link to="/admin/users" className="text-muted-foreground hover:text-foreground">
                  Users
                </Link>
              )}
              <Link to="/admin/settings" className="text-muted-foreground hover:text-foreground">
                Settings
              </Link>
              <button onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
                Exit
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 py-10 md:px-10 lg:px-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
