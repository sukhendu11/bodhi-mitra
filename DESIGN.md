---
version: alpha
name: Sabbe-Satta-design-system
description: "The canonical design language for Sabbe Satta — a contemplative, bilingual (English/Bangla) platform for wisdom, mindfulness, and learning. Warm minimal surfaces, saffron as the single brand accent (wisdom), indigo secondary (loving-kindness), gold accent (middle path), and red destructive (blessings) — drawn from the Buddhist flag. Serif display type (Cormorant Garamond) over a calm Inter UI with Noto Sans Bengali for Bangla. Reading-first: generous whitespace, max 1200px content, 42rem reading width, no intrusive popups."
---

# Sabbe Satta — DESIGN.md

**This is the single source of truth for the Sabbe Satta visual language.** All current and future agents MUST follow it when designing or modifying UI/UX. The live implementation lives in `src/styles.css` (design tokens) — when in doubt, the CSS variables there are ground truth; this file documents and explains them.

Related docs: `PROJECT.md §17` (brief pointer), `RULES.md §12–14` (engineering rules), `design-references/awesome-design-md/` (third-party references for research only).

---

## 1. Design Philosophy

From the product principles (`PROJECT.md §2`):

- **Serenity** — warm, minimal, earth-toned UI with generous whitespace.
- **Slowness** — content-first reading experience; no popups, no intrusive CTAs.
- **Bilingual parity** — every content field exists in English and Bangla; the UI must look equally refined in both.
- **Configurability** — site owner controls text and visuals via admin settings, but the design system stays coherent.
- **Content-first** — the platform prioritizes reading depth over engagement metrics, quality over quantity, timeless wisdom over trending topics.

Design decisions should always serve reading depth and calm. Avoid flashy effects, bouncing, or exaggerated motion.

## 2. Color System

### 2.1 Buddhist Flag Semantics

The palette is drawn from the Buddhist flag — every semantic token carries meaning:

| Token | Color | Meaning |
|-------|-------|---------|
| `primary` | **Saffron** | Wisdom — buttons, links, active states, focus |
| `secondary` | **Indigo-blue** | Loving-kindness (Mettā) — subtle fills, borders |
| `accent` | **Gold-yellow** | Middle path — highlights, badges |
| `destructive` | **Red** | Blessings — destructive/error states |
| `success` | **Green** | Growth / compassion — success states |
| `info` | **Blue** | Loving-kindness — info states |
| `warning` | **Gold** | Middle path — warning states |

### 2.2 Brand Saffron Scale

`--color-saffron` is the brand accent; the 50–900 scale is used for tints:

| Step | Value | Step | Value |
|------|-------|------|-------|
| 50 | `#fef2e8` | 600 | `#a84300` |
| 100 | `#fde0cc` | 700 | `#7d3200` |
| 200 | `#fbc199` | 800 | `#522100` |
| 300 | `#f8a266` | 900 | `#271000` |
| 400 | `#f68333` | **hover** | `#e67e22` |
| 500 | `#d35400` (base) | **gold** | `#8b6914` (gradients) |

`--color-saffron-gold: #8b6914` — deep gold for saffron→gold brand gradients (AA-compliant with white text ≥ 4.5:1).

### 2.3 Buddhist Flag Palette

`--color-buddha-blue/yellow/red/white/orange/mixed` — used sparingly for category colors and cultural accents:

- Blue `#1a3a6b` (loving-kindness) · Yellow `#d4a017` (middle path) · Red `#b91c1c` (blessings) · White `#fafaf8` (purity) · Orange `#c2410c` (wisdom) · Mixed `#7c3aed` (all truths)

### 2.4 Semantic Tokens — Light Mode (default)

| Token | Value (oklch) | Role |
|-------|---------------|------|
| `--background` | `0.985 0.008 80` | Warm off-white canvas |
| `--foreground` | `0.25 0.012 60` | Nearly-black warm text |
| `--card` | `0.98 0.008 80` | Card surface |
| `--popover` | `0.995 0.006 85` | Elevated dropdown/dialog surface (brighter than background — must read as solid, distinct) |
| `--primary` | `var(--color-saffron)` | Saffron CTA / links |
| `--primary-foreground` | `0.99 0.003 80` | Near-white on saffron |
| `--secondary` | `0.95 0.02 260` | Indigo-tinted subtle fill |
| `--muted` | `0.96 0.008 75` | Disabled / placeholder surface |
| `--muted-foreground` | `0.45 0.01 60` | Secondary text |
| `--accent` | `0.82 0.06 85` | Gold highlight / badges |
| `--destructive` | `0.50 0.17 25` | Error red |
| `--success` | `0.55 0.14 145` | Success green |
| `--warning` | `0.72 0.12 85` | Warning gold |
| `--info` | `0.50 0.10 255` | Info blue |
| `--border` / `--input` | `0.91 0.01 75` | Hairlines, form borders |
| `--ring` | `0.55 0.14 45` | Focus rings (saffron) |

