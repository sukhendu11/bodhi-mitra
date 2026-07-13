import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPublicNavItems,
  safeBuildNavTree,
  getNavCache,
  setNavCache,
  type NavTreeNode,
  type NavItem,
} from "@/lib/navigation";
import { useSiteSettings, type SiteConfig } from "@/lib/siteSettings";
import { useLang } from "@/lib/i18n";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface FooterLink {
  key: string;
  to: string;
  label: string;
  external: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface LayoutState {
  /** Pre-computed navigation tree (visible items only). */
  navTree: NavTreeNode[];
  /** Dropdown groups derived from navTree (for desktop dropdown menus). */
  dropdownGroups: NavTreeNode[];
  /** Flat non-dropdown items derived from navTree (for mobile top-level nav). */
  mobileItems: NavTreeNode[];
  /** Pre-computed footer sections derived from navTree + settings. */
  footerSections: FooterSection[];

  /* ─── Branding (localized) ──────────────────────────────────── */
  brandName: string;
  logoUrl: string;
  logoMaxWidth: number;
  faviconUrl: string;

  /* ─── Footer content (localized) ────────────────────────────── */
  footerText: string;
  copyright: string;
  contactEmail: string;
  contactPhone: string;

  /* ─── Social links ──────────────────────────────────────────── */
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };

  /* ─── Theme controls for layout ─────────────────────────────── */
  headerVisible: boolean;
  mode: "light" | "dark";
  accentColor: string;
  accentHover: string;
}

/* ─── Ultimate fallback (navbar NEVER disappears) ───────────────── */
// Minimal 3-item safety net: Home, About, Contact.
// Used only when Supabase AND cache both fail.

const FALLBACK_NAV_ITEMS: NavItem[] = [
  {
    id: "fb-home",
    parent_id: null,
    type: "internal",
    label_en: "Home",
    label_bn: "Home",
    url: "",
    slug: "/",
    icon: "",
    sort_order: 0,
    visible: true,
    location: "header",
    created_at: "",
    updated_at: "",
  },
  {
    id: "fb-about",
    parent_id: null,
    type: "internal",
    label_en: "About",
    label_bn: "About",
    url: "",
    slug: "/about",
    icon: "",
    sort_order: 1,
    visible: true,
    location: "header",
    created_at: "",
    updated_at: "",
  },
  {
    id: "fb-contact",
    parent_id: null,
    type: "internal",
    label_en: "Contact",
    label_bn: "Contact",
    url: "",
    slug: "/contact",
    icon: "",
    sort_order: 2,
    visible: true,
    location: "header",
    created_at: "",
    updated_at: "",
  },
];

const FALLBACK_TREE = safeBuildNavTree(FALLBACK_NAV_ITEMS);

const EMPTY_SOCIAL = { facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "" };

function defaultLayout(): LayoutState {
  return {
    navTree: FALLBACK_TREE,
    dropdownGroups: [],
    mobileItems: FALLBACK_TREE,
    footerSections: [
      {
        title: "Explore",
        links: FALLBACK_NAV_ITEMS.map((n) => ({
          key: n.id,
          to: n.slug || "/",
          label: n.label_en,
          external: false,
        })),
      },
    ],
    brandName: "Bodhi Mitra",
    logoUrl: "",
    logoMaxWidth: 120,
    faviconUrl: "",
    footerText: "Where ancient wisdom meets modern psychology.",
    copyright: "\u00a9 Bodhi Mitra. All rights reserved.",
    contactEmail: "",
    contactPhone: "",
    social: { ...EMPTY_SOCIAL },
    headerVisible: true,
    mode: "light",
    accentColor: "#d35400",
    accentHover: "#e67e22",
  };
}

/* ─── Normalization helpers ────────────────────────────────────── */

function pickLocalized(valEn: string, valBn: string | null | undefined, lang: "en" | "bn"): string {
  return lang === "bn" && valBn?.trim() ? valBn.trim() : valEn;
}

