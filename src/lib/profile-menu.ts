import type { LucideIcon } from "lucide-react";
import { User, Bookmark, Settings, Receipt, Shield } from "lucide-react";

/**
 * Profile dropdown menu configuration.
 *
 * `sort_order` drives the render order (ascending). This mirrors the
 * `navigation_items.sort_order` pattern used across the site so a future
 * admin backend can expose these positions for customization (reorder /
 * rename / hide) without touching the component — swap this module for a
 * CMS-driven fetch when that backend lands.
 *
 * "Sign out" is intentionally NOT part of this list: it is a destructive
 * action rendered after a separator, not a navigational destination.
 */
export interface ProfileMenuItemConfig {
  /** Stable id — a future admin backend references items by this. */
  id: "profile" | "bookmarks" | "settings" | "purchases" | "admin";
  sort_order: number;
  label_en: string;
  label_bn: string;
  /** Internal route path, or the external URL for `external` items. */
  to: string;
  icon: LucideIcon;
  /** External link — rendered as <a target="_blank">. */
  external?: boolean;
  /** Only rendered for signed-in admins. */
  adminOnly?: boolean;
}

export const PROFILE_MENU_ITEMS = [
  {
    id: "profile",
    sort_order: 0,
    label_en: "Profile",
    label_bn: "প্রোফাইল",
    to: "/profile",
    icon: User,
  },
  {
    id: "bookmarks",
    sort_order: 1,
    label_en: "Bookmarks",
    label_bn: "বুকমার্ক",
    to: "/bookmarks",
    icon: Bookmark,
  },
  {
    id: "settings",
    sort_order: 2,
    label_en: "Settings",
    label_bn: "সেটিংস",
    to: "/settings",
    icon: Settings,
  },
  {
    id: "purchases",
    sort_order: 3,
    label_en: "Purchases",
    label_bn: "ক্রয়",
    to: "/purchases",
    icon: Receipt,
  },
  {
    id: "admin",
    sort_order: 4,
    label_en: "Admin",
    label_bn: "অ্যাডমিন",
    to: "",
    icon: Shield,
    external: true,
    adminOnly: true,
  },
] as const satisfies readonly ProfileMenuItemConfig[];

/** Menu items sorted by `sort_order` (stable, ascending). */
export function getProfileMenuItems(): ProfileMenuItemConfig[] {
  return [...PROFILE_MENU_ITEMS].sort((a, b) => a.sort_order - b.sort_order);
}
