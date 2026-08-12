import {
  Home,
  BookOpen,
  Book,
  Video,
  ShoppingCart,
  ShoppingBag,
  BarChart3,
  Settings,
  Shield,
  Heart,
  ChevronDown,
  ChevronRight,
  UserRound,
  Bookmark,
  Info,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar } from "./UserAvatar";
import { BrandCtaButton } from "./BrandCtaButton";
import { LotusIcon } from "./LotusIcon";
import { useSiteSettings } from "@/lib/siteSettings";
import { useLang, formatCountBadge } from "@/lib/i18n";
import { PROFILE_MENU_GROUP_LABELS } from "@/lib/profile-menu";
import { useWishlist } from "@/hooks/useWishlist";
import { useBookmarkCount } from "@/hooks/useBookmarkCount";

/* ─── Types ─────────────────────────────────────────────── */

interface MobileNavItem {
  to: string;
  label: string;
}

interface MobileNavGroup {
  label: string;
  /** Parent page URL — tapping the label navigates here; the chevron toggles the submenu. */
  to?: string;
  items: MobileNavItem[];
}

interface MobileNavProps {
  items: MobileNavItem[];
  groups?: MobileNavGroup[];
  isAdmin?: boolean;
  isSignedIn?: boolean;
  adminLabel?: string;
  cartCount?: number;
  /** Needed for the bookmarks count badge (auth-required in all modes). */
  userId?: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  userDisplayName?: string;
  signInLabel?: string;
  signOutLabel?: string;
  onSignOut?: () => void;
  loginSearch?: { message: string; redirect: string };
  children?: React.ReactNode;
}

/* ─── Icon map for known paths ─────────────────────────── */

const PATH_ICONS: Record<string, React.ReactNode> = {
  "/": <Home className="h-4 w-4" />,
  "/reflections": <BookOpen className="h-4 w-4" />,
  "/books": <Book className="h-4 w-4" />,
  "/videos": <Video className="h-4 w-4" />,
  "/about": <Info className="h-4 w-4" />,
  "/purchases": <BookOpen className="h-4 w-4" />,
  "/orders": <ShoppingBag className="h-4 w-4" />,
  "/cart": <ShoppingCart className="h-4 w-4" />,
  "/wishlist": <Heart className="h-4 w-4" />,
  "/bookmarks": <Bookmark className="h-4 w-4" />,
  "/stats": <BarChart3 className="h-4 w-4" />,
  "/settings": <Settings className="h-4 w-4" />,
  "/admin": <Shield className="h-4 w-4" />,
};

function getPathIcon(to: string): React.ReactNode | null {
  if (PATH_ICONS[to]) return PATH_ICONS[to];
  const prefix = "/" + to.split("/")[1];
  if (prefix && PATH_ICONS[prefix]) return PATH_ICONS[prefix];
  return null;
}

/* ─── Staggered entrance animation ─────────────────────── */

function useStaggeredEntrance(delayMs = 40) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), 100);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getStyle = (index: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0)" : "translateX(14px)",
    transition: `opacity 0.4s cubic-bezier(0.65, 0, 0.35, 1) ${index * delayMs}ms, transform 0.4s cubic-bezier(0.65, 0, 0.35, 1) ${index * delayMs}ms`,
  });

  return { getStyle, visible };
}

/* ─── Sub-components ───────────────────────────────────── */

function NavItemEntry({
  to,
  label,
  style,
  suffix,
}: {
  to: string;
  label: string;
  style?: React.CSSProperties;
  suffix?: React.ReactNode;
}) {
  const icon = getPathIcon(to);
  return (
    <SheetClose asChild>
      <Link
        to={to}
        activeOptions={{ exact: to === "/" }}
        className="group flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 relative overflow-hidden hover:bg-secondary/30 hover:shadow-sm hover:translate-x-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        activeProps={{
          // Solid tinted background (saffron), saffron left accent bar, and the
          // row icon turns saffron so the current page reads at a glance. The
          // hover:bg-primary/15 keeps the saffron tint visible when an active
          // row is hovered (instead of the base secondary hover wash).
          className:
            "text-foreground font-medium bg-primary/10 hover:bg-primary/15 border-l-2 border-[var(--color-saffron)] [&_svg]:text-[var(--color-saffron)]",
        }}
        style={style}
      >
        <span className="flex items-center gap-3">
          {icon && (
            <span className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 group-hover:text-[var(--color-saffron)] transition-colors duration-200">
              {icon}
            </span>
          )}
          <span>{label}</span>
        </span>
        {suffix}
      </Link>
    </SheetClose>
  );
}