### 2.5 Semantic Tokens — Dark Mode (`.dark`)

Warm charcoal with a subtle indigo tint — **never pure black**.

| Token | Value (oklch) | Role |
|-------|---------------|------|
| `--background` | `0.16 0.01 280` | Dark charcoal canvas |
| `--foreground` | `0.92 0.008 280` | Near-white text |
| `--card` | `0.18 0.01 280` | Card surface |
| `--popover` | `0.22 0.012 280` | Elevated surface (lighter than bg) |
| `--primary` | `0.65 0.12 50` (lighter saffron) | CTA / links |
| `--primary-foreground` | `0.15 0.008 280` | Near-black on light saffron |
| `--secondary` | `0.23 0.01 280` | Subtle fill |
| `--muted` | `0.21 0.01 280` | Disabled surface |
| `--muted-foreground` | `0.55 0.008 280` | Secondary text |
| `--accent` | `0.25 0.01 280` | Gold highlight |
| `--destructive` | `0.45 0.15 25` | Error red |
| `--success` | `0.5 0.12 145` | Success green |
| `--warning` | `0.6 0.12 70` | Warning gold |
| `--info` | `0.5 0.08 240` | Info blue |
| `--border` / `--input` | `0.26 0.01 280` | Hairlines |
| `--ring` | `0.65 0.08 50` | Focus rings |

> ⚠️ **Never pin `--primary` / `--primary-foreground` at runtime** — they must stay theme-aware (dark mode uses a lighter saffron with dark text). Runtime theme changes only override saffron accent, fonts, radius, and book-grid vars.

## 3. Typography

| Role | Font | Notes |
|------|------|-------|
| Headings (`h1–h4`, `.font-serif`) | **Cormorant Garamond** | weight 400, `letter-spacing: -0.01em` |
| UI / body | **Inter** | system-ui fallback |
| Mono | `ui-monospace, SFMono-Regular, Menlo...` | code, technical eyebrows |
| **Bangla** (`--font-bn`) | **Noto Sans Bengali** | ⚠️ overrides ALL families + zeroes letter-spacing when `html[data-lang="bn"]` — the entire UI switches fonts |

### 3.1 Type Scale (Tailwind utilities)

| Token | Size | Use |
|-------|------|-----|
| `text-xxs` | 10px | Badges only (documented exception) |
| `text-xs` | 12px | Micro labels, meta, eyebrow |
| `text-sm` | 14px | Body-secondary, captions |
| `text-base` | 16px | Body default |
| `text-lg` | 18px | **Card titles** |
| `text-xl` | 20px | Sub-section headings |
| `text-2xl` | 24px | Section headings |
| `text-3xl` | 30px | Page sub-headings |
| `text-4xl` | 36px | Page H1 (mobile hero) |
| `text-5xl` | 48px | Hero display |

> **10px convention:** the 10px size is the floor for any text. In code it is applied as **`text-[10px]`** (the established convention, ~27 usages) — the `text-xxs` token exists as its equivalent but is not used in the codebase. **Do not go below 10px** (no `text-[9px]`, `text-[0.55rem]`, etc. — these were all eliminated in the 2026-08 audit).

Conventions: **no arbitrary `text-[0.xxrem]`** — use the scale sizes (`text-xs` = 12px minimum for readable body-adjacent text; 10px is reserved for badges/micro-labels). Card titles at `text-lg`. Headings use the serif stack. Weights: `font-medium` for emphasis on UI text, headings stay weight 400.

### 3.2 Article Prose (`.prose-mitra`)

- Body: 1.18rem, `line-height: 1.85`, Inter.
- Paragraphs: `margin-bottom: 1.4em`.
- Serif headings inside prose, `h2` = 2rem / `h3` = 1.5rem, `line-height: 1.25`.
- Blockquote: serif italic 1.22rem, `border-left: 3px solid var(--color-primary)`, tinted `--secondary` background, `line-height: 1.7`.
- Links: saffron with a subtle saffron underline; underline strengthens on hover.
- `code`: mono, `--secondary` background, 0.9em, 0.2em radius.

