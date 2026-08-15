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
  // Preview seam: in mock mode the Refine admin is the DEFAULT (P2 admin
  // direction). The legacy MockAdminPanel remains reachable via ?admin=mock
  // as a fallback per the Mock Data Removal Strategy, until its features are
  // fully covered by the Refine admin and it can be removed.
  const search = useSearch({ strict: false }) as { admin?: string };
  const previewMock = search.admin === "mock";

  // Not signed in / still loading — neutral shell (avoids hydration mismatch).
  if (loading || (!isMockMode() && !user)) {
    return <VerifyingShell />;
  }

  // Mock mode: the RBAC-aware Refine shell is the default for every role
  // (super_admin/admin/editor). The old MockAdminPanel renders only via the
  // ?admin=mock preview seam.
  if (isMockMode()) {
    if (previewMock) return <MockAdminPanel session={getMockSession()} />;
    return <RefineAdminApp />;
  }

  // Real mode — the Refine + shadcn admin inside the app (P2, AD-029).
  // Replaces the former Strapi redirect shell (superseded 2026-08-14).
  return <RefineAdminApp />;
}
