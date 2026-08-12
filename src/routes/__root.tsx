import { useEffect, useState } from "react";
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


import appCss from "../styles.css?url";
import { useAuthSession, useIsAdmin, signOut } from "@/hooks/useAuth";
import { LanguageProvider, useLang, formatCountBadge } from "@/lib/i18n";
import { SiteSettingsProvider, fetchSiteSettings, DEFAULT_CONFIG, useSiteSettings } from "@/lib/siteSettings";
import { useLayout, LayoutProvider } from "@/lib/layout-engine";
import type { NavTreeNode } from "@/lib/navigation";
import { LangToggle } from "@/components/LangToggle";
import { NavDropdown } from "@/components/NavDropdown";
import { MobileNav } from "@/components/MobileNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ErrorPage, NotFoundPage } from "@/components/error-page";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCartCount } from "@/lib/cart";
import { callFn } from "@/lib/call-fn";

import { WishlistBadge } from "@/components/WishlistBadge";
import { WishlistProvider } from "@/hooks/useWishlist";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchPalette } from "@/components/SearchPalette";
import { openSearchPalette } from "@/lib/search-events";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/error-boundary";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AvatarDropdown } from "@/components/AvatarDropdown";
import { CartDrawer } from "@/components/CartDrawer";
import { LotusIcon } from "@/components/LotusIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { Search } from "lucide-react";
import { SiteToaster } from "@/components/SiteToaster";
import { useTheme } from "@/hooks/useTheme";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => fetchSiteSettings().catch(() => DEFAULT_CONFIG),
  head: ({ loaderData }) => {
    const cfg = loaderData ?? DEFAULT_CONFIG;
    const siteName = cfg.branding.site_name_en || "Sabbe Satta";
    const tagline = cfg.branding.tagline_en || "Where ancient wisdom meets modern psychology.";
    const fullTitle = `${siteName} — ${tagline}`;
    const metaDesc =
      cfg.seo.meta_desc_en ||
      "A serene space blending Buddhist teachings with modern mental health, by practicing psychiatrists.";
    const siteUrl = cfg.seo.site_url || "https://sabbesatta.com";
    const ogImage = cfg.seo.og_image_url || `${siteUrl}/og-default.png`;

    // Build Google Fonts URL from theme settings
    const fonts = new Set<string>();
    const addFont = (family: string) => {
      const name = family.split(",")[0].trim().replace(/\"/g, "");
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
    fonts.add("Noto Sans Bengali");

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
        { property: "og:description", content: metaDesc },
        { property: "og:url", content: siteUrl },
        { property: "og:site_name", content: siteName },
        { property: "og:image", content: ogImage },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: fullTitle },
        { name: "twitter:description", content: metaDesc },
        { name: "twitter:image", content: ogImage },
        { name: "theme-color", content: "#d35400" },
        // Pre-paint signal for the FOUC script: admin-forced theme mode
        { name: "sabbe-admin-theme", content: cfg.theme.mode },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
    <html>
      <head>
        <HeadContent />
        {/* Flash Of Wrong Theme prevention — apply .dark from localStorage before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sabbe-satta-theme");var m=document.querySelector('meta[name="sabbe-admin-theme"]');var adminDark=!!m&&m.getAttribute("content")==="dark";var p=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=false;if(t==="dark"){dark=true}else if(t==="light"){dark=false}else if(t==="system"){dark=p}else{dark=adminDark||p}if(dark){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
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
        <h1 className="font-serif text-3xl font-semibold">{config.maintenance.title_en || "We'll be back soon"}</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground/60">{config.branding.site_name_en || "Sabbe Satta"}</p>
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
      to={to}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: `${activeLinkCls} ${linkCls}` }}
      className={linkCls}
    >
      {navLabel(node, lang)}
      <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
    </Link>
  );
}

function CartBagIcon({ isOpen = false }: { isOpen?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Box body */}
      <rect x="4" y="10" width="16" height="11" rx="1.5" />
      {/* Lid + ❖ seal group — tilts up on hover, stays open when drawer is visible */}
      <g className={`transition-transform duration-300 origin-bottom ${
        isOpen
          ? "-translate-y-1 rotate-[-8deg]"
          : "group-hover:-translate-y-1 group-hover:rotate-[-8deg]"
      }`}>
        {/* Lid — overlaps body like wrapping paper overhang */}
        <rect x="3" y="6" width="18" height="4.5" rx="1" />
        {/* ❖ Lozenge — brand seal replaces traditional bow */}
        <polygon points="12,7.2 13.3,8.5 12,9.8 10.7,8.5" strokeWidth="1.3" />
      </g>
      {/* Subtle vertical ribbon line */}
      <line x1="12" y1="6" x2="12" y2="21" strokeWidth="0.8" opacity="0.25" />
    </svg>
  );
}

