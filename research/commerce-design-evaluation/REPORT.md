# Commerce UI & Storefront Design-System Evaluation for Sabbe Satta

> Generated 2026-08-07 · workspace: research/commerce-design-evaluation/ · sources: 30+ (docs, GitHub, 2026 UX research)

## Executive Summary

- **Keep the existing shadcn-style primitive base as the load-bearing layer.** It is MIT, Tailwind v4-native, Radix-backed (WCAG-minded keyboard/ARIA), already installed, and the output target of every major AI tool — rebuilding on another library (Flowbite/Preline/daisyUI) would discard working code and force a class-system switch for zero benefit. [F1][F2]
- **Adopt Origin UI as the primary composition reference** (free, MIT, shadcn-native, large catalog incl. cart/checkout/order-summary/account blocks). **HyperUI** as a zero-dependency fallback for simple markup patterns. **TailGrids free tier** as an inspiration source only (freemium; the best commerce blocks are paid). [F1][F3]
- **Skip as dependencies**: Tailwind Plus/Catalyst ($299 — reference only), Aceternity/Magic UI animated layers (Framer Motion ~125KB; Aceternity is dark-first, light-mode rework cost, and offers little for commerce app surfaces), Flowbite/Preline/daisyUI (class-based, framework-interop friction in a React+shadcn app), Tabler/TailAdmin (Bootstrap/Alpine/HTML — pattern reference for admin layout only). [F1][F3]
- **Commerce engines (Medusa/Saleor/Vendure/Hydrogen) are pattern references, not platforms.** The stack already models the domain (cart, orders, purchases, coupons) behind `VITE_DATA_SOURCE`. We steal their **domain model boundaries** (cart ≠ wishlist ≠ orders ≠ purchases), **cart-context provider pattern**, **one-page checkout structure**, and **account-dashboard composition** — not their code. [F4]
- **Checkout UX evidence (Baymard/BelVG/2026 studies) validates the current implementation and points to three upgrades**: (1) guest checkout already first-class — keep; (2) live running total + full cost breakdown in cart (subtotal/discount/tax/total) — already shipping, keep sticky on desktop; (3) **new**: mini-cart is the right add-to-cart feedback, but it should also offer "Continue shopping" + total before checkout, and the account area should lead with recent orders (already true of `/orders` + `/profile`). [F5][F6]
- **Net effect on the codebase: near-zero new dependencies.** Most recommendations map to composition patterns already expressible with `shadcn` primitives the project ships (Sheet/Dialog/DropdownMenu/Tabs/Badge/Table/Card/Separator) + TanStack Table. The single largest missing piece is a **one-page checkout route** (currently a payment dialog) — built as composition, not a new library. [F5][F7]

## Background & Scope

The M2 commerce work delivered a working cart drawer, cart page, payment dialog, and order history, all mock-first. This evaluation asks: *given the 2026 open-source UI/commerce landscape, what interaction patterns, layouts, and component architecture should the next iteration adopt — without copying code and without paying for anything?*

Scope: 13 component/UI libraries, 2+ admin dashboards, 7 storefront frameworks, and published cart/checkout/account UX research.

---

## 1. Component & UI Library Landscape

### 1.1 Adoption decisions

| Library | License | Model | Tailwind v4 | Verdict for Sabbe Satta |
|---------|---------|-------|-------------|-------------------------|
| **shadcn/ui** | MIT | Copy-paste Radix+Tailwind | ✅ | **Foundation — keep.** Already installed. Radix a11y, code ownership, AI-tool default. [F1] |
| **Origin UI** | MIT (free) | shadcn-compatible registry | ✅ | **Adopt as composition reference** — largest free shadcn-native catalog (incl. ecommerce blocks). [F3] |
| **HyperUI** | MIT | Markup copy-paste, zero-dep | ✅ | **Adopt for simple patterns** (empty states, stat grids, section shells). [F3] |
| **TailGrids free** | MIT core / freemium | Copy-paste (React/HTML/Vue) | ✅ | **Inspiration only** — e-commerce/order-summary blocks are Pro. [F1] |
| **TailAdmin** | MIT free / freemium | HTML+Alpine, React/Next ports | ✅(ports) | **Pattern reference for admin shell** — sidebar/topbar/stat layout mirrors our MockAdminPanel goals. [F3] |
| **Tabler** | MIT | Bootstrap HTML | — | **Pattern reference only** (Bootstrap conflicts with Tailwind). Notifications/stat-card patterns worth borrowing. [F3] |
| **Flowbite** | MIT core / Pro | Class-based, JS layer | ✅ | **Skip** — class-based conflicts with shadcn component ownership. [F2] |
| **Preline UI** | MIT core / Pro | Class-based + headless JS | partial | **Skip** for same reason; good a11y docs to crib. [F2] |
| **daisyUI** | MIT | Tailwind plugin (semantic classes) | ✅ | **Skip** — different styling paradigm than shadcn. [F2] |
| **Tailwind Plus / Catalyst** | Paid $299 | Copy markup + React kit | ✅ | **Reference only** — paid; Catalyst ≈ shadcn (already owned). [F1] |
| **Magic UI** | MIT free / Pro templates | shadcn-addon, Framer Motion | ✅ | **Skip** — marketing animations, ~125KB motion dep; commerce app surfaces don't need it. [F3] |
| **Aceternity UI** | Free / paid templates | shadcn-addon, Framer Motion (+Three.js) | ✅ | **Skip** — dark-first (light-mode rework), heavy, decorative; low app-surface value. [F3] |
| **react-bits** | MIT | Copy-paste, CSS/WAAPI-first | ✅ | **Optional, low priority** — animated counters/dividers could enrich `/stats`, but motion is not a gap today. [F3] |

