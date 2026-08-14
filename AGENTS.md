## Objective
- Adopt **Supabase as the unified backend** — Auth, PostgreSQL (ALL data: content + application), Storage, RLS
- Target admin: **Refine Core + shadcn/ui** inside the TanStack application (admin/CRUD/data-handling patterns + component system)
- Keep TanStack Start as the frontend framework; **do not migrate** for hosting compatibility
- **Strapi is superseded** — no longer the target CMS; do not introduce it (or any other CMS/backend platform) without explicit architecture approval. Strapi code stays in the repo pending migration + removal (P2/P3)
- **Hosting target: Hostinger Managed Node.js / Web Apps Hosting** — managed platform; no VPS/Docker/Nginx/PM2/systemd; Cloudflare optional (not mandatory)
- Build custom features only for Sabbe Satta's unique requirements
- **Use free tools only** — no free tiers with hard limits, no trial versions, no freemium lock-in

> **Doc map:** `PROJECT.md` is the single architecture + roadmap document. The full technical blueprint is **§28 Platform Architecture** (formerly `ARCHITECTURE.md`, merged 2026-08-08, revised 2026-08-14 for **AD-029**): responsibility split §2, data flows §3, navigation structure §3, hosting/security/env config §6/§13/§10, architecture decisions §11. The condensed tables below are the **agent-facing orientation** — consult §28 when detail matters.

## Platform Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend (unified) | Supabase (Auth + PostgreSQL + Storage + RLS) | ALL data — content (posts, pages, books, videos, categories, tags, navigation, site settings) + application (purchases, cart, orders, progress, bookmarks, comments, etc.) |
| Admin (target) | Refine Core + shadcn/ui (inside the TanStack app) | Admin/CRUD/data-handling UI (P2 — not yet installed) |
| Frontend SSR | React 19 + TanStack Start | Public website, reader, commerce |
| Auth | Supabase Auth | Frontend user authentication (email + Google OAuth), sessions, roles |
| Database | Supabase PostgreSQL | ALL data (content + application) — single database |
| Storage | Supabase Storage | File uploads (private book PDFs, covers, user avatars, media) |
| Payments | Provider-agnostic interface (simulated → PipraPay stopgap → direct bKash/Nagad) | Payment processing, checkout redirects, IPN webhooks |
| Email | Resend | Transactional emails (purchase confirmations, contact notifications) |
| Hosting | Hostinger Managed Node.js (Web Apps Hosting) | Managed platform for the SSR app + Refine admin (no VPS/Docker/Nginx/PM2/systemd — AD-029; Cloudflare optional) |

## Responsibility Split

### Supabase Owns (Unified Backend — content + application)
- **Content:** posts, pages, books (+ chapters + authors), videos, categories, tags, navigation, site settings, book-grid settings
- **Application:** Auth (user signup, login, OAuth, JWT, sessions), user profiles + roles (RBAC), purchases, orders + order items, cart, reading progress, book ratings, bookmarks, reader bookmarks + notes/highlights, comments (moderation), notifications, coupons, newsletter subscriptions, contact messages, search analytics, audit logs
- **Storage:** file storage (private book PDFs — access-controlled, covers, avatars, other media)

### TanStack Start Owns (Frontend + Integration Layer — runs on Hostinger Managed Node.js)
- Frontend SSR (React 19 + TanStack Start)
- **Refine + shadcn admin** (target — P2): the admin/CRUD UI lives inside this app
- Payment webhook handling (provider-agnostic IPN at `/api/payments/webhook` — simulated → PipraPay, AD-026)
- Email sending (Resend)
- Server functions (auth-guarded mutations)
- Protected PDF access (ownership check → Supabase signed URL)

### Strapi (historical — superseded 2026-08-14, AD-029)
- Strapi was the content layer (posts, pages, books, videos, courses, taxonomies, navigation, site settings, admin panel, media library). **No longer part of the target architecture** — content moves to Supabase (P1/P3), the admin becomes Refine + shadcn (P2), and Strapi code is removed after the replacement is validated (P3). Do not describe Strapi as the production CMS.

## Free Tools Policy

**Always fully free. No exceptions.**

| Priority | Approach | Example |
|----------|----------|---------|
| 1 | Fully free open-source (MIT/Apache/ISC) | React, TanStack, shadcn, Refine |
| 2 | Free tier with no caps/vendor lock-in | Supabase (free tier, no hard limits) |
| 3 | Combine free tools + custom code | Free DB + custom hooks + raw API calls |
| 4 | Paid tools (last resort, documented) | Only with explicit justification |

**Never use**: Free tiers with growth limits, trial versions, freemium services requiring paid plans for essentials, any tool creating vendor lock-in.

## Library Stack (Frontend)

| Concern | Library | Status |
|---------|---------|--------|
| Admin (target) | Refine Core + shadcn/ui | 🔜 Target (P2) — not installed yet |
| UI Components | shadcn/ui + Radix UI | ✅ Integrated |
| Forms | React Hook Form + Zod | ✅ Integrated |
| Tables | TanStack Table | ✅ Integrated |
| Drag & Drop | dnd-kit | ✅ Integrated |
| Rich Editor | TipTap | ✅ Integrated |
| Search | cmdk | ✅ Integrated |
| Notifications | Sonner | ✅ Integrated |
| Charts | Apache ECharts | ✅ Integrated |
| File Uploads | Uppy | ✅ Integrated |
| Auth | Supabase Auth | ✅ Integrated |
| CMS (historical) | Strapi v5 | 🗑 Superseded (AD-029) — dev-only, pending removal (P3) |

## Mandatory Security Requirements

> **Core architectural rule: “Never trust the client.”** All security enforcement is **server-side** (Supabase RLS, Supabase Auth, server functions) — frontend restrictions are UX only, never security. Documented now; implementation lands in P1/P4/P5/P6/P7 — do not treat as already implemented. Full table: `PROJECT.md §28 → §13 Mandatory Security Requirements`.

1. **RLS on all tables** — ownership + access enforced at the database level; never rely on the app layer alone.
2. **Auth & RBAC server-side** — Supabase Auth + role/permission checks in server functions/RLS; never rely on frontend restrictions.
3. **Secrets server-only** — service-role keys, payment credentials, Resend keys never in `VITE_*`, never in Git, never in browser code.
4. **API/server routes** — authenticate, authorize, validate inputs (Zod); rate-limit where appropriate.
5. **Payments** — never trust frontend payment success; verify webhook signature, amount, order state and idempotency server-side before granting entitlement (AD-026).
6. **Storage/PDFs** — private paid PDFs; verify auth + purchase entitlement before signed URLs; no public `.pdf` URLs.
7. **Database** — RLS, foreign keys, constraints, least-privilege access (service role server-only).
8. **Input/content security** — XSS (escape/sanitize user content), injection (parameterized queries), malicious uploads (type/size validation), unsafe user content.
9. **Production** — secure headers, HTTPS, safe logging, dependency updates, backups + restore testing.

## Important Details
- **Supabase provides**: Auth, PostgreSQL (unified content + application schema), RLS, Storage (private PDFs, covers, avatars), admin via the Refine+shadcn app admin (target)
- **Refine + shadcn admin (target)**: lives inside the TanStack app; dataProvider → Supabase server functions; not a separate backend service
- **Custom code only for**: Books & Library, Reader, Visual Page Builder, Theme Builder, Commerce, Learning System, AI Assistant, Search, Analytics, Community
- **Database strategy**: Supabase PostgreSQL for ALL data (dev mock-first; production unified schema per P1)
- **Auth strategy**: Supabase Auth for all users (frontend users + admin RBAC via user_roles). Content reads flow through Supabase server functions/RLS (P3).
- **Storage strategy**: Supabase Storage for book PDFs (private, signed URLs, access-controlled), covers, avatars, and other media.
- **VITE_DATA_SOURCE** remains a **feature-level migration/dispatch mechanism** only — NOT the definition of backend ownership (AD-029).

## Data Flow
- **Content reads** (posts, pages, books, etc.) → Supabase (via server functions with RLS; P3 — Strapi historical)
- **App data reads** (cart, purchases, progress, bookmarks, ratings, etc.) → Supabase (via server functions with auth middleware)
- **Admin edits** → Refine + shadcn admin (/admin, target P2) → Supabase server functions
- **User actions** (purchase, bookmark, rate, etc.) → Supabase (via server functions)
- **Payments** → provider-agnostic gateway interface → webhook → server function → verify server-side → Supabase (order + purchase) → unlock PDF → Resend email

## Phase 1 Complete Files
- `src/lib/strapi-client.ts` — Strapi REST client for public content reads (posts, books, pages, videos, courses, categories, tags, navigation, comments, site settings)
- `scripts/migrate-to-strapi.mjs` — Supabase → Strapi data migration script (legacy, superseded by fresh-start seeding)
- *(Removed 2026-08-08 — the legacy app-data JWT bridge: `strapi/src/middlewares/supabase-auth.js`, its `config/middlewares.ts` registration, and the `purchase`/`reading-progress`/`bookmark`/`book-rating` content types with their `supabaseToken` client functions. User data lives only in Supabase — AD-026/027.)*

## Current Milestone

**Mock Platform Transformation — M0–M6 Complete, entire product demoable offline ✅**

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1 — Strapi Content API Foundation** | ✅ (historical) | API client (10 content types), 8 service files wired, migration script, PROJECT.md §28. (Supabase JWT bridge + app-data types removed 2026-08-08; Strapi superseded 2026-08-14 — AD-029.) |
| **Phase 2 — Admin Transition** | ✅ (historical) | Refine admin panel removed; Strapi admin was the CMS interface — superseded 2026-08-14 (AD-029): Refine + shadcn admin is the target |
| **Phase 3 — Data Migration** | ⏸ Superseded | Strapi migration superseded — content moves into the unified Supabase schema (P1/P3, AD-029) |
| **Phase 4 — Legacy Cleanup** | ✅ (historical) | Refine data provider, 27 admin routes, ~50 admin components removed |
| **Phase 5 — Production Hardening** | ⏳ Superseded by P7 | Old VPS hardening approach superseded — hardening on the Hostinger managed platform (P7, AD-029) |

**Data layer (dev):** Mock-first — `posts.ts`, `books.ts`, `videos.ts`, `navigation.ts`, `taxonomy.ts`, `siteSettings.tsx`, `pages.ts` return mock data. Tests: **453 passing**. TS: 0 errors.
- **Phase 0 fixes (F1–F5)** — see "Mock Platform Transformation" section below.

## Mock Platform Transformation (2026-08-03)

