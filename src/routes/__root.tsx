import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
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
import { LanguageProvider, useLang, pickLocalized } from "@/lib/i18n";
import { SiteSettingsProvider, useSiteSettings, fetchSiteSettings, DEFAULT_CONFIG } from "@/lib/siteSettings";
import { fetchPublicNavItems, buildNavTree, type NavTreeNode } from "@/lib/navigation";
import { LangToggle } from "@/components/LangToggle";
import { NavDropdown } from "@/components/NavDropdown";
import { MobileNav } from "@/components/MobileNav";
import { ScrollToTop } from "@/components/ScrollToTop";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">This page has drifted into stillness.</p>
        <Link to="/" className="mt-8 inline-block border-b border-foreground/40 pb-0.5 text-sm tracking-wide hover:border-foreground">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl">Something didn't load</h1>
        <p className="mt-3 text-sm text-muted-foreground">Take a breath, and try again.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 border-b border-foreground/40 pb-0.5 text-sm tracking-wide hover:border-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => fetchSiteSettings().catch(() => DEFAULT_CONFIG),
  head: ({ loaderData }) => {
    const cfg = loaderData ?? DEFAULT_CONFIG;
    const siteName = cfg.branding.site_name_en || "Bodhi Mitra";
    const tagline = "Where Ancient Wisdom Meets Modern Psychology";
    const fullTitle = `${siteName} — ${tagline}`;
    const metaDesc = cfg.seo.meta_desc_en || "A serene blog blending Buddhist teachings with modern mental health, by practicing psychiatrists.";
    const ogImage = cfg.seo.og_image_url || "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/11cf2395-0332-4caa-9d73-3ad5cf777114/id-preview-36f7f9ee--2d38f8d2-888c-45a0-8b23-e5cefe82af66.lovable.app-1779959858012.png";

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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

/* ─── Navigation hook ──────────────────────────────────────────── */

/** Fetch public nav items and build the tree. */
function usePublicNavigation() {
  return useQuery({
    queryKey: ["public-nav"],
    queryFn: async () => {
      const items = await fetchPublicNavItems();
      return buildNavTree(items);
    },
    staleTime: 60_000,
  });
}

/** Resolve a nav item's label for the current language. */
function navLabel(item: NavTreeNode, lang: "en" | "bn"): string {
  return lang === "bn" && item.label_bn?.trim() ? item.label_bn.trim() : item.label_en;
}

/* ─── Header ───────────────────────────────────────────────────────────── */

function NavLinkItem({ node, linkCls, activeLinkCls, lang }: { node: NavTreeNode; linkCls: string; activeLinkCls: string; lang: "en" | "bn" }) {
  if (node.type === "external") {
    return (
      <a
        href={node.url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkCls}
      >
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

function Header() {
  const { user } = useAuthSession();
  const { data: isAdmin } = useIsAdmin(user);
  const { lang } = useLang();
  const settings = useSiteSettings();
  const currentPath = useRouterState({ select: (s) => s.location.href });
  const { data: navTree = [] } = usePublicNavigation();
  const loginSearch = { message: "", redirect: currentPath === "/login" ? "/" : currentPath };

  const brandName = pickLocalized(settings.branding.site_name_en, settings.branding.site_name_bn, lang);
  const logoUrl = settings.branding.logo_url;
  const logoMaxW = settings.branding.logo_max_width;

  const linkCls = "group relative inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200";
  const activeLinkCls = "text-foreground";

  const signInCls =
    "px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 hover:brightness-110";
  const signInStyle = { backgroundColor: "var(--color-saffron)" };

  // Build nav structures from the dynamic tree (preserving sort_order)
  const dropdownGroups = navTree.filter((n) => n.type === "dropdown");
  // Flat nav for mobile: only top-level non-dropdown items
  // (dropdown groups are passed separately via the `groups` prop)
  const mobileItems = navTree.filter((n) => n.type !== "dropdown");

  return (
    <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        {/* Brand */}
        <Link to="/" className="font-serif text-2xl tracking-tight flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} style={{ maxWidth: logoMaxW, maxHeight: 56 }} className="object-contain" />
          ) : (
            <span>{brandName}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {/* All nav items interleaved by sort_order */}
          {navTree.map((item) =>
            item.type === "dropdown" ? (
              <NavDropdown
                key={item.id}
                triggerLabel={navLabel(item, lang)}
                items={item.children.map((child) => ({
                  to: child.type === "external" ? child.url : (child.slug || "/"),
                  label: navLabel(child, lang),
                  external: child.type === "external",
                }))}
              />
            ) : (
              <NavLinkItem key={item.id} node={item} linkCls={linkCls} activeLinkCls={activeLinkCls} lang={lang} />
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

          <LangToggle />

          {/* Sign in / out */}
          {user ? (
            <button onClick={() => signOut()} className={linkCls}>
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              search={loginSearch}
              className={signInCls}
              style={signInStyle}
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger + sheet */}
        <div className="md:hidden flex items-center gap-3">
          <LangToggle className="shrink-0" />
          <MobileNav
            items={mobileItems.map((item) => ({
              to: item.type === "external" ? item.url : (item.slug || "/"),
              label: navLabel(item, lang),
            }))}
            groups={dropdownGroups.map((group) => ({
              label: navLabel(group, lang),
              items: group.children.map((child) => ({
                to: child.type === "external" ? child.url : (child.slug || "/"),
                label: navLabel(child, lang),
              })),
            }))}
            isAdmin={!!isAdmin}
            isSignedIn={!!user}
            adminLabel="Admin"
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
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label}
      className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-[0.6rem] font-medium text-muted-foreground/60 hover:text-foreground hover:border-foreground/30 hover:bg-secondary/40 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-200">
      {children}
    </a>
  );
}

function Footer() {
  const { lang } = useLang();
  const s = useSiteSettings();
  const { data: navTree = [] } = usePublicNavigation();
  const brandName = pickLocalized(s.branding.site_name_en, s.branding.site_name_bn, lang);
  const tagline = pickLocalized(s.footer.text_en, s.footer.text_bn, lang);
  const copyrightTpl = pickLocalized(s.footer.copyright_en, s.footer.copyright_bn, lang);
  const copyright = copyrightTpl.replace("{year}", String(new Date().getFullYear()));

  const hasSocial = s.social.facebook || s.social.twitter || s.social.instagram || s.social.linkedin || s.social.youtube;

  // Build footer columns from the nav tree
  const dropdownGroups = navTree.filter((n) => n.type === "dropdown");
  const topLevelLinks = navTree.filter((n) => n.type !== "dropdown");
  const footerSections = [
    ...dropdownGroups.map((g) => ({
      title: navLabel(g, lang),
      links: g.children.map((c) => ({
        key: c.id,
        to: c.type === "external" ? c.url : (c.slug || "/"),
        label: navLabel(c, lang),
        external: c.type === "external",
      })),
    })),
    {
      title: lang === "bn" ? "অন্বেষণ" : "Explore",
      links: topLevelLinks.map((n) => ({
        key: n.id,
        to: n.type === "external" ? n.url : (n.slug || "/"),
        label: navLabel(n, lang),
        external: n.type === "external",
      })),
    },
  ].filter((s) => s.links.length > 0);

  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/10">
      {/* Main footer grid */}
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-4 md:gap-8">
          {/* Column 1: Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="font-serif text-lg text-foreground hover:opacity-80 hover:translate-x-0.5 transition-all duration-200">
              {brandName}
            </Link>
            <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
              {tagline}
            </p>
            {hasSocial && (
              <div className="flex items-center gap-2 mt-5">
                <SocialIcon href={s.social.facebook} label="Facebook">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </SocialIcon>
                <SocialIcon href={s.social.twitter} label="Twitter / X">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </SocialIcon>
                <SocialIcon href={s.social.instagram} label="Instagram">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </SocialIcon>
                <SocialIcon href={s.social.linkedin} label="LinkedIn">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </SocialIcon>
                <SocialIcon href={s.social.youtube} label="YouTube">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </SocialIcon>
              </div>
            )}
          </div>

          {/* Dynamic footer columns from nav tree */}
          {footerSections.map((section) => (
            <FooterSection key={section.title} title={section.title}>
              {section.links.map((link) => (
                <FooterLink key={link.key} to={link.to} label={link.label} external={link.external} />
              ))}
            </FooterSection>
          ))}

          {/* Email from contact settings (always last column) */}
          {s.contact.email && (
            <FooterSection title={lang === "bn" ? "যোগাযোগ" : "Contact"}>
              <a
                href={`mailto:${s.contact.email}`}
                className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors block"
              >
                {s.contact.email}
              </a>
            </FooterSection>
          )}
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.65rem] text-muted-foreground/50">
          <span>{copyright}</span>
          <span className="hidden sm:inline">·</span>
          <span>
            Made with{' '}
            <span className="text-rose-400/70 inline-block hover:scale-125 active:scale-150 transition-transform duration-300 cursor-default">&#10084;</span>
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

  // Scroll to top on every route change
  useEffect(() => {
    const unsub = router.subscribe("onBeforeLoad", () => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    return () => unsub?.();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SiteSettingsProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1"><Outlet /></main>
            <Footer />
          </div>
          <ScrollToTop />
          <Toaster position="bottom-center" />
        </SiteSettingsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
