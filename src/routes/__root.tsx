import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { useAuthSession, useIsAdmin, signOut } from "@/hooks/useAuth";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { SiteSettingsProvider, fetchSiteSettings, DEFAULT_CONFIG, useSiteSettings } from "@/lib/siteSettings";
import { useLayout, LayoutProvider } from "@/lib/layout-engine";
import type { NavTreeNode } from "@/lib/navigation";
import { LangToggle } from "@/components/LangToggle";
import { NavDropdown } from "@/components/NavDropdown";
import { MobileNav } from "@/components/MobileNav";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorPage, NotFoundPage } from "@/components/error-page";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCartCount } from "@/lib/cart";
import { Search, ShoppingCart } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { AiChatPanel } from "@/components/AiChatPanel";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => fetchSiteSettings().catch(() => DEFAULT_CONFIG),
  head: ({ loaderData }) => {
    const cfg = loaderData ?? DEFAULT_CONFIG;
    const siteName = cfg.branding.site_name_en || "Bodhi Mitra";
    const tagline = "Where Ancient Wisdom Meets Modern Psychology";
    const fullTitle = `${siteName} — ${tagline}`;
    const metaDesc =
      cfg.seo.meta_desc_en ||
      "A serene blog blending Buddhist teachings with modern mental health, by practicing psychiatrists.";
    const ogImage = cfg.seo.og_image_url || "";

    // Build Google Fonts URL from theme settings
    const fonts = new Set<string>();
    const addFont = (family: string) => {
      const name = family.split(",")[0].trim().replace(/"/g, "");
      if (name && name !== "system-ui" && name !== "sans-serif" && name !== "serif" && name !== "monospace") {
        fonts.add(name);
      }
    };
    addFont(cfg.theme.font_heading);
    addFont(cfg.theme.font_body);
    addFont(cfg.theme.font_bn);
    // Always include defaults as fallback
    fonts.add("Cormorant Garamond");
    fonts.add("Inter");
    fonts.add("Hind Siliguri");

    const fontParams = Array.from(fonts)
      .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700`)
      .join("&");
    const fontsUrl = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: fullTitle },
        { name: "description", content: metaDesc },
        { property: "og:title", content: fullTitle },
        { name: "twitter:title", content: fullTitle },
        { property: "og:description", content: metaDesc },
        { name: "twitter:description", content: metaDesc },
        { property: "og:image", content: ogImage },
        { name: "twitter:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:type", content: "website" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: fontsUrl,
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/* ─── Maintenance Gate ────────────────────────────────────────────── */

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const config = useSiteSettings();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const { data: isAdmin } = useIsAdmin(user);

  // Admins always see the site (for maintenance management)
  if (isAdmin) return <>{children}</>;

  // Maintenance mode off — render normally
  if (!config.maintenance.enabled) return <>{children}</>;

  // Maintenance page
  const message = lang === "bn" && config.maintenance.message_bn
    ? config.maintenance.message_bn
    : config.maintenance.message_en;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-secondary/60 flex items-center justify-center">
          <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl font-semibold">We&rsquo;ll be back soon</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground/60">{config.branding.site_name_en || "Bodhi Mitra"}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Navigation helper (pure render helper, no data fetching) ── */

/** Resolve a nav item's label for the current language. */
function navLabel(item: NavTreeNode, lang: "en" | "bn"): string {
  return lang === "bn" && item.label_bn?.trim() ? item.label_bn.trim() : item.label_en;
}

/* ─── Header ───────────────────────────────────────────────────────────── */

function NavLinkItem({
  node,
  linkCls,
  activeLinkCls,
  lang,
}: {
  node: NavTreeNode;
  linkCls: string;
  activeLinkCls: string;
  lang: "en" | "bn";
}) {
  if (node.type === "external") {
    return (
      <a href={node.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
        {navLabel(node, lang)}
        <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
      </a>
    );
  }
  const to = node.slug || "/";
  return (
    <Link
      to={to as any}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: `${activeLinkCls} ${linkCls}` }}
      className={linkCls}
    >
      {navLabel(node, lang)}
      <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
    </Link>
  );
}

function CartBadge() {
  const { user } = useAuthSession();
  const doGetCartCount = useServerFn(getCartCount);

  const { data: countData } = useQuery({
    queryKey: ["cart-count"],
    queryFn: () => (doGetCartCount as any)(),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const count = countData?.count ?? 0;

  if (!user || count === 0) return null;

  return (
    <Link
      to="/cart"
      className="group relative inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-foreground text-background text-[0.45rem] font-bold flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
      <span className="sr-only">Cart ({count})</span>
    </Link>
  );
}

function Header() {
  const { user } = useAuthSession();
  const { data: isAdmin } = useIsAdmin(user);
  const { lang } = useLang();
  const layout = useLayout();
  const config = useSiteSettings();
  const currentPath = useRouterState({ select: (s) => s.location.href });
  const loginSearch = { message: "", redirect: currentPath === "/login" ? "/" : currentPath };

  // Theme controls header visibility — if hidden, don't render
  if (!layout.headerVisible) return null;

  const linkCls =
    "group relative inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200";
  const activeLinkCls = "text-foreground";

  const signInCls =
    "px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 hover:brightness-110";
  const signInStyle = { backgroundColor: "var(--color-saffron)" };

  const isSticky = config.navigation?.sticky_header !== false;

  return (
    <header className={`border-b border-border/60 bg-background/60 backdrop-blur-md ${isSticky ? "sticky top-0 z-40" : ""}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        {/* Brand */}
        <Link to="/" className="font-serif text-2xl tracking-tight flex items-center gap-3">
          {layout.logoUrl ? (
            <img
              src={layout.logoUrl}
              alt={layout.brandName}
              style={{ maxWidth: layout.logoMaxWidth, maxHeight: 56 }}
              className="object-contain"
            />
          ) : (
            <span>{layout.brandName}</span>
          )}
        </Link>

        {/* Desktop nav — renders from Layout Engine ONLY */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {layout.navTree.map((item) =>
            item.type === "dropdown" ? (
              <NavDropdown
                key={item.id}
                triggerLabel={navLabel(item, lang)}
                items={item.children.map((child) => ({
                  to: child.type === "external" ? child.url : child.slug || "/",
                  label: navLabel(child, lang),
                  external: child.type === "external",
                }))}
              />
            ) : (
              <NavLinkItem
                key={item.id}
                node={item}
                linkCls={linkCls}
                activeLinkCls={activeLinkCls}
                lang={lang}
              />
            ),
          )}

          {/* Admin button */}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-200"
            >
              Admin
            </Link>
          )}

          {/* Search */}
          <Link to="/search" search={{ q: "", type: undefined, page: 1 }} className={linkCls}>
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Link>

          <LangToggle />

          {/* Sign in / out */}
          {user ? (
            <>
              <Link to="/books/library" search={{ search: "", page: 1 }} className={linkCls}>
                My Library
              </Link>
              <Link to="/bookmarks" className={linkCls}>
                Bookmarks
              </Link>
              <CartBadge />
              <Link to="/profile" className={linkCls}>
                Profile
              </Link>
              <button onClick={() => signOut()} className={linkCls}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" search={loginSearch} className={signInCls} style={signInStyle}>
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger + sheet */}
        <div className="md:hidden flex items-center gap-3">
          <LangToggle className="shrink-0" />
          <MobileNav
            items={layout.mobileItems.map((item) => ({
              to: item.type === "external" ? item.url : item.slug || "/",
              label: navLabel(item, lang),
            }))}
            groups={layout.dropdownGroups.map((group) => ({
              label: navLabel(group, lang),
              items: group.children.map((child) => ({
                to: child.type === "external" ? child.url : child.slug || "/",
                label: navLabel(child, lang),
              })),
            }))}
            isAdmin={!!isAdmin}
            isSignedIn={!!user}
            adminLabel="Admin"
            libraryLabel="My Library"
            bookmarksLabel="Bookmarks"
            profileLabel="Profile"
            signInLabel="Sign in"
            signOutLabel="Sign out"
            onSignOut={() => signOut()}
            loginSearch={loginSearch}
          />
        </div>
      </div>
    </header>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────────── */

function FooterLink({ to, label, external }: { to: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground/80 hover:text-foreground transition-all duration-200 hover:translate-x-0.5"
      >
        <span className="w-0 group-hover:w-2 h-px bg-foreground/40 transition-all duration-300 ease-out" />
        {label}
      </a>
    );
  }
  return (
    <Link
      to={to as any}
      className="group relative inline-flex items-center gap-1.5 text-sm text-muted-foreground/80 hover:text-foreground transition-all duration-200 hover:translate-x-0.5"
    >
      <span className="w-0 group-hover:w-2 h-px bg-foreground/40 transition-all duration-300 ease-out" />
      {label}
    </Link>
  );
}

function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.15em] font-medium text-muted-foreground/50 mb-3">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-[0.6rem] font-medium text-muted-foreground/60 hover:text-foreground hover:border-foreground/30 hover:bg-secondary/40 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-200"
    >
      {children}
    </a>
  );
}

