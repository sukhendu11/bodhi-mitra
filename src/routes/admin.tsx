import { createFileRoute, Outlet, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuth";
import { checkAdminAccess } from "@/lib/admin-access";
import { seoHead } from "@/lib/seo";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { MockAdminPanel } from "@/components/admin/mock/MockAdminPanel";
import { isMockMode } from "@/lib/data-source";
import { getMockSession, getMockUserRole } from "@/lib/mock-session";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || "https://cms.sabbesatta.com";

function isMockAdmin(): boolean {
  if (!isMockMode()) return false;
  const role = getMockUserRole();
  return role === "super_admin" || role === "admin";
}

/* ─── Route ──────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin")({
  head: () => seoHead({
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

function AdminShell() {
  const { user } = useAuthSession();

  // Mock mode — render the offline mock admin panel
  if (isMockMode() && isMockAdmin()) {
    return <MockAdminPanel session={getMockSession()} />;
  }

  // Production path — Strapi redirect shell (own hooks live here)
  return <StrapiShell user={user} />;
}

function StrapiShell({ user }: { user: ReturnType<typeof useAuthSession>["user"] }) {
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss banner after a delay or if previously dismissed
  useEffect(() => {
    const bannerDismissed = localStorage.getItem("strapi-banner-dismissed");
    if (bannerDismissed === "true") setDismissed(true);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("strapi-banner-dismissed", "true");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <h1 className="font-serif text-3xl text-foreground mb-4">Verifying access…</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner — Strapi migration notice */}
      {!dismissed && (
        <div className="relative border-b border-amber-400/20 bg-gradient-to-r from-amber-50/90 to-amber-100/70 dark:from-amber-950/15 dark:to-amber-900/10 px-4 py-2">
          <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.18em] font-semibold text-amber-700 dark:text-amber-400 bg-amber-200/50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                CMS
              </span>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/60">
                Content is now managed via Strapi CMS. The legacy admin panel has been replaced.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="p-0.5 rounded text-amber-600/40 hover:text-amber-700 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-secondary/60 flex items-center justify-center mb-6">
          <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M3 9h18" />
          </svg>
        </div>

        <h1 className="font-serif text-3xl text-foreground mb-3">Admin Panel</h1>
        <p className="text-base text-muted-foreground mb-8 max-w-sm mx-auto">
          Content management has moved to Strapi CMS. Use the button below to access the admin panel.
        </p>

        {/* Strapi CTA */}
        <BrandCtaButton asChild className="px-6 py-3">
          <a
            href={STRAPI_URL + "/admin"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Open Strapi Admin
          </a>
        </BrandCtaButton>

        {/* Quick links */}
        <div className="mt-10 pt-8 border-t border-border/40 max-w-xs mx-auto space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to site
          </Link>
        </div>
      </div>

      {/* Render outlet for child routes that may still exist briefly */}
      <Outlet />
    </div>
  );
}