### 1.2 What the research confirms about the current stack

- **shadcn/ui crossed 50k GitHub stars and is the default component output for AI coding tools** (v0, Cursor, etc.) — staying on it keeps AI-assisted development fast and future-proof. [F1]
- The industry-consensus **hybrid** is: marketing surfaces from a section library, application interiors from shadcn primitives. Sabbe Satta is almost entirely application interiors → shadcn primitives are the right load-bearing layer. [F1]
- shadcn's **atomic components** (Sheet, Dialog, Tabs, DropdownMenu, Table+TanStack, Badge, Card, Separator, Toast/Sonner) already cover cart drawer, checkout dialog, order history, admin tables, notifications. [F1][F5]

## 2. Admin Dashboard Patterns

From TailAdmin (sidebar + topbar + notification dropdown + stat cards + data tables + status badges), Tabler (notification center, stat progress cards), Medusa admin (order pipelines), and Vercel dashboard (shadcn + TanStack Table + charts):

- **Shell**: fixed left sidebar (collapsible), topbar with search, notification bell, user menu (right). Our `MockAdminPanel` already follows this.
- **Stat cards**: icon + value + delta + mini progress. `/admin` dashboard + `/stats` already implement the pattern; the missing nicety is a delta-vs-previous-period badge (deferrable).
- **Tables**: TanStack Table + sorting/filtering + status badges (processing/paid/failed/refunded) + row actions in a DropdownMenu — already the pattern in the Orders tab and TanStack Table is installed.
- **CRUD**: dialog form + AlertDialog delete confirm + toast — exactly what `mock-cms.ts` does.
- **Takeaway**: no new dashboard library. Keep `MockAdminPanel` composition; borrow *status-badge color semantics* (processing=amber, paid=green, failed=red, refunded=slate) from Tabler/Medusa into the Orders admin tab. [F3][F7]

## 3. Storefront Commerce Frameworks — Pattern Reference

None are adopted as platforms (AGENTS.md already assigns commerce to Supabase+Stripe behind the seam). Patterns worth extracting:

### 3.1 Cart domain (Medusa / Next.js Commerce / Vendure)
- **Cart context/provider** (`useCart`) with `cart_id` persisted in localStorage; line items updated optimistically; count badge in header. → Already equivalent: mock-cart + `getCart` + header badge. [F4]
- **Guest cart first**: carts exist before login, merge/assign on auth. → Already true (guest mock-cart + `requireAuthOrMock`). [F4][F6]
- **Domain separation**: cart ≠ wishlist ≠ orders ≠ purchases. → Already modeled (`mock-cart`, `mock-commerce`, `mock-*` wishlist/orders/purchases). [F4]