**Goal: make the *entire* product work offline as a production-like mock** — auth, commerce, reader access, comments, search, notifications, admin — so Strapi/Supabase integration later is a data-source swap, not a rewrite.

Milestone tracker: see the milestone table below and `PROJECT.md §18`; the architectural seam is documented in `PROJECT.md §28` (the former `ROADMAP.md` was retired 2026-08-08 — M0–M6 complete).

| Milestone | Status | Key Deliverable |
|-----------|--------|-----------------|
| M0 — Mock Platform Foundation | ✅ (partial) | `VITE_DATA_SOURCE` flag + per-domain mock stores (data-source, mock-session/cart/comments/commerce) |
| M1 — Identity | ✅ 2026-08-04 | Mock auth (demo user/admin), profile & settings persistence |
| M2 — Commerce | ✅ 2026-08-04 | Simulated checkout (card form + spinner), orders, purchases, reader access gating |
| M3 — Reading & Engagement | ✅ 2026-08-07 | Reading progress, ratings, bookmarks/notes (4 mock stores) |
| M4 — Community & Search | ✅ 2026-08-07 | Notifications bell, mock search (incl. pages), contact mock fallback, comments |
| M5 — Mock Admin Panel | ✅ 2026-08-07 | Local admin CRUD + dashboard, orders + notifications admin (production target: Refine + shadcn admin, P2) |
| M6 — Integration Seam Verification | ✅ 2026-08-07 | Adapter contract docs + swap drill + cleanup |

**Core seam:** `src/lib/data-source.ts` (`VITE_DATA_SOURCE=mock|strapi|supabase|auto` + `isMockMode()` + `setMockModeOverride()` test seam). Mock stores follow a **per-domain module pattern** (localStorage client / in-memory SSR-safe): `mock-session.ts`, `mock-cart.ts`, `mock-commerce.ts`, `mock-comments.ts`, `mock-progress.ts`, `mock-ratings.ts`, `mock-bookmarks.ts`, `mock-reader.ts`, `mock-notifications.ts`, `contact-messages.ts`, `newsletter.ts`. Demo accounts: `demo@sabbesatta.test` / `demo1234` (user), `admin@sabbesatta.test` / `admin1234` (super_admin).

> **Deployment note (2026-08-13):** `VITE_DATA_SOURCE` is a **build-time** flag — the local `.env` is gitignored, so on the dev/demo host it must be set as a **Production build env var** (`VITE_DATA_SOURCE=mock` for the demo, or `auto`/`supabase` when the fresh Supabase project is live) or the deployed site silently runs in real mode (no demo login buttons, real Supabase reads). After changing it, **Redeploy** (env changes don't rebuild automatically). **Production (2026-08-14, AD-029):** the frontend runs on **Hostinger Managed Node.js** with `VITE_DATA_SOURCE=supabase` set at build (managed env in hPanel) — no Vercel, no VPS.

### M1–M2 Delivery Notes (2026-08-04)
- **M1 Identity**: `mock-session.ts` (demo accounts, persisted session + profiles CRUD), `useAuth.ts` rewired (mock-first session, roles, signOut), `/login` demo buttons + credential validation, `/profile` + `/settings` mock persistence, `useTheme` persists to mock profile, loading gates prevent SSR guest-flash.
- **M2 Commerce**: `mock-commerce.ts` (orders + purchases, lazy demo seed), `CheckoutPaymentDialog` (card form `4242 4242 4242 4242`, ~1.2s spinner), `checkoutCart` → `{ simulated: true }` + new `completeMockCheckout`, `canAccessPdf`/`checkOwnership`/`purchaseBook`/`getUserPurchases`/`getMyLibrary` mock branches, `books-reader.ts` switched to `requireAuthOrMock`, coupon discount flows into order total.
- **Mock comments (uuid fix)**: `mock-comments.ts` + `isMockId()` — mock ids never hit the UUID `comments` column; ownership + demo-admin rules preserved.
- **Newsletter**: `subscribeToNewsletter` falls back to a mock subscriber store when Supabase is unavailable; `unsubscribeFromNewsletter` mock tokens.
- **Validation**: 0 TS errors, 312/312 tests. ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag).

### M3–M4 Delivery Notes (2026-08-07)
- **M3 Reading & Engagement**: 4 new mock stores — `mock-progress.ts` (reading_progress, per user×book, lazy demo seed), `mock-ratings.ts` (book_ratings + JS aggregate recompute mirroring the DB trigger — rating a book moves the stars live), `mock-bookmarks.ts` (polymorphic posts+books, enriched titles/covers), `mock-reader.ts` (reader bookmarks + notes with ownership rules). Service branches added to `books-progress.ts` / `books-ratings.ts`; `bookmarks.ts` + `books-reader.ts` switched to `requireAuthOrMock`; rating aggregates overlaid in `books.ts`; progress joined into `getMyLibrary`; profile gained reading stats + bookmarks section; BookCard queries enabled in mock mode.
- **M4 Community**: `mock-notifications.ts` (mirrors `admin_notifications`, per-user via mock `userId`, seeded welcome + purchase nudge, change event) + header `NotificationBell` (badge, dropdown, mark-all-read on close). Events: `mockPurchaseBook`/`mockRecordOrder` → `new_purchase`, comment → `new_comment`/`comment_reply` (demo admin), sign-in → `welcome`. `contact-messages.ts` — `submitContactMessage` server fn (Supabase-first, mock fallback, admin `contact_message` notification); `/contact` rewired. `searchContent` now `isMockMode()`-shortcuts + searches **pages** (`mockFetchPages` added; `pages.ts` mock branch). Shared `isSupabaseUnavailableError` extracted to `src/lib/supabase-unavailable.ts` (used by newsletter/comments/contact).
- **Validation**: 0 TS errors, 380/380 tests (23 new: notifications 9, search-mock 10, contact-messages 4). Browser-verified: bell badge+dropdown, contact offline success, Pages search results — zero console errors. ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag). Next up: M5 — Mock Admin Panel.

### M5 Delivery Notes (2026-08-07)
- **Mock admin**: `/admin` now renders an offline **MockAdminPanel** when the demo admin is signed in + mock mode — sidebar tabs (Dashboard, Books, Reflections, Videos, Orders, Notifications). Mock-aware `beforeLoad` guard (checks mock session role; non-admins → `/login`); production target is the Refine + shadcn admin (P2).
- **Content CRUD**: `mock-cms.ts` overrides store (upsert map + deleted-id lists, SSR-safe, `MOCK_CMS_EVENT`) merged inside every `mock-data.ts` fetch — so admin edits reflect on the books grid, reflections, videos hub, search, and homepage instantly. `mockFetchAllBooks/Posts/Videos` added for admin lists. Editor dialogs + CRUD tables with search, status badges, AlertDialog delete confirm, "Reset demo data".
- **Orders & notifications**: `mockGetAllOrders`/`mockGetAllPurchases` (admin aggregates) feed the Orders tab; `mockGetAllNotifications` feeds the Notifications tab (per-row mark-read + mark-all-read grouped by user).
- **Site settings editor (E5.4)**: `mock-settings.ts` (deep-partial patch store, SSR-safe, `MOCK_SETTINGS_EVENT`) + `fetchSiteSettings` merges overrides over `DEFAULT_CONFIG` in mock mode (Strapi fallback in real mode) — `SiteSettingsProvider` re-applies branding/theme/book-grid live. **Site Settings** tab: Branding (site name/tagline EN+BN), Theme (6 presets, color pickers, heading/body/Bangla fonts, base font size, radius scale, custom CSS), Maintenance (bilingual notice, admin bypass via `MaintenanceGate`).
- **Validation**: 0 TS errors, 402/402 tests (19 new: mock-cms 10, mock-settings 9, admin aggregates 2, mockGetAllNotifications 1). Browser-verified: admin dashboard stats + Settings save flow — changing site name to "Sabbe Satta Test" and accent to Cool Indigo reflected on the public homepage instantly (indigo rgb(79,70,229), zero console errors). ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag). Next up: M6 — Integration Seam Verification.

### M6 Delivery Notes (2026-08-07)
- **Adapter contracts**: `PROJECT.md §28` (Adapter Contract) documents every service's public function signatures + output shapes + the real adapter that must satisfy them; the manual swap drill (flip `VITE_DATA_SOURCE`, no code changes) is spelled out step-by-step.
- **Swap drill test**: `data-source.test.ts` (4) — `isMockMode()` toggles via `setMockModeOverride`, flag is one of the 4 documented values, all public reads (books/posts/videos/settings + reader-route `fetchBookById`) resolve in mock mode, site-settings overrides apply.
- **Cleanup**: `books.ts` `fetchBookById`/`fetchAllBooks` short-circuit via `isMockMode()` before any Supabase probe (the last public-path network hits); PROJECT.md §28 fallback-chain section rewritten as mock-first dispatch. Real-mode-only fallbacks (comments/newsletter/contact/admin CRUD) stay intact.
- **Validation**: 0 TS errors, 406/406 tests (+4 data-source). Docs: AGENTS, PROJECT, CHANGELOG. Mock Platform Transformation is now complete — production hookup is a config swap per the P0–P8 roadmap (AD-029).

