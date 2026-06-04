import { createFileRoute, Outlet, Link, redirect, isRedirect } from "@tanstack/react-router";
import { signOut, isHardcodedAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
        .eq("role", "admin")
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

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Demo environment banner */}
      <div className="mb-8 border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm">
        <div className="flex items-center gap-3">
          <span className="text-amber-700 dark:text-amber-400 text-xs uppercase tracking-[0.2em] font-semibold shrink-0">
            ⚠ Demo
          </span>
          <p className="text-xs text-amber-800 dark:text-amber-300/80">
            This is a demo environment. Data may be reset at any time.
          </p>
        </div>
        <p className="text-[0.6rem] text-amber-600 dark:text-amber-400/60 font-mono truncate">
          admin@bodhimitra.test / BodhiMitra@2026!Demo
        </p>
      </div>
      <header className="flex items-center justify-between border-b border-border pb-6 mb-10">
        <div>
          <h1 className="font-serif text-3xl">Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your journal</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link to="/admin" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground">
            Posts
          </Link>
          <Link to="/admin/new" activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground">
            New post
          </Link>
          <Link to="/admin/settings" activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground">
            Site Settings
          </Link>
          <button onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