function CartIcon({ count, isOpen, lang }: { count: number; isOpen?: boolean; lang: "en" | "bn" }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <CartBagIcon isOpen={isOpen} />
      {count > 0 && (
        <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-foreground text-background text-[10px] font-bold leading-none flex items-center justify-center px-1 shadow-sm ring-2 ring-background">
          {formatCountBadge(count, lang, 9)}
        </span>
      )}
    </span>
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

  // Scroll-driven header opacity — starts transparent, grows more opaque on scroll
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Theme controls header visibility — if hidden, don't render
  if (!layout.headerVisible) return null;

  const linkCls =
    "group relative inline-flex items-center gap-1.5 text-base text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40";
  const activeLinkCls = "text-foreground";

  // Cart count query — used by both CartBadge and MobileNav.
  // Runs for guests too (mock-aware middleware returns the localStorage count).
  const doGetCartCount = useServerFn(getCartCount);
  const { data: countData } = useQuery({
    queryKey: ["cart-count"],
    queryFn: () => callFn(doGetCartCount),
    enabled: true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const cartCount = countData?.count ?? 0;

  const isSticky = config.navigation?.sticky_header !== false;

  return (
    <header
        className={`${
          scrolled
            ? "border-b border-border/60 bg-background/85 backdrop-blur-lg shadow-sm"
            : "border-b border-border/20 bg-background/50"
        } transition-all duration-500 ease-out ${isSticky ? "sticky top-0 z-40" : ""}`}
      >
      <div className="flex w-full items-center px-5 sm:px-8 md:px-16 py-4 sm:py-5">          {/* ── Desktop: 4-column layout ── */}
        <div className="hidden md:flex w-full items-center gap-10">
          {/* SECTION 1 — Logo (left) */}
          <div className="flex items-center flex-shrink-0">
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
          </div>

          {/* COL 2 — Nav + Donate (centered) */}
          <div className="flex items-center flex-1 justify-center">
            <nav className="flex items-center">
              <div className="flex items-center gap-10 text-base text-muted-foreground">
                {layout.navTree.map((item) =>
                  item.type === "dropdown" ? (
                    <NavDropdown
                      key={item.id}
                      to={item.slug || undefined}
                      triggerLabel={navLabel(item, lang)}
                      items={item.children.map((child) => ({
                        to: child.type === "external" ? child.url : child.slug || "/",
                        label: navLabel(child, lang),
                        external: child.type === "external",
                        children: child.children?.map((grandchild) => ({
                          to: grandchild.type === "external" ? grandchild.url : grandchild.slug || "/",
                          label: navLabel(grandchild, lang),
                          external: grandchild.type === "external",
                        })),
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
                {/* Donate — lotus icon that blooms into a flower on hover, with a tooltip label like the cart icon */}
                <div className="group/icon relative flex flex-col items-center">
                  <Link
                    to="/donate"
                    aria-label={lang === "bn" ? "দান করুন" : "Donate"}
                    className="group relative block p-0.5 text-foreground"
                  >
                    <LotusIcon />
                  </Link>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-foreground/60 whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none">
                    {lang === "bn" ? "দান করুন" : "Donate"}
                  </span>
                </div>
              </div>
            </nav>
          </div>

          {/* SECTION 3 — Search + Notifications + Wishlist + Cart (after nav) */}
          <div className="flex items-center flex-shrink-0 gap-5">
            {/* Search — opens the global ⌘K palette */}
            <div className="group/icon relative flex flex-col items-center">
              <button
                onClick={openSearchPalette}
                aria-label={lang === "bn" ? "অনুসন্ধান" : "Search"}
                title={lang === "bn" ? "অনুসন্ধান (⌘K)" : "Search (⌘K)"}
                className="group relative block p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-5 w-5 stroke-[1.8] block group-hover:scale-110 transition-transform duration-300" />
              </button>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-foreground/60 whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none">
                {lang === "bn" ? "অনুসন্ধান" : "Search"}
              </span>
            </div>

            {/* Notifications (signed-in only) */}
            {user && (
              <div className="group/icon relative flex flex-col items-center">
                <NotificationBell userId={user.id} />
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-foreground/60 whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {lang === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
                </span>
              </div>
            )}

            {/* Wishlist */}
            <div className="group/icon relative flex flex-col items-center">
              <WishlistBadge />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-foreground/60 whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none">
                {lang === "bn" ? "পছন্দ" : "Wishlist"}
              </span>
            </div>

            {/* Cart */}
            <div className="group/icon relative flex flex-col items-center">
              <CartDrawer cartCount={cartCount}>
                {(open) => (
                  <button
                    className="group relative text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    title={lang === "bn" ? "কার্ট" : "Cart"}
                  >
                    <span className="block group-hover:scale-110 transition-transform duration-300">
                      <CartIcon count={cartCount} isOpen={open} lang={lang} />
                    </span>
                  </button>
                )}
              </CartDrawer>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.12em] text-foreground/60 whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none">
                {lang === "bn" ? "কার্ট" : "Cart"}
              </span>
            </div>
          </div>

          {/* SECTION 4 — Toggles + Profile / Sign in */}
          <div className="flex items-center flex-shrink-0 gap-8">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LangToggle />
            </div>
            <div className="h-8 w-px bg-border/30" />
            {user ? (
              <AvatarDropdown
                avatarUrl={user.user_metadata?.avatar_url}
                isAdmin={!!isAdmin}
                strapiUrl={import.meta.env.VITE_STRAPI_URL}
                userId={user.id}
                cartCount={cartCount}
                onSignOut={() => signOut()}
              />
            ) : (
              <BrandCtaButton asChild className="px-4 py-1.5 text-sm uppercase tracking-[0.2em]">
                <Link to="/login" search={loginSearch}>
                  Sign in
                </Link>
              </BrandCtaButton>
            )}
          </div>
        </div>

        {/* ── Mobile: logo + actions + hamburger ── */}
        <div className="md:hidden flex w-full items-center justify-between gap-2">
          <Link to="/" className="font-serif text-3xl tracking-tight flex items-center gap-3 min-w-0">
            {layout.logoUrl ? (
              <img
                src={layout.logoUrl}
                alt={layout.brandName}
                style={{ maxWidth: layout.logoMaxWidth, maxHeight: 56 }}
                className="object-contain"
              />
            ) : (
              <span className="truncate">{layout.brandName}</span>
            )}
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Search — opens the global ⌘K palette */}
            <button
              onClick={openSearchPalette}
              aria-label={lang === "bn" ? "অনুসন্ধান" : "Search"}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors hover:scale-110 active:scale-95"
            >
              <Search className="h-5 w-5 stroke-[1.8]" />
            </button>
            {/* Notifications (signed-in only) */}
            {user && (
              <div className="mr-0.5">
                <NotificationBell userId={user.id} />
              </div>
            )}
            {/* Wishlist lives in the bottom nav on mobile — no header heart */}
            <MobileNav
              items={layout.mobileItems.map((item) => ({
                to: item.type === "external" ? item.url : item.slug || "/",
                label: navLabel(item, lang),
              }))}
              groups={layout.dropdownGroups.map((group) => ({
                label: navLabel(group, lang),
                // Only link the label when the dropdown has a landing page —
                // otherwise the whole row toggles (avoids linking to /).
                to: group.type === "external" ? group.url : group.slug || undefined,
                items: group.children.map((child) => ({
                  to: child.type === "external" ? child.url : child.slug || "/",
                  label: navLabel(child, lang),
                })),
              }))}
              isAdmin={!!isAdmin}
              isSignedIn={!!user}
              adminLabel="Admin"
              cartCount={cartCount}
              userId={user?.id}
              // Profile lives in the drawer's persistent bottom block — the
              // display name comes from user metadata (mock session puts it in
              // `display_name`; Google OAuth may set `name`/`full_name`).
              userEmail={user?.email ?? ""}
              userAvatarUrl={user?.user_metadata?.avatar_url}
              userDisplayName={
                (user?.user_metadata?.display_name as string) ||
                user?.user_metadata?.name ||
                user?.user_metadata?.full_name ||
                ""
              }
              signInLabel="Sign in"
              signOutLabel="Sign out"
              onSignOut={() => signOut()}
              loginSearch={loginSearch}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────────── */

function FooterLink({ to, label, external }: { to: string; label: string; external?: boolean }) {
  const base =
    "text-sm text-muted-foreground/90 hover:text-foreground transition-colors duration-300 relative block w-fit after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-foreground/40 after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40";
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={base}>
        {label}
      </a>
    );
  }
  return (
    <Link to={to as any} className={base}>
      {label}
    </Link>
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
      className="w-9 h-9 rounded-full border border-border/40 flex items-center justify-center text-xs font-medium text-muted-foreground/85 hover:text-foreground hover:border-foreground/25 hover:bg-foreground/[0.04] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
    <footer className="mt-24 relative overflow-hidden">
      {/* Background — warm saffron glow fading into the page (theme-aware, keeps text legible) */}
      <div className="absolute inset-0 bg-gradient-to-b from-saffron-50/60 via-background to-background dark:from-saffron-900/40 dark:via-background dark:to-background" />
      {/* Soft radial saffron warmth for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,color-mix(in_oklab,var(--color-saffron)_7%,transparent),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-3 md:gap-0">
          {/* Col 1: Brand */}
          <div className="space-y-5 md:pr-10">
            <Link
              to="/"
              className="font-serif text-lg text-foreground hover:opacity-80 transition-opacity duration-300 inline-flex items-center gap-2"
            >
              ❖ {layout.brandName}
            </Link>
            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-xs">
              Where ancient wisdom meets modern psychology.
            </p>
          </div>

          {/* Col 2: Navigate */}
          <div className="md:px-10 md:border-l md:border-border/10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground/85 mb-4">
                {lang === "bn" ? "অন্বেষণ" : "Explore"}
              </p>
              {/* Mobile: links wrap inline for a compact, thumb-friendly row.
                  Desktop: tidy 2-column grid. */}
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 md:grid md:grid-cols-2 md:gap-x-4">
                <FooterLink to="/reflections" label={lang === "bn" ? "প্রতিফলন" : "Reflections"} />
                <FooterLink to="/books" label={lang === "bn" ? "বই" : "Books"} />
                <FooterLink to="/videos" label={lang === "bn" ? "ভিডিও" : "Videos"} />
                <FooterLink to="/about" label={lang === "bn" ? "সম্পর্কে" : "About"} />
                <FooterLink to="/donate" label={lang === "bn" ? "দান করুন" : "Donate"} />
              </div>
            </div>
          </div>

          {/* Col 3: Support & Connect */}
          <div className="space-y-10 md:pl-10 md:border-l md:border-border/10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground/85 mb-4">
                {lang === "bn" ? "দ্রুত লিঙ্ক" : "Quick Links"}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 md:flex-col md:gap-y-2.5">
                <FooterLink to="/faq" label={lang === "bn" ? "সচরাচর জিজ্ঞাসা" : "FAQ"} />
                <FooterLink to="/privacy" label={lang === "bn" ? "গোপনীয়তা" : "Privacy"} />
                <FooterLink to="/terms" label={lang === "bn" ? "শর্তাবলী" : "Terms"} />
              </div>
            </div>

            {hasSocial && (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground/85 mb-4">
                  {lang === "bn" ? "অনুসরণ করুন" : "Follow"}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower footer bar */}
      <div className="relative bg-muted border-t-2 border-border/20 dark:bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground/75">
          <p>&copy; {new Date().getFullYear()} {layout.brandName}.</p>
          <p>
            Made with{" "}
            <span className="text-rose-400/60 inline-block hover:scale-125 active:scale-150 transition-transform duration-300 cursor-default">
              &#10084;
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Theme Controller ─────────────────────────────────────────── */

/** Bridges the user's personal theme preference (from Supabase profile)
 *  with the `.dark` CSS class. useTheme now owns the `.dark` class —
 *  SiteSettingsProvider no longer toggles it, so the user's choice wins. */
function ThemeController() {
  useTheme();
  return null;
}

/* ─── Reduced Motion Controller ────────────────────────────────── */

/** Bridges the saved "Reduced motion" preference (Settings → Appearance)
 *  with the site-wide `data-reduced-motion` attribute on <html>, which the
 *  CSS kill-switch in styles.css reads to suppress animations/transitions.
 *  Runs at the root so the setting applies on every page, not just /settings. */
function ReducedMotionController() {
  const { data: prefs } = useUserPreferences();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (prefs?.reduced_motion) {
      document.documentElement.setAttribute("data-reduced-motion", "true");
    } else {
      document.documentElement.removeAttribute("data-reduced-motion");
    }
  }, [prefs?.reduced_motion]);

  return null;
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
            <SiteToaster />
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
            <ThemeController />
            <ReducedMotionController />
            <WishlistProvider>
            <MaintenanceGate>
              <LayoutProvider>
              <div className="min-h-screen flex flex-col pb-16 md:pb-0">
                <ReadingProgress />
                <Header />
                <main className="flex-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
              <BottomNav />
              {useFeatureFlag("ai_chat") && <AiChatPanel />}
              <ScrollToTop />
              <SearchPalette />
              <SiteToaster />
              </LayoutProvider>
            </MaintenanceGate>
            </WishlistProvider>
          </SiteSettingsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