function Footer() {
  const { lang } = useLang();
  const layout = useLayout();
  const hasSocial =
    layout.social.facebook ||
    layout.social.twitter ||
    layout.social.instagram ||
    layout.social.linkedin ||
    layout.social.youtube;

  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/10">
      {/* Main footer grid */}
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-4 md:gap-8">
          {/* Column 1: Brand */}
          <div className="md:col-span-1">
            <Link
              to="/"
              className="font-serif text-lg text-foreground hover:opacity-80 hover:translate-x-0.5 transition-all duration-200"
            >
              {layout.brandName}
            </Link>
            <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
              {layout.footerText}
            </p>
            {hasSocial && (
              <div className="flex items-center gap-2 mt-5">
                <SocialIcon href={layout.social.facebook} label="Facebook">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </SocialIcon>
                <SocialIcon href={layout.social.twitter} label="Twitter / X">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </SocialIcon>
                <SocialIcon href={layout.social.instagram} label="Instagram">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </SocialIcon>
                <SocialIcon href={layout.social.linkedin} label="LinkedIn">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </SocialIcon>
                <SocialIcon href={layout.social.youtube} label="YouTube">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </SocialIcon>
              </div>
            )}
            <div className="mt-6 border-t border-border/40 pt-5">
              {useFeatureFlag("newsletter_automation") && <NewsletterSignup compact />}
            </div>
          </div>

          {/* Dynamic footer columns from Layout Engine */}
          {layout.footerSections.map((section) => (
            <FooterSection key={section.title} title={section.title}>
              {section.links.map((link) => (
                <FooterLink
                  key={link.key}
                  to={link.to}
                  label={link.label}
                  external={link.external}
                />
              ))}
            </FooterSection>
          ))}

          {/* Contact info from settings (always last column) */}
          {(layout.contactEmail || layout.contactPhone) && (
            <FooterSection title={lang === "bn" ? "যোগাযোগ" : "Contact"}>
              {layout.contactEmail && (
                <a
                  href={`mailto:${layout.contactEmail}`}
                  className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors block"
                >
                  {layout.contactEmail}
                </a>
              )}
              {layout.contactPhone && (
                <a
                  href={`tel:${layout.contactPhone}`}
                  className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors block"
                >
                  {layout.contactPhone}
                </a>
              )}
            </FooterSection>
          )}
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.65rem] text-muted-foreground/50">
          <span>{layout.copyright}</span>
          <span className="hidden sm:inline">·</span>
          <span>
            Made with{" "}
            <span className="text-rose-400/70 inline-block hover:scale-125 active:scale-150 transition-transform duration-300 cursor-default">
              &#10084;
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root component ───────────────────────────────────────────────────── */

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminRoute = pathname.startsWith("/admin");

  // Scroll to top on every route change
  useEffect(() => {
    const unsub = router.subscribe("onBeforeLoad", () => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    return () => unsub?.();
  }, [router]);

  // ── Admin CMS: fully independent shell ──────────────────────────
  // No theme system, no layout engine, no public Header/Footer.
  // Shares only QueryClient (for data fetching) and Supabase (for auth).
  if (isAdminRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ErrorBoundary>
            <Outlet />
            <Toaster position="bottom-center" />
          </ErrorBoundary>
        </LanguageProvider>
      </QueryClientProvider>
    );
  }

  // ── Public frontend: full theme + layout engine ────────────────
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <LanguageProvider>
          <SiteSettingsProvider>
            <MaintenanceGate>
              <LayoutProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
              {useFeatureFlag("ai_chat") && <AiChatPanel />}
              <ScrollToTop />
              <Toaster position="bottom-center" />
              </LayoutProvider>
            </MaintenanceGate>
          </SiteSettingsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