function buildFooterSections(navTree: NavTreeNode[], lang: "en" | "bn"): FooterSection[] {
  const dropdownGroups = navTree.filter((n) => n.type === "dropdown");
  const topLevelLinks = navTree.filter((n) => n.type !== "dropdown");

  const sections: FooterSection[] = [
    ...dropdownGroups.map((g) => ({
      title: lang === "bn" && g.label_bn?.trim() ? g.label_bn.trim() : g.label_en,
      links: g.children.map((c) => ({
        key: c.id,
        to: c.type === "external" ? c.url : c.slug || "/",
        label: lang === "bn" && c.label_bn?.trim() ? c.label_bn.trim() : c.label_en,
        external: c.type === "external",
      })),
    })),
    {
      title: lang === "bn" ? "\u0985\u09a8\u09cd\u09ac\u09c7\u09b7\u09a3" : "Explore",
      links: topLevelLinks.map((n) => ({
        key: n.id,
        to: n.type === "external" ? n.url : n.slug || "/",
        label: lang === "bn" && n.label_bn?.trim() ? n.label_bn.trim() : n.label_en,
        external: n.type === "external",
      })),
    },
  ].filter((s) => s.links.length > 0);

  return sections;
}

/* ─── Normalize settings + nav tree into LayoutState ───────────── */

function normalizeLayout(
  navTree: NavTreeNode[],
  settings: SiteConfig,
  lang: "en" | "bn",
): LayoutState {
  const effectiveNav = navTree.length > 0 ? navTree : FALLBACK_TREE;

  const brandName =
    pickLocalized(settings.branding.site_name_en, settings.branding.site_name_bn, lang) ||
    "Bodhi Mitra";
  const footerText = pickLocalized(settings.footer.text_en, settings.footer.text_bn, lang);
  const copyrightTpl =
    pickLocalized(settings.footer.copyright_en, settings.footer.copyright_bn, lang) ||
    "\u00a9 Bodhi Mitra. All rights reserved.";
  const copyright = copyrightTpl.replace("{year}", String(new Date().getFullYear()));

  const dropdownGroups = effectiveNav.filter((n) => n.type === "dropdown");
  const mobileItems = effectiveNav.filter((n) => n.type !== "dropdown");
  const footerSections = buildFooterSections(effectiveNav, lang);

  return {
    navTree: effectiveNav,
    dropdownGroups,
    mobileItems,
    footerSections,
    brandName,
    logoUrl: settings.branding.logo_url || "",
    logoMaxWidth: settings.branding.logo_max_width || 120,
    faviconUrl: settings.branding.favicon_url || "",
    footerText,
    copyright,
    contactEmail: settings.contact.email || "",
    contactPhone: settings.contact.phone || "",
    social: {
      facebook: settings.social.facebook || "",
      twitter: settings.social.twitter || "",
      instagram: settings.social.instagram || "",
      linkedin: settings.social.linkedin || "",
      youtube: settings.social.youtube || "",
    },
    headerVisible: settings.theme.header_visible !== false,
    mode: settings.theme.mode === "dark" ? "dark" : "light",
    accentColor: settings.theme.accent_color || "#d35400",
    accentHover: settings.theme.accent_hover || "#e67e22",
  };
}

/* ─── Context + Provider ───────────────────────────────────────── */

const LayoutContext = createContext<LayoutState>(defaultLayout());

export function useLayout(): LayoutState {
  return useContext(LayoutContext);
}

interface LayoutProviderProps {
  children: ReactNode;
}

/**
 * Layout Provider — single source of truth for layout state.
 *
 * Reads site settings from existing context (no duplicate fetch),
 * fetches navigation items from Supabase, normalizes everything
 * into a unified `LayoutState`, and provides it via React context.
 *
 * - Header, Footer, Navbar consume from `useLayout()`.
 * - Falls back to safe defaults if data is missing.
 * - Navbar can NEVER disappear.
 */
export function LayoutProvider({ children }: LayoutProviderProps) {
  const settings = useSiteSettings();
  const { lang } = useLang();

  const { data: navTree } = useQuery({
    queryKey: ["layout-nav"],
    queryFn: async (): Promise<NavTreeNode[]> => {
      // Layer 1: Try Supabase
      try {
        const items = await fetchPublicNavItems();
        if (items.length > 0) {
          const tree = safeBuildNavTree(items);
          if (tree.length > 0) {
            setNavCache(tree);
            return tree;
          }
        }
      } catch {
        // Supabase failed — fall through to cache
      }

      // Layer 2: Try last-known-valid cache
      const cached = getNavCache();
      if (cached && cached.length > 0) return cached;

      // Layer 3: Ultimate fallback (never empty)
      return FALLBACK_TREE;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const layout = normalizeLayout(navTree ?? FALLBACK_TREE, settings, lang);

  return <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>;
}
