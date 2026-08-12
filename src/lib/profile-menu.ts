import type { LucideIcon } from "lucide-react";
import {
  User,
  Bookmark,
  Settings,
  ShoppingBag,
  BarChart3,
  Shield,
  BookOpen,
  ShoppingCart,
  Heart,
} from "lucide-react";

/**
 * Profile dropdown menu configuration.
 *
 * `sort_order` drives the render order (ascending). This mirrors the
 * `navigation_items.sort_order` pattern used across the site so a future
 * admin backend can expose these positions for customization (reorder /
 * rename / hide) without touching the component — swap this module for a
 * CMS-driven fetch when that backend lands.
 *
 * Items may carry a `group`, rendered as a labeled section header by
 * AvatarDropdown: Financial (orders/cart/wishlist/bookmarks), Stats, and
 * Settings. Ungrouped items (Profile, My Books, Admin) render standalone.
 *
 * "Sign out" is intentionally NOT part of this list: it is a destructive
 * action rendered after a separator, not a navigational destination.
 */
export type ProfileMenuGroup = "finance" | "stats" | "settings";

export const PROFILE_MENU_GROUP_LABELS: Record<
  ProfileMenuGroup,
  { label: string; labelBn: string }
> = {
  finance: { label: "Financial", labelBn: "আর্থিক" },
  stats: { label: "Stats", labelBn: "পরিসংখ্যান" },
  settings: { label: "Settings", labelBn: "সেটিংস" },
};

export interface ProfileMenuItemConfig {
  /** Stable id — a future admin backend references items by this. */
  id:
    | "profile"
    | "purchases"
    | "orders"
    | "cart"
    | "wishlist"
    | "bookmarks"
    | "stats"
    | "settings"
    | "admin";
  sort_order: number;
  label_en: string;
  label_bn: string;
  /** Internal route path, or the external URL for `external` items. */
  to: string;
  icon: LucideIcon;
  /** Optional labeled section header (Financial / Stats / Settings). */
  group?: ProfileMenuGroup;
  /** External link — rendered as <a target="_blank">. */
  external?: boolean;
  /** Only rendered for signed-in admins. */
  adminOnly?: boolean;
}

export const PROFILE_MENU_ITEMS = [
  // Identity + owned content (standalone)
  {
    id: "profile",
    sort_order: 0,
    label_en: "Profile",
    label_bn: "প্রোফাইল",
    to: "/profile",
    icon: User,
  },
  {
    id: "purchases",
    sort_order: 1,
    label_en: "My Books",
    label_bn: "আমার বই",
    to: "/purchases",
    icon: BookOpen,
  },
  // ── Financial ──
  {
    id: "orders",
    sort_order: 2,
    group: "finance",
    label_en: "Orders & Receipts",
    label_bn: "অর্ডার ও রসিদ",
    to: "/orders",
    icon: ShoppingBag,
  },
  {
    id: "cart",
    sort_order: 3,
    group: "finance",
    label_en: "Cart",
    label_bn: "কার্ট",
    to: "/cart",
    icon: ShoppingCart,
  },
  {
    id: "wishlist",
    sort_order: 4,
    group: "finance",
    label_en: "Wishlist",
    label_bn: "ইচ্ছাতালিকা",
    to: "/wishlist",
    icon: Heart,
  },
  {
    id: "bookmarks",
    sort_order: 5,
    group: "finance",
    label_en: "Bookmarks",
    label_bn: "বুকমার্ক",
    to: "/bookmarks",
    icon: Bookmark,
  },
  // ── Stats ──
  {
    id: "stats",
    sort_order: 6,
    group: "stats",
    label_en: "Reading Stats",
    label_bn: "পড়ার পরিসংখ্যান",
    to: "/stats",
    icon: BarChart3,
  },
  // ── Settings ──
  {
    id: "settings",
    sort_order: 7,
    group: "settings",
    label_en: "Settings",
    label_bn: "সেটিংস",
    to: "/settings",
    icon: Settings,
  },
  {
    id: "admin",
    sort_order: 8,
    label_en: "Admin",
    label_bn: "অ্যাডমিন",
    to: "",
    icon: Shield,
    external: true,
    adminOnly: true,
    /** External items: when `to` is empty, the renderer resolves the href
        from the Strapi admin URL provided at render time (see AvatarDropdown). */
  },
] as const satisfies readonly ProfileMenuItemConfig[];

/** Menu items sorted by `sort_order` (stable, ascending). */
export function getProfileMenuItems(): ProfileMenuItemConfig[] {
  return [...PROFILE_MENU_ITEMS].sort((a, b) => a.sort_order - b.sort_order);
}
