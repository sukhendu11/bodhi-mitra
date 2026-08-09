import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * BrandCtaButton — the saffron-gradient CTA with shimmer sweep (DESIGN.md §5.1).
 *
 * Brand CTAs (Checkout, Pay, Sign in / Sign up, Subscribe, Donate, Send,
 * Save) use the saffron → gold gradient instead of the theme-neutral
 * `bg-foreground` button. This is the single shared implementation so the
 * gradient, shimmer, and hover lift stay identical everywhere.
 *
 * Pass `asChild` to render as a TanStack Router `<Link>` (e.g. the cart
 * page's "Proceed to Checkout").
 *
 * NOTE on Radix Slot: `Slot` requires exactly ONE element child (or a
 * `Slottable`). The shimmer sweep span must therefore be marked with
 * `Slottable` so it merges INTO the slotted element instead of being a
 * second sibling child — a second sibling throws "Slot failed to slot onto
 * its children. Expected a single React element child or `Slottable`."
 *
 * IMPORTANT: the Slottable + shimmer must be passed as IMPLICIT multiple
 * JSX children (an array). Wrapping them in an explicit `<>` fragment makes
 * `React.Children.forEach` treat the fragment as ONE opaque child, which
 * silently slots onto the fragment instead of the consumer's element —
 * dropping the className/style merge. (Verified via renderToString.)
 */
const baseCls =
  "group/cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:pointer-events-none";
const gradientStyle = {
  background: "linear-gradient(135deg, var(--color-saffron-600), var(--color-saffron-gold))",
} as const;

export const BrandCtaButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild = false, style, children, ...props }, ref) => {
  const shimmerCls =
    "pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/15 to-white/0 transition-transform duration-700 group-hover/cta:translate-x-[100%]";

  if (asChild) {
    return (
      <Slot
        ref={ref}
        {...props}
        style={{ ...gradientStyle, ...style }}
        className={cn(baseCls, className)}
      >
        {/* Slottable = the consumer's single element (e.g. <Link>). The
            shimmer span merges into that element as an extra child. */}
        <Slottable>{children}</Slottable>
        <span aria-hidden="true" className={shimmerCls} />
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      {...props}
      style={{ ...gradientStyle, ...style }}
      className={cn(baseCls, className)}
    >
      {/* Shimmer sweep */}
      <span aria-hidden="true" className={shimmerCls} />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
});
BrandCtaButton.displayName = "BrandCtaButton";
