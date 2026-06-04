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

const navItems = [
  { to: "/", labelKey: "home" as const },
  { to: "/buddhist-psychology", labelKey: "bp" as const },
  { to: "/wisdom", labelKey: "wisdom" as const },
  { to: "/books", labelKey: "books" as const },
  { to: "/about", labelKey: "about" as const },
  { to: "/contact", labelKey: "contact" as const },
] as const;

function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to বাংলা" : "Switch to English"}
      className={`inline-flex items-center rounded-full border border-border bg-background text-[11px] uppercase tracking-[0.18em] overflow-hidden select-none ${className}`}
    >
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "en" ? "bg-foreground text-background" : "text-muted-foreground"
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 transition-colors ${
          lang === "bn" ? "bg-foreground text-background" : "text-muted-foreground"
        }`}
        style={{ fontFamily: "var(--font-bn)", letterSpacing: 0 }}
      >
        বাং
      </span>
    </button>
  );
}

function Header() {
  const { user } = useAuthSession();
  const { data: isAdmin } = useIsAdmin(user);
  const { t, lang } = useLang();
  const settings = useSiteSettings();
  const currentPath = useRouterState({ select: (s) => s.location.href });
  const loginSearch = { message: "", redirect: currentPath === "/login" ? "/" : currentPath };

  const navLabel = (k: "home" | "bp" | "wisdom" | "books" | "about" | "contact") =>
    pickLocalized(settings.nav[`${k}_en`], settings.nav[`${k}_bn`], lang);

  const brandName = pickLocalized(settings.branding.site_name_en, settings.branding.site_name_bn, lang);
  const logoUrl = settings.branding.logo_url;
  const logoMaxW = settings.branding.logo_max_width;

  const signInCls =
    "px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-colors";
  const signInStyle = { backgroundColor: "var(--color-saffron)" };
  const onSignInEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget.style.backgroundColor = "var(--color-saffron-hover)");
  };
  const onSignInLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget.style.backgroundColor = "var(--color-saffron)");
  };

  return (
    <header className="border-b border-border/60 bg-background/60 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-serif text-2xl tracking-tight flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} style={{ maxWidth: logoMaxW, maxHeight: 56 }} className="object-contain" />
          ) : (
            <span>{brandName}</span>
          )}
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground transition-colors"
            >
              {navLabel(item.labelKey)}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              {t("nav_admin")}
            </Link>
          )}
          <LangToggle />
          {user ? (
            <button onClick={() => signOut()} className="hover:text-foreground transition-colors">
              {t("sign_out")}
            </button>
          ) : (
            <Link
              to="/login"
              search={loginSearch}
              className={signInCls}
              style={signInStyle}
              onMouseEnter={onSignInEnter}
              onMouseLeave={onSignInLeave}
            >
              {t("sign_in")}
            </Link>
          )}
        </nav>
      </div>
      <nav className="md:hidden flex items-center gap-4 overflow-x-auto px-6 pb-3 text-xs text-muted-foreground">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-foreground" }}
            className="whitespace-nowrap"
          >
            {navLabel(item.labelKey)}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" className="whitespace-nowrap text-foreground font-medium">
            {t("nav_admin_short")}
          </Link>
        )}
        <LangToggle className="ml-auto shrink-0" />
        {user ? (
          <button onClick={() => signOut()} className="whitespace-nowrap">
            {t("sign_out")}
          </button>
        ) : (
          <Link
            to="/login"
            search={loginSearch}
            className="whitespace-nowrap px-3 py-1 rounded-sm text-white"
            style={{ backgroundColor: "var(--color-saffron)" }}
          >
            {t("sign_in")}
          </Link>
        )}
      </nav>
    </header>
  );
}

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