## 4. Layout & Spacing

- **Max content width:** 1200px (`max-w-6xl`), centered with `px-6` (mobile) / `px-8 md:px-12` (desktop).
- **Reading width:** 42rem for article bodies.
- **Breakpoints:** mobile `< 768px` · tablet `≥ 768px` (2-col grids) · desktop `≥ 1024px` (3-col grids).
- **Grids:** responsive 1/2/3 columns. The `.book-grid` class uses CSS custom properties (`--book-grid-cols-mobile/tablet/desktop`, `--book-grid-gap: 40px` default) so admins can tune it.
- **Spacing scale:** Tailwind standard 0.5→96 (2px→384px). Generous section padding — `py-20 md:py-28` for major sections, consistent `border-t border-border/40` section separators.
- **Z-index ladder:** `--z-dropdown: 100` · `sticky: 200` · `banner: 300` · `drawer: 400` · `modal: 500` · `popover: 600` · `tooltip: 700` · `toast: 800`.

## 5. Components & Patterns

### 5.1 Buttons

Per `RULES.md §14`:

- **Default / theme-neutral actions** → `bg-foreground text-background` (inverts automatically in dark mode). Used for: *Add to Cart, Save, Continue, Clear all, pagination, tab switches, dismiss*.
- **Brand CTAs** → saffron (`var(--color-saffron)` bg + `text-white`, or the saffron gradient). Used for: *Sign in / Sign up, Subscribe, Donate, Checkout, Send (AI chat), admin Back to site*. **Use the shared `BrandCtaButton` component** (`src/components/BrandCtaButton.tsx`) — the single saffron→gold gradient + shimmer-sweep implementation (with `asChild` for TanStack `<Link>`s). Do NOT hand-roll the inline gradient/shimmer markup (was duplicated ~10× before extraction).
- **`BrandCtaButton asChild` implementation note (Radix Slot):** the `asChild` branch renders `<Slot><Slottable>{children}</Slottable><span shimmer/></Slot>` so the shimmer merges INTO the slotted element. Do NOT "simplify" it back into a fragment-wrapped ternary — an explicit `<>` around `Slottable` + shimmer makes `React.Children.forEach` treat the fragment as one opaque child, so the Slot silently slots onto the fragment (className/style lost, shimmer emitted as sibling). The branch is split via early `if (asChild) return` precisely so the Slot receives implicit array children. (2026-08-09 SSR crash regression — see CHANGELOG.)
- **Dialog/modal surfaces** (AuthModal, purchase dialog, CheckoutPaymentDialog, ConfirmDialog, SocialShare, video Dialog, PdfViewer, Sheet drawers): the §5.1 taxonomy applies INSIDE modals exactly as outside — primary payment/auth/subscribe/donate actions → `BrandCtaButton`; confirm/delete/dismiss → `AlertDialogAction` (destructive) or outline Cancel; content actions (Comment, Share, Bookmark) → neutral. Google OAuth and other third-party brand buttons stay outline by convention. The dialog chrome itself uses `bg-popover` tokens (see §2.4/2.5) — no zinc hardcodes (2026-08-09 full dialog-surface audit — all compliant, see CHANGELOG).
- **Overlay elements** → fixed `text-white` on dark/translucent backgrounds for contrast over imagery (video play buttons, duration badges, icon buttons over cards).
- Rules of thumb: never `text-white` on an unthemed background (breaks dark mode); never invent a new brand button when a theme-aware one exists for the same role; icons inherit `currentColor`.

### 5.2 Cards

- Cards: `bg-card border border-border/40 overflow-hidden`, **`hover:shadow-lg hover:-translate-y-1`** with `transition-all duration-500`, hover border `border-foreground/20`.
- Card action buttons: `backdrop-blur-md shadow-[0_2px_12px] ring-1 ring-black/5`.
- Badges: 10px font, compact padding (`px-1.5 py-px`), no tracking, rounded, status-tinted (green = free, amber = featured).
- Star rating: filled stars use **saffron** (`primary`).
- Interactive elements: **global `cursor: pointer`** on `a, button, [role=button], select, label[for]` (in base styles).

### 5.3 Micro-interactions

