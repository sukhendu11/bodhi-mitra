import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared base classes for the article-page outlined action buttons
 * (bookmark / share / typography). Keeps hover lift, active press, focus
 * ring, and resting opacity consistent across all three.
 */
export const ACTION_PILL_CLS =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/60 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * Escape HTML special characters to prevent XSS in rendered HTML.
 * Used for email templates and any user-generated content rendered as HTML.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * True when an ID is a mock/dev id (non-UUID) rather than a real database
 * UUID. Mock content (posts/books from mock-data.ts) uses ids like "post-3"
 * / "book-1"; real Supabase rows use UUIDs. Server functions must never
 * write mock ids into UUID-typed columns (e.g. comments.post_id).
 */
export function isMockId(id: string | null | undefined): boolean {
  return !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
}

