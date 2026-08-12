/**
 * Mobile Bottom Tab Bar — A2 milestone (2026-08-12).
 *
 * Persistent one-tap navigation for small screens: Home · Reflections ·
 * Books · Wishlist · Cart. Sits below the mobile-menu sheet (z-50), the chat
 * FAB and its backdrop (z-[45]/z-[46]), and the scroll-to-top button (z-50)
 * — so it never stacks on top of those chrome elements. `md:hidden` —
 * desktop keeps the header nav.
 *
 * Badges: wishlist count from the shared wishlist store; cart count from the
 * same ["cart-count"] query the header uses (shared cache). (The Search tab
 * was removed 2026-08-12 — search stays in the header icons + ⌘K palette.)
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLang, formatCountBadge } from "@/lib/i18n";
import { useWishlist } from "@/hooks/useWishlist";
import { getCartCount } from "@/lib/cart";
import { callFn } from "@/lib/call-fn";
import { openCartDrawer } from "@/lib/cart-events";
import { Home, Feather, BookOpen, Heart, ShoppingBag } from "lucide-react";

const SAFE_BOTTOM = "pb-[env(safe-area-inset-bottom)]";

export function BottomNav() {
  const { lang } = useLang();
  const { count: wishlistCount } = useWishlist();
  const doGetCartCount = useServerFn(getCartCount);
  const { data: countData } = useQuery({
    queryKey: ["cart-count"],
    queryFn: () => callFn(doGetCartCount),
    enabled: true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const cartCount = countData?.count ?? 0;

  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // The reader is a full-screen immersive surface — a bottom tab bar would
  // overlay its page controls on mobile. Hide the bar there (and on the
  // focused checkout flow).
  if (currentPath.startsWith("/reader") || currentPath.startsWith("/checkout")) {
    return null;
  }

  const tabCls = (active: boolean) =>
    `group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors duration-300 ${
      active
        ? "text-[var(--color-saffron)]"
        : "text-muted-foreground/70 hover:text-foreground"
    }`;

  const iconWrapCls = (active: boolean) =>
    `relative flex h-7 w-10 items-center justify-center rounded-lg transition-all duration-300 ${
      active ? "bg-[var(--color-saffron)]/10" : "group-active:bg-secondary/40"
    }`;

  const badge =
    "absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[9px] font-bold leading-none flex items-center justify-center px-1 ring-2 ring-background";

  return (
    <nav
      aria-label="Mobile navigation"
      className={`fixed inset-x-0 bottom-0 z-[44] border-t border-border/60 bg-background/92 backdrop-blur-lg md:hidden ${SAFE_BOTTOM}`}
    >
      <div className="flex items-stretch px-1">
        <Link to="/" className={tabCls(currentPath === "/")} activeOptions={{ exact: true }}>
          <span className={iconWrapCls(currentPath === "/")}>
            <Home className="h-5 w-5 stroke-[1.8]" />
          </span>
          {lang === "bn" ? "হোম" : "Home"}
        </Link>

        {/* Reflections — the hub page (category pages also light it up).
            Feather matches the mobile-drawer icon AND the homepage section
            header; Books uses the open-book `BookOpen` (same as the mobile
            nav) so the two tabs stay visually distinct. */}
        <Link
          to="/reflections"
          className={tabCls(currentPath.startsWith("/reflections"))}
        >
          <span className={iconWrapCls(currentPath.startsWith("/reflections"))}>
            <Feather className="h-5 w-5 stroke-[1.8]" />
          </span>
          {lang === "bn" ? "প্রতিফলন" : "Reflections"}
        </Link>

        <Link to="/books" className={tabCls(currentPath.startsWith("/books"))}>
          <span className={iconWrapCls(currentPath.startsWith("/books"))}>
            <BookOpen className="h-5 w-5 stroke-[1.8]" />
          </span>
          {lang === "bn" ? "বই" : "Books"}
        </Link>

        <Link to="/wishlist" className={tabCls(currentPath.startsWith("/wishlist"))}>
          <span className={iconWrapCls(currentPath.startsWith("/wishlist"))}>
            <Heart className="h-5 w-5 stroke-[1.8]" />
            {wishlistCount > 0 && (
              <span className={badge}>
                {formatCountBadge(wishlistCount, lang, 9)}
              </span>
            )}
          </span>
          {lang === "bn" ? "পছন্দ" : "Wishlist"}
        </Link>

        <button
          onClick={openCartDrawer}
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
          className={tabCls(false)}
        >
          <span className={iconWrapCls(false)}>
            <ShoppingBag className="h-5 w-5 stroke-[1.8]" />
            {cartCount > 0 && (
              <span className={badge}>
                {formatCountBadge(cartCount, lang, 9)}
              </span>
            )}
          </span>
          {lang === "bn" ? "কার্ট" : "Cart"}
        </button>
      </div>
    </nav>
  );
}