- Calm, slow, Zen-like — never flashy. Prefer 300–700ms transitions with smooth easing (`cubic-bezier(0.4, 0, 0.2, 1)`).
- Hover: subtle scale (`hover:scale-105` / `110`), gentle grow, soft primary glow shadows.
- **Respect `prefers-reduced-motion`** — all animations zeroed via the CSS media query.
- Page entrance: `page-enter` (0.35s fade + 6px rise); cards use `stagger-enter` / `card-enter`.
- Available keyframes: `fade-in/out`, `slide-in/out`, `scale-in/out`, `shimmer` (skeleton), `bounce-subtle`, `pulse-soft`, `spin-slow`.

### 5.4 Elevation & Focus

- Shadows are subtle (low alpha, warm): `shadow-sm` → `shadow-2xl` scale defined in tokens.
- Popovers/dropdowns must read as **solid elevated cards** — use `bg-popover` with `shadow-2xl` + `ring-1 ring-foreground/5` and `border-border/80` when they sit on similar-toned surfaces.
- Focus rings: `--ring` (saffron) via `ring-1 ring-primary/40` or default focus styles. Keyboard accessibility is mandatory.

### 5.4.1 Form Inputs & Validation States (2026-08-09 audit — all compliant)

- **Hand-rolled inputs** must pair the resting border with a keyboard focus ring: `focus-visible:ring-1 focus-visible:ring-primary/40` (mouse users keep the existing `focus:border-*` feedback). No border-only focus, no foreground-tinted rings (`ring-foreground/*`), no raw saffron vars (`ring-[var(--color-saffron)]/*`) — always the `primary` token.
- **Composite inputs** (borderless inner field inside a bordered container — NewsletterSignup, TagInput): put the ring on the container with `focus-within:ring-1 focus-within:ring-primary/40` (+ `focus-within:border-primary/40`) so keyboard focus is visible.
- **Disabled** = `disabled:opacity-50` (+ `disabled:cursor-not-allowed` on interactive primitives); loading inputs get `disabled:opacity-50`.
- **Validation/error** = `aria-invalid={!!error}` + `aria-invalid:border-destructive/70` + `aria-invalid:focus-visible:ring-destructive/40` on the input, plus a `text-destructive` message below (shadcn convention). Never hardcode `border-red-*` — use the `destructive` token.
- **Selects & color swatches** get the same `focus-visible:ring` treatment as text inputs. Site-surface native selects hide the OS arrow (`appearance-none`) and show the Lucide `ChevronDown` inside a `relative` wrapper (gold-standard: books.index sort, search sort) — never a bare native arrow. Reader listbox controls (PdfViewer zoom preset trigger + `role=option` items) use the reader's own `ring-2 focus-visible:ring-primary/40` per §7, `ring-inset` on menu options so the ring stays inside the rounded menu.
- Shared primitives (`ui/input.tsx`, `ui/textarea.tsx`, `ui/switch.tsx`, `ui/checkbox.tsx`) already carry `focus-visible:ring-ring` — the canonical recipe; consumers just pass `aria-invalid` + validation classes via `className`.
- Reader surfaces (PdfViewer, reader routes) are exempt — they use their own theme tokens per §7.

### 5.5 Loading / Empty / Error States

- Skeleton: `.skeleton-shimmer` (gradient sweep, 1.8s). Loading text: "Loading…" / "লোড হচ্ছে…".
- Consistent empty states with an icon, one-line message, and a recovery action (e.g. "Clear search").
- Error states: message + Retry button; never blank the page.

### 5.5.1 Button Loading & Disabled States (2026-08-09 audit — all compliant)

- **Spinner icon:** `Loader2` (Lucide) with `animate-spin` — never a static `Loader2` (a non-spinning spinner is a bug: retry/refresh buttons use `RefreshCw` instead).
- **Canonical sizes:** `h-3.5 w-3.5` for small inline buttons (coupon apply, bookmark, reorder, compact links); `h-4 w-4` for labeled CTAs and icon buttons that replace a `h-4` icon (add-to-cart, publish, send, remove, purchase, processing). Standalone page/overlay loaders may be larger (`h-5` reader opening, `h-6`/`h-7` full-state loaders) — they are not buttons.
- **Pattern:** loading replaces the resting icon (spinner in its place, same size) + a bilingual pending label ("Processing…"/"প্রক্রিয়া হচ্ছে…"). One indicator per action — never a spinner both in the button AND an adjacent inline indicator (2026-08-09: removed the purchase-dialog double-spinner).
- **Disabled treatment:** `disabled:opacity-50` (shadcn standard) + `disabled:pointer-events-none` (or `disabled:cursor-not-allowed` when the disabled state should still hint interactivity, e.g. pagination). `BrandCtaButton` adds `disabled:hover:translate-y-0` so the hover lift doesn't fire when disabled.
- **Reader surfaces exempt** — PdfViewer/reader buttons keep their own theme-tinted disabled treatment per §7.

