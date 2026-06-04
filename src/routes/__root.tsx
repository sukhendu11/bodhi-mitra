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
import { LanguageProvider, useLang, pickLocalized } from "@/lib/i18n";
import { SiteSettingsProvider, useSiteSettings, fetchSiteSettings, DEFAULT_CONFIG } from "@/lib/siteSettings";
import { LangToggle } from "@/components/LangToggle";
import { NavDropdown } from "@/components/NavDropdown";
import { MobileNav } from "@/components/MobileNav";


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

/* ─── Navigation structure ─────────────────────────────────────────────── */

/** Top-level direct links — shown inline in desktop nav. */
const topLevelLinks = [
  { to: "/" as const, labelKey: "home" as const },
  { to: "/books" as const, labelKey: "books" as const },
  { to: "/about" as const, labelKey: "about" as const },
  { to: "/contact" as const, labelKey: "contact" as const },
] as const;

/** Dropdown groups — Philosophy and Practice with their sub-items. */
const dropdownGroups = [
  {
    labelKey: "philosophy" as const,
    items: [
      { to: "/buddhist-psychology" as const, labelKey: "buddhism" as const },
      { to: "/wisdom" as const, labelKey: "mind" as const },
    ],
  },
  {
    labelKey: "practice" as const,
    items: [
      { to: "/satsang" as const, labelKey: "wellness" as const },
      { to: "/" as const, labelKey: "today" as const },
    ],
  },
] as const;

/** All nav items as a flat list for mobile (groups will be rendered separately).
 *  Only top-level items that are NOT inside dropdown groups. */
const flatNavItems = [
  { to: "/" as const, labelKey: "home" as const },
  { to: "/books" as const, labelKey: "books" as const },
  { to: "/about" as const, labelKey: "about" as const },
  { to: "/contact" as const, labelKey: "contact" as const },
] as const;

/** Resolve a nav label from site settings, with i18n fallback. */
type NavKey =
  | "home" | "philosophy" | "practice"
  | "buddhism" | "mind" | "wellness" | "today"
  | "books" | "about" | "contact";

function resolveNavLabel(settings: ReturnType<typeof useSiteSettings>, lang: "en" | "bn", key: NavKey): string {
  const val = (settings.nav as Record<string, string>)[`${key}_${lang}`];
  if (val?.trim()) return val.trim();
  // Fallback to the other language
  const other = (settings.nav as Record<string, string>)[`${key}_${lang === "en" ? "bn" : "en"}`];
  if (other?.trim()) return other.trim();
  // Ultimate fallback
  const fallbacks: Record<NavKey, string> = {
    home: "Home", philosophy: "Philosophy", practice: "Practice",
    buddhism: "Buddhism", mind: "Mind (Buddhist Psychology)",
    wellness: "Wellness (Mental Health Approach)", today: "Today (Modern Relevance)",
    books: "Books", about: "About", contact: "Contact",
  };
  return fallbacks[key];
}

/* ─── Header ───────────────────────────────────────────────────────────── */

function Header() {
  const { user } = useAuthSession();
  const { data: isAdmin } = useIsAdmin(user);
  const { lang } = useLang();
  const settings = useSiteSettings();
  const currentPath = useRouterState({ select: (s) => s.location.href });
  const loginSearch = { message: "", redirect: currentPath === "/login" ? "/" : currentPath };

  const brandName = pickLocalized(settings.branding.site_name_en, settings.branding.site_name_bn, lang);
  const logoUrl = settings.branding.logo_url;
  const logoMaxW = settings.branding.logo_max_width;

  const linkCls = "hover:text-foreground transition-colors";
  const activeLinkCls = "text-foreground";

  const signInCls =
    "px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-colors";
  const signInStyle = { backgroundColor: "var(--color-saffron)" };

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
          {/* Top-level links */}
          {topLevelLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: activeLinkCls }}
              className={linkCls}
            >
              {resolveNavLabel(settings, lang, item.labelKey)}
            </Link>
          ))}

          {/* Dropdown groups */}
          {dropdownGroups.map((group) => (
            <NavDropdown
              key={group.labelKey}
              triggerLabel={resolveNavLabel(settings, lang, group.labelKey)}
              items={group.items.map((item) => ({
                to: item.to,
                label: resolveNavLabel(settings, lang, item.labelKey),
              }))}
            />
          ))}

          {/* Admin button */}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 transition-opacity"
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
              onMouseEnter={(e) => { (e.currentTarget.style.backgroundColor = "var(--color-saffron-hover)"); }}
              onMouseLeave={(e) => { (e.currentTarget.style.backgroundColor = "var(--color-saffron)"); }}
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger + sheet */}
        <div className="md:hidden flex items-center gap-3">
          <LangToggle className="shrink-0" />
          <MobileNav
            items={flatNavItems.map((item) => ({
              to: item.to,
              label: resolveNavLabel(settings, lang, item.labelKey),
            }))}
            groups={dropdownGroups.map((group) => ({
              label: resolveNavLabel(settings, lang, group.labelKey),
              items: group.items.map((item) => ({
                to: item.to,
                label: resolveNavLabel(settings, lang, item.labelKey),
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

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label}
      className="hover:text-foreground transition-colors">
      {children}
    </a>
  );
}

function Footer() {
  const { lang } = useLang();
  const s = useSiteSettings();
  const brandName = pickLocalized(s.branding.site_name_en, s.branding.site_name_bn, lang);
  const text = pickLocalized(s.footer.text_en, s.footer.text_bn, lang);
  const copyrightTpl = pickLocalized(s.footer.copyright_en, s.footer.copyright_bn, lang);
  const copyright = copyrightTpl.replace("{year}", String(new Date().getFullYear()));

  return (
    <footer className="mt-32 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-serif text-base text-foreground">{brandName}</p>
          <p className="mt-2 leading-relaxed">{text}</p>
        </div>
        <div className="space-y-1">
          {s.contact.email && <p>Email: <a className="hover:text-foreground" href={`mailto:${s.contact.email}`}>{s.contact.email}</a></p>}
          {s.contact.phone && <p>Phone: {s.contact.phone}</p>}
          {s.contact.location && <p>{s.contact.location}</p>}
        </div>
        <div className="flex md:justify-end items-start gap-5 text-xs uppercase tracking-[0.18em]">
          <SocialIcon href={s.social.facebook} label="Facebook">FB</SocialIcon>
          <SocialIcon href={s.social.twitter} label="Twitter / X">X</SocialIcon>
          <SocialIcon href={s.social.instagram} label="Instagram">IG</SocialIcon>
          <SocialIcon href={s.social.linkedin} label="LinkedIn">IN</SocialIcon>
          <SocialIcon href={s.social.youtube} label="YouTube">YT</SocialIcon>
        </div>
      </div>
      <div className="border-t border-border/40 mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
        {copyright}
      </div>
    </footer>
  );
}

/* ─── Root component ───────────────────────────────────────────────────── */

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SiteSettingsProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1"><Outlet /></main>
            <Footer />
          </div>
          <Toaster position="bottom-center" />
        </SiteSettingsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