### Reader Feature Spec — Full Reader + User Features (2026-08-07)
- **PdfViewer (`src/components/PdfViewer.tsx`)**: zoom-mode state machine (`fit-width` default / `fit-page` / `100%`, recomputes on resize); thumbnails converted from bottom strip to **collapsible right sidebar** (static column desktop, overlay mobile, lazy IntersectionObserver rendering, rotation-aware); **imperative ref API** `PdfViewerHandle` — `goToPage(n)`, `getPageCount()`, `getPageText(n)` (pdf.js text extraction) powering TOC/search
- **Reader route (`reader.$bookId.tsx`)**: **Contents tab** from `book.chapters` + new `chapter_pages` (active-chapter highlight, click-to-jump); **full-text search tab** (debounced text-layer search, `<mark>` snippets, jump-to-page, re-runs after PDF load); **permission-based Download/Print** gated on `reader.allow_download`/`allow_print` (server fn `downloadBookPdf` = ownership check + base64 JSON envelope — no `%PDF` bytes on the wire, download managers can't hijack; client helpers in `src/lib/reader-download.ts`); reading-session recording debounced with progress saves + **flush-on-unmount**
- **Reading history (`src/lib/reading-history.ts`)**: mock-first append-only session rows (localStorage / in-memory SSR-safe); `getRecentBooks` (deduped latest-per-book) + `getReadingHistory` (full timeline); no-op in real mode (derived from `reading_progress`)
- **Profile (`profile.tsx`)**: **Recent Books** section (saffron accent, progress %, page indicator) + **Reading History** timeline (relative timestamps, bilingual)
- **Validation**: 0 TS errors, 428/428 tests; reviewer issues all fixed (unmount flush, search-after-load deps, dead-code export now consumed, hooks-in-JSX hoisted, dead chevron imports removed). Next: reader-side wishlist, reading stats dashboard.

### Reading Statistics Dashboard — /stats (2026-08-07)
- **`src/lib/reading-stats.ts`** — pure derivations from history rows: pages read (deltas clamped [1,25]), reading time (same-book gaps [2s,30min]), local-day bucketing, current/longest streaks, 28-day window, avg session. `getReadingStats(userId)` mock-first (real mode degrades to progress). **Demo seed**: 28 days, rotating primary book, monotonic 4-17 page bursts, 1-2 anchored bursts 10-25 min apart; version-marker re-seed (`SEED_VERSION=3`, key `sabbe-satta-history-seed-version`) heals stale/partial seeds. `reading-history.ts` gained `getAllHistoryRows`, `clearHistoryRows`, and optional `timestamp` on `recordReadingSession` (seed backdating).
- **`src/routes/stats.tsx`** — dashboard: 4 stat cards (streak / pages / time / active days), ECharts pages-per-day bar chart (last 14 days, client-only mount guard for SSR), 28-day intensity strip, time-per-book list with progress bars, bilingual, dark-mode aware, auth-gated. Linked from profile.
- **Validation**: 0 TS errors, 439/439 tests (+11). Browser-verified: streak 2d · 296 pages · 3h 4m · 22 active days · zero console errors.

### Modal PDF Reader Redesign — Toolbar, Left Sidebar, Modes, Themes (2026-08-07)
- **`src/components/PdfViewer.tsx` redesigned** — backward compatible (`PdfViewerHandle` = `{goToPage, getPageCount, getPageText}` + all existing props kept `<PdfViewer>` lazy imports in books.index / books.$slug / index are unchanged).
- **Toolbar**: unified `[-] % [+]` zoom with preset dropdown (Fit Width / Fit Page / 50-200%, `ZoomMenuItem`, `zoomMenuOpen`); close **✕ top-right** replaces the old back button (`showBackButton` kept only in the props interface); Search (Ctrl+F), Download/Print (permission-gated via new optional `onDownload`/`onPrint`), Rotate, Fullscreen.
- **Layout modes** (`ReaderMode` = single|spread|continuous): spread renders two pages on one canvas; **continuous** uses a lazy `ContinuousView` + `ContinuousPage` (per-page canvases, `IntersectionObserver` pre-render, fit-to-width, center-page tracking `onPageChange`). Sidebar default-open effect; search/notes/comments guard inputs.
- **Left sidebar** (PanelLeft) — tabs **Contents** (from `chapters: PdfChapter[]` prop) / **Pages** (lazy `IntersectionObserver` thumbnails); auto-opens on desktop when chapters exist.
- **Reading theme** (`ReaderTheme` light|dark|sepia): CSS filter on canvas `invert(1) hue-rotate(180deg)` / `sepia(0.4)` — cycle theme button; moved into the new `src/styles.css` `.reader-page-shadow` (`box-shadow: 0 4px 20px rgba(0,0,0,0.15)`) — sandboxed drop shadow for the canvas.
- **Render fix (pdf.js v6)**: main/thumbnail/continuous renders go through a shared `renderPageToCanvas(canvas, page, viewport)` helper using pdf.js's native `transform`+`outputScale` (NOT manual `getContext().setTransform` — pdf.js ignores that when a `canvas` is passed). Spread renders its second page into its **own** canvas (`canvas2Ref`), because pdf.js throws `Cannot use the same canvas during multiple render() operations` when two pages share one canvas. Render errors are now non-fatal (logged; the last good frame stays, re-rendered on next nav) instead of the earlier `setError("Failed to render this PDF…")` that blanked the whole reader on any transient/rejected render — that fatal state is reserved for PDF load/decode failures only.
- **Validation**: 0 TS errors, 439/439 tests (unchanged). Next: browser spot-check (single/spread/continuous/zoom/theme), reader-page wishlist/stats.

### Profile & Settings UX Restructure + Account Navigation Groups (2026-08-12)
- **Profile audit → approved restructure** — read-only audit of the Profile area (entry points, `/profile` hub, child pages, back-nav, auth, notification entry) produced a single architecture design; all flagged issues fixed: post author-card "View profile" link → static caption (no author routes exist); `/purchases` BackLink unified to `/profile`; `/settings` gained deep-link hash scrolling (`#appearance`, new `#reading`); `/profile` gained a **Notifications card** (latest 5, topic-gated via the shared `useNotifications` hook, mark-read + link-aware rows) so the header bell's "View all in profile" is no longer a dead end; purchases retitled **"My Books"**, orders → **"Orders & Receipts"**, both cross-link; avatar dropdown gained Orders + Reading Stats.
- **Settings — Design A (user-goal groups)** — `SettingsSectionDef.group` + `SETTINGS_GROUP_LABELS`; sections regrouped into **Account** (Profile & Account · Security · Danger Zone), **Reading & Appearance** (Reading · Appearance · Notifications), **Privacy & Help** (Privacy · Data & Account · Support & Legal); sticky sidebar + mobile chips render group headers; scroll-spy, section IDs, `scroll-mt-28`, and deep links preserved. NEW **`ReadingSection`** (`/settings#reading`) — font size, line spacing, reading width, reader mode (light/sepia/dark), save-progress — previously only editable in the article/reader toolbars; rows stack (no `justify-between`) to stay 320px-safe; BN toggle labels kept short (আরাম, not আরামদায়ক).
- **Dropdown — Design B (action-frequency groups)** — `profile-menu.ts` items carry an optional `group`; entries: Profile · My Books (standalone), **Financial** — Orders & Receipts · Cart · Wishlist · Bookmarks (Cart + Wishlist newly added as entries), **Stats** — Reading Stats, **Settings** — Settings, then Admin (admin-only). `AvatarDropdown` renders labeled section headers at group boundaries (separators only at boundaries, not per-entry); external href resolves `item.to || strapiUrl`; Orders icon is ShoppingBag.
- **Mobile sync** — `MobileNav` ACCOUNT section mirrors the dropdown: My Books, Orders & Receipts, Reading Stats, and Settings added (icons match), grouped under Financial/Stats/Settings headers shared from `PROFILE_MENU_GROUP_LABELS`; Wishlist BN aligned (ইচ্ছাতালিকা); Admin last behind a divider; group labels participate in the staggered entrance animation.
- **Verification (non-browser)** — `AvatarDropdown.test.tsx` (5 jsdom tests): EN + BN labels + group headers, route hrefs, separator counts (6 admin / 5 non-admin), admin filtering. **Validation**: 0 TS errors, 611/611 tests, 56/56 responsive-contract guards.

### UI polish batch — grid card stagger, FeatherPenIcon, desktop nav active states, search palette (2026-08-12)
- **Grid cards now slide up smoothly everywhere** — homepage **Featured Books** + **Videos** grids gained per-card staggered `Reveal fade={false}` wrappers (`delay={Math.min(i * 0.05, 0.3)}`); previously cards popped in with the section, no individual animation. The **Books** + **Videos** pages' existing per-card `Reveal` stagger switched to `fade={false}` (pure slide-up, no opacity change) to match the homepage sections' motion language. Reflections grids (`PostGrid`) converted to the same scroll-triggered `Reveal` pattern (was mount-time `stagger-enter`, invisible below the fold on small screens) — all four content grids now animate as cards enter the viewport; the dead `stagger-enter`/`card-enter` CSS utilities were removed.
- **`Reveal` gained a `fade` prop** (default `true` = existing fade+slide; `fade={false}` = pure `translateY` slide-up with the softer `cubic-bezier(0.22, 1, 0.36, 1)` landing). Homepage sections used it last session; all four content grids now do too. Scroll-triggered (IntersectionObserver) so the cascade plays as cards enter the viewport on any screen size; reduced-motion users unaffected.
- **Custom `FeatherPenIcon.tsx`** — the Reflections mark is now a hand-drawn **full feather quill + ink writing line** (lucide-style: 24×24, `currentColor`, round caps; replaces both the lucide `Feather` and the brief `QuillInkwellIcon`). Applied to all 8 Reflections surfaces: MobileNav drawer row, BottomNav tab, homepage section header, SearchPalette type meta, `/search` tabs + result chips, bookmarks placeholders, About explore card, mock admin tab. Icon-record types relaxed to `React.ComponentType<{ className?: string }>` where needed.
- **Desktop nav active states synced from mobile** — `__root.tsx` header links + `NavDropdown` trigger/items/flyouts + `AvatarDropdown` items now use the mobile drawer's active language: `bg-primary/10` tint pill + saffron left accent bar + medium weight + saffron icon on the current route (Reflections trigger prefix-matches category pages). Hover preserved (`hover:bg-primary/15`).
- **MobileNav white-strip fix (final)** — the pale 56px scroll-shadow overlay div was the culprit (light-mode white band + unreachable when the menu didn't overflow); removed, and the bottom fade moved onto the scroll-container background (`from-foreground/20 via-foreground/[0.06] to-transparent`), so the fade always terminates exactly at the saffron divider. Dead `pb-2` nav padding also removed.
- **Mobile menu ✕ smaller** — hamburger/✕ button box `h-6 w-6` → `h-5 w-5`, morph icon box 16×20 → 14×16, ✕ bars `w-5` → `w-4` (geometry re-derived so the 3-line → ✕ morph still glides cleanly).
- **Search palette (⌘K) fixes** — `⌘` glyph (tofu box on Windows) → `Ctrl K` in the palette + header tooltip; `↑↓`/`↵` glyphs → lucide ArrowUp/Down + CornerDownLeft icons; keyboard-hint footer now `hidden sm:flex` (no Esc hints on mobile); new visible ✕ close button on every screen.
- **Validation** — tsc 0 errors · **627/627 tests** · 63 responsive-contract guards.

### About hero artwork + typography, FeatherPenIcon SVG, font-size consistency (2026-08-13)
- **About hero artwork** — `public/about-hero.png` is now Pixabay vector **8314420** ("Meditation, Zen, Nature, Lotus Lake", Pixabay Content License; `cdn.pixabay.com/photo/2023/10/14/09/19/meditation-8314420_1280.png`, 1280×853 landscape), wired as the mock About page `banner_url`. Rendered `object-contain` (full artwork, face visible — no center-crop). Hero typography redesigned for legibility over the image: frosted panel (`bg-background/55` + `backdrop-blur-md`, hairline border, ring, `shadow-2xl`) holding the saffron eyebrow + hairlines, serif title, dot divider, and tagline — visible in both themes (no `dark:text-white` special-casing).
- **FeatherPenIcon = real SVG now** — the component was a wrapper around the Flaticon `quill-pen.png` raster (a PNG can't inherit `currentColor`, so every active-state tint silently did nothing). Rewritten as a hand-drawn lucide-style SVG (24×24, `stroke="currentColor"`, stroke-width 2, round caps; feather vane + shaft + barbs + nib + ink line). PNG deleted; all 8 Reflections surfaces now tint correctly (saffron active states, section chips, muted placeholders).
- **MobileNav white-strip fix** — the pale scroll-shadow overlay div removed (it read as a white band above the saffron profile divider in light mode); bottom fade moved onto the scroll-container background so it always terminates at the divider.
- **Font-size consistency sweeps (body min 16px rule)** — rule added to `DESIGN.md §3.1`: **no reading copy below 16px**; card/excerpt/description text `text-base`, grid card titles `text-lg`, row titles `text-base`, captions `text-sm`, pure metadata `text-xs`. Applied in three passes: (1) bodies (blog 1.18rem, FAQ/book-desc 16px, terms/privacy prose, about tagline 18px); (2) post-page widgets (pullquote support 16px, comments 16px, newsletter blurb 16px, author-card caption 14px, reply snippets 14px); (3) **full-site audit — every route + shared component** (page intros 14→16px on ~17 pages incl. account/auth/commerce, section headings 14→16px incl. all 8 settings sections via `SettingsSectionCard`, row/list titles 14→16px, row descriptions 12→14px, profile/settings bios 16px, Explore cards 18px titles + 16px descs, `VideoCard` titles 18px, search results 16px, homepage blurbs 16px). Consistent on mobile + desktop (no mobile-shrunk text).
- **Validation** — tsc 0 errors · **627/627 tests** (unchanged across all three rounds).

### Payment Provider Abstraction — PipraPay-Ready (2026-08-08)
- **`src/lib/payments/`** — provider-agnostic payment seam (AD-026): `types.ts` (`PaymentProvider` interface + order/result/verified-payment shapes), `config.ts` (ALL PipraPay credentials from env — zero hardcoded secrets), `simulated.ts` (default provider, inline checkout), `piprapay.ts` (HMAC-signed create-payment + webhook signature verification, throws until configured), `index.ts` (`getPaymentProvider()` keyed by `PAYMENT_PROVIDER` env), `orders.ts` (server-side order state machine — `createPaymentOrder` pending → `fulfillOrder`/`failOrder`/`cancelOrder`, idempotent so duplicate webhooks are no-ops)
- **Amount verification (review finding, 2026-08-08)** — `fulfillOrder` rejects webhook callbacks whose `amountPaid` mismatches the server-side order total (±BDT 1 tolerance) and marks the order `failed`; webhook returns 422 on mismatch. 2 new tests (rejection + tolerance acceptance). 476/476 tests, 0 TS errors
- **`src/routes/api/payments/webhook.ts`** — provider-agnostic IPN: verify → fulfill/fail/cancel → 200. Handles success/failure/cancellation/verification/duplicate callbacks
- **`cart.ts`** — `checkoutCart` creates a server-side pending order then calls the provider (`simulated` → `{ simulated, orderId, amount }`; `piprapay` → `{ url }` redirect); `completeMockCheckout` fulfills via the order service (simulated only)
- **`books-reader.ts`** — single-book purchases route through the provider
- **Deploy checklist**: when PipraPay is hosted (managed hosting, P5), set `PAYMENT_PROVIDER=piprapay` + `PIPRAPAY_BASE_URL`/`MERCHANT_ID`/`API_KEY`/`API_SECRET`/`WEBHOOK_SECRET` (`.env.example` documents them) + point PipraPay's callback URL at `<SITE_URL>/api/payments/webhook`. No code changes

### Static-pages sweep — Stripe references removed + premium cards (2026-08-08)
- **Every user-visible Stripe reference removed** (AD-026: Stripe not viable for Bangladesh): `terms.tsx` §5 + `privacy.tsx` (EN+BN) → "secure payment gateway" wording; `cart.tsx` / `checkout.tsx` / `CartDrawer.tsx` "powered by Stripe" → "secure checkout / access granted after verification"; `books.$slug.tsx` internal `stripeToastShown` → `redirectToastShown`. Final sweep: 0 Stripe matches in `src/routes/*.tsx` + `src/components/*.tsx` (legacy `api/stripe-webhook.ts` + `lib/stripe-checkout.ts` remain as P7-scheduled dead code)
- **Premium card treatment** — `terms`/`privacy` content in `rounded-2xl border bg-card shadow-sm` panels; `about.tsx` mission block → `bg-card` with saffron gradient hairline (CartDrawer accent-bar pattern) + note block `bg-secondary/20` + image radius aligned; `newsletter.unsubscribe.$token.tsx` bare layout → `bg-card` card with circular icon containers (saffron-gradient success mark, tinted loading/already/error)

### Secondary-pages polish — Donate, FAQ, Wishlist, Contact (2026-08-08)
- **Donate** — `alert()` replaced with premium in-page success state (saffron-gradient check badge, "Donate again" reset); preset amount chips (200/500/1000/2000 BDT, `aria-pressed`, bilingual); CTA → `BrandCtaButton`; Stripe wording → "Your payment is processed securely."
- **FAQ** — two stale Stripe answers rewritten (bKash/Nagad/cards + verification); accordion animated via `grid-template-rows 0fr→1fr` with `aria-expanded`/`aria-controls` + rotating chevron badge; contact CTA → `rounded-2xl bg-card` card
- **Wishlist** — "Browse Books" inline-styled button → `BrandCtaButton asChild` + `<Link>` (DESIGN.md §5.1)
- **Contact** — submit → `BrandCtaButton`, "Sending…" localized (পাঠানো হচ্ছে…), success in `bg-card` panel

### Bilingual (EN↔BN) Sweep + BDT Currency Standard (2026-08-08)
- **Currency**: all money now renders via `formatMoney()` as **`BDT 20.00`** (EN) / **`২০.০০ টাকা`** (BN — Bengali numerals). The third arg (custom symbol) is ignored; `TakaIcon.tsx` + old `Money` component deleted; `symbol` prop threading removed from `PaymentForm`/`CheckoutPaymentDialog`/`CartDrawer`/`BookCard`; email templates + `MockAdminPanel` mojibake → `BDT`.
- **Books page** (`books.index.tsx`): bilingual header/description now driven by a new bilingual mock `books` page (page-4 in `MOCK_PAGES_DATA`); "All"→সব, counts, error/retry, empty state, purchase dialog, loading overlay, toasts localized.
- **BookCard**: বিশেষ badge, বই পড়ুন/কিনে পড়ুন, চালিয়ে যান, কার্টে যোগ করুন, পৃষ্ঠা, wishlist/rating toasts, শিরোনামহীন/অজানা fallbacks.
- **Taxonomies**: `localizeCategoryName()` + `CATEGORY_BN_LABELS` in `taxonomy.ts`, used by PostCard / posts.$slug / books.$slug; homepage category chips bilingual.
- **Grids & states**: videos error/clear-search; search tabs (সব/প্রতিফলন/পৃষ্ঠা/বই/ভিডিও) + sort (প্রাসঙ্গিকতা/নতুন) + counts + pagination; reader toasts/placeholders/Page labels; wishlist; integration seams & detail pages (not-found / error / hidden / badges); cart/checkout summaries + PaymentForm failure; AuthModal fully bilingual; Comments toasts/placeholders.
- **Validation**: 0 TS errors, **453/453 tests** (31 files).

### Phase 0 — Frontend Fix Milestones (2026-08-03) ✅ F1–F5

| Milestone | Status | Deliverable |
|-----------|--------|-------------|
| F1 — Mock data parity | ✅ | Videos gained bilingual fields (`title_en/bn`, `description_en/bn`); all 8 mock videos updated; `VideoCard` + `/videos` search use `pickLocalized`; audio narration spread 3 → 12 posts (`AUDIO_BY_SLUG` map); featured books balanced (6)
| F2 — Micro-typography cleanup | ✅ | All leftover `text-[0.5rem]`/`text-[0.6rem]`/`text-[0.65rem]`/`text-[11px]` → `text-xs` (incl. `AiChatPanel` `text-[0.45rem]`); `text-[10px]` badges kept as documented exception
| F3 — Reader & toolbar polish | ✅ | Unified toolbar icon sizes to `h-4 w-4`; `aria-label` on icon-only buttons; `aria-pressed`/`aria-expanded` states
| F4 — Homepage & grids verification | ✅ | Browser-verified hero, reflections tabs, 6 featured books, 6 videos, newsletter — zero console errors
| F5 — Feature flow fixes | ✅ | Mock-aware auth (`src/lib/mock-auth.ts` — `requireAuthOrMock` only mocks on genuine Supabase unavailability, invalid tokens still 401); guest cart (mock-cart in-memory SSR fallback + all 6 cart server fns + `validateCoupon` demo code WELCOME10); free-book eye reader opens offline (books.tsx + index.tsx DEV branch for local PDFs); mock search fallback (`searchContent` probes Supabase with 10s cache); guest wishlist toggle local (no forced login)

Validation: 0 TS errors, 263/263 tests passing. Next up: M0 — Mock Platform Foundation.

---

## Phase 1: Strapi Content API Foundation ✅ (2026-07-17 — historical; Strapi superseded 2026-08-14, AD-029)
- **Strapi API client expanded** — All 10 content types with typed interfaces (posts, books, pages, videos, courses, categories, tags, navigation, comments, site settings)
- **8 service files wired** — pages, videos, courses, comments, navigation, posts, books, taxonomy all use Strapi-first + Supabase-fallback
- **JWT bridge implemented (removed 2026-08-08)** — `strapi/src/middlewares/supabase-auth.js` + the 4 app-data content types (`purchase`, `reading-progress`, `bookmark`, `book-rating`) and their `supabaseToken` client functions were deleted; user data lives only in Supabase (AD-026/027)
- **Migration script created** — `scripts/migrate-to-strapi.mjs` exports Supabase data, saves JSON, imports via Strapi REST API

## Phase 2: Admin Transition ✅ (2026-07-17 — historical)
- Point admin button to Strapi admin URL ✅ *(superseded 2026-08-14 — the target admin is Refine + shadcn inside the app, P2)*
- Remove Refine admin panel completely ✅ *(historical — Refine returns as the target admin, AD-029)*
  - `@refinedev/core`, `@refinedev/supabase` removed from package.json
  - `src/integrations/refine/` deleted (data-provider, auth-provider, access-control, resources)
  - All 27 `src/routes/admin.*.tsx` sub-routes deleted (only `admin.tsx` retained as Strapi redirect shell)
  - `src/components/admin/` files removed (except `page-builder/` — used by public `pages.$slug.tsx`)
  - `useFavorites.ts`, `useRecentItems.ts`, `useContentAutosave.ts`, `dynamic-form-bridge.tsx` removed
  - `src/lib/admin-routes.ts` removed (dead code)
  - 0 TypeScript errors after cleanup
- Train editors on Strapi admin *(historical)*

## Phase 3: Data Migration ⏸ (superseded — now P1/P3 Supabase content migration)
- Target (P1/P3): migrate content into the unified Supabase schema; remove Strapi code after the Refine admin is validated
- Historical: `node scripts/migrate-to-strapi.mjs` (Strapi import tooling — kept for reference only)

## Phase 4: Legacy Code Cleanup ✅ (2026-07-17 — historical)
- Remove unused Refine admin panel code ✅
- Remove duplicated content type definitions

## Approved Production Architecture (2026-08-14 — AD-029)

> **Decision AD-029 (PROJECT.md §21), superseding AD-023/AD-027/AD-028.** Full blueprint: `PROJECT.md §28`.

- **Supabase is the unified backend**: Auth, PostgreSQL (ALL data — content + application), Storage, RLS. Content (posts, pages, books, chapters, authors, videos, categories, tags, navigation, site settings, book-grid settings) lives beside application data (profiles, purchases, orders, cart, progress, bookmarks, ratings, comments, notes/highlights, notifications, coupons, audit).
- **Admin target: Refine Core + shadcn/ui inside the TanStack app** — CRUD/data-handling patterns + component system; backed by Supabase via server functions. **Not installed yet (P2); do not mark complete.**
- **Strapi is superseded**: historical, pending migration to Supabase + removal (P2/P3). Do **not** delete Strapi code during this migration; do **not** describe Strapi as the production CMS. **No other CMS/backend platform may be introduced without explicit architecture approval.**
- **Books:** Supabase `books` is the single source of truth (edited via the Refine admin). No Strapi mirror (AD-027 superseded).
- **Storage:** Supabase Storage — private PDFs (signed URLs, access-controlled), covers, avatars.
- **Payments:** one provider-agnostic interface — `initiate → redirect → webhook → verify server-side → order → purchase → unlock PDF → email`. Gateway swap is config, not rewrite. Stages: simulated → PipraPay (stopgap) → direct bKash/Nagad merchant APIs (licensed, final, when trade license lands). **Payment success must be verified server-side before granting purchased content.** Do not couple the app to PipraPay.
- **Hosting:** Hostinger Managed Node.js (managed platform — SSL/CDN/security/backups provided). No VPS/Docker/Nginx/PM2/systemd; Cloudflare optional.

## Production Migration Roadmap (P0–P8 — revised 2026-08-14, AD-029)

| Phase | Focus | Validation |
|-------|-------|-----------|
| P0 — Architecture validation | Research + validate: Hostinger Managed Node.js deployment, TanStack Start on it, Refine Core, shadcn/ui, Supabase unified schema, PipraPay compatibility | Research documented; managed-host deploy proof |
| P1 — Supabase content model | Design the unified schema (content + application tables, RLS, Storage buckets) | Schema + RLS + migration SQL documented |
| P2 — Custom admin | Implement Refine + shadcn admin inside the TanStack app (CRUD → Supabase) | Admin CRUD works; editors manage content without code |
| P3 — Content migration | Move Strapi responsibilities into Supabase (migrate content, wire reads, **then** remove Strapi code) | All content served from Supabase; Strapi removed |
| P4 — Application data | Cart/orders/progress/bookmarks/ratings/comments/notifications → Supabase-only; remove per-feature mock stores | Data persists across sessions |
| P5 — Payments | Validate PipraPay through the provider abstraction (initiation, webhook, signature + amount check, idempotency, fulfillment, entitlement, email) | End-to-end purchase grants access |
| P6 — Storage | Supabase Storage/PDF authorization (private `book-pdfs`, signed-URL reader) | Reader opens real books, access-controlled |
| P7 — Hardening | Testing, security, backups, monitoring, performance on the managed platform; admin-configurable grid density (admin/site-settings layer) | Live + monitored; security review passes |
| P8 — License upgrade | Swap PipraPay → direct bKash/Nagad APIs | Licensed settlement, formal records |

> ⚠️ **Working agreement (2026-08-14):** the user plans a **fresh start** — a brand-new Supabase instance (unified backend) + a Hostinger Managed Node.js app, not the existing dev setups. **The user performs all real backend setup MANUALLY in the dashboards and does NOT share credentials with agents.** Agents must NOT connect to live Supabase, assume `.env` values are valid (they are stale), or ask for API keys. Instead, prepare/update the **Manual Setup Kit** (`PROJECT.md §18 → Fresh Instance Manual Setup Kit`): paste-ready SQL, dashboard checklists, schema references, and content-entry guides. After the user confirms a step is done, the agent wires/verifies the frontend feature (per the Mock Data Removal Strategy). Mock-first frontend work is unaffected — this only gates live backend hookup.

> 🔄 **Mock Data Removal Strategy (2026-08-08):** the site must stay fully functional throughout the migration — **never remove mock data at the start**. Each feature follows its own sequence: **Mock → Real Backend Connection → Admin/CMS Configuration → Frontend Verification → Full Feature Testing → Remove Mock Data**. A feature's mock path is removed only after its real backend, admin workflow, frontend rendering, and essential user flows are verified (the mock stays as a fallback via the `VITE_DATA_SOURCE` seam until then). Applies progressively to every feature: content (posts/pages/videos/nav/SEO/settings/books), auth, comments, cart, checkout, orders, purchases, PDF access, reading progress, bookmarks, ratings, search, newsletter/contact. P2–P6 each complete their features' steps 1–6; **P7 Hardening** completes testing/security and ensures no feature is left mock-only. Full feature-coverage table: `PROJECT.md §18 → Mock Data Removal Strategy`.

## Phase 5: Production Hardening ⏳ (pending — superseded by P7; historical VPS approach)
- Historical: deploy to a VPS natively (Node 22 + PostgreSQL 16 + Nginx + SSL; frontend via PM2) — superseded by Hostinger Managed Node.js (AD-029)
- Target (P7): testing, security, backups, monitoring, performance on the managed Hostinger platform

## Phase 6: Supabase Connection (Production)
**Frontend is fully built with mock data. Connect Supabase when ready for production.**

The user sets up the fresh Supabase instance (unified backend) + Hostinger Managed Node.js app **manually** using the **Manual Setup Kit** (`PROJECT.md §18 → Fresh Instance Manual Setup Kit`) — no credentials are shared with agents:

1. User creates the fresh Supabase project; the unified schema (content + application tables, RLS, storage buckets) is designed in P1 and applied via SQL Editor
2. User creates the Hostinger Managed Node.js app (P0) and deploys the SSR frontend; sets env vars in hPanel
3. User fills `.env` with fresh values per the kit's env checklist (current `.env` is **stale** — replace everything, add `SITE_URL`)
4. User promotes the first admin via `select public.set_user_role('<uuid>', 'admin');` and updates the hardcoded admin email in `src/lib/permissions.ts` + `src/hooks/useAuth.ts`
5. Payments stay on the provider-agnostic interface (`simulated` → `piprapay` later) — no Stripe keys needed (AD-026)
6. Configure Resend API key for transactional email when ready
7. After each feature's manual setup is confirmed, the agent wires that feature and removes its mock fallback last (Mock Data Removal Strategy)

**No code changes needed for content reads** — services dispatch via the `VITE_DATA_SOURCE` seam (`mock|strapi|supabase|auto`): mock mode short-circuits first, real adapters run when a backend is configured (verified by the M6 swap drill in `PROJECT.md §28` → Adapter Contract). The `strapi` flag is retained for the legacy path until P3 removes it.

## Session Completed Features

### LotusIcon — Flaticon Bud→Flower Donate Icon (2026-07-31)
- **`src/components/LotusIcon.tsx`** — Header donate button icon with a bloom-on-hover crossfade between two Flaticon PNGs
- **Initial state**: Flaticon "Lotus" icon (#7373599), stored at `public/icons/lotus-bud.png`
- **Hover state**: Flaticon "Lotus flower" icon (#1419204), stored at `public/icons/lotus-flower.png`
- **Both are solid black silhouettes** — a `.dark` `filter: invert(1)` keeps them theme-aware (black in light mode, white in dark mode)
- **Sizing**: resting bud at 28px (`h-[28px] w-[28px]`); on hover the incoming bloom grows to 29.5px (`scale(1.054)`, 1.5px larger than the bud)
- **Smooth animation**: 300–400ms `cubic-bezier(0.4, 0, 0.2, 1)` crossfade (base fades out, bloom fades in with `scale(0.92 → 1.054)`) plus a 1px translateY lift — no rotation, no bounce
- **`prefers-reduced-motion`**: all transitions zeroed via CSS media query (no JS state)
- Flaticon free downloads are PNG-only (SVGs are premium-gated); icons fetched from the `cdn-icons-png.flaticon.com` CDN with the correct prefix directory (not always the first 4 digits — probe if 404)
- Tooltip label below the icon uses the same `group/icon` hover pattern as Cart/Wishlist
- Historical: previously used an inlined SVG Repo lotus, then an SVG bud→bloom animation, then a Flaticon aloe vera PNG — all replaced by the current two-PNG crossfade

### ThemeToggle — Lucide-React Moon/Sun Crossfade
- **Two-icon approach**: Moon icon visible in light mode, Sun icon visible in dark mode
- **Crossfade animation**: scale (0.5→1) + opacity crossfade between Moon and Sun
- **Hover effect**: scale 1.1 + rotate 45° + `hsl(var(--primary)/0.25)` glow shadow
- **Active state**: scale 0.95 on click
- **Theme deferred**: `requestAnimationFrame` delays theme switch by 1 frame so icon transition starts before page-wide transition
- `prefers-reduced-motion`: all durations → 0ms
- Uses `lucide-react` Moon/Sun icons with CSS transitions

### Gift Box Icon — ❖ Origami Design with Brand Motif (2026-07-21)
- **Cart icon redesigned**: generic gift box → ❖-sealed origami gift box
- **❖ Lozenge seal**: same symbol from `❖ Sabbe Satta` replaces traditional bow
- **Overlapping lid**: wider than body (wrapping paper overhang effect)
- **Subtle vertical ribbon**: thin structural line at 25% opacity
- **Empty state**: lid lifted 3px + dashed ribbon = open/empty metaphor
- **Drawer-aware animation**: lid tilts up on hover AND stays open while CartDrawer is visible (render function pattern)
- **CartDrawer children**: now supports `(open: boolean) => React.ReactNode` for state-passing
- Three icon variants: header (animated), SheetTitle (static), empty state (lifted)

### Header Layout Restructure (2026-07-21)
- **Full-width header**: removed `max-w-6xl` constraint
- **3-segment layout**: `[LOGO] — [NAV+WISHLIST] — [TOGGLES|PROFILE|CTA]` with `justify-between`
- **Centered nav links**: primary navigation sits in the middle segment
- **Pipe dividers removed**: replaced with natural `gap-5` spacing
- **`<nav>` landmark fix**: only wraps primary navigation links (accessibility)
- **Font sizes**: nav 14→16px, Sign In 12→14px, LangToggle 11→12px
- **Icon sizes**: all header icons bumped 1 step (search 16→20px, cart 20→24px, donate 16→20px, profile 20→24px, wishlist 16→20px, theme 16→20px)

### Header Restructure v3 — 4-Column Distributed Layout (2026-07-22)
- **Final 4-column layout**: `[LOGO] — [NAV + DONATE flex-1] — [♡ 🎁] — [🌙 🌐 │ 👤]`
- **Nav takes maximum space**: `flex-1 justify-center` — links centered in remaining width
- **Toggles + Profile merged**: Theme/Lang and Profile/Sign in combined into one column with `h-8 w-px bg-border/30` divider
- **Content constrained**: `mx-auto max-w-7xl` (1280px), background/borders still full-width
- **Bottom border always visible**: `border-border/20` at top of page, `border-border/60` on scroll
- **Header padding**: `px-6` → `px-8 md:px-12`
- **Parent gap**: `gap-10` → `gap-6` for balanced breathing room

### WishlistBadge — Grow Only, No Rotation (2026-07-22)
- Removed `hover:rotate-[12deg]` — heart no longer tilts on hover
- `hover:scale-125` → `hover:scale-110` — standard subtle grow matching other icons

### LangToggle — Reverted to Sliding Indicator Pill (2026-07-22)
- Reverted from two-segment divider version back to original black-and-white sliding indicator pill
- Single `<button>` with absolute positioned `bg-foreground` indicator that slides between EN/বাং
- Added `overflow-hidden` to prevent indicator corner bleed

### MobileNav — Premium Animations & Styling (2026-07-22)
- **Sheet panel**: `bg-background/95 backdrop-blur-xl` frosted glass with deeper `0_8px_32px_-8px` shadow
- **Hover effects**: `hover:translate-x-0.5` added to all nav items, group headers, child links, and profile link
- **Group expand/collapse**: CSS grid-based animation (`gridTemplateRows: 0fr → 1fr`) with opacity fade instead of instant show/hide
- **Bottom bar buttons**: enlarged sign in/out buttons (`text-xs px-5 py-2 rounded-lg` with `hover:shadow-md`)

### CartDrawer — Interior Polish & Visual Consistency (2026-07-22)
- **Loading skeleton**: `animate-pulse` → `skeleton-shimmer` with staggered delay
- **Empty state**: gift box SVG now matches CartBagIcon design; "Browse Books" is a `<Link>` with arrow hover animation
- **Item price badge**: subtle `bg-secondary/40 text-[10px] font-medium` rounded tag
- **Coupon separator**: ornate divider with centered "Coupon" label in muted pill
- **Scrollbar**: custom WebKit scrollbar via Tailwind arbitrary variants (zero-dependency)

### Hover Label Text — Dark Mode Visibility Fix (2026-07-22)
- Changed wishlist/cart hover labels from `text-muted-foreground/50` to `text-foreground/60`
- Fixes invisible labels in dark mode where `muted-foreground` is too dim at 50%

### Supabase Types Regeneration & `as any` Cleanup (2026-07-21)
- **Types regenerated**: 49 tables, 9 enums, 8 RPC functions from all 60+ SQL migrations
- **124 `as any` casts removed**: Supabase client casts (85), server function casts (35), router casts (5)
- **`callFn` helper** (`src/lib/call-fn.ts`): Typed wrapper for TanStack Start server function calls
- **2 hidden bugs fixed**: `purchases` table has no `status` column; `site_settings` uses `config` JSON column
- **Remaining ~130 casts**: structurally necessary (auto-generated, auth schema, dynamic tables, RPC params, test setup)

### Site Rename — Bodhi Mitra → Sabbe Satta (2026-07-21)
- Renamed across all source files: `"Bodhi Mitra"` → `"Sabbe Satta"` (50+ occurrences)
- Bangla name: `"বোধি মিত্র"` → `"সব্বে সত্তা"`
- URLs: `bodhimitra.com` → `sabbesatta.com`
- Admin emails, localStorage key, AI persona name all updated

### Homepage Polish — Section Order & Video Cards (2026-07-21)
- **Section reorder**: Recently Added moved from bottom to between Reflections and Featured Books
- **VideoCard component** (`src/components/VideoCard.tsx`): YouTube-native card extracted as shared component
- **BackLink component** (`src/components/BackLink.tsx`): Shared back navigation extracted
- **Video card design**: Borderless, rounded-xl thumbnails, frosted glass play button, channel author, hover scrim
- **Videos page**: BackLink, video count indicator, empty state with "Clear search", staggered skeleton

### Cart Drawer — Header Cart Icon (2026-07-21)
- **CartDrawer** (`src/components/CartDrawer.tsx`): Sheet component with full cart functionality
- Desktop: Cart icon always visible in header, opens drawer
- Mobile: Cart icon added to header bar
- CartBadge fixed to always show icon (count badge only when items > 0)
- **Mock cart fallback** (`src/lib/mock-cart.ts`): localStorage-based cart for frontend dev
- Cart server functions fall back to mock when Supabase unavailable

### Book Detail Page Polish (2026-07-21)
- BackLink replaces breadcrumbs
- Cover: wider (340px), shadow, reading progress bar for owned books
- Category pill + tag pills below author
- Metadata grid: 3-4 columns, bilingual labels
- CTA buttons: bilingual labels, ownership distinction
- Recommendations with border separator

### SEO Overhaul (2026-07-21)
- `seoHead()`: Added `scripts` option, always includes OG image (fallback to `/og-default.png`)
- Created `public/og-default.svg` — branded OG image
- Root layout: added `og:url`, `og:site_name`, `theme-color`
- Sitemap: added reflection category pages
- Robots.txt: added disallows for auth pages, allows for public content
- All 28 routes use `seoHead()` with proper meta tags
- Auth/admin/settings pages get `noIndex: true`

### Footer Redesign — 3-Column Zen Layout (2026-07-21)

**Footer restructured from 4-column to 3-column proportional grid with newsletter pre-footer.**

#### Layout
- 3-column grid: Brand 40% (col-span-5), Navigate 30% (col-span-4), Action 30% (col-span-3)
- Newsletter CTA strip above columns: "Receive new reflections" label, "Slow. Occasional. Never noisy." heading, `NewsletterSignup` component

#### Column 1 — Brand & Grounding
- `❖ Sabbe Satta` in serif font (`text-lg`)
- Hardcoded tagline: "Where ancient wisdom meets modern psychology." (muted, `leading-relaxed`)
- Copyright with dynamic year + "Made with ❤" — no border separator

#### Column 2 — Deep Dive Navigation
- Two sub-columns: **Reflections** (Meditation, Mindfulness, Mental Health, Philosophy) and **Primary** (Books, Videos, Donate)
- All links bilingual (EN/BN)

#### Column 3 — Community & Action
- **Actions**: Support (FAQ), Donate, Privacy & Terms
- **Follow**: Social icons (same set as before: Facebook, X, Instagram, LinkedIn, YouTube)

#### NewsletterSignup Polish
- Replaced heavy solid black pill button (`bg-black`, inline `style`) with transparent outline button (`bg-transparent`, `border border-border/40`, `hover:border-foreground/30`)
- Removed unused `hovered` state and associated inline style tracking
- Input remains bottom-border only (`border-b`)
- 0 TypeScript errors

#### Cleanup
- Removed unused `FooterSection` component
- Removed `layout.footerSections`, `layout.contactEmail`, `layout.contactPhone` from footer (no longer needed)
- Removed old bottom copyright bar (content integrated into Column 1)

---

### Homepage Featured Books — Full Feature Parity (2026-07-21)

**Featured Books section rebuilt with responsive grid and full BookCard feature parity to the Books page.**

#### Grid Layout
- Changed from horizontal scroll carousel to responsive `book-grid` CSS class (same as Books page)
- 6 featured books (multiples of 3 for clean rows) — book-5 and book-6 flipped to `featured: true` in mock data
- CSS custom properties `--book-grid-cols-mobile/tablet/desktop` control breakpoints

#### BookCard Integration
- Replaced custom card markup with `BookCard` component (identical to Books page)
- All handlers wired: `userId`, `onEyeClick`, `requireAuth`, `onAddToCart`, `isCartAdding`, `pdfLoading`

#### Auth & Book Infrastructure Added to Homepage
- `useAuthSession()` for user state
- `requireAuth` callback — shows AuthModal for unauthenticated actions
- `handleEyeClick` — opens PDF reader (free/owned) or purchase modal (premium)
- `handleAuthSuccess` — resumes pending action after auth modal closes
- `handlePurchaseConfirm` — processes purchase, opens PDF reader
- `cartMutation` — add to cart with toast feedback + cart count invalidation
- AuthModal, lazy PdfViewer in Dialog, Purchase Dialog added to JSX

#### Cleanup
- Removed `bookScrollRef`, `scrollBooks`, `useRef` (horizontal scroll artifacts)
- Fixed AuthModal prop (`onClose` → `onOpenChange`), PdfViewer props (`bookTitle` → `title`, removed `onExpired`)
- TypeScript: 0 errors

---

### Frontend Build & UI Polish (2026-07-18)

**Complete frontend build using mock data layer — all pages, navigation, responsive grids, Buddhist color system, and premium UI polish.**

#### Mock Data & Services
- 20 posts, 10 books, 8 videos, `mockFetchRecentlyAdded()` in mock-data.ts
- All 7 service files rewired mock-first — no Strapi/Supabase fetches during frontend dev
- Courses removed (3 route files deleted, search/homepage cleaned)

#### New Pages
- `/donate` (preset amounts + Stripe placeholder), `/faq` (accordion), `/terms`, `/privacy` — all bilingual

#### Navigation
- NavDropdown + MobileNav: `<a>` → `<Link>` for SPA navigation
- Root items with empty URLs derive from label

#### Reflections Page
- Hub: per-category PostGrid sections + taxonomy tabs + search bar + quick-link cards
- Category colors: Meditation (purple), Mindfulness (green), Mental Health (amber), Philosophy (blue)
- Gradient background, tinted section headers, gradient underlines, gradient border cards

#### Design System
- **Buddhist flag colors**: Primary=saffron (wisdom), Secondary=indigo (loving-kindness), Accent=gold (middle path), Destructive=red (blessings)
- **Grid responsive**: 1/2/3 columns across all grids (mobile/tablet/desktop)
- **Font sizes**: All `text-[0.xxrem]` → `text-xs`; card titles at `text-lg` (18px)
- **Book badges**: 10px font, compact padding, no tracking
- **Star rating**: Filled stars use saffron color
- **Card buttons**: `backdrop-blur-md shadow-[0_2px_12px] ring-1 ring-black/5`
- **Cards**: `hover:shadow-lg hover:-translate-y-1` consistent across all types
- **Cursor**: Global `cursor: pointer` on all interactive elements

#### Videos
- Search field + inline YouTube player via Dialog popup with "YouTube" button

#### Validation: 0 TypeScript errors

---

### Post Page Layout, Breathing Widget & Homepage Polish (2026-07-20)

**Post page layout finalized, breathing widget added, duplicate elements removed, homepage books section upgraded.**

#### Post Page Final Layout
- **Order**: Cover → Breadcrumbs → Header (Category, Title, Excerpt, Author/Date, Tags, Actions) → Content → Editorial Pullquote (after content) → Breathing Widget → Author Card → Comments → Related Posts
- **Sidebar**: ToC (sticky) → Author card → Related posts → Newsletter → Explore links
- Duplicate Tags and Share/Bookmark removed from post page
- Comments moved before Related Posts ("Continue reading")
- Editorial pullquote moved from mid-article loop to after content (works with both HTML and plain text)
- Cover image stays overlapping header via `-mt-16` (user chose to keep previous design)

#### Breathing Anchor Widget
- Interactive breathing exercise embedded in "breath-as-anchoring" post
- 4-phase box breathing: inhale (4s), hold (4s), exhale (4s), rest (4s)
- Web Audio API generates subtle sine tones per phase (220Hz inhale, 330Hz hold, 196Hz exhale)
- Mute toggle button in widget header
- Placed at bottom of article content

#### Breadcrumb Fix
- `PublicBreadcrumbs` now correctly links `/posts` → `/reflections` via `URL_OVERRIDES` map
- Added segment→route override system for legacy URL mappings

#### Homepage Featured Books Section
- Changed from horizontal scroll to `book-grid` CSS class (same as Books page)
- 6 featured books (multiple of 3) — 3×2 grid on desktop
- Now uses `BookCard` component with full feature parity to Books page:
  - Auth modal for unauthenticated actions
  - Eye icon → PDF reader (free/owned) or purchase modal (premium)
  - Add to Cart with toast feedback
  - Interactive star rating
  - Wishlist button
  - Reading progress bar
  - Free/Featured badges
- PDF viewer dialog + purchase confirmation dialog added to homepage
- Removed unused `bookScrollRef` and `scrollBooks` (horizontal scroll artifacts)

#### Mock Data
- 6 books marked `featured: true` (was 4): book-5 "Art of Sitting Still", book-6 "Four Noble Truths for Modern Life"
- Query limited to 6 via `fetchPublishedBooks(1, 6, { featured: true })`

#### Validation: 0 TypeScript errors

### Reflections Restructure — Blog → /reflections (2026-07-18)

**`/reflections` hub page created** — replaces `/blog` as the blog hub with hero, taxonomy tabs, search bar, PostGrid, and quick-link cards.

**Dynamic category route** — Single `reflections.$slug.tsx` handles ALL category sub-pages at `/reflections/:slug`:
- Categories are fetched LIVE from Strapi (`fetchCategories()`) — no hardcoded route files
- Adding/removing categories in Strapi admin automatically creates/disables category pages
- SEO metadata, taxonomy tabs, PostGrid filtering all driven by Strapi category data
- Old `reflections.meditation.tsx` (and siblings) deleted — replaced by `reflections.$slug.tsx`
- `reflections.tsx` hub page also fetches categories dynamically for tabs and quick-link cards

**Nav dropdown clickable trigger** — `NavDropdown.tsx` accepts optional `to` prop; trigger becomes clickable `<Link>` when URL is provided. Used by "Reflections" dropdown which navigates to `/reflections` on click.

**Bug fix**: Nested children extraction removed from `fetchPublicNavItems()` — Strapi v5 `populate=*` was returning minimized child objects (missing `url`) in nested `children` arrays, which were added to the dedup `seen` Set before the full items from `data[]`, causing empty `slug` values. Now only `data[]` items are used; `safeBuildNavTree` links via `parent.documentId`.

**Mock data layer**: `src/lib/mock-data.ts` added — `mockFetchCategories()`, `mockFetchPosts()`, `mockFetchPostCounts()`, `mockFetchPostBySlug()`, `mockFetchPublicNavItems()`. All service files updated to fall back to mock data after Strapi and Supabase both fail. `fetchPageBySlug` returns null gracefully (component has defaults). `fetchSiteSettings` returns `DEFAULT_CONFIG`. Frontend now renders fully without any backend.

**Validation**: TS 0 errors, 266/266 tests passing, browser verified

### Nav dropdown bug fixed — `fetchPublicNavItems()` in `navigation.ts`:
- Bug: Strapi v5 returns children BOTH as nested data AND top-level `data[]` entries. Children appearing before their parent (by sort_order) were added as root items first, then skipped by dedup when correctly linked from parent's `children` field
- Fix: Root-only filter (`!parentId || !itemMap.has(parentId)`) — only items whose parent isn't in the collection are processed from `data[]`. Children are added exclusively via their parent's nested `children` field
- Dedup via `seen` Set handles edge cases

**Category slug mapping** — Added `categoryToSlug()` in `posts.ts`:
- Maps PostCategory names (e.g., "Meditation") to Strapi slugs (e.g., "meditation")
- Used in both `fetchPosts()` and `fetchPostCounts()` to fix Strapi's `categories[slug][$eq]` filter

**Database seeded** — 19 posts across categories:
- Meditation: 2 | Mindfulness: 6 | Mental Health: 6 | Philosophy: 4 | Buddhist Psychology: 1 (total = 19)
- New posts: "The Art of Deep Listening", "Mindfulness in the Morning" (Mindfulness); "The Power of Rest", "Building Emotional Resilience" (Mental Health)
- Bug fix: Fixed `"true"` → `"text"` typo in "The Power of Rest" JSON content

**Seed scripts created**:
- `scripts/seed-sample-posts.sql` — 8 posts across 4 categories
- `scripts/seed-philosophy-posts.sql` — 2 Philosophy posts + re-categorization
- `scripts/seed-balance-posts.sql` — 2 Mindfulness + 2 Mental Health

**Validation**: TS 0 errors, 266/266 tests passing, browser verified

### Navigation Sitemap & Seed Scripts (2026-07-17)
- Navigation source-of-truth now lives in `PROJECT.md §28` (Current Navigation Structure) — `NAV-SITEMAP.md` retired 2026-08-08
- `scripts/seed-strapi-nav.sql` — Idempotent SQL script to seed Strapi navigation (Home, Blog, Books, Videos — all standalone internal links)
- `scripts/seed-navigation.mjs` — Node.js script to seed Supabase navigation_items table (fallback)
- **Nav structure (2026-07-17, superseded)**: Home → / | Blog → /blog | Books → /books | Videos → /videos (all internal, no dropdowns) — later replaced by the Reflections dropdown structure (see **Current Nav Structure** below)
- Nav items inserted into Strapi SQLite database
- Satsang, Buddhist Psychology, Wisdom pages removed entirely

### Deep Cleanup — Removed Pages & Stale References (2026-07-17)
- **Deleted routes**: `buddhist-psychology.tsx`, `wisdom.tsx`, `blog.buddhist-psychology.tsx`, `blog.wisdom.tsx`, `satsang.tsx`
- **Deleted dead component**: `CategoryPage.tsx` (no longer imported)
- **Cleaned up hardcoded references** across 7 files:
  - `blog.tsx` — Removed BLOG_CATEGORIES entries, CATEGORY_PAGES section, ArrowRight import
  - `index.tsx` — Removed hardcoded filter labels "Buddhism"/"Buddhist Psychology" and "Mind"/"Wisdom"
  - `books.tsx` — Removed "buddhist-psychology" and "wisdom" from category filter chips
  - `PublicBreadcrumbs.tsx` — Removed stale breadcrumb labels
  - `seo.ts` — Updated STATIC_ROUTES (removed deleted pages, added /blog, /videos)
  - `siteSettings.tsx` — Changed default hero CTA from /buddhist-psychology to /blog
  - `SettingsHomepageTab.tsx` — Updated placeholder text
  - `books.test.ts`, `schemas.test.ts` — Updated test data
- Strapi DB: Blog changed from empty dropdown to internal link (/blog)
- Search icon removed from desktop header
- Home nav item added to Strapi (sort_order: 0)
- **TypeScript: 0 errors**

## Current Nav Structure
```
Home        → /               (type: internal, sort_order: 0)
Reflections → /reflections    (type: dropdown, sort_order: 1)
├── Meditation          → /reflections/meditation          (sort: 0)
├── Mindfulness         → /reflections/mindfulness         (sort: 1)
├── Mental Health       → /reflections/mental-health       (sort: 2)
├── Philosophy          → /reflections/philosophy          (sort: 3)
└── Buddhist Psychology → /reflections/buddhist-psychology (sort: 4)
Books       → /books           (type: internal, sort_order: 2)
Videos      → /videos          (type: internal, sort_order: 3)
About       → /about           (type: internal, sort_order: 4)
```

Dropdown trigger (`/reflections`) is clickable — navigates to the hub page while preserving hover-to-open dropdown behavior. Category sub-pages at `/reflections/meditation` etc. (dynamically generated from categories — no hardcoded routes; historical source was Strapi, target is Supabase `categories`). The original `/blog` route now redirects to `/reflections`.

## Relevant Files
- `PROJECT.md §28`: Navigation structure (source of truth — was `NAV-SITEMAP.md`)
- `scripts/seed-strapi-nav.sql`: Strapi nav seed script (SQLite — **historical**, Strapi superseded)
- `scripts/seed-navigation.mjs`: Supabase nav seed script (Node.js)
- `PROJECT.md §28`: Comprehensive architecture blueprint (formerly `ARCHITECTURE.md`, merged 2026-08-08)
- `src/lib/mock-data.ts`: Static mock content (posts, books, videos, pages, categories, nav) — returned first in mock mode via `isMockMode()` dispatch
- `src/components/VideoCard.tsx`: Shared video card component (YouTube-native design)
- `src/components/BackLink.tsx`: Shared back navigation component
- `src/components/CartDrawer.tsx`: Slide-in cart drawer for header
- `src/components/LotusIcon.tsx`: Header donate icon — Flaticon lotus (#7373599) crossfading into a lotus flower (#1419204) on hover; PNGs in `public/icons/`
- `src/lib/reading-history.ts`: Mock-first reading history (Recent Books + full timeline)
- `src/lib/reading-stats.ts`: Reading statistics derivations (streaks, pages/day, time per book) + demo seed
- `src/lib/reader-download.ts`: Client PDF download/print helpers (base64 → Blob, no raw `%PDF` on the wire)
- `src/routes/stats.tsx`: Reading Statistics dashboard (/stats)
- `src/lib/mock-cart.ts`: localStorage-based mock cart for frontend dev
- `src/routes/checkout.success.tsx`: Checkout success page
- `src/routes/purchases.tsx`: Purchase history page
- `src/lib/call-fn.ts`: Typed wrapper for TanStack Start server function calls
- `src/lib/payments/`: Provider-agnostic payment abstraction — `types.ts` (interface), `config.ts` (env-only PipraPay config), `simulated.ts` (default inline provider), `piprapay.ts` (production provider), `index.ts` (registry), `orders.ts` (server-side order state machine)
- `src/routes/api/payments/webhook.ts`: Provider-agnostic IPN/webhook endpoint
- `public/og-default.svg`: Default OG image for social sharing
- `public/sample-book.pdf`: Mock PDF for book testing

## Pending Work — Session Note (2026-08-03, paused)

### ✅ Typography dropdown opacity fix on single post page — FIXED (2026-08-03)

**User request:** Fix the opacity of the typography dropdown card on the single post page (`/reflections/:slug` articles use `TypographyControls`).

**Root cause (verified):** The panel was already technically opaque (`bg-popover`), but `--popover` was **identical** to `--background` (both `oklch(0.985 0.008 80)` in light, `oklch(0.18 0.01 280)` vs `oklch(0.16 0.01 280)` in dark) — so the card blended into the page and *looked* translucent, with a too-faint shadow (0.04 alpha) to lift it. `SiteSettingsProvider` does **not** override `--popover` at runtime (verified via `setProperty` search — only saffron/fonts/radius/book-grid vars).

**Fix applied:**
- `src/styles.css` — `--popover` now a distinct elevated surface: light `oklch(0.995 0.006 85)`, dark `oklch(0.22 0.012 280)` (deliberately brighter/lighter than `--background`).
- `src/components/TypographyControls.tsx` — panel: `border-border/80` (was `/60`) + `shadow-2xl` + `ring-1 ring-foreground/5` (was `shadow-xl`).
- `src/components/SocialShare.tsx` — same elevated treatment applied for consistency (`border-border/80` + `shadow-2xl` + `ring-1 ring-foreground/5`).
- Consistency: `NavDropdown`, `dropdown-menu` also use `bg-popover` — they automatically inherit the improved token.

**Validation:** 0 TS errors, 263/263 tests passing. Browser-verified on `/posts/breath-as-anchoring` — SocialShare dropdown renders solid in both modes: light `oklch(0.995 0.006 85)`, dark `oklch(0.22 0.012 280)`, with border + ring + shadow-2xl; reads as a distinct elevated card. (One hydration attribute-mismatch warning is pre-existing SSR/theme-script noise, unrelated to this CSS-only change.)

---

## Sabbe Satta Design Language — DESIGN.md

**[`DESIGN.md`](./DESIGN.md) is the canonical, single source of truth for the Sabbe Satta visual language** (colors, typography, layout, components, micro-interactions, bilingual rules). Every agent designing or modifying UI/UX MUST read it first, then follow the research flow below. `PROJECT.md §17` and `RULES.md §14` are pointers/rules that reference it; `src/styles.css` holds the exact token values. Do not create a competing design document — extend DESIGN.md only when genuinely necessary.

## Shared Design Research Library

`design-references/awesome-design-md/` is a **shared design research source** for ALL agents working on UI/UX. It is a third-party reference repository (VoltAgent/awesome-design-md, 74 DESIGN.md files across 73+ sites) — **not** application code, a dependency, or something to modify. It is gitignored; re-clone it if missing:

```bash
git clone --depth 1 https://github.com/VoltAgent/awesome-design-md.git design-references/awesome-design-md
```

### Design Research Workflow (required for every new page, major component, or significant UI modification)

1. **First inspect the existing Sabbe Satta design system** (`DESIGN.md`, `src/styles.css`) and reuse established patterns where possible.
2. **Identify relevant `DESIGN.md` references** from the shared library based on the type of interface being designed.
3. **Study multiple relevant references** rather than relying on a single website.
4. **Extract the underlying design principles and UX patterns** — not the exact visual design or branding.
5. **Adapt those patterns** to Sabbe Satta's existing typography, colors, spacing, components, responsive behavior, and overall visual identity.
6. **Prefer proven modern patterns** over inventing unnecessary custom UI.
7. **Keep interactions, hierarchy, spacing, component behavior, and responsive UX consistent** across the entire website.
8. **Before implementing a major UI change, briefly state** which references were considered and which patterns are being adopted.
9. **Do not modify the reference library.**
10. **Do not add unnecessary dependencies or copy external website code** unless explicitly approved.

Pick references by design category (choose by the type of interface being built):

- **Editorial/publishing** → blog, articles, reading, authors (The Verge, Wired, Notion, Mintlify)
- **Ecommerce** → books, products, cart, checkout (Shopify, Nike, Airbnb, Uber, Stripe)
- **SaaS** → application flows, settings, dashboards (Linear, Notion, Stripe, Supabase, Vercel)
- **Finance** → data-heavy dashboards, tables, statistics (Revolut, Wise, Coinbase, Binance, Kraken)
- **Productivity** → workspaces, filters, management interfaces (Raycast, Superhuman, Warp, Cal.com, Zapier)
- **Media** → video, discovery, content grids (Spotify, Pinterest, Vimeo-style grids)
- **Developer tools** → technical navigation and dense interfaces (Cursor, Raycast, Vercel, Expo, Mintlify)
- **Editorial/premium** → typography, storytelling, content presentation (Apple, Stripe, Framer, Clay)

> **Goal:** not to make every page look like another website — use established design knowledge to make each interface **modern, intuitive, accessible, responsive, and consistent with the Sabbe Satta product.** When uncertain about a design decision, research the shared references first, then discuss the best approach with the user before making a significant structural change.

### Agent Consistency Rule

- Treat `design-references/awesome-design-md/` as a **shared design knowledge base**. Do not create conflicting design patterns simply because a different agent is working on a different feature.
- When introducing a major new design pattern, first check the existing project design (DESIGN.md, styles.css) and the shared references, then reuse or extend established patterns whenever possible.
- **Do not modify the reference repository** unless explicitly instructed.

## Frontend-First Development Rule

**Always polish the frontend first using mock data. Only connect to the live backend (Supabase — the unified backend; Strapi is historical/superseded) after the frontend is fully verified.**

Never waste time debugging backend connectivity during UI development. The mock data layer guarantees the frontend renders fully without any running service.

## Mock Data Layer

Since M6, every service file (`taxonomy.ts`, `posts.ts`, `navigation.ts`, `books.ts`, etc.) follows a **mock-first dispatch** pattern (no wasted network calls in dev):

```typescript
if (isMockMode()) return mockFetchX();   // fast, deterministic, offline — checked first
// …real chain (Supabase — unified backend) retained for production mode…
```

The mock path is checked **first** via `isMockMode()` (`VITE_DATA_SOURCE=mock|strapi|supabase|auto` in `src/lib/data-source.ts`); real adapters run only when a backend is configured. Mock data lives in `src/lib/mock-data.ts` (static content) plus per-domain stores (`mock-session`, `mock-cart`, `mock-commerce`, `mock-comments`, `mock-progress`, `mock-ratings`, `mock-bookmarks`, `mock-reader`, `mock-notifications`, `mock-cms`, `mock-settings`, `newsletter`, `contact-messages`) for auth, commerce, engagement, community, and admin — each localStorage-persisted on the client with SSR-safe in-memory fallback. To add mock data for a new collection, add a `mockFetchX()` function to `mock-data.ts` (or a `mock-*` store) and gate it behind `isMockMode()` in the service.
- `strapi/docker-compose.yml`: Strapi Docker configuration (**historical** — dev-only; production runs on Hostinger Managed Node.js, no Docker, AD-029)
- `strapi/docker-compose.prod.yml`: Legacy production Docker configuration (**historical** — dev-only reference)
- `strapi/README.md`: Setup and configuration guide (**historical** — Strapi superseded, AD-029)
- `src/lib/strapi-client.ts`: Strapi API client for public content reads (no app-data functions — those were removed 2026-08-08)
- `strapi/src/api/book/controllers/book.js`: Book controller — content-only helpers (`getFeatured`, `getByCategory`); purchase/rating enrichment removed 2026-08-08
- `src/lib/siteSettings.tsx`: SiteConfig type, DEFAULT_CONFIG, mergeConfig, SiteSettingsProvider
- `src/lib/__tests__/`: Test suite (406 tests)
- `src/hooks/useTheme.ts`: Dark mode hook with localStorage + Supabase persistence
- `src/lib/schemas/profile.ts`: Profile form Zod schema
- `src/lib/user-preferences.ts`: Shared UserPreferences type
- `src/routes/blog.tsx`: Blog hub page
- `scripts/migrate-to-strapi.mjs`: Supabase → Strapi data migration script
- `research/cms-evaluation/REPORT.md`: CMS platform evaluation report
- `src/integrations/supabase/`: Supabase client, auth middleware, types
- `src/integrations/stripe/`: Legacy Stripe configuration (dead code — P7-scheduled removal; payments are provider-agnostic, AD-026)
- `src/integrations/resend/`: Resend email client
