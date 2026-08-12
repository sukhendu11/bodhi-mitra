import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * StatCard — shared responsive stat card (M6 rule extraction).
 *
 * Encodes the money-stat responsive rule from the 2026-08-11 M6 milestone:
 * long currency strings (`formatMoney` → "BDT 1,000.00" / "১,০০০.০০ টাকা")
 * render at `text-xl` on phones so they fit narrow cards and wrap cleanly
 * (`leading-tight`), scaling back to `text-2xl` at sm+; short counts stay
 * `text-2xl` everywhere.
 *
 * Layouts:
 *   - `"centered"` (default): tinted card, big value above a small label —
 *     orders, purchases, and the profile library summary.
 *   - `"stacked"`: bordered panel with an icon + label row above the value —
 *     the reading-stats page.
 *
 * Variants (centered only):
 *   - `"default"`: bordered tinted card (orders / purchases).
 *   - `"tint"`: borderless tinted card with semibold value + uppercase label
 *     (profile library summary — dense 3-col on phones is safe for counts).
 */
export function StatCard({
  value,
  label,
  money = false,
  variant = "default",
  layout = "centered",
  icon,
  suffix,
  className,
}: {
  /** Pre-formatted display value (count, `formatMoney` result, duration, …). */
  value: ReactNode;
  /** Short label for the stat. */
  label: string;
  /** Long currency value → the responsive M6 typography rule. */
  money?: boolean;
  /** Card look. `"default"` = bordered tinted card; `"tint"` = borderless + semibold + uppercase label. */
  variant?: "default" | "tint";
  /** `"centered"` = value above label; `"stacked"` = icon+label row above value. */
  layout?: "centered" | "stacked";
  /** Stacked layout: small icon beside the label. */
  icon?: ReactNode;
  /** Stacked layout: suffix rendered after the value (e.g. "days"). */
  suffix?: ReactNode;
  className?: string;
}) {
  const size = money ? "text-xl sm:text-2xl leading-tight" : "text-2xl leading-none";
  const weight =
    money || (layout === "centered" && variant === "default")
      ? "font-medium"
      : "font-semibold";

  if (layout === "stacked") {
    return (
      <div className={cn("border border-border/60 rounded-xl p-4 flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-[10px] uppercase tracking-[0.1em] font-medium">{label}</span>
        </div>
        <p className={cn(size, weight, "text-foreground tabular-nums")}>
          {value}
          {suffix && (
            <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-center",
        variant === "tint"
          ? "bg-secondary/30 rounded-lg p-4"
          : "p-4 rounded-xl bg-secondary/30 border border-border/40",
        className,
      )}
    >
      <p className={cn(size, weight, "tabular-nums")}>{value}</p>
      <p
        className={cn(
          "text-xs text-muted-foreground mt-1",
          variant === "tint" && "uppercase tracking-[0.1em]",
        )}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * StatGrid — responsive stat-card grid (M6 rule extraction).
 *
 * Encodes the "money grids stack on phones" rule: a 3+ column grid containing
 * money values collapses to one column below `sm` (even `text-xl` money
 * overflows a third-wide phone card — see the M6 purchases fix). Two-column
 * grids stay 2-col (the `text-xl` rule fits them), and short-value grids keep
 * their dense columns.
 *
 * Pass the page-specific gap/margin via `className` (e.g. `gap-4 mb-10`) —
 * this component owns the column rule only.
 */
export function StatGrid({
  columns = 2,
  money = false,
  className = "",
  children,
}: {
  /** Desktop column count. */
  columns?: 2 | 3 | 4;
  /** The grid contains money values → stack below `sm` when columns > 2. */
  money?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cols =
    columns === 4
      ? "grid-cols-2 md:grid-cols-4"
      : columns === 3
        ? money
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-3"
        : "grid-cols-2";
  return <div className={cn("grid", cols, className)}>{children}</div>;
}
