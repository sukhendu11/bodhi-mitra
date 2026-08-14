import { createFileRoute, redirect, isRedirect, useSearch } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuth";
import { checkAdminAccess } from "@/lib/admin-access";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { MockAdminPanel } from "@/components/admin/mock/MockAdminPanel";
import { RefineAdminApp } from "@/components/admin/refine/RefineAdminApp";
import { isMockMode } from "@/lib/data-source";
import { getMockSession, getMockUserRole } from "@/lib/mock-session";
import { canEnterAdmin } from "@/lib/admin/rbac";

function isMockAdmin(): boolean {
  if (!isMockMode()) return false;
  return canEnterAdmin(getMockUserRole());
}

/* ─── Route ──────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin")({
  head: () =>
    seoHead({
      title: "Admin",
      description: "Sabbe Satta content management.",
      path: "/admin",
      noIndex: true,
    }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    // Mock mode — the mock session is the source of truth (no Supabase).
    if (isMockMode()) {
      if (!isMockAdmin()) {
        throw redirect({
          to: "/login",
          search: { message: "Please sign in as an admin to continue.", redirect: location.href },
        });
      }
      return;
    }
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
  component: AdminShell,
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
});

/* ─── Admin Shell ────────────────────────────────────────────────── */

/**
 * SSR/hydration-safe gate: the session is only known on the client, so the
 * first server render shows a neutral "verifying" shell (no localStorage on
 * the server — matching the previous StrapiShell placeholder). Once the
 * client knows the session it renders the real panel.
 */
function VerifyingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <h1 className="font-serif text-2xl text-foreground">Verifying access…</h1>
    </div>
  );
}

function AdminShell() {
  const { user, loading } = useAuthSession();
  // Preview seam: ?admin=refine exercises the Refine admin offline in mock
  // mode (mock mode default stays MockAdminPanel for full admins per the
  // Mock Data Removal Strategy — the Refine admin replaces it in production
  // once verified).
  const search = useSearch({ strict: false }) as { admin?: string };
  const previewRefine = search.admin === "refine";

  // Not signed in / still loading — neutral shell (avoids hydration mismatch).
  if (loading || (!isMockMode() && !user)) {
    return <VerifyingShell />;
  }

  // Mock mode:
  //  - editor or above: admittable (isMockAdmin guard runs in beforeLoad).
  //  - full admins (super_admin/admin) get MockAdminPanel by default, with
  //    the RBAC-aware Refine shell via ?admin=refine preview.
  //  - limited roles (editor + in the future author/moderator) go straight
  //    to the Refine shell — it filters resources/actions by role (RBAC, P2).
  if (isMockMode()) {
    const role = getMockUserRole();
    const isFullAdmin = role === "super_admin" || role === "admin";
    if (previewRefine || !isFullAdmin) return <RefineAdminApp />;
    return <MockAdminPanel session={getMockSession()} />;
  }

  // Real mode — the Refine + shadcn admin inside the app (P2, AD-029).
  // Replaces the former Strapi redirect shell (superseded 2026-08-14).
  return <RefineAdminApp />;
}