### 5.6 Toasts & Notifications (Sonner)

- **One shared toaster** — `SiteToaster` (`src/components/SiteToaster.tsx`) is the only `<Toaster>` in the app (public shell + admin shell in `__root.tsx`). Do not render a second bare `<Toaster>`.
- **Theme-aware** — `SiteToaster` watches the actual `.dark` class on `<html>` (MutationObserver + matchMedia), so `data-sonner-theme` always matches the site: manual toggle, admin-forced dark, and OS "system" mode. Sonner's own `theme="system"` only follows the OS and would render light toasts on a manually darkened site.
- **Design tokens, not Sonner defaults** — colors are mapped in `styles.css` under `[data-sonner-toaster][data-sonner-theme]` (with `!important`, because Sonner injects its stylesheet late): `--normal-bg: var(--card)`, `--normal-border: var(--border)`, `--normal-text: var(--foreground)`, radius 0.75rem, width 360px. `richColors` variants use **tinted token surfaces** (`color-mix(in oklab, var(--success|destructive|info|warning) ~10%, var(--card))` bg + ~30% border) with `--foreground` text for readability — never Sonner's pure white/black or its own green/red.
- **Lucide icons only** — the `icons` prop passes `CheckCircle2` / `AlertCircle` / `Info` / `TriangleAlert` (h-4 w-4); the `[data-icon]` color is set to the semantic token per `data-type` via CSS. Description text = `--muted-foreground`.
- **Bilingual** — every user-facing toast is EN + BN (`lang === "bn" ? … : …`). Backend `error.message` strings pass through as-is. Auth/settings *pages* are EN-only system pages (§6) — their toasts stay English to match the page until the page itself is localized.

## 6. Bilingual (EN ↔ BN) Rules

- **Every user-facing string** must have EN + BN. Use `pickLocalized(en, bn, lang, fallback)`.
- Bangla mode switches the **entire font stack** to Noto Sans Bengali (`data-lang="bn"`), zeroes letter-spacing, and uses **Bengali numerals** (`toBanglaDigits()`, e.g. ২০.০০ টাকা).
- Money: `formatMoney()` — `BDT 20.00` (EN) / `২০.০০ টাকা` (BN). **BDT is the only currency.**
- Category names: `localizeCategoryName()`; author names: `localizeAuthorName()`.
- Nav/system labels (Home, Books, Sign in) stay English in both languages by design.

## 7. Reader Design (PDF Viewer)

The PDF reader (`src/components/PdfViewer.tsx`) is a **self-contained reading surface** — it deliberately uses its own theme tokens rather than the site's light/dark tokens, because the reader is an immersive, distraction-free environment that should match the book being read, not the surrounding chrome.

### 7.1 Reading Themes (`ReaderTheme`)

| Theme | Wrap surface | Text | Page area backdrop | Page filter (CSS, zero re-render cost) |
|-------|-------------|------|--------------------|------------------------------------------|
| `light` | `bg-white` | `text-zinc-900` | `bg-secondary/10` | `none` |
| `dark` | `bg-zinc-900` | `text-zinc-100` | `bg-zinc-950` | `invert(1) hue-rotate(180deg)` |
| `sepia` | `bg-amber-50` | `text-amber-900` | `bg-amber-100/60` | `sepia(0.4) contrast(1.02)` |

- Pages are always painted white and the theme is applied as a **CSS filter on the canvas** — switching themes costs nothing (no re-render).
- The theme cycles `light → dark → sepia → light`. The toolbar icon shows Sun/Moon.
- These zinc/amber classes are **intentional exceptions** to the global token rule — the reader is a paper-like surface, not a site surface. Do not swap them for `--background`/`--foreground` tokens.

### 7.2 Toolbar & Icon Buttons

- Single row: sidebar toggle + book title (left) · page nav + zoom + layout mode (center) · search / download / print / rotate / fullscreen / theme / close (right).
- Icon buttons: `p-1.5 rounded-md` (≈32px hit target) via the `iconBtn(theme)` helper — theme-tinted zinc scale (light: `text-zinc-500` → hover `text-zinc-900 bg-zinc-100`; dark: `text-zinc-400` → hover `text-zinc-100 bg-zinc-800`; sepia: `text-amber-600` → hover `text-amber-800 bg-amber-100`). Active state gets a filled chip (`bg-zinc-200/70` / `bg-zinc-700` / `bg-amber-200/70`).
- All buttons have `title` + `aria-label`, `disabled:opacity-30`, and a saffron `focus-visible:ring-2 ring-primary/40`.
- Icons: `h-4 w-4`, Lucide only.