### 3.2 Checkout structure (Medusa starter, Astro Medusa, thefrontkit, Your Next Store)
- **One-page checkout** with collapsible sections (contact → shipping → payment → review) + sticky order summary in a right rail on desktop; sticky "Place Order" button; accordion summaries collapse to readable state. Baymard/CheckoutPage data: one-page reduces abandonment ~20%. [F5][F6]
- **Explicit CTA**: "Place Order" / "Pay & Place Order" (not "Continue"); totals visible up front; no forced account creation. [F5][F6]
- **Running total**: live recalc of discount/tax/total as line items change. → Cart drawer + dialog already do this. [F5]
- **Currently missing in Sabbe Satta**: a dedicated **one-page checkout route** (the payment dialog is compact but there's no full review+address+payment page). Recommendation: build `/checkout` as shadcn composition (two-column: accordion sections + sticky summary rail), reusing `CheckoutPaymentDialog`'s card form and `completeMockCheckout`. [F5][F7]

### 3.3 Order & confirmation (Medusa `/order/confirmed/[id]`, Vendure, yournextstore)
- Confirmation page = order number prominently, itemized summary, totals, next-steps. → `/checkout.success` exists; upgrade to include the full receipt breakdown (subtotal/discount/tax/total) now that orders carry those fields. [F4][F5]

### 3.4 Account pages (Medusa `/account` = orders + addresses; Shopify account UX; EcomDesignPro)
- **Account dashboard leads with next actions**: recent orders, tracking/reorder — settings below the fold. Treat the account as a mini-storefront for returning customers. [F6]
- Order list with expandable detail + reorder ("Buy again"). → `/orders` has expandable detail; add a **reorder** action (re-add items to cart). [F6][F7]
- Saved addresses / saved cards (deferrable — digital goods, single-address checkout). [F6]

## 4. Cart / Checkout / Payment UX Evidence

- **~70% cart abandonment** (Baymard, 50 studies); top fixable causes: unexpected costs, forced registration, complexity, distrust. [F6]
- **One-page checkout**: −20% abandonment average; accordion sections + sticky summary; collapsed summary on mobile (item count + total visible, tap to expand). [F6]
- **Guest checkout**: −24% abandonment vs forced registration; invite account creation *post-purchase* (single-field password) — not before. [F6]
- **Payment diversity**: +12–15% conversion (Apple Pay/Google Pay/wallets). Deferrable for Sabbe Satta (Stripe Card + future Link/GPay). [F6]
- **Full cost breakdown in the cart** (subtotal/discount/shipping/taxes/total) is the #1 transparency fix — already implemented (Subtotal/Discount/Tax/Total). [F5][F6]
- **Mini-cart pattern**: slide-out drawer gives immediate add-to-cart feedback without leaving the page; full-page cart for final review. Both should coexist; mini-cart CTA = "View cart / Checkout". → Already true (CartDrawer + /cart). [F6]
- **Trust signals near CTA** (SSL, secure-payment note) reduce payment-step drop-off. Low-cost add. [F6]
- **Account**: place account dropdown upper-right (done); highlight recent orders (done via /orders + /profile); provide explicit "Apply/Save" on account edits (settings already uses explicit save). [F6]

## 5. Sabbe Satta Fit Assessment

### 5.1 Adopt (add to project)
1. **`/checkout` one-page route** — shadcn composition (accordion sections + sticky right summary rail + sticky Place Order). Reuses existing card form, tax pipeline, `completeMockCheckout`. *Biggest UX gap.*
2. **Reorder action** on `/orders` and `/profile` recent books — re-add owned items to cart (guards against already-purchased).
3. **Order-confirmation receipt breakdown** on `/checkout.success` (subtotal/discount/tax/total) + trust note.
4. **Mini-cart upgrade**: show running total + "Continue shopping" link alongside "Checkout" (mirrors BelVG/top-store mini-carts).
5. **Origin UI** as the composition reference for any new block (account sidebar, order cards, empty states) — MIT, no install, copy the *pattern*.

### 5.2 Adapt (pattern into existing components)
- **Status-badge color semantics** (processing/paid/failed/refunded) in admin Orders tab + order history.
- **Delta badges** on dashboard stat cards (optional).
- **Collapsible order summary on mobile** checkout (sticky total bar).
- **`aria-live` announcements** for cart add/quantity changes (Screen-reader feedback; Radix Sheet gives focus handling, add polite region).

### 5.3 Skip (paid / overweight / redundant)
- Tailwind Plus/Catalyst, Aceternity/Magic UI (motion + dark-first), Flowbite/Preline/daisyUI (class-based), Tabler/TailAdmin (Bootstrap/Alpine — pattern only), TailGrids Pro, Medusa/Saleor/Vendure/Hydrogen/Commerce Layer as platforms.

### 5.4 Token/bilingual mapping
- All new surfaces must use existing CSS-variable tokens (saffron primary, indigo secondary, gold accent) via `siteSettings` overrides — the evaluation surfaces no reason to change the design token system; it is shadcn/v4-compatible and themeable at runtime.
- Bilingual microcopy (EN+BN) for all checkout/receipt/account labels; keep `pickLocalized` pattern.

## Decision

**No new dependencies are justified.** The next commerce iteration should be built as **composition on the existing shadcn-style primitive layer**, guided by Origin UI / HyperUI patterns, the one-page-checkout structure from Medusa-storefront/YourNextStore, and the cart/checkout/account UX evidence in F5/F6. The concrete work is: one-page `/checkout`, reorder, receipt-on-confirmation, mini-cart total, and status-badge semantics — all expressible with components already in `package.json`.

## Findings Index
- `findings/F1.md` — Component library landscape & licenses
- `findings/F2.md` — shadcn vs class-based (Flowbite/Preline/daisyUI) architecture
- `findings/F3.md` — Admin dashboard patterns (TailAdmin/Tabler/Medusa admin/Vercel)
- `findings/F4.md` — Commerce frameworks: domain models & storefront patterns
- `findings/F5.md` — Current-implementation audit vs best practice (gaps)
- `findings/F6.md` — Cart/checkout/account UX research evidence
- `findings/F7.md` — Adaptation plan & component mapping