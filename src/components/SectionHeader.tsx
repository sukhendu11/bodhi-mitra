/**
 * Shared section header — tinted icon chip + serif title + gradient hairline
 * + pill View-all link. C2 milestone (2026-08-12): extracted from the
 * homepage's local `HomeSectionHeader` so every content section across hubs
 * (homepage sections, continue-reading strip, etc.) shares one visual
 * language. The page *mastheads* (books/reflections/videos hubs) keep the
 * EditorialHeader component — that is intentionally a different pattern.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  icon,
  title,
  viewAllTo,
  viewAllLabel,
  accent = "saffron",
}: {
  icon: ReactNode;
  title: string;
  viewAllTo: string;
  viewAllLabel: string;
  /** Which brand-tint the icon chip wears: saffron (primary) | gold | indigo. */
  accent?: "saffron" | "gold" | "indigo";
}) {
  const chipTints: Record<typeof accent, string> = {
    saffron: "bg-[var(--color-saffron)]/10 text-[var(--color-saffron)] ring-[var(--color-saffron)]/20",
    gold: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
  };
  const hairlineTints: Record<typeof accent, string> = {
    saffron: "from-[var(--color-saffron)] to-[var(--color-saffron)]/15",
    gold: "from-amber-500 to-amber-500/15",
    indigo: "from-indigo-500 to-indigo-500/15",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-10 h-10 shrink-0 rounded-xl ring-1 flex items-center justify-center ${chipTints[accent]}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-xl md:text-2xl leading-tight">{title}</h2>
          <span
            className={`mt-1.5 block h-0.5 w-12 rounded-full bg-gradient-to-r ${hairlineTints[accent]}`}
          />
        </div>
      </div>
      <Link
        to={viewAllTo}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-[var(--color-saffron)]/40 hover:shadow-sm transition-all duration-300 active:scale-95"
      >
        {viewAllLabel}
        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