/* ─── Compact count chip for the Account rows ───────────── */

function CountBadge({ count, lang }: { count: number; lang: "en" | "bn" }) {
  // min-w + px-1 (not a fixed w-5) so "99+" doesn't overflow the pill.
  return (
    <span className="h-5 min-w-5 px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shadow-sm">
      {formatCountBadge(count, lang)}
    </span>
  );
}

/* ─── Section label (BROWSE / ACCOUNT) ─────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
      {children}
    </p>
  );
}

/* ─── Sub-group label (Financial / Stats / Settings) ───── */

function GroupLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={style}
      className="px-3 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50"
    >
      {children}
    </p>
  );
}

/* ─── Tinted surface grouping nav rows ─────────────────── */

function NavSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-2xl bg-secondary/10 dark:bg-secondary/20 p-1.5">
      {children}
    </div>
  );
}

/* ─── Expandable section row (label link + chevron toggle) ─ */

function ExpandableRow({
  to,
  label,
  icon,
  isOpen,
  onToggle,
  suffix,
}: {
  to?: string;
  label: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  suffix?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Active when the current page IS the parent page or one of its children
  // (e.g. /reflections and /reflections/meditation both light up Reflections).
  const isActive =
    !!to && (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));
  const rowCls =
    "flex items-center rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const iconCls =
    "w-5 h-5 shrink-0 flex items-center justify-center text-muted-foreground/50 group-hover:text-[var(--color-saffron)] transition-colors duration-200";

  // With `to`: the label is a navigation Link and the chevron toggles the
  // submenu (parent page + children, e.g. Reflections).
  return (
    <div
      className={`${rowCls} w-full overflow-hidden hover:bg-secondary/30 hover:shadow-sm hover:translate-x-0.5 active:scale-[0.98] ${
        isActive
          ? "bg-primary/10 hover:bg-primary/15 text-foreground font-medium border-l-2 border-[var(--color-saffron)] [&_svg]:text-[var(--color-saffron)]"
          : ""
      }`}
    >
      {to ? (
        <SheetClose asChild>
          <Link to={to} className="group flex flex-1 items-center gap-3 px-4 py-2.5 min-w-0">
            {icon && <span className={iconCls}>{icon}</span>}
            <span className="truncate">{label}</span>
          </Link>
        </SheetClose>
      ) : (
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          className="group flex flex-1 items-center gap-3 px-4 py-2.5 min-w-0 text-left"
        >
          {icon && <span className={iconCls}>{icon}</span>}
          <span className="truncate">{label}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-300 ${
              isOpen ? "rotate-180 text-[var(--color-saffron)]" : ""
            }`}
          />
        </button>
      )}
      {suffix}
      {to && (
        /* Visible chip affordance — a SEPARATE control from the label link.
           The bordered, tinted square reads as "tap to expand the dropdown"
           (tapping the label goes to the parent page instead). Saffron fill +
           rotated chevron when open, press-scale feedback, focus ring intact. */
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
          // Note: no active:scale on the chip — the row wrapper already scales
          // on press (active:scale-[0.98] matches via the descendant), and the
          // two would compound into an over-aggressive ~0.88 shrink.
          className={`my-1 mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            isOpen
              ? "border-[var(--color-saffron)]/60 bg-[var(--color-saffron)]/10 text-[var(--color-saffron)] hover:bg-[var(--color-saffron)]/15"
              : "border-border/50 bg-secondary/20 dark:bg-secondary/30 text-muted-foreground/70 hover:border-[var(--color-saffron)]/60 hover:bg-secondary/40 hover:text-[var(--color-saffron)]"
          }`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

function CollapsibleChildren({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-all duration-300 ease-out"
      style={{
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">
        <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-[var(--color-saffron)]/20 pl-3 pb-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function SubNavLink({ to, label, style }: { to: string; label: string; style?: React.CSSProperties }) {
  const icon = getPathIcon(to);
  return (
    <SheetClose key={to} asChild>
      <Link
        to={to}
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/80 hover:text-foreground hover:bg-secondary/20 hover:shadow-sm hover:translate-x-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        activeProps={{
          className:
            "text-foreground font-medium bg-primary/10 hover:bg-primary/15 [&_svg]:text-[var(--color-saffron)]",
        }}
        style={style}
      >
        {icon && (
          <span className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground/40">
            {icon}
          </span>
        )}
        {label}
      </Link>
    </SheetClose>
  );
}

/* ─── Hamburger button — 3-bar morph to ✕ ──────────────── */

function HamburgerButton({ open = false }: { open?: boolean }) {
  // Pure-transform morph: bars keep FIXED positions and only translate/rotate,
  // so the 3-line hamburger glides into a 2-line ✕ (same w-5 line length) and
  // reverses identically on close — no `top` jumps, no origin drift.
  // Geometry: 16px tall box, 2px bars at y=1/7/13 (centers 2/8/14); the top
  // and bottom bars translate ±6px to the middle bar's axis (y=8) and rotate
  // ±45° around their own centers to form the ✕ legs.
  const bar =
    "absolute left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none";
  return (
    <span className="relative block h-4 w-6" aria-hidden>
      {/* Top bar → ✕ first leg (rotates down-right around its center) */}
      <span className={`${bar} top-[1px] ${open ? "translate-y-[6px] rotate-45" : ""}`} />
      {/* Middle bar → fades and shrinks away */}
      <span className={`${bar} top-[7px] ${open ? "opacity-0 scale-x-0" : ""}`} />
      {/* Bottom bar → ✕ second leg (rotates up-left around its center) */}
      <span className={`${bar} top-[13px] ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
    </span>
  );
}

/* ─── Morphing close control (lives INSIDE the sheet) ───── */

function MorphClose({ open }: { open: boolean }) {
  // The sheet content mounts already in its open state, so a bare `open`
  // prop would pop straight into the ✕ with no visible morph. Flipping
  // `entered` one animation frame after mount makes the button render as a
  // hamburger first, then glide into the ✕ while the sheet slides in. When
  // `open` goes false on close, the classes flip back and the ✕ smoothly
  // reverses into the three-line hamburger during the slide-out.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return <HamburgerButton open={open && entered} />;
}

/* ─── Bottom profile block (persistent, pinned) ────────── */

function ProfileBlock({
  isSignedIn,
  userEmail,
  userAvatarUrl,
  userDisplayName,
  signInLabel,
  loginSearch,
  lang,
}: {
  isSignedIn?: boolean;
  userEmail?: string;
  userAvatarUrl?: string | null;
  userDisplayName?: string;
  signInLabel?: string;
  loginSearch?: { message: string; redirect: string };
  lang: "en" | "bn";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = isSignedIn ? pathname === "/profile" : pathname === "/login";
  const rowCls = `group flex items-center gap-3 rounded-2xl p-3 hover:shadow-sm active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    isActive
      ? "bg-primary/10 hover:bg-primary/15 ring-1 ring-[var(--color-saffron)]/40 [&_svg]:text-[var(--color-saffron)]"
      : "bg-secondary/10 dark:bg-secondary/20 hover:bg-secondary/25"
  }`;
  const chevronCls =
    "h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-[var(--color-saffron)] group-hover:translate-x-0.5 transition-all duration-200";

  return (
    <SheetClose asChild>
      {isSignedIn ? (
        <Link to="/profile" className={rowCls}>
          <UserAvatar email={userEmail ?? ""} avatarUrl={userAvatarUrl} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {userDisplayName || userEmail}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground/70">
              {lang === "bn" ? "প্রোফাইল দেখুন" : "View profile"}
            </span>
          </span>
          <ChevronRight className={chevronCls} />
        </Link>
      ) : (
        <Link
          to="/login"
          search={loginSearch ?? { message: "", redirect: "/" }}
          className={rowCls}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/40 text-muted-foreground">
            <UserRound className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {signInLabel || (lang === "bn" ? "সাইন ইন" : "Sign in")}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground/70">
              {lang === "bn" ? "প্রোফাইল দেখতে সাইন ইন করুন" : "Sign in to view your profile"}
            </span>
          </span>
          <ChevronRight className={chevronCls} />
        </Link>
      )}
    </SheetClose>
  );
}

/* ─── Main Component ───────────────────────────────────── */

export function MobileNav({
  items,
  groups,
  isAdmin,
  isSignedIn,
  adminLabel,
  cartCount,
  userEmail,
  userAvatarUrl,
  userDisplayName,
  signInLabel,
  signOutLabel,
  onSignOut,
  loginSearch,
  userId,
}: MobileNavProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const config = useSiteSettings();
  const { lang } = useLang();
  // Live count badges for the Account rows — same shared stores/queries as
  // the header + bottom nav (wishlist context, bookmark-count query).
  const { count: wishlistCount } = useWishlist();
  const bookmarkCount = useBookmarkCount(userId);
  const navStyle = config.navigation?.mobile_nav_style || "slide";
  const { getStyle, visible } = useStaggeredEntrance(50);

  let itemIndex = 0;
  const nextIndex = () => itemIndex++;

  const brandName = config.branding?.site_name_en || "Sabbe Satta";
  const brandNameBn = config.branding?.site_name_bn || "সব্বে সত্তা";
  const displayBrand = lang === "bn" ? brandNameBn : brandName;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={sheetOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={sheetOpen}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full border border-border/20 bg-background/60 hover:border-foreground/25 hover:bg-background"
        >
          {/* The visible morph happens on the in-sheet ✕ control (same corner,
              above the sheet layer). This header trigger is purely the opening
              hamburger — it sits under the sheet overlay when the menu is open
              (header z-40 < sheet z-50), so it always renders the 3-line state. */}
          <HamburgerButton />
        </button>
      </SheetTrigger>
      <SheetContent
        side={navStyle === "overlay" ? "left" : "right"}
        // The in-sheet ✕ (brand header) is the single close control — hide the
        // stock sheet close button so there's exactly one consistent ✕.
        hideClose
        className="w-72 sm:w-80 p-0 flex flex-col bg-background/95 backdrop-blur-xl overflow-hidden [box-shadow:0_16px_48px_-12px_hsl(var(--foreground)/0.18),inset_0_1px_0_hsl(var(--border)/0.1),inset_0_-1px_0_hsl(var(--border)/0.1)]"
      >
        {/* ── Subtle background atmosphere ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-saffron-50/[0.02] via-background to-background pointer-events-none" />

        {/* ── Brand header (pinned) — brand + morphing ✕ close ── */}
        <div className="relative shrink-0 bg-background/95 px-6 pt-6 pb-3 border-b border-border/10">
          {/* Saffron accent hairline — lives inside the pinned header so the
              brand strip always carries the accent. */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--color-saffron)] via-[var(--color-saffron)]/50 to-transparent" />
          <div className="flex items-center gap-3">
          <SheetClose asChild>
            <Link
              to="/"
              className="font-serif text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity inline-flex items-center gap-2 min-w-0"
            >
              <span className="text-[var(--color-saffron)]">❖</span>
              <span className="truncate">{displayBrand}</span>
            </Link>
          </SheetClose>
            <SheetClose asChild>
              <button
                aria-label="Close navigation menu"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:scale-105 active:scale-90 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <MorphClose open={sheetOpen} />
              </button>
            </SheetClose>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground/40 uppercase tracking-[0.15em] truncate">
            {lang === "bn" ? "প্রাচীন জ্ঞান ও আধুনিক মনোবিজ্ঞান" : "Ancient wisdom meets modern psychology"}
          </p>
        </div>

        {/* ── Scrollable middle — only this region scrolls; the profile block
             and bottom utilities stay pinned below. ── */}
        <nav className="relative flex-1 overflow-y-auto px-3 pb-4">
          {/* Browse section */}
          <SectionLabel>{lang === "bn" ? "ব্রাউজ করুন" : "Browse"}</SectionLabel>
          <NavSurface>
            {items.map((item) => {
              const idx = nextIndex();
              return (
                <NavItemEntry
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  style={getStyle(idx)}
                />
              );
            })}

            {/* Grouped dropdown items — label navigates to the parent page,
                chevron toggles the submenu (users can tell the two apart). */}
            {groups?.map((group) => {
              const idx = nextIndex();
              const isOpen = openGroup === group.label;
              return (
                <div key={group.label} style={getStyle(idx)}>
                  <ExpandableRow
                    to={group.to}
                    label={group.label}
                    icon={getPathIcon(group.to ?? "") ?? <BookOpen className="h-4 w-4" />}
                    isOpen={isOpen}
                    onToggle={() => setOpenGroup(isOpen ? null : group.label)}
                  />
                  <CollapsibleChildren isOpen={isOpen}>
                    {group.items.map((item, i) => (
                      <SubNavLink
                        key={item.to}
                        to={item.to}
                        label={item.label}
                        style={{
                          opacity: visible ? 1 : 0,
                          transform: visible ? "translateX(0)" : "translateX(8px)",
                          transition: `opacity 0.3s cubic-bezier(0.65, 0, 0.35, 1) ${i * 30}ms, transform 0.3s cubic-bezier(0.65, 0, 0.35, 1) ${i * 30}ms`,
                        }}
                      />
                    ))}
                  </CollapsibleChildren>
                </div>
              );
            })}

          </NavSurface>

          {/* ── Divider ── */}
          <div className="my-4 px-4">
            <div className="h-px bg-gradient-to-r from-border/30 via-border/10 to-transparent" />
          </div>

          {/* ── Help-us-grow CTA — the site's Donate action, kept in Sabbe
               Satta's own voice (saffron gradient + lotus) instead of copying
               the reference's heart label. ── */}
          <SheetClose asChild>
            <BrandCtaButton asChild className="w-full px-4 py-3 rounded-lg">
              <Link to="/donate" className="w-full">
                {/* White lotus — the CTA sits on the saffron gradient, so the
                    black PNG silhouette must be inverted in ALL themes. */}
                <LotusIcon size={18} white className="shrink-0" />
                {/* Bangla alignment (measured, 2026-08-11): line-height CANNOT
                    fix this — increasing it moves baseline and box center down
                    together, so ink-vs-box-center is font-metric-fixed. Noto
                    Sans Bengali's ink starts above its nominal ascent, leaving
                    the word ~2.3px high vs the 18px icon. Only a vertical
                    translate shifts the ink: translate-y-[2.25px] lands it
                    within +0.2px of the icon center. leading-[18px] still
                    matches the line box to the icon so the box stays 18px. */}
                <span className={`leading-[18px] ${lang === "bn" ? "translate-y-[2.25px]" : ""}`}>
                  {lang === "bn" ? "দান করুন" : "Donate"}
                </span>
              </Link>
            </BrandCtaButton>
          </SheetClose>

          {/* Account utilities — mirror the desktop avatar dropdown's
              Financial / Stats / Settings sections so both surfaces stay in
              sync (labels come from PROFILE_MENU_GROUP_LABELS). Visible to
              everyone; the admin row is admin-only and sits last. */}
          <div className="pt-5" />
          <SectionLabel>{lang === "bn" ? "অ্যাকাউন্ট" : "Account"}</SectionLabel>
          <NavSurface>
            {/* My Books — owned library (standalone, mirrors the dropdown) */}
            <NavItemEntry
              to="/purchases"
              label={lang === "bn" ? "আমার বই" : "My Books"}
              style={getStyle(nextIndex())}
            />

            {/* Financial — orders / cart / wishlist / bookmarks */}
            <GroupLabel style={getStyle(nextIndex())}>
              {lang === "bn"
                ? PROFILE_MENU_GROUP_LABELS.finance.labelBn
                : PROFILE_MENU_GROUP_LABELS.finance.label}
            </GroupLabel>
            <NavItemEntry
              to="/orders"
              label={lang === "bn" ? "অর্ডার ও রসিদ" : "Orders & Receipts"}
              style={getStyle(nextIndex())}
            />
            <NavItemEntry
              to="/cart"
              label={lang === "bn" ? "কার্ট" : "Cart"}
              suffix={
                cartCount != null && cartCount > 0 ? (
                  <CountBadge count={cartCount} lang={lang} />
                ) : undefined
              }
              style={getStyle(nextIndex())}
            />
            <NavItemEntry
              to="/wishlist"
              label={lang === "bn" ? "ইচ্ছাতালিকা" : "Wishlist"}
              suffix={wishlistCount > 0 ? <CountBadge count={wishlistCount} lang={lang} /> : undefined}
              style={getStyle(nextIndex())}
            />
            <NavItemEntry
              to="/bookmarks"
              label={lang === "bn" ? "বুকমার্ক" : "Bookmarks"}
              suffix={bookmarkCount > 0 ? <CountBadge count={bookmarkCount} lang={lang} /> : undefined}
              style={getStyle(nextIndex())}
            />

            {/* Stats */}
            <GroupLabel style={getStyle(nextIndex())}>
              {lang === "bn"
                ? PROFILE_MENU_GROUP_LABELS.stats.labelBn
                : PROFILE_MENU_GROUP_LABELS.stats.label}
            </GroupLabel>
            <NavItemEntry
              to="/stats"
              label={lang === "bn" ? "পড়ার পরিসংখ্যান" : "Reading Stats"}
              style={getStyle(nextIndex())}
            />

            {/* Settings */}
            <GroupLabel style={getStyle(nextIndex())}>
              {lang === "bn"
                ? PROFILE_MENU_GROUP_LABELS.settings.labelBn
                : PROFILE_MENU_GROUP_LABELS.settings.label}
            </GroupLabel>
            <NavItemEntry
              to="/settings"
              label={lang === "bn" ? "সেটিংস" : "Settings"}
              style={getStyle(nextIndex())}
            />

            {/* Admin — admin-only, delimited (mirrors the dropdown's
                standalone-admin separator), sits last. */}
            {isAdmin && adminLabel && (
              <div className="mt-1.5 border-t border-border/15 pt-1.5" style={getStyle(nextIndex())}>
                <NavItemEntry to="/admin" label={adminLabel} />
              </div>
            )}
          </NavSurface>
        </nav>

        {/* ── Persistent bottom profile block — Profile lives HERE, anchored
             below the scrollable navigation. The divider on top is clearly
             visible (border + hairline + soft shadow) so the pinned block
             reads as a separate surface on small screens. ── */}
        <div className="relative shrink-0 border-t border-border/25 px-4 py-3 bg-gradient-to-t from-saffron-50/[0.02] to-background shadow-[0_-8px_16px_-12px_hsl(var(--foreground)/0.25)]">
          {/* Saffron-tinted hairline on the divider edge */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--color-saffron)]/25 to-transparent" />
          <ProfileBlock
            isSignedIn={isSignedIn}
            userEmail={userEmail}
            userAvatarUrl={userAvatarUrl}
            userDisplayName={userDisplayName}
            signInLabel={signInLabel}
            loginSearch={loginSearch}
            lang={lang}
          />
        </div>

        {/* ── Bottom utilities (pinned): LangToggle + ThemeToggle + Sign out ── */}
        <div className="relative shrink-0 border-t border-border/10 px-4 py-4 bg-gradient-to-t from-saffron-50/[0.02] to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LangToggle className="ml-0" />
              <ThemeToggle />
            </div>
            {isSignedIn && (
              <SheetClose asChild>
                <BrandCtaButton
                  onClick={onSignOut}
                  className="px-5 py-2 text-xs uppercase tracking-[0.15em] rounded-lg"
                >
                  {signOutLabel || (lang === "bn" ? "সাইন আউট" : "Sign out")}
                </BrandCtaButton>
              </SheetClose>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