### 7.3 Layout Modes & Zoom

- **Single** — one page, centered. **Spread** — two pages side by side with a 16px gutter (pages render into separate canvases). **Continuous** — lazy vertical scroll with 40px page gap and IntersectionObserver pre-render (800px margin).
- **Zoom:** `fit-width` (default), `fit-page`, or custom scale — presets 50/75/100/125/150/200%, ±15% steps via `+`/`−`, clamped to 0.4–3.0.
- Page-turn affordances: floating round chevrons at the left/right edges (fade in on hover on desktop), swipe edge-shadow gradients that track the drag.

### 7.4 Sidebar (TOC + Thumbnails)

- Left sidebar `w-40 sm:w-48` with two tabs: **Contents** (chapter list, active chapter highlighted) and **Pages** (thumbnail rail).
- Thumbnails 112×150, lazily rendered via IntersectionObserver; **active page = `border-primary`** + `shadow-md`; inactive hover raises with `hover:-translate-y-0.5`.
- Active thumbnail auto-scrolls to center; rail scrollbars hidden via `.thumbnail-scroll`.
- Desktop (hover + fine pointer) opens by default when a TOC exists; closed on touch devices (opens via the PanelLeft toggle).

### 7.5 Interaction & Motion

- **Swipe to turn** (touch): 60px threshold, 90px drag-follow with rubber-band, settle at `280ms cubic-bezier(0.22, 1, 0.36, 1)`. Disabled in continuous mode or when the page is wider than the viewport.
- **Keyboard:** `←`/`→` turn page · `+`/`−` zoom · `0` = 100% · `F` fullscreen · `Ctrl/Cmd+F` search · `Esc` close (or close search first).
- Page canvases get `.reader-page-shadow` (`0 4px 20px rgba(0,0,0,0.15)`, 2px radius) so pages read as physical sheets.
- Search results render as horizontal cards: page-number eyebrow (`text-[10px] uppercase tracking-[0.08em]`) + 3-line snippet.

### 7.6 PDF Delivery

- PDFs are fetched **only** through the extension-less proxy route `/api/pdf?src=<encoded>` (base64 JSON payload → bytes) — no raw `.pdf` URLs exist in the app, so browsers/download managers never auto-grab the file. In-viewer Download/Print are permission-gated (`onDownload`/`onPrint` props) and hidden when not provided.

## 8. What NOT to Do

- Don't introduce a new brand color when saffron exists.
- Don't hardcode colors/typography/spacing/radius/shadows — use design tokens.
- Don't use `text-white` on theme-neutral backgrounds.
- Don't create page-specific styling when a shared component exists.
- Don't add a new animation without checking the keyframe library first.
- Don't break dark mode — verify every new pattern in both `.dark` and `.light`.
- Don't sacrifice readability (e.g. `text-[10px]` for body copy).

## 9. References

- **Canonical tokens:** `src/styles.css`
- **Rules:** `RULES.md §12–14` (frontend/UI/UX/design-system rules), `PROJECT.md §17`
- **Third-party research (do not copy, adapt):** `design-references/awesome-design-md/design-md/<site>/DESIGN.md`. The required 10-step research workflow lives in `AGENTS.md` → **Design Research Workflow** — follow it for every new page, major component, or significant UI change.
- Category→reference mapping (pick by the type of interface being built):
  - **Editorial/publishing** → blog, articles, reading, authors (The Verge, Wired, Notion, Mintlify)
  - **Ecommerce** → books, products, cart, checkout (Shopify, Nike, Airbnb, Uber, Stripe)
  - **SaaS** → application flows, settings, dashboards (Linear, Notion, Stripe, Supabase, Vercel)
  - **Finance** → data-heavy dashboards, tables, statistics (Revolut, Wise, Coinbase, Binance, Kraken)
  - **Productivity** → workspaces, filters, management interfaces (Raycast, Superhuman, Warp, Cal.com, Zapier)
  - **Media** → video, discovery, content grids (Spotify, Pinterest)
  - **Developer tools** → technical navigation and dense interfaces (Cursor, Raycast, Vercel, Expo, Mintlify)
  - **Editorial/premium** → typography, storytelling, content presentation (Apple, Stripe, Framer, Clay)
