import { Menu, X, ChevronRight, Home, BookOpen, Book, Video, ShoppingCart, Receipt, Shield, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar } from "./UserAvatar";
import { BrandCtaButton } from "./BrandCtaButton";
import { useSiteSettings } from "@/lib/siteSettings";
import { useLang } from "@/lib/i18n";

/* ─── Types ─────────────────────────────────────────────── */

interface MobileNavItem {
  to: string;
  label: string;
}

interface MobileNavGroup {
  label: string;
  items: MobileNavItem[];
}

interface MobileNavProps {
  items: MobileNavItem[];
  groups?: MobileNavGroup[];
  isAdmin?: boolean;
  isSignedIn?: boolean;
  adminLabel?: string;
  profileLabel?: string;
  cartCount?: number;
  userEmail?: string;
  userAvatarUrl?: string | null;
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

/* ─── Donate SVG Icon ──────────────────────────────────── */

function DonateIcon() {
  return (
    <svg viewBox="0 0 256 256" className="w-4 h-4" fill="currentColor">
      <path d="M128 20 C92 76 30 104 30 164 C30 206 62 242 110 242 C118 242 124 238 128 232 C132 238 138 242 146 242 C194 242 226 206 226 164 C226 104 164 76 128 20 Z" opacity="0.5" />
      <path d="M128 64 C106 108 54 132 54 178 C54 212 82 238 116 238 C120 238 124 234 128 228 C132 234 136 238 140 238 C174 238 202 212 202 178 C202 132 150 108 128 64 Z" opacity="0.75" />
      <path d="M128 100 C114 130 80 152 80 184 C80 210 100 232 124 232 C126 232 128 228 128 224 C128 228 130 232 132 232 C156 232 176 210 176 184 C176 152 142 130 128 100 Z" />
      <path d="M40 212 C40 242 76 254 128 254 C180 254 216 242 216 212" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
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
        className="group flex items-center justify-between rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 relative overflow-hidden hover:bg-secondary/30 hover:shadow-sm hover:translate-x-0.5 active:scale-[0.98]"
        activeProps={{
          className:
            "text-foreground font-medium bg-gradient-to-r from-primary/8 to-transparent border-l-2 border-[var(--color-saffron)]",
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

/* ─── Hamburger button with open/close morph ───────────── */

function HamburgerButton({ open }: { open: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: open ? 0 : 1,
          transform: open ? "rotate(90deg) scale(0.6)" : "rotate(0) scale(1)",
          pointerEvents: "none",
        }}
      >
        <Menu className="h-4 w-4" />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "rotate(0) scale(1)" : "rotate(-90deg) scale(0.6)",
          pointerEvents: "none",
        }}
      >
        <X className="h-4 w-4" />
      </span>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

export function MobileNav({
  items,
  groups,
  isAdmin,
  isSignedIn,
  adminLabel,
  profileLabel,
  cartCount,
  userEmail,
  userAvatarUrl,
  signInLabel,
  signOutLabel,
  onSignOut,
  loginSearch,
}: MobileNavProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const config = useSiteSettings();
  const { lang } = useLang();
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
          aria-label="Open navigation menu"
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 active:scale-90"
        >
          <HamburgerButton open={sheetOpen} />
        </button>
      </SheetTrigger>
      <SheetContent
        side={navStyle === "overlay" ? "left" : "right"}
        className="w-72 sm:w-80 p-0 flex flex-col bg-background/95 backdrop-blur-xl overflow-y-auto [box-shadow:0_8px_32px_-8px_hsl(var(--foreground)/0.12),inset_0_1px_0_hsl(var(--border)/0.1),inset_0_-1px_0_hsl(var(--border)/0.1)]"
      >
        {/* ── Saffron accent bar ── */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--color-saffron)] via-[var(--color-saffron)]/50 to-transparent" />

        {/* ── Subtle background atmosphere ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-saffron-50/[0.02] via-background to-background pointer-events-none" />

        {/* ── Brand header ── */}
        <div className="relative shrink-0 px-6 pt-8 pb-4">
          <Link
            to="/"
            className="font-serif text-lg tracking-tight text-foreground hover:opacity-80 transition-opacity inline-flex items-center gap-2"
          >
            <span className="text-[var(--color-saffron)]">❖</span>
            {displayBrand}
          </Link>
          <p className="mt-1.5 text-xs text-muted-foreground/40 uppercase tracking-[0.15em]">
            {lang === "bn" ? "প্রাচীন জ্ঞান ও আধুনিক মনোবিজ্ঞান" : "Ancient wisdom meets modern psychology"}
          </p>
        </div>

        {/* ── Separator ── */}
        <div className="relative px-6 pb-3">
          <div className="h-px bg-gradient-to-r from-border/30 via-border/10 to-transparent" />
        </div>

        {/* ── Navigation items ── */}
        <nav className="relative flex-1 px-3 pb-2 space-y-1">
          {/* Top-level items */}
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

          {/* Grouped dropdown items with expand/collapse */}
          {groups?.map((group) => {
            const idx = nextIndex();
            const isOpen = openGroup === group.label;
            return (
              <div key={group.label} style={getStyle(idx)}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : group.label)}
                  className="flex items-center justify-between w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 hover:translate-x-0.5 transition-all duration-200 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                    <span>{group.label}</span>
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-250 ${
                      isOpen ? "rotate-90 text-[var(--color-saffron)]" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-[var(--color-saffron)]/20 pl-3">
                    {group.items.map((item, i) => (
                      <SheetClose key={item.to} asChild>
                        <Link
                          to={item.to}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground/80 hover:text-foreground hover:bg-secondary/20 hover:shadow-sm hover:translate-x-0.5 transition-all duration-200"
                          style={{
                            opacity: visible ? 1 : 0,
                            transform: visible ? "translateX(0)" : "translateX(8px)",
                            transition: `opacity 0.3s cubic-bezier(0.65, 0, 0.35, 1) ${i * 30}ms, transform 0.3s cubic-bezier(0.65, 0, 0.35, 1) ${i * 30}ms`,
                          }}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Divider ── */}
          <div className="my-4 px-4">
            <div className="h-px bg-gradient-to-r from-border/30 via-border/10 to-transparent" />
          </div>

          {/* ── Donate CTA ── */}
          <SheetClose asChild>
            <BrandCtaButton asChild className="w-full px-4 py-3 rounded-lg">
              <Link to="/donate" className="w-full">
                <DonateIcon />
                {lang === "bn" ? "দান করুন" : "Donate"}
              </Link>
            </BrandCtaButton>
          </SheetClose>

          {/* ── Account section ── */}
          {isSignedIn && (
            <>
              <div className="my-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-border/20 to-transparent" />
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/30 font-semibold">
                    {lang === "bn" ? "অ্যাকাউন্ট" : "Account"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/20" />
                </div>
              </div>

              {/* Admin */}
              {isAdmin && adminLabel && (
                <NavItemEntry
                  to="/admin"
                  label={adminLabel}
                  suffix={<Shield className="h-3.5 w-3.5 text-muted-foreground/30" />}
                  style={getStyle(nextIndex())}
                />
              )}

              {/* Profile */}
              {profileLabel && userEmail && (
                <SheetClose asChild>
                  <Link
                    to="/profile"
                    className="group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 hover:shadow-sm hover:translate-x-0.5 transition-all duration-200 active:scale-[0.98]"
                  >
                    <UserAvatar email={userEmail} avatarUrl={userAvatarUrl} size="sm" />
                    <span className="flex-1">{profileLabel}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
                  </Link>
                </SheetClose>
              )}

              {/* Wishlist */}
              <NavItemEntry
                to="/wishlist"
                label={lang === "bn" ? "পছন্দের তালিকা" : "Wishlist"}
                suffix={<Heart className="h-3.5 w-3.5 text-muted-foreground/30" />}
                style={getStyle(nextIndex())}
              />

              {/* Cart */}
              <NavItemEntry
                to="/cart"
                label={lang === "bn" ? "কার্ট" : "Cart"}
                suffix={
                  cartCount != null && cartCount > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  ) : (
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/30" />
                  )
                }
                style={getStyle(nextIndex())}
              />

              {/* Purchases */}
              <NavItemEntry
                to="/purchases"
                label={lang === "bn" ? "ক্রয়সমূহ" : "Purchases"}
                suffix={<Receipt className="h-3.5 w-3.5 text-muted-foreground/30" />}
                style={getStyle(nextIndex())}
              />
            </>
          )}
        </nav>

        {/* ── Bottom bar: LangToggle + ThemeToggle + Auth ── */}
        <div className="relative shrink-0 border-t border-border/10 px-4 py-4 bg-gradient-to-t from-saffron-50/[0.02] to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LangToggle className="ml-0" />
              <ThemeToggle />
            </div>
            <SheetClose asChild>
              {isSignedIn ? (
                <BrandCtaButton
                  onClick={onSignOut}
                  className="px-5 py-2 text-xs uppercase tracking-[0.15em] rounded-lg"
                >
                  {signOutLabel || (lang === "bn" ? "সাইন আউট" : "Sign out")}
                </BrandCtaButton>
              ) : (
                <BrandCtaButton asChild className="px-5 py-2 text-xs uppercase tracking-[0.15em] rounded-lg">
                  <Link
                    to="/login"
                    search={loginSearch ?? { message: "", redirect: "/" }}
                  >
                    {signInLabel || (lang === "bn" ? "সাইন ইন" : "Sign in")}
                  </Link>
                </BrandCtaButton>
              )}
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
