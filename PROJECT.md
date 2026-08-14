# Sabbe Satta - Project Architecture & Roadmap

> **A modern digital platform for wisdom, mindfulness, learning, and compassionate living.**

---

## 1. Project Vision

Sabbe Satta is a full-stack digital platform that brings together publishing, digital reading, multimedia learning, community engagement, and digital commerce into a single, scalable ecosystem.

**Long-term goal:** A self-sustaining platform where creators publish bilingual (English/Bangla) wisdom literature, readers consume across multiple formats, and the community interacts through discussions, bookmarks, notes, and shared learning.

**Core identity:** Contemplative, minimal, content-first. The platform prioritizes reading depth over engagement metrics, quality over quantity, and timeless wisdom over trending topics.

---

## 2. Product Philosophy

### Design Principles

- **Serenity** - Warm, minimal, earth-toned UI with generous whitespace
- **Slowness** - Content-first reading experience; no popups, no intrusive CTAs
- **Bilingual parity** - Every content field exists in English and Bangla
- **Configurability** - Site owner controls all text and visuals from an admin panel

### Architecture Principles

- **Build platforms, not pages.** Every feature is a reusable module.
- **Modules over monoliths.** Features are independent, composable, and swappable.
- **Services over spaghetti.** Business logic lives in services, never in UI components.
- **Data-driven content.** No hardcoded text, links, or metadata.
- **Future-proof.** Design for expansion without rewrites.

### Development Strategy

**Library-first, platform-first. Never rebuild mature solutions. Use free tools only.**

Priority order (revised 2026-08-14, AD-029):
1. Supabase services (Auth, PostgreSQL, Storage, RLS) — the unified backend
2. Refine Core + shadcn/ui — admin/CRUD patterns + component system (inside the app)
3. Mature open-source libraries (TanStack, Zod, TipTap, etc.)
4. Custom business logic (only for unique platform requirements)

**Free tools only.** Never use free tiers with hard limits, trial versions, or freemium services that require paid plans for essential features. When no fully free solution exists, combine free tools with custom hooks/libraries/raw code.

> **2026-08-14 (AD-029):** the ownership split below is revised — Supabase owns ALL data (content + application), the admin is Refine + shadcn, and hosting is Hostinger Managed Node.js. Strapi is historical (superseded).

**Supabase owns (unified backend):** Auth (user signup/login/OAuth/sessions), Storage (book PDFs — private/access-controlled, covers, avatars), content data (posts, pages, books, videos, categories, tags, navigation, site settings, book-grid settings), and application data (profiles/RBAC, purchases, orders, cart, reading progress, bookmarks, ratings, comments, notes/highlights, notifications, coupons, newsletter subscriptions, contact messages, audit logs).

**Refine + shadcn admin owns (target — P2):** the admin/CRUD UI inside the TanStack app (content + application resources).

**TanStack Start owns (runs on Hostinger Managed Node.js):** Frontend SSR, payment webhooks, email (Resend), server functions.

Custom code is reserved for Sabbe Satta's unique logic: reader behavior, purchase rules, book access permissions, user library, reading progress, page builder, theme builder, commerce, learning system, AI assistant.

**Approved production architecture (2026-08-08) — data ownership:**

| Layer | System | Owns |
|-------|--------|------|
| Backend (unified) | **Supabase** (Auth + PostgreSQL + Storage) | ALL data — content (posts, pages, books, videos, categories, tags, navigation, site settings) + application (profiles/RBAC, purchases, orders, cart, coupons, progress, bookmarks, ratings, reviews, comments, newsletter, contact, audit) + Auth + Storage |
| Admin | **Refine Core + shadcn/ui** (inside the TanStack app — target, P2) | admin/CRUD/data-handling patterns |
| Payments | **Provider-agnostic interface** | one interface: simulated → PipraPay (stopgap) → direct bKash/Nagad merchant APIs (licensed, final) |
| Email | **Resend** | transactional emails |
| Frontend | **Hostinger Managed Node.js (TanStack Start SSR)** | UI + auth-guarded server functions + webhook endpoints + Refine admin |

**Books:** Supabase `books` is the single source of truth (edited via the Refine admin); no Strapi mirror exists in the target architecture (AD-027 superseded by AD-029).

**Payments:** the gateway is replaceable through one common interface (`initiate → redirect/pay → webhook → verify → order → purchase → unlock PDF → email`). Payment success is **always verified server-side** before granting purchased content. See AD-026.

> **Historical (2026-08-14):** under the superseded hybrid architecture (AD-023), Strapi owned content and a one-way mirror (AD-027) carried commerce fields into Supabase `books`. Both are superseded by AD-029.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend (unified)** | Supabase (Auth + PostgreSQL + Storage + RLS) | Unified backend: auth, ALL data (content + application), file storage |
| **Admin (target)** | Refine Core + shadcn/ui (inside the TanStack app) | Admin/CRUD/data-handling patterns + UI component system (target — P2) |
| **Framework** | TanStack Start (React 19) | Full-stack SSR framework with file-based routing |
| **Client Rendering** | React 19 | UI component library |
| **Routing** | TanStack Router v1 | File-based, type-safe routing with SSR support |
| **Data Fetching** | TanStack Query v5 | Server state management, caching, infinite queries |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with design tokens |
| **UI Components** | shadcn/ui (New York) | Accessible, composable primitives |
| **Rich Text** | TipTap | Headless WYSIWYG editor with prose extensions |
| **Forms** | React Hook Form + Zod | Schema-driven form validation |
| **Tables** | TanStack Table | Headless table with sorting, filtering, pagination |
| **Drag & Drop** | dnd-kit | Accessible drag-and-drop for navigation builder |
| **Payments** | Provider-agnostic gateway interface (simulated → PipraPay → direct bKash/Nagad) | Payment processing, checkout redirects, IPN webhooks |
| **Email** | Resend | Transactional emails (purchases, contact, newsletter) |
| **Database** | Supabase PostgreSQL (Cloud) | ALL data — content (posts, pages, books, videos, categories, tags, navigation, site settings) + application data (purchases, cart, progress, orders, etc.) |
| **Auth** | Supabase Auth | Frontend user authentication (email + Google OAuth) + roles/authorization |
| **Storage** | Supabase Storage | All media — private book PDFs, covers, avatars, other application media |
| **Search** | PostgreSQL FTS (current) → Meilisearch (planned) | Public search with Bangla support |
| **Hosting** | Hostinger Managed Node.js / Web Apps Hosting | Managed hosting for the TanStack Start SSR app (no VPS/Docker/Nginx/PM2/systemd — see AD-029) |
| **Package Manager** | Bun | Fast package installation and script execution |

> **Strapi v5** — superseded as the production CMS (2026-08-14). Strapi code remains in the repo and is **pending migration and removal** (P3 of the new roadmap); it must not be described as the future production CMS. See AD-029 + §18 P0–P8.

---

## 4. System Architecture

> **Full technical blueprint:** see **§28 — Platform Architecture** (merged from `ARCHITECTURE.md`, 2026-08-08, revised 2026-08-14 for AD-029) for the unified-backend table, high-level architecture diagram, data-flow patterns, auth flows, the mock-platform data-source seam, adapter contracts, navigation structure, hosting, security, and env configuration. **Target architecture: Supabase unified backend + Refine/shadcn admin + Hostinger Managed Node.js (AD-029).**

Sabbe Satta uses a **unified architecture**: **Supabase** owns the entire backend — Auth, PostgreSQL (ALL data: content + application), Storage, and RLS. The **TanStack Start frontend** (deployed on **Hostinger Managed Node.js**) owns the SSR app, payment webhooks, email (Resend), server functions, and the **admin panel built with Refine Core + shadcn/ui** living inside the TanStack application. Payments flow through a **provider-agnostic gateway interface** (currently simulated; PipraPay as stopgap until direct bKash/Nagad merchant APIs are available). Production hosting: **Hostinger Managed Node.js** (managed platform — no VPS, no Docker, no Nginx, no PM2/systemd administration; see AD-029). The previous Strapi/VPS architecture is superseded — see AD-029 + §18 roadmap.

---

## 5. Core Modules

### Authentication

| Aspect | Detail |
|--------|--------|
| **Provider** | Supabase Auth (email/password + Google OAuth) |
| **Session** | JWT via Supabase, persisted in localStorage |
| **Status** | Complete |
| **Hooks** | useAuthSession(), useIsAdmin(), useUserRole(), useCanManageUsers() |
| **Middleware** | attachSupabaseAuth, requireSupabaseAuth |

### Authorization (RBAC)

| Aspect | Detail |
|--------|--------|
| **Table** | public.user_roles with app_role enum |
| **Roles** | user, admin, super_admin |
| **Functions** | has_role(), get_user_roles(), set_user_role() |
| **RLS** | Every table guarded by row-level security |
| **Hardcoded bypass** | admin@bodhimitra.test auto-grants super_admin |
| **Status** | Complete |

### Admin Dashboard

| Aspect | Detail |
|--------|--------|
| **Provider** | **Refine Core + shadcn/ui inside the TanStack app — target (P2)**; current dev: MockAdminPanel; historical: Strapi redirect shell |
| **Guard** | Frontend `/admin` checks Supabase Auth + role (RBAC via `user_roles`) |
| **Sections** | Content CRUD (posts, pages, books, videos, categories, tags, navigation, site settings), commerce admin, users/roles |
| **Layout** | Lives inside the public app (`/admin`) — not a separate service |
| **Status** | 🔜 Target (P2) — not installed; Strapi admin superseded (AD-029) |

### Posts / Blog

| Aspect | Detail |
|--------|--------|
| **Table** | Supabase `posts` (unified schema — target P1/P3; historical: Strapi `post` content type) |
| **Statuses** | draft, published |
| **Editor** | TipTap (admin editor) |
| **Bilingual** | title_en/bn, content_en/bn, excerpt_en/bn |
| **Cover** | Supabase Storage upload |
| **Tags** | Supabase `tags` relation |
| **Categories** | Meditation, Mindfulness, Mental Health, Philosophy, Buddhist Psychology (nav dropdown) |
| **Routes** | `/reflections` hub + category pages with bilingual SEO |
| **Status** | Complete |

### Pages

| Aspect | Detail |
|--------|--------|
| **Table** | public.pages with bilingual fields |
| **Sections** | JSON array (hero/text/image/quote/video/cta) |
| **Visibility** | Toggle per page |
| **Sort** | Configurable sort order |
| **SEO** | Per-page meta description |
| **Status** | Complete |

### Media Library

| Aspect | Detail |
|--------|--------|
| **Buckets** | blog-images, site-assets, book-covers, avatars, book-pdfs |
| **Features** | Grid/list toggle, bucket filter, multi-file upload, search, pagination |
| **Details** | Slide-over panel with copy URL / open / delete |
| **Status** | Complete |

### Navigation

| Aspect | Detail |
|--------|--------|
| **Table** | public.navigation_items |
| **Structure** | Self-referencing parent_id for nested trees |
| **Types** | internal, external, dropdown |
| **Builder** | Drag-and-drop with inline editing |
| **Locations** | header, footer |
| **Status** | Complete |

### Theme / Site Settings

| Aspect | Detail |
|--------|--------|
| **Storage** | JSON blob in site_settings singleton table |
| **Tabs** | Branding, Homepage, Article, About, Contact, Theme, Social, SEO |
| **Capabilities** | Logo/favicon upload, accent colors, dark mode, GA injection |
| **Status** | Complete |

### Taxonomies

| Aspect | Detail |
|--------|--------|
| **Tables** | categories, tags + polymorphic junction tables |
| **Features** | Bilingual labels, color picker, visibility, sort order |
| **Status** | Complete |

### Comments

| Aspect | Detail |
|--------|--------|
| **Table** | public.comments with parent_id for nesting |
| **Auth** | Any authenticated user can comment/reply |
| **Moderation** | Admin edit + delete, contact messages inbox |
| **Status** | Complete |

### Books Module

| Aspect | Detail |
|--------|--------|
| **Table** | public.books with bilingual fields |
| **Statuses** | draft, published, archived |
| **Features** | Rating (1-5 stars), featured flag, PDF upload |
| **Public** | Infinite scroll grid, search, detail page |
| **Eye icon** | Opens PDF (free/owned) or purchase modal (premium) |
| **Status** | Complete |

### Reader

| Aspect | Detail |
|--------|--------|
| **Engine** | Supabase signed URLs (5-min expiry) |
| **Access** | Server-side enforced via canAccessPdf() |
| **Viewer** | Full-screen iframe with session expiry handling |
| **Status** | MVP Complete |

### Purchases / Digital Access

| Aspect | Detail |
|--------|--------|
| **Table** | public.purchases with UNIQUE(user_id, book_id) |
| **Access** | Free books auto-granted, premium requires purchase |
| **Payment** | Provider-agnostic (AD-026) — simulated → PipraPay stopgap → bKash/Nagad (P8); webhook-verified |
| **Status** | Complete |

### Videos

| Aspect | Detail |
|--------|--------|
| **Table** | public.videos with bilingual fields |
| **Admin** | CRUD with cover, duration, embed URL |
| **Public** | Video grid page |
| **Status** | MVP Complete |

### SEO

| Aspect | Detail |
|--------|--------|
| **Dynamic meta** | Per-route head() with OG/Twitter tags |
| **Site settings** | Global meta description, OG image, Google Analytics |
| **Sitemap** | Server-side generate function |
| **Robots.txt** | Server-side generate function |
| **Status** | Foundation Complete |

---

## 6. Development Phases

> **Historical (2026-08-14):** this module-status table documents the original build. The current roadmap is **P0–P8** in §18; several rows below were corrected on 2026-08-14 (Stripe → provider-agnostic payments, bookmarks/courses/donations statuses). The Strapi-based CMS rows below are superseded by AD-029 (Supabase unified backend + Refine/shadcn admin target).

### Phase 1 - Foundation

| Module | Status | Notes |
|--------|--------|-------|
| Project foundation | Done | TanStack Start, Router, Query, Tailwind, shadcn |
| Authentication | Done | Supabase Auth, email/password + Google OAuth |
| Authorization (RBAC) | Done | user_roles table, RLS, RPC functions |
| Database foundation | Done | 40+ migrations applied |
| Admin dashboard shell | Transitioned to Strapi ✅ | `/admin` route redirects to Strapi admin panel |
| CMS framework | Transitioned to Strapi ✅ | Content managed via Strapi admin panel; TipTap replaced by Strapi built-in editor |
| Media library | Done | Grid/list, multiple buckets, search |
| Global settings | Done | 8-tab customizer, singleton JSON blob |
| Navigation system | Done | Drag-and-drop tree builder |
| Theme system | Done | Accent colors, dark mode, CSS custom properties |

### Phase 2 - Content Engine

| Module | Status | Notes |
|--------|--------|-------|
| Content engine | Done | Page builder plus full CMS Engine layer (content types, workflows, relationships, revisions, SEO, slugs, metadata) |
| CMS Architecture | Transitioned to Strapi ✅ | CMS managed via Strapi admin panel. Refine admin panel removed. |
| Schema-driven forms | Done | Form Engine (FormRenderer + 11 field types) + React Hook Form + Zod across all admin forms |
| Taxonomies | Done | Categories + Tags with junction tables. React Hook Form + Zod forms, shared ConfirmDelete |
| SEO foundation | Done | Per-route meta, GA injection, sitemap, CMS Engine SEO module |
| Search foundation | Done | Unified searchContent server function across posts/pages/books/videos, /search route with type filters |

### Phase 3 - Books & Reading

| Module | Status | Notes |
|--------|--------|-------|
| Books module | Done | CRUD, grid, detail, ratings, search, Enhanced preview/SEO/sort |
| Reader module | Done | PDF.js viewer with zoom, navigation, fullscreen, keyboard shortcuts, mobile-first layout (2026-08-14) |
| User library | Removed | `/books/library` route deleted from codebase and header; library features now served via reader + profile |
| Reading progress | Done | Per-user tracking per book with progress bars |
| Bookmarks | **Restored (2026-08-07)** | `/bookmarks` route + header entry restored in M3 (mock-bookmarks store); Supabase `bookmarks` table is the real adapter |
| Notes | Done (mock) | Reader notes (`reader_notes` + mock-reader store) |
| Highlights | Not started | `reader_highlights` table reserved — annotations milestone |

### Phase 4 - Commerce

> Corrected 2026-08-14 (AD-026): payments are **provider-agnostic** (simulated → PipraPay stopgap → bKash/Nagad), not Stripe. Stripe is not viable for Bangladesh and its code is scheduled for removal (P7).

| Module | Status |
|--------|--------|
| Commerce core | Done | Cart system, provider-agnostic checkout, webhook processing |
| Cart | Done | Full cart with add/remove/clear, cart badge in header, simulated checkout |
| Checkout | Done | Provider-agnostic checkout (`checkoutCart` → pending order → provider redirect) |
| Orders | Done (mock) | Order History page (/orders) + receipt breakdown (items/discount/tax/total); mock-first via `orders.ts`; **real `orders`/`order_items` tables added in P3** |
| Payments | Done (interface) | Provider-agnostic payment interface (AD-026) — simulated live, PipraPay deployment = P4 |
| Coupons | Done | Coupon codes incl. demo `WELCOME10`; discount flows into order total + receipt |
| Purchases | Done | Idempotent purchases with UNIQUE(user_id, book_id) constraint |
| Digital access | Done | Signed URL PDF access with server-side enforcement |

### Phase 5 - Extended Features

| Module | Status | Notes |
|--------|--------|-------|
| Videos | Done | CRUD with Resource Engine, Form Engine. Public video grid page + inline player. |
| Courses | **Removed (2026-08-07)** | Route files deleted, search/homepage cleaned; Strapi `course` type removed 2026-08-14 (no frontend consumer) |
| Podcasts | Not started | Parked post-launch |
| Community | Done | User profiles, comments system with moderation, bookmarks. |
| Newsletter | Done | Subscription form in footer and article sidebar. |
| Donations | **Done (2026-08-08)** | `/donate` with preset chips, in-page success state, `BrandCtaButton` |
| Analytics | Done (mock) | Mock admin dashboard; real analytics = Supabase aggregates + search_analytics |

---

## 7. CMS Architecture

> **2026-08-14 revision (AD-029):** the target architecture moves content management into **Supabase** (unified backend) with a **Refine Core + shadcn/ui admin** living inside the TanStack application. **Strapi is no longer the target CMS** — it is historical/superseded, pending migration and removal (P2/P3). The current frontend still ships mock-first + a mock admin panel for development (see §18 M0–M6).

### Core Pattern (target)

```
Content Management → Custom admin inside the TanStack app (Refine + shadcn/ui)
  |
Refine Core provides:
  |  - CRUD/data-handling patterns (dataProvider → Supabase)
  |  - useTable / useList / useForm / useCreate / useUpdate / useDelete
  |
shadcn/ui provides the component system (tables, forms, dialogs, etc.)
  |
Data persists → Supabase PostgreSQL (content + application data, one database)
  |
Media persists → Supabase Storage (book PDFs, covers, avatars, other media)
  |
Frontend reads → Supabase (server functions / RLS-guarded queries)
```

### Content Architecture (target)

- **Content tables in Supabase**: posts, pages, books, chapters, authors, videos, categories, tags, navigation, site settings, book-grid settings — alongside application tables (cart, orders, purchases, progress, bookmarks, ratings, comments, notes/highlights, notifications, coupons, audit). One database, one owner (Supabase), RLS everywhere.
- **Bilingual pattern**: Every content table uses paired columns (title_en/title_bn, content_en/content_bn, etc.)
- **Runtime selection**: `pickLocalized(field_en, field_bn, lang, fallback)`
- **Admin UI**: Refine + shadcn admin panel inside the TanStack app (target — P2); mock admin panel in dev
- **Content flow (target)**: Editor → Refine admin (/admin) → server functions → Supabase PostgreSQL → Frontend renders

---

## 8. Admin Dashboard

> **2026-08-14 revision (AD-029):** the target admin is **Refine Core + shadcn/ui**, living inside the TanStack application (not a separate backend service). **Strapi is superseded** as the admin panel — its code remains in the repo, pending migration and removal (P2/P3).

- **Target**: Refine Core (admin/CRUD/data-handling patterns) + shadcn/ui (component system) inside the TanStack app, backed by Supabase via server functions — see §18 P2
- **Current**: the `/admin` route renders the offline **MockAdminPanel** (M5, mock mode) or the Strapi redirect shell (production, until P2 lands)
- **Not yet done**: Refine/shadcn admin is **not installed or marked complete** — P2 of the roadmap; Strapi removal is pending implementation and validation of the replacement admin/content system

---

## 9. Content Management Architecture

**Covered by §7 (CMS Architecture)** — content types, the bilingual paired-field pattern, `pickLocalized()` runtime selection, and the editor → Strapi → frontend content flow. Merged into §7 during the 2026-08-08 dedup.

---

## 10. Commerce Architecture

**Approved flow (2026-08-08):** `Product → Cart → Checkout → Payment Provider (one interface) → IPN webhook → Verify server-side → Order → Purchase → Unlock PDF → Email`.

- The payment gateway is **replaceable** through one common interface — the same `initiate → redirect → webhook → verify` shape maps to PipraPay, direct bKash/Nagad merchant APIs, or an aggregator (SSLCommerz). Swapping gateways is a config change, not a rewrite.
- **Payment success is verified server-side (webhook + signature check) BEFORE granting purchased content.** The frontend never self-grants access.
- Purchases stay idempotent (`UNIQUE(user_id, book_id)`); orders + purchases are recorded in Supabase only.
- Current dev state: **simulated card checkout through the provider abstraction** (`checkoutCart` → pending order → `completeMockCheckout`); PipraPay is wired but dormant until `PAYMENT_PROVIDER=piprapay` + `PIPRAPAY_*` env are set. Stripe code exists but is **not viable for Bangladesh** (no BDT, no local support) and is scheduled for removal.

---

## 11. Reader Architecture

Current: Private book-pdfs bucket, signed URLs (5-min), iframe viewer, session expiry
Future: PDF.js for annotations, TOC, chapter-level progress, bookmarks, notes, highlights

---

## 12. User & Permission System

Roles: super_admin > admin > user
RLS: Every table guarded. Admin routes guarded by beforeLoad middleware.

---

## 13. Media Library

Buckets: blog-images (public), site-assets (public), book-covers (public), avatars (public), book-pdfs (private)
Upload: Client validate -> Supabase Storage -> media_assets table -> return URL

---

## 14. Search System

Current: PostgreSQL ILIKE queries, full-text search on media_assets
V2 (planned): Meilisearch — self-hosted Docker container with Supabase sync via Edge Functions. Automatic language detection for English + Bangla, typo-tolerant search-as-you-type.
Fallback: PostgreSQL tsvector + pg_trgm retained for admin/internal search.

---

## 15. API & Service Layer

Server Functions (TanStack Start) for all mutations and protected reads
Library Modules: posts, pages, books, books-purchases, books-ratings, books-progress, books-reader, videos, taxonomy, navigation, comments, media, seo, site-settings, admin

---

## 16. Database Architecture

> **2026-08-14 revision (AD-029):** Supabase PostgreSQL is the **single, unified database** — it owns BOTH content and application data. Under the previous Strapi architecture, content tables were being moved to Strapi's own PostgreSQL; that direction is superseded. The unified Supabase schema (P1 of the new roadmap) holds content tables alongside application tables.

Core Tables (unified Supabase schema — target, P1):

**Content:**
- posts (bilingual, status, tags, timestamps)
- pages (bilingual, sections JSON, visibility)
- books (bilingual, status, price, ratings, featured) + chapters + authors
- videos (bilingual, embed_url, duration)
- categories (bilingual, color, visibility)
- tags (bilingual, color)
- navigation_items (parent_id for tree structure)
- site_settings (singleton JSONB) + book_grid_settings

**Application:**
- user_roles (user_id, role enum)
- profiles (user_id, email, display_name)
- purchases (UNIQUE user_id + book_id)
- orders + order_items
- carts + cart_items
- reading_progress (UNIQUE user_id + book_id)
- book_ratings (UNIQUE user_id + book_id, 1-5)
- bookmarks + reader_bookmarks + reader_notes + reader_highlights
- comments (parent_id for nesting)
- notifications
- coupons
- newsletter_subscribers + contact_messages + audit_log + search_analytics

Key Indexes: idx_books_avg_rating, idx_purchases_user_id, idx_purchases_book_id, idx_reading_progress_user_id, idx_book_ratings_book_id

Triggers: update_book_rating_aggregates, update_purchases_timestamp, update_reading_progress_timestamp

---

## 17. UI Design System

**The full design language lives in [`DESIGN.md`](./DESIGN.md) — the single source of truth.** This section is a brief pointer (updated 2026-08-08 to avoid duplicating/overloading the docs).

- **Philosophy:** Serenity, slowness, bilingual parity, content-first. Warm minimal earth-toned UI, generous whitespace, no intrusive CTAs.
- **Colors:** Warm off-white background, nearly-black warm text, **saffron primary** (wisdom), indigo secondary (loving-kindness), gold accent (middle path), red destructive (blessings) — from the Buddhist flag. Full token tables (light + dark, oklch) in `DESIGN.md §2`.
- **Fonts:** Cormorant Garamond (serif headings), Inter (UI/body), Noto Sans Bengali (Bangla — overrides the whole stack in BN mode). Type scale + prose rules in `DESIGN.md §3`.
- **Layout:** Max content 1200px, reading width 42rem, mobile `<768px` / tablet `≥768px` / desktop `≥1024px` grids. Details in `DESIGN.md §4`.
- **Components:** Button color conventions, card hover patterns, badges, micro-interactions, elevation, loading/empty/error states, and bilingual rules in `DESIGN.md §5–6`.
- **Canonical tokens:** `src/styles.css` (ground truth). **Rules:** `RULES.md §12–14`.

> Agents: when designing or modifying UI, **read `DESIGN.md` first**, then `RULES.md §14` (button conventions), then check `src/styles.css` for exact tokens.

### UI/UX Completeness & Responsive Program (2026-08-10 →)

> Program guide: every route/component/feature must be fully designed, functional, and consistent across mobile / tablet / desktop — with intentional touch adaptations (never just hiding desktop elements). Each milestone follows **Audit → Design → Implement → Test → Validate → Document**; the site stays functional throughout.

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1 — Shared components** | Cards, buttons, badges, controls: states (hover/focus/active/disabled, empty/loading/error) + touch targets | ✅ 2026-08-10 (see CHANGELOG: touch-target + hover-only-action batch) |
| **M2 — Navigation** | Header, MobileNav, dropdowns, footer across breakpoints | ✅ 2026-08-10 (see CHANGELOG: dropdown keyboard/ARIA, focus rings on all nav links, guest mobile wishlist) |
| **M3 — Page layouts** | Every route responsive (incl. mobile ToC/related fallback on posts, stat grids) | ✅ 2026-08-10 — audit clean: post page has a `lg:hidden` mobile ToC + footer newsletter/explore cover the hidden sidebar; all grids are 1→2→3 col; book/purchases/profile stat grids OK at 3-col (short values, labels wrap); filter rows stack; PDF viewer dialogs use `h-[90vh]`/`max-sm:` treatments. No changes needed. |
| **M4 — New features** | AI chat, reader surfaces, page-builder renderer | ✅ 2026-08-10 (see CHANGELOG: Reveal reduced-motion, section-builder button focus rings, AI chat a11y) |
| **M5 — Profile & Settings** | Profile dashboard, 9-section settings, preferences | ✅ 2026-08-11 |
| **M6 — Commerce** | Cart, checkout, orders, purchases, wishlist, donate | ✅ 2026-08-11 |
| **M7 — Final QA** | Full-site breakpoint sweep (contract-test pattern), dead-hook cleanup, optional polish | ✅ 2026-08-11 |

**M1 audit notes (2026-08-10):** grids are already responsive 1→2→3 col site-wide; pagination already has a chevron-only mobile mode; category pills use a drag carousel with fade edges; AiChatPanel already has a `max-sm:` full-width bottom-sheet mode. Remaining gaps were touch targets (StarRating stars, SocialShare popover icons, CartDrawer remove) and a hover-only action invisible on touch (AiChatPanel copy button) — all fixed.

**M5 audit notes (2026-08-11):** profile/settings/stats were already responsive in code (settings nav: `hidden lg:block` sidebar + `lg:hidden` scroll-spy chips; profile grids 2→4 / 1→3; stats 2→4; all settings sections use mobile-safe `justify-between gap-4` toggle rows). Confirmed fixes: stats chart header now stacks title above the summary on mobile (`flex-col sm:flex-row`, was `justify-between` overflow); streak strip gets `thumbnail-scroll` + `h-7 w-7 sm:h-8 sm:w-8` dots; profile email row `min-w-0` + `truncate` (long addresses can no longer overflow). The earlier-flagged `grid-cols-3` is the Library Summary (short numeric values — intentionally kept per the M3 precedent). Verification is **non-browser**: 15 new source-level responsive-contract tests in `src/lib/__tests__/responsive-contract.test.ts` lock in every guarantee (562/562 tests, tsc 0 errors).

**M6 audit notes (2026-08-11):** cart/checkout/orders/purchases/wishlist/donate (+ `checkout.success`, `PaymentForm`) were already mobile-safe in code (checkout `md:grid-cols-5` → 1 col, `md:`-only sticky summary; cart item rows `min-w-0` + touch-visible remove buttons; wishlist uses the shared `book-grid`; donate chips wrap; card form expiry/CVC 2-col short inputs). Confirmed fixes at ~320px: orders OrderCard header `flex-wrap` (badge/price/chevron wrap under the title) + "Total Spent" stat `text-xl sm:text-2xl`; purchases stats `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` ("BDT 1,000.00" overflowed the ~48px inner column); cart header `flex-wrap` for long Bangla subtitles. Verification **non-browser**: responsive-contract suite extended to **35 assertions** (all M5 + M6 pages, zero dev server / zero browser).

**M7 audit notes (2026-08-11):** full-site breakpoint sweep of the remaining surfaces — homepage (featured `book-grid`, 1→2→3 grids), reflections hub + category (pills `flex-wrap`, PostGrid 1→2→3), books catalog + detail (search stack, metadata `grid-cols-2 sm:grid-cols-4`, cover `md:grid-cols-[340px_1fr]`, CTA wrap), posts article (mobile ToC `mb-8 lg:hidden`, sidebar `hidden lg:block`, related 1→3), reader (`h-screen flex flex-col overflow-hidden`), and the mock admin panel (sidebar `overflow-x-auto` horizontal scroll, `overflow-x-auto` tables, 2→3 stat grid). All verified responsive. Changes: **`src/hooks/use-mobile.tsx` deleted** (dead hook — zero imports); `books.$slug` metadata `grid-cols-3` → `grid-cols-2 sm:grid-cols-4` (price/file-size cells breathe on phones; 3-cell books render 2+1 with the price alone on row 2 — intentional, commented in the test); homepage reflections pills + `/reflections` hub category pills **lost their taxonomy counters** (`fetchPostCounts` + `mockFetchPostCounts` + both queries removed as dead code). Verification **non-browser**: contract suite extended to **56 assertions** (M5–M7 sweep blocks + a **global overflow guard** — `SAFE_UNWRAPPED_JUSTIFY_BETWEEN` allowlist of all 40 audited unwrapped `justify-between` rows across 25 files; CI fails on any NEW unwrapped row, plus a stale-entry reverse check; regenerate via `node scripts/gen-responsive-allowlist.mjs`). **602/602 tests · tsc 0 errors.** Responsive Program **M1–M7 complete**. (Counter removal on the hub is guarded by a `not.toContain("counts")` contract assertion.)

---

## 18. Current Milestone

Milestone: Content Platform + UI Polish Complete — Mock-First Frontend Ready for Production Hookup ✅

### Mock Platform Transformation (2026-08-03)

**Goal:** Make the *entire* product work offline as a production-like mock — auth, commerce, reader access, comments, search, notifications, admin — so real-backend integration (Supabase unified backend, AD-029) later is a **data-source swap, not a rewrite**.

Milestone tracker: the table below + `PROJECT.md §28` (Mock Platform seam). (Former `ROADMAP.md` retired 2026-08-08 — M0–M6 complete.)

| Milestone | Status | Key Deliverable |
|-----------|--------|-----------------|
| M0 — Mock Platform Foundation | ✅ (partial) | `VITE_DATA_SOURCE` flag + per-domain mock stores (data-source, mock-session/cart/comments/commerce) |
| M1 — Identity | ✅ 2026-08-04 | Mock auth (demo user/admin), profile & settings persistence |
| M2 — Commerce | ✅ 2026-08-04 | Simulated checkout (card form + spinner), orders, purchases, reader access gating |
| M3 — Reading & Engagement | ✅ 2026-08-07 | Reading progress, ratings, bookmarks/notes (4 mock stores) |
| M4 — Community & Search | ✅ 2026-08-07 | Notifications bell, mock search (incl. pages), contact mock fallback, comments |
| M5 — Mock Admin Panel | ✅ 2026-08-07 | Local admin CRUD + dashboard, orders + notifications admin (production target: Refine + shadcn admin, P2) |
| M6 — Integration Seam Verification | ✅ 2026-08-07 | Adapter contract docs + swap drill + cleanup |

**Core seam:** `src/lib/data-source.ts` (`VITE_DATA_SOURCE=mock|strapi|supabase|auto` + `isMockMode()` + `setMockModeOverride()` test seam). Mock stores follow a **per-domain module pattern** (localStorage client / in-memory SSR-safe): `mock-session.ts`, `mock-cart.ts`, `mock-commerce.ts`, `mock-comments.ts`, `mock-progress.ts`, `mock-ratings.ts`, `mock-bookmarks.ts`, `mock-reader.ts`, `mock-notifications.ts`, `mock-cms.ts`, `contact-messages.ts`, `newsletter.ts`. Demo accounts: `demo@sabbesatta.test` / `demo1234` (user), `admin@sabbesatta.test` / `admin1234` (super_admin).

### Mock Platform Delivery (2026-08-04)
- **M1 Identity** — `mock-session.ts` (demo accounts, persisted session + profiles CRUD), `useAuth.ts` mock-first (session, roles, signOut), `/login` "Continue as demo user/admin" buttons + credential validation, `/profile` + `/settings` mock persistence, `useTheme` → mock profile, loading gates (no SSR guest-flash).
- **M2 Commerce** — `mock-commerce.ts` (orders + purchases, lazy demo seed: 2 paid books + 1 order), `CheckoutPaymentDialog` (card form `4242 4242 4242 4242`, ~1.2s spinner, discount → order total), `checkoutCart` → `{ simulated: true }` + new `completeMockCheckout`, `canAccessPdf`/`checkOwnership`/`purchaseBook`/`getUserPurchases`/`getMyLibrary` mock branches, `books-reader.ts` on `requireAuthOrMock`. Premium books open after "purchase"; demo admin bypasses.
- **Mock comments (uuid fix)** — `mock-comments.ts` + `isMockId()`: mock ids never hit the UUID `comments` column; ownership + demo-admin rules preserved.
- **Newsletter** — mock subscriber store fallback + mock unsubscribe tokens.
- **Validation** — 0 TS errors, 312/312 tests. ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag).

### Mock Platform Delivery (2026-08-07) — M3 + M4
- **M3 Reading & Engagement** — 4 mock stores: `mock-progress.ts` (reading_progress, per user×book, lazy demo seed), `mock-ratings.ts` (book_ratings + JS aggregate recompute mirroring the DB trigger), `mock-bookmarks.ts` (polymorphic posts+books), `mock-reader.ts` (reader bookmarks + notes, ownership rules). `books-progress.ts`/`books-ratings.ts` mock branches; `bookmarks.ts` + `books-reader.ts` on `requireAuthOrMock`; rating overlays in `books.ts`; progress joined into `getMyLibrary`; profile reading stats + bookmarks section; BookCard queries enabled in mock mode.
- **M4 Community** — `mock-notifications.ts` (mirrors `admin_notifications`, per-user via mock `userId`, seeded welcome + purchase nudge, change event) + header `NotificationBell` (badge, dropdown, mark-all-read on close). Events: purchase → `new_purchase`, comment → `new_comment`/`comment_reply` (demo admin), sign-in → `welcome`. `contact-messages.ts` — `submitContactMessage` server fn (Supabase-first, mock fallback, admin `contact_message` notification); `/contact` rewired. `searchContent` `isMockMode()`-shortcut + **pages** type (`mockFetchPages`; `pages.ts` mock branch). Shared `isSupabaseUnavailableError` extracted to `supabase-unavailable.ts`.
- **Validation** — 0 TS errors, 380/380 tests. Browser-verified: bell badge + dropdown, contact offline success, Pages search results — zero console errors. ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag). Next up: M5 — Mock Admin Panel.

### Mock Platform Delivery (2026-08-07) — M5 Mock Admin Panel
- **Mock admin shell** — `/admin` renders the offline **MockAdminPanel** when demo admin + mock mode: sidebar tabs (Dashboard, Books, Reflections, Videos, Orders, Notifications). Mock-aware `beforeLoad` guard (mock session role; non-admin → `/login`); Strapi redirect shell kept for production.
- **Content CRUD** — `mock-cms.ts` overrides store (upsert map + deleted-id lists, SSR-safe, `MOCK_CMS_EVENT`) merged into every `mock-data.ts` fetch — admin edits reflect instantly on books grid, reflections, videos hub, search, homepage. `mockFetchAllBooks/Posts/Videos` for admin lists. Editor dialogs + tables with search, status badges, AlertDialog delete, "Reset demo data".
- **Orders & notifications** — `mockGetAllOrders`/`mockGetAllPurchases` aggregates → Orders tab; `mockGetAllNotifications` → Notifications tab (mark-read + mark-all-read grouped by user).
- **Site settings editor (E5.4)** — `mock-settings.ts` (deep-partial patch store, SSR-safe, `MOCK_SETTINGS_EVENT`); `fetchSiteSettings` merges overrides over defaults in mock mode (Strapi fallback in real mode) so `SiteSettingsProvider` re-applies branding/theme/book-grid live. **Site Settings** tab: Branding, Theme (6 presets, color pickers, fonts, size/radius, custom CSS), Maintenance (bilingual, admin bypass).
- **Validation** — 0 TS errors, 402/402 tests (19 new: mock-cms 10, mock-settings 9, admin aggregates 2, mockGetAllNotifications 1). Browser-verified: admin dashboard + Settings save flow — site name + accent change reflected on the public homepage instantly, zero console errors. ⚠️ Restart the dev server to pick up `VITE_DATA_SOURCE=mock` (build-time flag). Next up: M6 — Integration Seam Verification.

### Mock Platform Delivery (2026-08-07) — M6 Integration Seam Verification ✅
- **E6.1 Adapter contracts** — `PROJECT.md §28` (Adapter Contract) table: every service's public functions, output shapes, and the real adapter (Strapi/Supabase/Stripe/Resend at the time; **target now: Supabase unified — AD-029**) that must satisfy the same contract; 4-step manual swap drill documented.
- **E6.2 Swap drill test** — `data-source.test.ts` (4 tests): seam toggles via `setMockModeOverride`, flag values validated, mock-mode short-circuit verified across books/posts/videos/settings + reader-route `fetchBookById`, settings overrides apply.
- **E6.3 Cleanup** — `books.ts` `fetchBookById`/`fetchAllBooks` now `isMockMode()`-gated (last public-path Supabase probes removed); fallback-chain docs rewritten as mock-first dispatch. Real-mode-only fallbacks untouched.
- **E6.4 Docs** — AGENTS/PROJECT/CHANGELOG updated. **Mock Platform Transformation (M0–M6) is complete** — production hookup = config swap (per the P0–P8 roadmap, AD-029).

### Bilingual (EN↔BN) Sweep + BDT Currency Standard (2026-08-08)
- **Currency** — every money value now renders `formatMoney()` as `BDT 20.00` (EN) / `২০.০০ টাকা` (BN); the taka glyph and custom-symbol plumbing are gone (`TakaIcon.tsx` + `Money` deleted, `symbol` prop threading removed from PaymentForm→CheckoutPaymentDialog→CartDrawer→BookCard). Bangla numerals via `toBanglaDigits()`.
- **Books content** — bilingual mock `books` page (page-4) drives `/books` header/description; page states, purchase dialog, overlay, and toasts localized.
- **Grids / grid items / taxonomies** — `BookCard` fully bilingual (বই পড়ুন/কিনে পড়ুন, চালিয়ে যান, কার্টে যোগ করুন, বিশেষ badge, পৃষ্ঠা); `localizeCategoryName()` + `CATEGORY_BN_LABELS` in `taxonomy.ts` localize category chips across homepage / PostCard / post+book detail; videos hub, search tabs (`সব/প্রতিফলন/পৃষ্ঠা/বই/ভিডিও`) + sort (`প্রাসঙ্গিকতা/নতুন`), wishlist, reader, and detail-page not-found/error/hidden states all follow the toggle.
- **Commerce & engagement** — cart/checkout summary labels, AuthModal, Comments toasts/placeholders, and PaymentForm failure messaging localized.
- **Validation** — 0 TS errors, **453/453 tests** (31 files).

### Production Migration Phases — Revised Roadmap (Approved 2026-08-14)

> Implementation roadmap — each phase is independently shippable and testable.
>
> ⚠️ **Architecture revision (2026-08-14, AD-029):** the target architecture is **Hostinger Managed Node.js + TanStack Start + Refine Core + shadcn/ui + Supabase** — Supabase becomes the **unified backend** (Auth + PostgreSQL for ALL data + Storage). **Strapi is no longer part of the target architecture** — it is historical/superseded, pending migration and removal (P3). **Do not delete Strapi code yet** — removal happens after the replacement admin/content system is implemented and validated (P2/P3). VPS/Docker/Nginx/PM2/systemd are **not** required production infrastructure; Hostinger's managed platform supplies SSL/CDN/security/backups. Cloudflare is **optional**, not mandatory.
>
> ⚠️ **Fresh-start precondition:** phases run against a **fresh Supabase instance** the user creates. The user performs setup **manually** via dashboards and **does not share credentials with agents** — agents prepare the *Manual Setup Kit* (below), users execute it. Never reuse old dev env vars; the current `.env` is **stale**.

| Phase | Focus | Validation |
|-------|-------|-----------|
| **P0 — Architecture validation** | Research and validate: **Hostinger Managed Node.js** (deploying the TanStack Start SSR app on it), **Refine Core** + **shadcn/ui** admin viability, **Supabase** unified schema approach, **PipraPay** compatibility with the provider abstraction | Research validated + documented; Hostinger managed deploy proof (frontend serves from managed hosting) |
| **P1 — Supabase content model** | Design the **unified Supabase schema**: content tables (posts, pages, books, chapters, authors, videos, categories, tags, navigation, site settings, book-grid settings) + application tables (cart, orders, order_items, purchases, progress, bookmarks, ratings, comments, notes/highlights, notifications, coupons, audit) with RLS policies + Storage buckets | Schema + RLS designed and documented; migration SQL prepared |
| **P2 — Custom admin** | Implement the **Refine + shadcn/ui admin** inside the TanStack app (`/admin`): CRUD for content + application resources via Refine dataProvider → Supabase server functions; RBAC; replace the Strapi redirect/mock panel | Admin CRUD works against Supabase; editors manage content without code |
| **P3 — Content migration** | Move required **Strapi responsibilities into Supabase**: migrate content (posts, pages, books, videos, categories, tags, navigation, site settings) into the unified schema; wire frontend content reads to Supabase; **then** remove Strapi code/dependencies (pending validation of the replacement admin/content system) | All content served from Supabase; Strapi removed from the codebase; no mock for content features |
| **P4 — Application data** | Complete commerce/user/application integration: cart, orders, purchases, progress, bookmarks, ratings, comments, notifications → Supabase-only; remove per-feature mock stores (per the Mock Data Removal Strategy) | All user features persist across sessions on Supabase |
| **P5 — Payments** | **Validate PipraPay integration** through the existing provider abstraction (initiation, callback/webhook, signature + amount verification, idempotency, order fulfillment, purchase entitlement, email confirmation); `PAYMENT_PROVIDER=piprapay` + `PIPRAPAY_*` env | End-to-end purchase grants access live; gateway swap remains config-only |
| **P6 — Storage** | Complete **Supabase Storage/PDF authorization**: private book PDFs (`book-pdfs`), covers, avatars + signed-URL reader flow with server-side ownership checks | Reader opens real books, access-controlled; no direct `.pdf` URLs |
| **P7 — Production hardening** | Testing, security, backups, monitoring and performance on the managed Hostinger platform (its SSL/CDN/security/WAF/DDoS/backups), secrets management, admin-configurable grid density (admin/site-settings layer) | Live + monitored; security review passes; tests green |
| **P8 — Future payment upgrade** | Direct bKash/Nagad merchant APIs after licensing/settlement requirements are met (same provider abstraction) | Licensed settlement, formal records |

### Fresh Instance Manual Setup Kit (2026-08-14 revision — AD-029)

> **Workflow:** the user provisions the fresh Supabase instance (and, at P0, the Hostinger Managed Node.js app) and executes every setup step **manually** (no credentials shared with agents). This kit is the agent-prepared, user-executed checklist for P0 (Hostinger managed hosting), P1 (Supabase content model) and P2 (custom admin). After the user completes a section, the agent verifies and wires the frontend (per the Mock Data Removal Strategy — feature by feature).

⚠️ **`.env` is stale** — every value belongs to the OLD dev project. Replace each one as the steps below produce fresh values; `SITE_URL` is currently missing and must be added.

#### P0. Hostinger Managed Node.js — production hosting (prerequisite for everything)

> **Production hosting (approved 2026-08-14, AD-029):** **Hostinger Managed Node.js / Web Apps Hosting** — the managed platform provides Node runtime, deployment, SSL, CDN, security/WAF, DDoS protection, and backups. **No VPS, no Docker, no Nginx administration, no PM2/systemd, no server-installed PostgreSQL.** Cloudflare is optional (only if a specific requirement is demonstrated later). See **AD-029** and §28 §6.

1. **Create the Hostinger Managed Node.js web app** — Hostinger hPanel → Web Apps / Managed Node.js → choose Node.js runtime (Node 22) → connect the repo (or deploy via Git / file upload per Hostinger's managed flow).
2. **Deploy the TanStack Start frontend** — build output deployable on the managed Node runtime; set env vars in hPanel (`VITE_DATA_SOURCE`, `SITE_URL`, Supabase keys, `PAYMENT_PROVIDER`, `RESEND_API_KEY`).
3. **Domain + TLS** — point `sabbesatta.com` at the Hostinger managed app; Hostinger handles SSL (free auto-renewed certificates on the managed plan). Subdomains (`admin.*`/`api.*`) as needed — Hostinger's managed platform handles routing.
4. **Backups** — rely on Hostinger managed backups + Supabase automatic backups.

#### A. Supabase — fresh project (P1 prerequisite — the unified backend)

> **Supabase is the single backend**: Auth + PostgreSQL (ALL data: content + application) + Storage + RLS. The unified schema is designed in **P1**; the kit below covers the standard project setup. (Under the previous Strapi architecture this section was "application tables only" — that split is superseded: content tables live in Supabase now.)

1. **Create project** — supabase.com → New project (name `sabbe-satta`, nearest region). Note the URL `https://<ref>.supabase.co`.
2. **Apply schema** — Dashboard → **SQL Editor → New query** → paste the unified schema SQL (produced in P1 — content + application tables, RLS, storage buckets, triggers) → **Run**. Buckets: `book-pdfs` (private), `covers`, `avatars`, `site-assets`, `documents`.
3. **Sanity check** — Tables list includes content tables (posts, pages, books, chapters, authors, videos, categories, tags, navigation_items, site_settings, book_grid_settings) + application tables (profiles, user_roles, purchases, orders, order_items, carts, cart_items, bookmarks, reading_progress, book_ratings, reader_bookmarks, reader_notes, comments, notifications, coupons, newsletter_subscribers, contact_messages, audit_log, search_analytics) with RLS enabled.
4. **Auth → Providers** — enable **Email**. Enable **Google**: create an OAuth Client in Google Cloud Console (Web application); Authorized redirect URI → `https://<ref>.supabase.co/auth/v1/callback`; paste Client ID + Secret.
5. **Auth → URL Configuration** — Site URL `http://localhost:3000` (dev; production domain later) + redirect URLs.
6. **First admin** — sign up via the frontend, then promote in SQL Editor:
   ```sql
   select public.set_user_role('<your-user-uuid>', 'admin');  -- or 'super_admin'
   ```
   Then update the hardcoded admin email in `src/lib/permissions.ts` and `src/hooks/useAuth.ts`.
7. **Settings → API keys** — copy **anon (publishable)** + **service_role** into `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Never commit `.env`.

#### B. Strapi — SUPERSEDED (historical — no longer in the target architecture)

> **2026-08-14 (AD-029):** Strapi is **no longer part of the target architecture**. Do **not** create a fresh Strapi instance. The sections below are kept for **historical reference only** — the Strapi instance, its content types, and its API reads are **pending migration to Supabase and removal** (P3 of the new roadmap). Do not describe Strapi as the production CMS.

#### A. Supabase — fresh project (P2 prerequisite)

1. **Create project** — supabase.com → New project (name `sabbe-satta`, nearest region). Note the URL `https://<ref>.supabase.co`.
2. **Apply schema** — Dashboard → **SQL Editor → New query** → paste the entire **`supabase/manual-setup.sql`** → **Run**. (Generated from all 59 migrations in `supabase/migrations/`; the regeneration command is in the file header. `supabase/seed.sql` sample data is intentionally excluded — it requires a real user UUID.)
   - Creates every table, RLS policy, storage bucket, and the signup trigger that auto-creates a profile row. Buckets: `post-covers`, `blog-images`, `site-assets`, `avatars`, `book-covers`, `book-pdfs`, `audio`, `documents`.
3. **Sanity check** — Tables list includes: `posts, pages, books, videos, courses, categories, tags, profiles, purchases, carts, orders, bookmarks, reading_progress, book_ratings, comments, newsletter_subscribers, contact_messages, admin_notifications, site_settings, media_assets` with RLS enabled.
4. **Auth → Providers** — enable **Email**. Enable **Google**: create an OAuth Client in Google Cloud Console (Web application); Authorized redirect URI → `https://<ref>.supabase.co/auth/v1/callback`; paste Client ID + Secret.
5. **Auth → URL Configuration** — Site URL `http://localhost:3000` (dev; production domain later) + redirect URLs.
6. **First admin** — sign up via the frontend, then promote in SQL Editor:
   ```sql
   select public.set_user_role('<your-user-uuid>', 'admin');  -- or 'super_admin'
   ```
   Then update the hardcoded admin email in `src/lib/permissions.ts` and `src/hooks/useAuth.ts`.
7. **Settings → API keys** — copy **anon (publishable)** + **service_role** into `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Never commit `.env`.

#### B. Strapi — fresh instance (P1 prerequisite)

> **Recommended:** run the existing `strapi/` project with a fresh database — the **9 content types** auto-register from `strapi/src/api/*/content-types/*/schema.json`. No rebuilding by hand. The field reference in §D is only needed if you create a blank Strapi project instead. (The legacy `comment` and `course` types were removed 2026-08-14 — comments are Supabase-owned; courses have no frontend consumer.)

1. **Fresh database** — wipe the old dev DB, then `npm run develop` (or Docker per `strapi/docker-compose.yml`).
2. **Admin user** — first-run registration screen (email + strong password).
3. **API token** — Settings → API Tokens → Create `frontend-read`, type **Read-only**, grant every content-type permission → copy into `.env` → `VITE_STRAPI_API_TOKEN`.
4. **i18n** — Settings → Internationalization → add locale **Bengali (bn)** (default: English).
5. **Media Library** — upload book covers + PDFs, post covers, logo/favicon/OG image.
6. **Site Settings (single type)** — fill top-level fields (table below); the large `config` JSON field can stay empty (frontend merges `DEFAULT_CONFIG`).
7. **Content** — enter the minimum content (table below), then **Publish** everything (draftAndPublish).
8. **Verify** — `curl -H "Authorization: Bearer <token>" http://localhost:1337/api/posts?populate=*` returns entries.

| Content type | Kind | Draft/Publish | Used by |
|---|---|---|---|
| Post | Collection | ✅ | `/reflections`, `/reflections/:slug`, post page |
| Book | Collection | ✅ | `/books`, `/books/:slug`, homepage featured |
| Video | Collection | ✅ | `/videos` |
| Page | Collection | ✅ | `/about`, `/faq`, `/contact`, `/books` header (page-4) |
| Category | Collection | ❌ | `/reflections/:slug` hub tabs, taxonomy chips |
| Tag | Collection | ❌ | post/book tags |
| Navigation | Collection | ❌ | header/footer menus |
| SiteSetting | **Single** | ❌ | global site config |
| BookGridSetting | **Single** | ❌ | grid layout — **P6 (admin/site-settings layer): extend to per-breakpoint grid-item controls for ALL content grids** (books, reflections `PostGrid`, videos, homepage sections), driven from site settings via CSS custom properties (`--book-grid-cols-mobile/tablet/desktop` pattern) so admins can reduce/increment grid items on small devices for every grid |

> The legacy Strapi **app-data content types** (`purchase`, `reading-progress`, `bookmark`, `book-rating`) and the content types `comment` / `course` are deliberately **not included** — user data lives only in Supabase (AD-026/027), comments are Supabase-owned (2026-08-14), and courses have no frontend consumer. Their controllers, the `supabase-auth` middleware, and the `strapi-client.ts` user functions were **removed from the repo 2026-08-08**.

#### C. Minimum content to enter (historical — Strapi)

> **2026-08-14 (AD-029):** this Strapi content-entry guide is **historical**. In the target architecture the same content (categories, navigation, site settings, posts, books, videos) is entered through the **Refine + shadcn admin** (P2) into **Supabase** (P1 schema + P3 migration). The lists below remain the reference set of content the site needs — the entry mechanism changes, not the content itself.

**Categories (5)** — exact slugs required by the frontend:

| name_en | name_bn | slug | color | sort |
|---|---|---|---|---|
| Meditation | ধ্যান | meditation | #8B5CF6 | 0 |
| Mindfulness | মাইন্ডফুলনেস | mindfulness | #10B981 | 1 |
| Mental Health | মানসিক স্বাস্থ্য | mental-health | #F59E0B | 2 |
| Philosophy | দর্শন | philosophy | #3B82F6 | 3 |
| Buddhist Psychology | বৌদ্ধ মনোবিজ্ঞান | buddhist-psychology | #EC4899 | 4 |

**Navigation (5)** — simplified header (flat, no dropdown children):

| title_en | title_bn | url | type | sort |
|---|---|---|---|---|
| Home | হোম | / | internal | 0 |
| Reflections | প্রতিফলন | /reflections | internal | 1 |
| Books | বই | /books | internal | 2 |
| Videos | ভিডিও | /videos | internal | 3 |
| About | সম্পর্কে | /about | internal | 4 |

**Site Settings (single)** — `site_name` = Sabbe Satta, `site_name_bn` = সব্বে সত্তা, taglines, `accent_color` = `#92400E`, `maintenance_mode` = false, `contact_email`, social URLs, `meta_title`/`meta_description`. Leave `config` empty.

**Sample posts (2–3)** — title_en/bn, slug (uid from title_en), content_en/bn (Blocks editor), excerpt_en/bn, category relation, author, reading_time, then **Publish**. Full bilingual bodies can be copied from `src/lib/mock-data.ts` (`MOCK_POSTS_DATA`).

> **Migration path (P3):** the mock content (5 categories, 22 tags, 5 nav items, 4 pages, 25 posts, 10 books, 8 videos + site settings) is the seed set for the Supabase unified schema (P1) and the custom admin (P2). The legacy `strapi/seed/strapi-content-bundle.json` + `scripts/import-strapi-seed.mjs` are Strapi-import tooling (historical; may inform the P1 seed script). The `scripts/sync-strapi-books.mjs` AD-027 mirror is likewise superseded — with content in Supabase, books are written directly, no mirror needed.

**Books (1 free + 1 paid)** — title_en/bn, slug, description blocks, author_name, cover_image (media), pdf_file (media), price (BDT), is_free, book_status = published, featured = true on the free one, rating/rating_count, categories/tags, **Publish**. PDFs live in the Media Library; the reader opens them via `/api/pdf?slug=` (no direct `.pdf` URLs — see the IDM fix in CHANGELOG).

**Videos (1–2)** — title_en/bn, slug, embed_url (YouTube), description, duration, **Publish**.

#### D. Content field reference (historical — Strapi content types)

> **2026-08-14 (AD-029):** the Strapi content-type field reference below is **historical**. In the target architecture these fields become **Supabase table columns** (P1 unified schema) managed by the **Refine + shadcn admin** (P2). The field lists remain the authoritative content shape the frontend consumes — they map 1:1 to the Supabase schema design.

- **Post** — title_en (string, req), title_bn (string), slug (uid ← title_en), content_en (blocks), content_bn (blocks), excerpt_en (text, 500), excerpt_bn (text, 500), cover_image (media · single · images), author (string), categories (relation · manyToMany → Category · inversedBy posts), tags (relation · manyToMany → Tag · inversedBy posts), seo_title (string), seo_description (text, 160), reading_time (integer, default 1), featured (boolean, default false), sort_order (integer, default 0).
- **Book** — title_en (string, req), title_bn (string), slug (uid ← title_en), description_en (blocks), description_bn (blocks), author_name (string), author_bio_en (blocks) ⭐, author_bio_bn (blocks) ⭐, cover_image (media · single · images), pdf_file (media · single · files), price (decimal, default 0), currency (string, default **BDT**), is_free (boolean, default true), book_status (enum: draft/published/archived, default draft), rating (decimal, default 0), rating_count (integer, default 0), featured (boolean, default false), sort_order (integer, default 0), categories (manyToMany → Category), tags (manyToMany → Tag), chapters (json) ⭐, chapter_pages (json) ⭐, seo_title (string), seo_description (text, 160). ⭐ = **planned amendments (2026-08-14)** — the frontend `Book` interface + reader TOC consume these today; they must be added to the schema + AD-027 mirror (chapters/chapter_pages/author_bio_en/bn).
- **Video** — title_en (string, req), title_bn (string), slug (uid ← title_en), description_en (text), description_bn (text), embed_url (string, req), thumbnail (media · single · images), duration (integer), sort_order (integer, default 0).
- **Page** — title_en (string, req), title_bn (string), slug (uid ← title_en), content_en (blocks), content_bn (blocks), sections (json), banner_url (string), visible (boolean, default true), sort_order (integer, default 0), seo_title (string), seo_description (text, 160).
- **Course** — title_en (string, req), title_bn (string), slug (uid), description_en (blocks), description_bn (blocks), cover_image (media), price (decimal, default 0), is_free (boolean, default true), course_status (enum: draft/published/archived), sort_order (integer), lessons (json).
- **Category** — name_en (string, req), name_bn (string), slug (uid ← name_en), description_en (text), description_bn (text), color (string, default #6B7280), visible (boolean, default true), sort_order (integer, default 0), posts (manyToMany · mappedBy), books (manyToMany · mappedBy).
- **Tag** — name_en (string, req), name_bn (string), slug (uid ← name_en), color (string, default #6B7280), posts (manyToMany · mappedBy), books (manyToMany · mappedBy).
- **Navigation** — title_en (string, req), title_bn (string), url (string, req), type (enum: internal/external/dropdown, default internal), target (string), parent (relation · manyToOne → Navigation), children (relation · oneToMany ← Navigation · mappedBy parent), location (enum: header/footer, default header), visible (boolean, default true), sort_order (integer, default 0).
- **Comment** — content (text, req), author_name (string, req), author_email (email), parent (manyToOne → Comment), children (oneToMany ← Comment), status (enum: pending/approved/rejected, default pending).
- **SiteSetting (single)** — site_name (string), site_name_bn (string), site_tagline_en (string), site_tagline_bn (string), logo (media), favicon (media), accent_color (string), dark_mode (boolean), maintenance_mode (boolean), maintenance_message_en (text), maintenance_message_bn (text), meta_title (string), meta_description (text, 160), og_image (media), google_analytics_id (string), social_facebook/social_twitter/social_youtube (string), contact_email (email), contact_phone (string), contact_address (text), config (json).
- **BookGridSetting (single)** — page_size (int 4–48, default 12), eyebrow_en (string, default “Books”), eyebrow_bn (string, default “বই”), columns_mobile (int 1–2, default 2), columns_tablet (int 2–4, default 3), columns_desktop (int 2–5, default 4), gap (int 0–80, default 40), cover_aspect_ratio (enum: portrait_3_4/portrait_2_3/square_1_1/landscape_4_3, default portrait_2_3), card_radius (int 0–32, default 12), show_author (boolean), show_free_badge (boolean), show_featured_badge (boolean), title_font_size (int 10–24, default 20), author_font_size (int 8–20, default 16), taxonomy_font_size (int 8–18, default 14), title_lines (int 1–3, default 2).

#### E. Environment checklist

| Variable | Where from | Needed for |
|---|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Supabase → Settings → API | client + SSR DB/auth (unified backend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API (anon) | client auth/DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role — server-only) | server functions |
| `SUPABASE_MANAGEMENT_KEY` | Supabase account → Access Tokens (`sbp_`) | optional seeding scripts |
| `SITE_URL` | production domain (Hostinger managed) | IPN callbacks, sitemap, email links |
| `VITE_DATA_SOURCE` | `mock` now → `auto` when wiring | feature-level migration/dispatch seam |
| `PAYMENT_PROVIDER` | `simulated` now → `piprapay` later | payment abstraction |
| `PIPRAPAY_*` | PipraPay admin (P5, when deployed) | payments |
| `RESEND_API_KEY` | resend.com | transactional email |
| `OPENAI_API_KEY` | platform.openai.com | AI chat / embeddings |
| ~~`VITE_STRAPI_URL` / `VITE_STRAPI_API_TOKEN`~~ | ~~Strapi~~ — **historical (AD-029)** | public content reads move to Supabase (P3) |

#### F. What the frontend calls (historical — Strapi REST)

> **2026-08-14 (AD-029):** the Strapi REST endpoints below are **historical**. In the target architecture the same reads go to **Supabase** (via server functions / RLS-guarded queries) once P3 lands. The module → data mapping stays the same (posts, books, pages, videos, taxonomy, navigation, comments, site settings).

| Frontend module | Historical endpoints (Strapi, all `/api/…`, Bearer read token) | Target data source (P3) |
|---|---|---|
| posts.ts | `/posts` (+ filters), `/posts?filters[slug]` | Supabase `posts` |
| books.ts | `/books`, `/books?filters[featured]`, `/books?filters[slug]` | Supabase `books` |
| pages.ts | `/pages`, `/pages?filters[slug]` | Supabase `pages` |
| videos.ts | `/videos` | Supabase `videos` |
| taxonomy.ts | `/categories`, `/tags` | Supabase `categories` + `tags` |
| navigation.ts | `/navigations` | Supabase `navigation_items` |
| comments.ts | `/comments` | Supabase `comments` |
| siteSettings.tsx | `/sitesetting` | Supabase `site_settings` |

### Mock Data Removal Strategy (2026-08-08)

> **Principle: the site stays fully functional throughout the migration. Mock data is removed LAST for each feature — never at the start.**

**Per-feature sequence (apply to EVERY feature, one feature at a time):**

```
1. Mock (current state) → 2. Real Backend Connection → 3. Admin/CMS Configuration
→ 4. Frontend Verification → 5. Full Feature Testing → 6. Remove Mock Data
```

**Rule:** a feature's mock data is only removed after its real backend connection, admin/CMS management workflow, frontend rendering, AND essential user flows have all been verified against the live backend. Between steps 3 and 6 the feature runs on the real backend while its mock path stays as a verified fallback (existing `VITE_DATA_SOURCE` seam) — the website remains demoable and functional at every step.

**Feature coverage (each follows the 6-step sequence above):**

| Feature | Real backend (target) | Admin/CMS config (target) | Verified by |
|---------|-------------|------------------|-------------|
| Content — posts/reflections | Supabase `posts` | Refine admin (bilingual fields, categories) | P3 + per-feature steps 4–5 |
| Content — pages | Supabase `pages` | Refine admin + page sections | P3 |
| Navigation (header/footer) | Supabase `navigation_items` | Refine admin navigation config | P3 |
| SEO / site settings | Supabase `site_settings` | Refine admin site-settings singleton | P3 |
| Videos | Supabase `videos` | Refine admin + Supabase Storage | P3 |
| Books catalog | Supabase `books` (+ `chapters` + `authors`) | Refine admin editorial | P3 |
| Authentication | Supabase Auth | Supabase auth settings (email + Google OAuth) | P4 |
| Comments | Supabase `comments` | Admin moderation in Refine-backed UI | P4 |
| Cart / checkout | Supabase + payment interface | Order state machine + gateway config | P4 + P5 |
| Orders / purchases | Supabase | Admin orders view | P4 + P5 |
| PDF access (reader) | Supabase Storage signed URLs | Private bucket + access rules | P6 |
| Reading progress | Supabase | Reading-progress table (app data) | P4 |
| Bookmarks / ratings | Supabase | App-data tables | P4 |
| Search | PostgreSQL FTS → Meilisearch | Search index/sync | P4 (FTS) → V2 (Meilisearch) |
| Newsletter / contact | Supabase + Resend | Table + email config | P4 |

> **2026-08-14 (AD-029):** column updated — the real backend is **Supabase** for every feature (content + application unified), and the admin/CMS config is the **Refine + shadcn admin** (P2). The previous rows referenced Strapi as the content backend; that is superseded.

**Where mock removal happens:** the final “remove mock data” step for each feature is completed inside the phase where that feature is verified (P2–P6). **P7 (Hardening)** is the *last* step — it completes testing/security/backups and ensures no feature is left mock-only in production. No feature is left mock-only at cutover.

### Migration Phases (historical — Strapi transition)

> **2026-08-14 (AD-029):** the Strapi transition phases below are **historical**. The active roadmap is the **P0–P8 revision** at the top of §18 (Supabase unified backend + Refine/shadcn admin + Hostinger Managed Node.js).

| Phase | Status | Details |
|-------|--------|---------|
| **Phase 1 — Strapi Content API Foundation** | ✅ (historical) | Strapi API client (10 content types), 8 service files wired, migration script, `PROJECT.md §28`. (Supabase JWT bridge + app-data types removed 2026-08-08.) |
| **Phase 2 — Admin Transition** | ✅ (historical) | Refine admin panel removed; Strapi admin was the CMS interface (`/admin` redirects). **Superseded 2026-08-14 — Refine returns as the target admin (AD-029).** |
| **Phase 3 — Data Migration** | ⏸ Superseded | Strapi data migration superseded; content moves to the unified Supabase schema instead (P1/P3) |
| **Phase 4 — Legacy Cleanup** | ✅ (historical) | Refine data provider, 27 admin routes, ~50 admin components all removed |
| **Phase 5 — Production Hardening** | ⏳ Superseded | Old VPS hardening superseded — P7 covers hardening on the Hostinger managed platform |

### Recent Sessions (2026-07-17 → 2026-08-13)

| Feature | Status | Details |
|---------|--------|---------|
| **Full-site font-size audit** | ✅ 2026-08-13 | Rule (DESIGN.md §3.1): no reading copy below 16px — body/cards/excerpts `text-base`, grid titles `text-lg`, row titles `text-base`, captions `text-sm`, metadata `text-xs`. Pass 1: article bodies (blog 1.18rem, FAQ/book-desc 16px, terms/privacy prose, about tagline 18px). Pass 2: post-page widgets (pullquote/comments/newsletter 16px, author caption 14px). Pass 3: full-site sweep — page intros 14→16px (~17 pages), section headings 14→16px (incl. all settings sections), row titles 14→16px, row descs 12→14px, Explore cards 18/16px, VideoCard titles 18px, search results 16px. Consistent across devices |
| **About hero + FeatherPenIcon SVG** | ✅ 2026-08-13 | About hero = Pixabay 8314420 (zen lotus lake, `public/about-hero.png`), `object-contain` so the face stays visible, frosted-panel typography (saffron eyebrow, serif title, both themes). `FeatherPenIcon` rewritten from a PNG wrapper to a real `currentColor` SVG so active-state tints work; PNG deleted. MobileNav white-strip (scroll-shadow overlay) removed |
| **Grid card entrance animations** | ✅ 2026-08-12 | All four content grids (homepage books + videos, books page, videos page) now stagger cards in with a pure slide-up (`Reveal fade={false}`, `delay = i*0.05s cap 0.3s`); `Reveal.tsx` gained a `fade` prop (default true; false = translateY-only). Reflections grids (`PostGrid`) converted to the same scroll-triggered `Reveal` pattern (was mount-time `stagger-enter`, invisible below the fold on small screens) — consistent site-wide; `stagger-enter`/`card-enter` CSS utilities removed |
| **Custom FeatherPenIcon** | ✅ 2026-08-12 | Hand-drawn full feather quill + ink writing line replaces lucide `Feather` (and the interim `QuillInkwellIcon`) on all 8 Reflections surfaces — mobile drawer, bottom nav, homepage section header, ⌘K palette, /search tabs + result chips, bookmarks placeholders, About explore card, mock admin tab |
| **Desktop nav active states** | ✅ 2026-08-12 | Header links, `NavDropdown` trigger/items/flyouts, and `AvatarDropdown` items use the mobile drawer's active language (`bg-primary/10` tint pill + saffron accent bar + saffron icon) on the current route; Reflections trigger prefix-matches category pages |
| **MobileNav white-strip fix** | ✅ 2026-08-12 | Pale scroll-shadow overlay div removed (was a white band above the saffron divider in light mode); bottom fade moved onto the scroll-container background so it always terminates at the divider; dead `pb-2` removed; mobile ✕ shrunk `h-6 w-6` → `h-5 w-5` with re-derived morph geometry |
| **Search palette ⌘K fixes** | ✅ 2026-08-12 | `⌘` → `Ctrl K` (tofu glyph fix, palette + header tooltip), `↑↓`/`↵` → lucide icons, keyboard-hint footer hidden on mobile, visible ✕ close button added |
| **Static-pages sweep** | ✅ 2026-08-08 | All user-visible Stripe references removed (terms/privacy/cart/checkout/CartDrawer/books.$slug) → provider-agnostic wording (AD-026); premium card treatment for terms, privacy, about, newsletter-unsubscribe |
| **Secondary-pages polish** | ✅ 2026-08-08 | Donate (preset chips, `BrandCtaButton`, in-page success replacing `alert()`, no Stripe wording), FAQ (animated accordion + Stripe-free answers), Wishlist/Contact (`BrandCtaButton`) |
| **PipraPay-ready payment abstraction** | ✅ 2026-08-08 | Provider-agnostic `PaymentProvider` interface (simulated → piprapay), server-side order lifecycle (pending→paid/failed/cancelled), `/api/payments/webhook` IPN with idempotent duplicate-callback handling + **amount verification** (webhook `amountPaid` must match order total ±BDT 1 or the order is marked failed), env-driven PipraPay config. Details below. |
| Blog hub + category pages | ✅ | `/blog` hub with filter tabs + 4 category routes (meditation, mindfulness, mental-health, philosophy) with bilingual SEO + error boundaries |
| Nav dropdown fix | ✅ | Strapi children extraction + dedup + root-only filter — Blog dropdown shows sub-items correctly |
| Content seeding | ✅ | 19 posts across 5 categories in Strapi DB (Meditation 2, Mindfulness 6, Mental Health 6, Philosophy 4, Buddhist Psychology 1) — `seed-sample-posts.sql`, `seed-balance-posts.sql`, etc. |
| Buddhist Psychology page | ✅ | Category + nav dropdown child added (served by dynamic `reflections.$slug.tsx`; mock data + `seed-strapi-nav.sql` + CAT_COLORS) |
| Dark mode | ✅ | `useTheme` hook with localStorage caching, system detection, instant toggle, FOWT prevention |
| Header restructure v3 | ✅ | 4-column layout, avatar dropdown, Sun/Moon toggle, LangToggle pill, wishlist/cart badges |
| RHF + Zod profile | ✅ | Field-level validation on profile editing (display name, bio) |
| Settings page | ✅ | Dedicated `/settings` with preferences (theme, language, notifications, reading) + password change |
| Site rename → Sabbe Satta | ✅ | Full rename across source, SEO overhaul (og:image, sitemap, robots), video/book card polish |

### Next Objective
**Mock Platform Transformation (M0–M6) is complete** — the entire product works offline as a production-like mock: the demo user can sign in, shop, check out with the simulated card form, read premium books offline, rate/progress/bookmark, comment, get notifications, search pages/books/posts/videos, send contact messages, and the demo admin can manage content, orders, notifications, and site settings — all without any backend. The `VITE_DATA_SOURCE` seam (`mock|strapi|supabase|auto`) is verified by the M6 swap drill — hooking up real backends is a config swap, not a rewrite (see `PROJECT.md §28` → Adapter Contract).

**Next steps (fresh start, revised 2026-08-14 — AD-029):** the user creates a **brand-new Supabase instance** (unified backend) and a **Hostinger Managed Node.js** app; agents must ask for the fresh-start go-ahead before any real backend work (see the P0–P8 table above and AGENTS.md working agreement).
1. **P0 — Architecture validation** — Validate Hostinger Managed Node.js deployment, Refine Core + shadcn/ui, Supabase unified schema, and PipraPay compatibility; document findings.
2. **P1 — Supabase content model** — Design the unified schema (content + application tables, RLS, Storage buckets).
3. **P2 — Custom admin** — Implement the Refine + shadcn admin inside the TanStack app (content + application CRUD → Supabase).

### Future Phases
> **2026-08-14 (AD-029):** the legacy phase list below is historical. The active roadmap is the **P0–P8 revision** at the top of §18.
1. **Phase 1: Strapi Content API Foundation** ✅ (historical)
2. **Phase 2: Admin Transition** ✅ (historical — Refine admin removed then; **Refine returns as the target admin**, AD-029)
3. **Phase 3: Data Migration** ⏸ — superseded twice: the old Strapi fresh-start is replaced by the **Supabase unified schema** (P1) + content migration (P3)
4. **Phase 4: Legacy Cleanup** ✅ (historical)
5. **Phase 5: Production Hardening** — superseded by **P7** (hardening on the Hostinger managed platform)

---

## 19. Current TODO

> **2026-08-14 (AD-029):** the Strapi phases below are **historical** — Strapi is superseded, pending migration to Supabase and removal (P2/P3). Active work items: **P0 — Architecture validation**, **P1 — Supabase content model**, **P2 — Custom Refine+shadcn admin**, **P3 — Content migration** (see §18).

### Phase 1: Strapi Content API Foundation ✅ (2026-07-17, historical)

- [x] **Expand Strapi API client** — Added typed interfaces and operations for all 10 content types (posts, books, pages, videos, courses, categories, tags, navigation, comments, site settings) with `buildQuery()` helper
- [x] **Wire 8 frontend service files** — `pages.ts`, `videos.ts`, `courses.ts`, `comments.ts`, `navigation.ts`, `posts.ts`, `books.ts`, `taxonomy.ts` use Strapi-first + Supabase-fallback with type-mapping functions
- [x] ~~**Implement auth bridge**~~ — `strapi/src/middlewares/supabase-auth.js` (validated Supabase JWTs) — **removed 2026-08-08** (app data is Supabase-only)
- [x] ~~**Update 5 Strapi controllers**~~ — `purchase`, `reading-progress`, `bookmark`, `book-rating`, `book` — the 4 app-data types were **removed 2026-08-08**; `book` controller now content-only
- [x] ~~**Update frontend client**~~ — `strapiFetch` `supabaseToken` + 12 user-specific functions — **removed 2026-08-08**
- [x] **Create migration script** — `scripts/migrate-to-strapi.mjs` exports from Supabase (SDK), transforms HTML-to-blocks, saves JSON unconditionally, imports via Strapi REST API (handles relations, self-references, site settings)
- [x] **Create architecture docs** — `PROJECT.md §28` with all decisions, flows, and responsibility splits

### Phase 2: Admin Transition ✅ (2026-07-17 — historical)

> **2026-08-14 (AD-029):** this removed the old Refine admin in favor of Strapi. The target has since reversed — **Refine + shadcn returns as the admin (P2)** and Strapi is superseded. Kept for historical reference.

- [x] **Point admin button to Strapi admin** — Already done (VITE_STRAPI_URL; historical)
- [x] **Remove Refine admin panel** — `@refinedev/core`, `@refinedev/supabase` removed; all Refine integration layer, admin routes, admin components deleted; only `page-builder/` kept for public site
- [x] **Remove dead code** — `useFavorites.ts`, `useRecentItems.ts`, `useContentAutosave.ts`, `dynamic-form-bridge.tsx`, `admin-routes.ts` all removed
- [x] **Update lockfile** — `bun install` run; lockfile updated; 0 TypeScript errors
- [ ] ~~**Train editors on Strapi admin**~~ — historical; editors will use the Refine admin (P2)

### Phase 3: Data Migration ⏸ (superseded — now P1/P3 Supabase content migration)

> **Note (2026-08-08, revised 2026-08-14):** All content service files (`posts.ts`, `books.ts`, `videos.ts`, `navigation.ts`, `taxonomy.ts`, `trending.ts`, `siteSettings.tsx`) are **mock-first** for development. The **Strapi fresh-start plan is superseded by AD-029**: content moves into the **unified Supabase schema** (P1) and is migrated there in P3 (from Strapi/mock data); Strapi code is then removed. The legacy `scripts/migrate-to-strapi.mjs` no longer applies.

- [x] **Create migration script (legacy)** — `scripts/migrate-to-strapi.mjs` (exports old dev data, transforms, saves JSON, imports) — kept for reference only
- [ ] **P1: Unified Supabase schema** — Design content + application tables, RLS policies, Storage buckets (see §18)
- [ ] **P2: Custom admin** — Refine Core + shadcn/ui admin inside the TanStack app
- [ ] **P3: Content migration** — Migrate content (posts/pages/books/videos/categories/tags/navigation/site-settings) into Supabase; wire reads; remove Strapi code
- [ ] **Fresh Supabase: run migrations + env** — Run the unified schema SQL against the new project; set `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from the user's new project

### Phase 4: Legacy Code Cleanup ✅ (2026-07-17)

- [x] **Remove Refine data provider** — `src/integrations/refine/` directory deleted
- [x] **Remove Refine admin routes** — All 27 `src/routes/admin.*.tsx` sub-routes deleted (kept `admin.tsx` as Strapi redirect)
- [x] **Remove Refine admin components** — `src/components/admin/` files removed (except `page-builder/` for public site)
- [ ] **Remove duplicated content service files** — Files that only Supabase-based content reads

### Phase 5: Production Hardening

> Superseded 2026-08-14 by the P0–P8 roadmap — production runs on **Hostinger Managed Node.js** (no VPS/Docker/Nginx/PM2/systemd; AD-029). See §18 P0–P8 (P7 = hardening).

- [ ] **Deploy to Hostinger Managed Node.js (P0/P7)** — managed Node runtime, env vars in hPanel, Hostinger SSL/CDN/backups
- [ ] **Configure monitoring** — Uptime monitoring, health checks, logging (Hostinger managed tooling)
- [ ] **Set up backups** — Supabase automatic backups + Hostinger managed backups
- [ ] **Performance tuning** — Bundle optimization, Hostinger CDN, caching headers
- [ ] **Security audit** — HTTPS, CORS, rate limiting, secrets management, RLS review

### Historical Completion (Pre-Strapi)

- [x] Generic CRUD framework, Form framework, Permission framework
- [x] Error handling, Notification framework, .env.example
- [x] User library, Bookmarks, PDF.js reader, TOC
- [x] Typography controls, Unified search, Sitemap
- [x] Newsletter, Contact form, Cart + Checkout
- [x] Courses, Community features, Analytics
- [x] Stripe integration, 319 tests

---

## 20. Version 2 — Sprint Roadmap

> **Legacy (2026-08-14):** predates the P0–P8 roadmap (§18) and AD-026. Several items are already complete (Supabase types regeneration, reading stats, purchase history, coupons, donations) and the Stripe-based items are superseded by the provider-agnostic payment interface. Kept for historical reference.

### Sprint 1 — Foundation Hardening

| Task | Effort | Value | Status |
|------|--------|-------|--------|
| Supabase types regeneration (eliminate 246 `as any`) | Low | High | ✅ Done (140 removed, 130 structurally necessary) |
| Orders management panel (purchase admin view) | Low | High | Not started |
| Test coverage expansion (reader, cart, courses) | Medium | High | Partial (263 tests, all passing) |
| Email automation (purchase confirmation emails) | Low | High | Backend done, needs testing |

### Sprint 2 — Search & Discoverability

| Task | Effort | Value |
|------|--------|-------|
| Meilisearch deployment + sync pipeline | Medium | High |
| Search UI upgrade (typeahead, filters, highlighting) | Medium | High |
| Blog reading time estimation | Low | Medium |

### Sprint 3 — Reading Experience

| Task | Effort | Value |
|------|--------|-------|
| Reader annotations (highlight + note UI polish) | Medium | High |
| Reading statistics / streaks | Medium | High |
| Book recommendations (by category/author) | Medium | Medium |

### Sprint 4 — Commerce & Monetization

| Task | Effort | Value |
|------|--------|-------|
| Coupon/discount codes | Low | Medium | ✅ Done — custom `coupons` table + `WELCOME10` demo (not Stripe; AD-026) |
| Donations page | Low | Medium | ✅ Done — `/donate` (2026-08-08) |
| Purchase history page for users | Low | Medium | ✅ Done — `/purchases` + `/orders` |

### Sprint 5 — Content Expansion

| Task | Effort | Value |
|------|--------|-------|
| Podcasts module (Castopod integration) | Medium | High |
| Course completion certificates | Medium | Medium |
| Newsletter automation (welcome series) | Medium | Medium |

### Sprint 6 — Polish & Performance

| Task | Effort | Value |
|------|--------|-------|
| Bundle optimization (code-split large chunks) | Medium | High |
| Lighthouse audit + fixes | Medium | High |
| Accessibility audit + fixes | Medium | High |
| Performance budget enforcement | Low | Medium |

### V1 Baseline vs V2 Targets

| Metric | V1 Baseline | Current | V2 Target |
|--------|-------------|---------|-----------|
| TypeScript errors | 0 | 0 | 0 |
| `as any` casts | 246 | ~130 | <50 |
| Supabase types | 8 tables | 49 tables | 49+ tables |
| Test count | 62 | 263 | 300+ |
| Test coverage | ~15% of lib/ | ~40% of lib/ | >60% of lib/ |
| User-facing search | ILIKE (basic) | ILIKE (basic) | Meilisearch (production) |
| Reading features | View + progress | View + progress | View + progress + annotate |
| Commerce features | Purchase + cart | Purchase + cart + coupons | Purchase + cart + coupons + orders |
| Content types | 5 | 6 | 6 (+ podcast) |
| Lighthouse score | Unknown | Unknown | >90 all categories |

---

## 21. Architecture Decisions

### AD-001: TanStack Start over Next.js
Full type safety from router to data fetching with file-based routing and TypeScript inference.

### AD-002: Supabase over Custom Backend
Managed PostgreSQL with built-in auth, storage, and RLS eliminates the need for a separate API server.

### AD-003: TanStack Query for Server State
Automatic caching, background refetching, and optimistic updates provide a consistent data-fetching pattern.

### AD-004: shadcn/ui Component Library
Full control over styling with Tailwind CSS v4 compatibility, accessibility, and zero runtime dependencies.

### AD-005: Server Functions for Data Mutations
Auth middleware enforced consistently with business logic running server-side.

### AD-006: Modular Service Layer
All business logic lives in lib/ modules. Components render, hooks manage state, services own logic.

### AD-007: Bilingual Fields as Separate Columns
Type-safe at the database level, indexable, and accessible via a simple pickLocalized() utility.

### AD-008: Private PDF Bucket with Signed URLs
Protected copyrighted content with server-side access enforcement and 5-minute URL expiry.

### AD-009: Idempotent Purchases with UNIQUE Constraint
Prevents duplicate purchases from race conditions or double-clicks.

### AD-010: Ref-Based Auth Resume for Eye Icon
useRef + setTimeout pattern avoids closure staleness from synchronous Supabase auth state changes.

### AD-012: Refine as Admin Data Layer (Headless) — SUPERSEDED

**Decision:** Use Refine v5 in headless mode as the admin data layer instead of writing custom TanStack Query hooks for each resource.

**Rationale:** Refine's `dataProvider` pattern eliminates repetitive CRUD boilerplate across 13 admin pages. The `@refinedev/supabase` adapter maps tables to resources with zero configuration. Hooks like `useTable`/`useList`/`useOne`/`useCreate`/`useUpdate`/`useDelete` provide a consistent, type-safe interface without replacing TanStack Router (routing) or shadcn (UI).

**Constraints:** Refine is embedded within existing routes — no Refine routing, layout, or UI components used. Storage operations (Supabase Storage) remain direct calls due to Refine's lack of Storage abstraction.

**Date:** 2026-07-11
**Superseded by:** AD-023 (Hybrid Strapi + Supabase) — Strapi v5 now provides the admin interface. All Refine code removed in Phase 2 (2026-07-17).

### AD-013: Meilisearch for Public Search

**Decision:** Use Meilisearch (self-hosted Docker) as the dedicated search engine for public-facing search, replacing PostgreSQL ILIKE queries for user-facing features.

**Rationale:** PostgreSQL ILIKE queries do not handle Bangla (non-Latin script) well. Meilisearch offers automatic language detection, typo tolerance, search-as-you-type, and disk-based scalability. Keeps PostgreSQL FTS as fallback for admin/internal search.

**Architecture:** Sidecar Docker container, sync via Supabase Edge Functions + Database Webhooks. Initial load via one-time script.

**Date:** 2026-07-11 (V2 Planning)### AD-014: Stripe Native Coupons (Not External Platform) — **Superseded 2026-08-14**
> **Superseded:** coupons are custom codes (`coupons` table, `validateCoupon`, demo `WELCOME10`) — not Stripe native (AD-026 removed Stripe from the payment path). Kept for historical reference.

**Decision:** Start with Stripe's native Coupons and Promotion Codes API for discount management.

**Rationale:** Already using Stripe Checkout. Stripe coupons handle percentage off, fixed amount, duration, and max redemptions — sufficient for current commerce scale. Only reach for external platforms (Voucherify, Talon.One) if complex stacking rules or loyalty programs are needed in the future.

**Local cache:** `coupons` table in Supabase for admin CRUD UI.

**Date:** 2026-07-11 (V2 Planning)

### AD-015: Custom PDF Annotations (Not Third-Party Library)

**Decision:** Build highlight/annotation UI as a custom canvas overlay on existing PDF.js, rather than integrating a third-party annotation library.

**Rationale:** No mature self-hosted annotation library fits the signed-URL + access-control model. Existing codebase already has PDF.js, `reader_notes` table with server functions, and `reader_highlights` table (empty, ready for V2). Custom overlay avoids licensing costs and external dependencies while maintaining full DRM control.

**Research reserve:** Evaluate Hypothesis overlay (`pdf.js-hypothes.is`) during implementation as potential accelerator.

**Date:** 2026-07-11 (V2 Planning)

### AD-016: Castopod for Podcasts (Not In-House Build)

**Decision:** Use Castopod (self-hosted, open-source) for podcast hosting rather than building custom podcast infrastructure.

**Rationale:** Castopod supports Podcasting 2.0 standards, multi-feed management for bilingual content, and RSS generation. Building custom podcast hosting (audio storage, RSS feeds, player, episode management) would duplicate mature open-source functionality.

**Strategy:** Two separate feeds (English / Bangla) for better discoverability in podcast apps. Embed Castopod player in main site pages.

**Date:** 2026-07-11 (V2 Planning)

### AD-011: Platform-First, Library-First Strategy

**Decision:** Build a reusable platform foundation before any feature modules. Use mature open-source libraries before custom code.

**Priority chain:** Mature libraries > Official SDKs > Supabase services > Custom business logic

**Supabase owns:** Auth, Authorization, PostgreSQL, Storage, Realtime, Edge Functions, RLS, database policies

**Custom code only for:** CMS workflows, reader behavior, purchase rules, book access permissions, user library, reading progress

**Date:** 2026-07-10

### AD-023: Hybrid Strapi + Supabase Architecture — **SUPERSEDED 2026-08-14 (AD-029)**

> **Superseded by AD-029:** the hybrid split (Strapi content + Supabase app data) is replaced by **Supabase as the unified backend** (content + application data in one database) with a **Refine + shadcn admin**. Strapi is historical/pending removal. Kept for historical reference.

**Full decision record: §28 → Architecture Decisions (AD-023).** Summary — use Strapi v5 for content management + admin and Supabase for application data/auth, rather than putting everything in one system. Strapi is not designed for cart/purchases/per-user tracking; the 42 Supabase migrations stay put. Content reads → Strapi REST API; app data → Supabase via server functions; payments → provider-agnostic (AD-026: simulated → PipraPay → bKash/Nagad) → webhook → VPS → Supabase; admin edits → Strapi admin panel.

### AD-026: Provider-Agnostic Payment Interface (Stripe → PipraPay → bKash/Nagad)

**Decision:** Replace the Stripe-specific checkout path with a single provider-agnostic payment interface: `initiate → redirect/pay → IPN webhook → verify (server-side, signature-checked) → order → purchase → unlock PDF → email`. Gateways are swappable config.

**Rationale:** Stripe is not available to Bangladesh-registered businesses and does not support BDT — the current `stripe-checkout.ts` + `stripe-webhook.ts` code cannot collect real payments in-market. A common interface lets the site launch with simulated checkout (Stage 1), accept live low-volume payments via self-hosted PipraPay (Stage 2, stopgap while no trade license), then upgrade to licensed direct bKash/Nagad merchant APIs (Stage 3, final) with zero frontend rewrite.

**Constraints:** Payment success must ALWAYS be verified server-side before granting purchased content (never trust the client). Stripe code (checkout session + webhook + `sk_test_placeholder`) is scheduled for removal in P7.

**Implementation (2026-08-08) — PipraPay-ready without a live PipraPay install:**

- **`src/lib/payments/`** — the provider seam:
  - `types.ts` — `PaymentProvider` interface (`createPayment`, `verifyWebhook`, `isConfigured`) + `PaymentOrder`/`CreatePaymentResult`/`VerifiedPayment` shapes
  - `config.ts` — ALL PipraPay credentials/URLs from env (`PIPRAPAY_BASE_URL`, `PIPRAPAY_MERCHANT_ID`, `PIPRAPAY_API_KEY`, `PIPRAPAY_API_SECRET`, `PIPRAPAY_WEBHOOK_SECRET`, `PIPRAPAY_CREATE_PAYMENT_PATH`, `PIPRAPAY_WEBHOOK_URL`) — zero hardcoded secrets
  - `simulated.ts` — default provider: inline (no redirect), webhook verifier accepts test payloads so the endpoint is testable offline
  - `piprapay.ts` — production provider: HMAC-SHA256-signed create-payment + webhook signature verification (`X-PipraPay-Signature`). Throws a descriptive error until configured; checkout then falls back to simulated so dev never breaks
  - `index.ts` — `getPaymentProvider()` registry keyed by `PAYMENT_PROVIDER` env (default `simulated`)
  - `orders.ts` — **server-side order state machine**: `createPaymentOrder` (pending) → `fulfillOrder`/`failOrder`/`cancelOrder`. Fulfillment grants purchases + clears cart + sends emails (mock-first; Supabase writes in real mode). Idempotent — only `pending → X` transitions, so duplicate callbacks are safe no-ops
- **`src/routes/api/payments/webhook.ts`** — provider-agnostic IPN: verify → fulfill/fail/cancel → 200. Handles success, failure, cancellation, verification, and duplicate callbacks
- **`cart.ts`** — `checkoutCart` creates a server-side pending order then calls the provider (simulated → `{ simulated, orderId, amount }`; piprapay → `{ url }` redirect). `completeMockCheckout` fulfills via the order service (simulated only)
- **`books-reader.ts`** — single-book purchases route through the provider (paid + simulated → inline; paid + piprapay → redirect)
- **Env** — `PAYMENT_PROVIDER`, `PIPRAPAY_*` documented in `.env.example`

**What to configure when PipraPay is deployed on hosting (cPanel/VPS):**

1. Deploy the PipraPay server (AGPL, PHP/MySQL — hosted on managed hosting, P5) and note its public base URL
2. Create a merchant in the PipraPay admin panel → copy Merchant ID + API key
3. Set the webhook/secret pair in the PipraPay admin (must match the app's `PIPRAPAY_WEBHOOK_SECRET`) and point its callback URL to `<SITE_URL>/api/payments/webhook`
4. Set in `.env` on the frontend host: `PAYMENT_PROVIDER=piprapay`, `PIPRAPAY_BASE_URL`, `PIPRAPAY_MERCHANT_ID`, `PIPRAPAY_API_KEY`, `PIPRAPAY_API_SECRET`, `PIPRAPAY_WEBHOOK_SECRET` (and overrides if the deployed PipraPay uses non-default API paths)
5. Redeploy the frontend — no code changes. The checkout now redirects to PipraPay; the IPN webhook grants purchases server-side

**Date:** 2026-08-08

### AD-027: Strapi-Primary Book Catalog with Supabase Commerce Mirror — **SUPERSEDED 2026-08-14 (AD-029)**

> **Superseded by AD-029:** with content unified in Supabase, books live directly in the Supabase `books` table (edited via the Refine admin) — no mirror is needed. The `scripts/sync-strapi-books.mjs` tool is historical/dead in the target architecture. Kept for historical reference.

**Decision:** Strapi is the editorial source of truth for books (title/cover/description/category/featured). A one-way, idempotent sync mirrors only the commerce-critical fields (price, is_free, slug, cover path, pdf reference) into the existing Supabase `books` table. The frontend reads books from Supabase for grids/cart/checkout/library (fast, RLS-guarded); posts/pages/videos/nav/settings read from Strapi directly.

**Rationale:** Keeps the admin experience in Strapi (editors manage books in the CMS), avoids rewriting the 36 existing routes, and keeps commerce queries on Supabase where ownership/purchases already live. Avoids both dual-write conflicts and per-request CMS lookups in the checkout hot path.

**Tooling:** `scripts/sync-strapi-books.mjs` — the one-way mirror (upsert on `slug`, merge-duplicates, optional archiving of Strapi-absent books, `--dry-run`/`--from-json`/`--self-test` modes, 17 unit tests). Run it after entering books in Strapi (P1) and whenever Strapi book data changes. Only `MIRRORED_COLUMNS` are written; `id`/`pages`/`isbn`/timestamps are preserved. See CHANGELOG 2026-08-08.

**Date:** 2026-08-08

---

### AD-028: Single-VPS Production Architecture (no Vercel / Docker / GitHub) — **SUPERSEDED 2026-08-14 (AD-029)**

> **Superseded by AD-029:** production runs on **Hostinger Managed Node.js** instead — no VPS, no Docker, no Nginx, no PM2/systemd administration, no server-installed PostgreSQL. Kept for historical reference.

**Decision (2026-08-14):** Production runs on **one VPS, natively installed** — Hostinger KVM 2 (or Hetzner CX22), Ubuntu 24.04, with Node 22, PostgreSQL 16, Nginx, Certbot, and PHP-FPM/MySQL (PipraPay) installed via apt/systemd — **no Vercel, no Docker, no GitHub**. Cloudflare (free) in front for DNS/TLS/CDN; Supabase + Resend remain free cloud services.

**What runs where (P0 foundation):**
- Frontend SSR (TanStack Start, Nitro `node-server` preset) → PM2, port 3001 → `sabbesatta.com`
- Strapi v5 → systemd, port 1337 → `cms.sabbesatta.com` (admin + API)
- PostgreSQL 16 (Strapi DB) → apt, nightly `pg_dump` + weekly snapshot
- PipraPay (stopgap) → PHP-FPM + MySQL, isolated vhost → `pay.sabbesatta.com` (P4)

**Rationale:** Vercel/Docker/GitHub were development conveniences; production favors the lowest recurring cost (~$7–15/mo), one login/bill, minimal moving parts, and admin-driven maintenance (content flows through Strapi admin — code never deploys for routine management). Regular shared hosting was ruled out (verified: no PostgreSQL, no reliable Strapi runtime).

**Cutover code changes (deferred to P0/P7, one-liners):** Nitro preset `"vercel"` → `"node-server"` in `vite.config.ts`; `deploy.sh` (git pull → build → `pm2 reload`); production `.env` on the box (`VITE_DATA_SOURCE=supabase` at build). No frontend/UX changes.

**Scale path (no rewrite):** resize VPS → split Strapi or PipraPay onto a second VPS → managed PostgreSQL → S3-compatible media → Cloudflare Workers as traffic grows.

**Date:** 2026-08-14

---

### AD-029: Hostinger Managed Node.js + Supabase Unified Backend + Refine/shadcn Admin

**Decision (2026-08-14):** Replace the single-VPS + Strapi architecture (AD-023/AD-027/AD-028) with:
- **Hostinger Managed Node.js / Web Apps Hosting** — the managed platform runs the TanStack Start SSR app (Node runtime, deployment, SSL, CDN, security/WAF, DDoS protection, backups). **No VPS, no Docker, no manual Nginx, no PM2/systemd, no server-installed PostgreSQL.** Cloudflare is **optional** (introduce only if a specific requirement is demonstrated).
- **Supabase = unified backend** — Auth, PostgreSQL (ALL data: content + application), Storage, RLS. Content tables (posts, pages, books, chapters, authors, videos, categories, tags, navigation, site settings, book-grid settings) live beside application tables (cart, orders, order items, purchases, progress, bookmarks, ratings, comments, notes/highlights, notifications, coupons, audit). Paid PDFs stay access-controlled via private buckets + signed URLs.
- **Admin = Refine Core + shadcn/ui inside the TanStack app** — CRUD/data-handling patterns + component system; not a separate backend service. Refine provides the dataProvider → Supabase connection; the admin lives at `/admin`.
- **Strapi is superseded** — historical, pending migration and removal (P3). Strapi code stays in the repo until the replacement admin/content system is implemented and validated (P2).
- **Payments unchanged** — provider-agnostic interface (AD-026): simulated → PipraPay stopgap → direct bKash/Nagad (P8). Not coupled to PipraPay.
- **Email unchanged** — Resend.

**Roadmap:** P0 architecture validation → P1 Supabase content model → P2 custom admin → P3 content migration → P4 application data → P5 payments → P6 storage → P7 hardening → P8 future payment upgrade (see §18).

**Date:** 2026-08-14

---

## 22. Coding Notes

Naming: PascalCase (components), camelCase (hooks/functions), snake_case (DB columns)
Imports: Prefer @/ path aliases over relative imports
Query Keys: ["resource", ...identifiers, ...filters]
Component Pattern: Thin handler, no business logic, delegate to services

---

## 23. External Services

| Service | Status |
|---------|--------|
| Supabase (Auth, PostgreSQL, Storage — **unified backend**) | Connected |
| Google OAuth | Configured |
| Hostinger Managed Node.js | **Target (P0)** — managed hosting (no VPS; AD-029) |
| Refine Core + shadcn/ui (admin) | **Target (P2)** — not installed yet |
| Strapi v5 | **Historical/superseded** — pending migration to Supabase + removal (P3); code kept for now (AD-029) |
| Google Analytics | Configurable |
| Payment provider | Provider-agnostic interface (simulated → PipraPay stopgap → bKash/Nagad). Stripe code exists but is **not viable for Bangladesh** — removal scheduled (P7) |
| Email service (Resend) | Connected (contact form notifications) |
| Search engine (Meilisearch) | Planned (V2 Sprint 2) |
| Podcast hosting (Castopod) | Planned (V2 Sprint 5) |

---

## 24. Release Checklist

- TypeScript typecheck passes (zero errors)
- All migrations applied
- RLS policies verified
- Auth flow tested
- Admin panel accessible
- Public pages render
- Bilingual toggle works
- Storage CORS configured
- .env.example documented
- CHANGELOG.md updated

---

## 25. Current Project Status

| Metric | Value |
|--------|-------|
| Architecture | ✅ **Supabase unified backend** (content + application) + TanStack Start + Refine/shadcn admin (target) + Hostinger Managed Node.js (AD-029) |
| Documentation | ✅ PROJECT.md (§28 blueprint), AGENTS.md, CHANGELOG.md |
| Admin (target) | **Refine Core + shadcn/ui inside the TanStack app — P2 (not installed, not complete)** |
| Strapi | **Historical/superseded (AD-029)** — runs locally in dev only; pending migration to Supabase + removal (P3) |
| Hosting (target) | **Hostinger Managed Node.js — P0** (no VPS/Docker/Nginx/PM2/systemd; AD-029) |
| Database migrations | Supabase migrations (unified schema = P1 design work; legacy `manual-setup.sql` covers the current app tables) |
| Frontend typecheck | ✅ 0 TypeScript errors |
| Migration script | ✅ `scripts/migrate-to-strapi.mjs` (legacy, kept for reference) — superseded: content migrates into the unified Supabase schema (P1/P3) |
| JWT middleware | 🗑 Removed 2026-08-08 — `supabase-auth.js` deleted; user data lives only in Supabase (AD-026/027) |
| Blog hub page | ✅ `/blog` route with categories, post grid, pagination |
| Dark mode | ✅ `useTheme` hook, localStorage cache, system detection, FOWT prevention |
| Profile form validation | ✅ React Hook Form + Zod with field-level errors |
| Header auth UX | ✅ Avatar dropdown, consistent sign in/out, mobile cart badge |
| Settings page | ✅ Dedicated `/settings` with preferences + password change |
| TypeScript errors | 0 |
| `as any` casts | ~130 remaining (down from 270 — 140 removed) |
| Supabase types | ✅ Regenerated — 49 tables, 9 enums, 8 RPC functions |
| Test count | 442 (all passing) ✅ |
| Current phase | **Mock Platform Transformation M0–M6 complete — full offline demo; production hookup per the P0–P8 roadmap (AD-029)** |
| Data layer | **Mock-first** — posts, books, videos, navigation, taxonomy, trending, site settings, pages + auth, profiles, cart, orders, purchases, comments, newsletter, progress, ratings, bookmarks, notifications, contact, CMS overrides, site-settings overrides |
| Strapi transition | Historical — Phases 1, 2, 4 ✅ (Strapi era); Strapi superseded 2026-08-14 (AD-029), pending migration + removal (P2/P3) |
| Supabase connection | **Deferred to production** — frontend uses mock data; unified Supabase backend wired per P1/P3–P4 |
| Next milestone | **P0 — Architecture validation** (Hostinger Managed Node.js + Refine + shadcn + Supabase + PipraPay) — see `README.md` + `PROJECT.md §18` |

### Latest Session Features (2026-07-22)

| Feature | Status | Details |
|---------|--------|---------|
| Header restructure v3 — 4 columns | ✅ | `[LOGO] — [NAV flex-1] — [♡ 🎁] — [🌙 🌐 │ 👤]` distributed layout, `max-w-7xl` constrained |
| Nav takes maximum space | ✅ | `flex-1 justify-center` — nav links centered in remaining header width |
| Bottom border always visible | ✅ | `border-border/20` at top, `border-border/60` on scroll |
| LangToggle reverted to sliding pill | ✅ | Returned to original black-and-white sliding indicator from two-divider version |
| WishlistBadge — grow only | ✅ | Removed rotation, just `hover:scale-110` subtle grow |
| MobileNav polish | ✅ | Frosted glass, CSS grid expand/collapse, hover effects, larger buttons |
| CartDrawer interior | ✅ | skeleton-shimmer loading, price badges, coupon divider, custom scrollbar |
| Dark mode hover labels | ✅ | `text-muted-foreground/50` → `text-foreground/60` |

---

## 26. Appendix A — V2 Design Specifications

### Sprint 1 — Email Automation (Purchase Confirmations)

**User Flow:**
1. User completes Stripe checkout for a book
2. Webhook fires → purchase recorded
3. Server function sends confirmation email via Resend
4. Email contains: book title, receipt amount, link to reader, library link

**Component Architecture:**
- `src/lib/purchase-emails.ts` — Server function `sendPurchaseConfirmation(userId, purchaseId)`
  - Fetch user profile (email, name) + book details
  - Call Resend API with HTML template
  - Graceful fallback if RESEND_API_KEY not configured
- `src/emails/purchase-confirmation.tsx` — React Email template (or inline HTML)

**Data Model:** No new tables. Uses existing: `purchases`, `books`, `profiles`

**API Contract:**
```ts
async function sendPurchaseConfirmation(params: {
  userId: string;
  purchaseId: string;
}): Promise<{ sent: boolean; reason?: string }>
```

**Implementation Tasks:**
1. Create `src/lib/purchase-emails.ts` with sendPurchaseConfirmation
2. Integrate into `src/routes/api/stripe-webhook.ts` after successful purchase insert
3. Test with Resend dev mode (onboarding@resend.dev)

---

### Sprint 1 — Test Coverage Expansion

**Target Modules to Cover:**

| Module | Existing Tests | Target | Key Functions to Test |
|--------|---------------|--------|----------------------|
| reader (books-reader.ts) | 0 | 20 | getReaderBookmarks, addReaderBookmark, getReaderNotes, addReaderNote, deleteReaderNote |
| cart (cart.ts) | 0 | 15 | addToCart, removeFromCart, clearCart, getCart, checkoutCart |
| courses (courses.ts) | 0 | 20 | fetchPublishedCourses, enrollInCourse, getEnrollmentStatus, toggleLessonProgress |
| search (search.ts) | 0 | 10 | searchContent (all 5 content types, empty, edge cases) |
| newsletter (newsletter.ts) | 0 | 5 | subscribeToNewsletter (valid, duplicate, invalid email) |
| books-reader server fns | 0 | 10 | getPdfReaderUrl, checkBookOwnership, purchaseBookAction |

**Testing Pattern:** Follow existing `makeChainable()` pattern from `books.test.ts` for Supabase mocking.

---

### Sprint 2 — Meilisearch Search

**Architecture:**
```
Supabase DB
  |
  +-- Database Webhook (on insert/update/delete)
  |     or
  +-- Supabase Edge Function (polling or realtime)
  |
  +-- Meilisearch Index
        |
        +-- Public /search route calls Meilisearch client directly
```

**Indexed Content Types:**
- Posts (id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, created_at, status)
- Pages (id, slug, title_en, title_bn, body_en_preview, body_bn_preview, banner_url, created_at, visible)
- Books (id, slug, title_en, title_bn, description_en, description_bn, cover_image, author_name, created_at, status)
- Videos (id, slug, title, description, thumbnail_url, created_at)
- Courses (id, slug, title_en, title_bn, description_en, description_bn, cover_image, created_at, published)

**Sync Strategy:**
1. One-time script: `scripts/seed-meilisearch.mjs` — reads all content from Supabase, indexes
2. Real-time sync: Supabase Database Webhook → Edge Function → Meilisearch API
3. Fallback: Keep existing `searchContent` for admin/internal search

**Search UI Updates:**
- `/search` route gets typeahead dropdown on search bar (debounced 300ms)
- Result cards get search term highlighting (Meilisearch `matchesPosition` or `formatted`)
- Filter chips remain (All, Posts, Pages, Books, Videos, Courses)
- Empty state, loading skeleton, error handling preserved

**Implementation Tasks:**
1. Docker Compose config for Meilisearch (`docker-compose.yml`)
2. `src/integrations/meilisearch/client.ts` — Meilisearch client singleton
3. `src/integrations/meilisearch/sync.ts` — Index management functions
4. `scripts/initial-index.mjs` — One-time index population
5. Meilisearch Edge Function for real-time sync
6. Update `src/lib/search.ts` to use Meilisearch for public queries
7. Update `src/routes/search.tsx` with typeahead + highlighting

---

### Sprint 2 — Reading Time Estimation

**Implementation:** Add a utility function and display on post cards/articles.

**Utility:**
```ts
function estimateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
```

**Display:**
- On post cards in grid: show "X min read" badge
- On article page: show "X min read" in metadata header alongside date

**Files to modify:**
- `src/lib/utils.ts` — Add `estimateReadingTime()`
- `src/components/PostCard.tsx` or equivalent — Add reading time display
- Post detail route — Add reading time to article header

---

### Sprint 3 — Reader Annotations (Highlights + Notes UI)

**Prerequisite:** `reader_highlights` table already exists (empty, migration applied). `reader_notes` has server functions but no highlight UI.

**Highlights — User Flow:**
1. User selects text in PDF.js viewer with mouse
2. Context menu appears: "Highlight" + color picker (yellow/green/blue/pink)
3. Selection is saved to `reader_highlights` table with page_number, selection_text, color, position_data
4. Highlighted text is rendered as colored overlay on the PDF canvas
5. Highlights tab in side panel shows all highlights for the book, grouped by page

**Notes — UI Polish:**
- Existing: Text input + submit in side panel
- Upgrade: Add color picker per note, edit capability, pin-to-highlight relationship

**Component Architecture:**
- `src/components/reader/HighlightLayer.tsx` — Canvas overlay for highlights
- `src/components/reader/HighlightPicker.tsx` — Color picker + context menu
- `src/components/reader/AnnotationsPanel.tsx` — Unified side panel tab (combines notes + highlights)

**Data Model (already migrated):**
```sql
-- reader_highlights table:
CREATE TABLE public.reader_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#fef08a',
  selection_text TEXT NOT NULL,
  position_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Server Functions to Add (in `books-reader.ts` or new `reader-highlights.ts`):**
```ts
getReaderHighlights(bookId, userId): ReaderHighlight[]
addReaderHighlight(bookId, pageNumber, color, selectionText, positionData): ReaderHighlight
removeReaderHighlight(id): void
```

**Implementation Tasks:**
1. Create highlight server functions
2. Build HighlightLayer component (PDF.js text layer extraction + canvas overlay)
3. Build HighlightPicker component
4. Update reader side panel with AnnotationsPanel combining notes + highlights
5. Wire context menu in PdfViewer

---

### Sprint 3 — Reading Statistics & Streaks

**User Flow:**
1. Profile page shows reading stats: total pages read, total books completed, current streak, all-time streak
2. Streak = consecutive days with reading activity (at least 1 page)
3. Stats computed from `reading_progress` table

**Server Functions:**
```ts
getReadingStats(userId): {
  totalPagesRead: number;
  totalBooksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  readingDays: { date: string; pages: number }[]; // for charts
}
```

**Data:** Uses existing `reading_progress` table. Streak computed by querying distinct dates where progress was updated.

**Profile Page Update:** Add stats cards section between profile header and activity.

---

### Sprint 3 — Book Recommendations

**Strategy:** Simple rule-based recommendations (no ML):
1. Same category as user's last read/purchased book
2. By same author as user's most-read author
3. Featured books in categories user hasn't explored

**Server Function:**
```ts
getBookRecommendations(userId, limit = 6): Book[]
```

**Display:** "Recommended for You" section on books listing page, below the main grid.

---

### Sprint 4 — Coupon/Discount Codes

**Architecture Decision:** AD-014 (Stripe native Coupons API)

**Data Model — New Table:**
```sql
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_coupon_id TEXT, -- Stripe Coupon ID (nullable until synced)
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10, 2) NOT NULL, -- percentage (10 = 10%) or fixed amount ($5.00)
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Coupon Application Flow:**
1. Admin creates coupon in admin panel (stores locally + optionally in Stripe)
2. On cart checkout, user enters coupon code
3. Server validates: exists, active, not expired, not maxed out
4. If valid, update Stripe Checkout Session with `discounts` array
5. On successful purchase, increment `current_redemptions`

**Admin Panel:**
- `/admin/coupons` — ResourceListPage with CRUD for coupons
- Fields: Code, Type (percentage/fixed), Value, Max redemptions, Expiry, Active toggle

**Cart UI Update:**
- Add coupon code input field in cart page
- Show discount line item in cart summary
- Apply/remove button with validation feedback

**Implementation Tasks:**
1. Create Supabase migration for `coupons` table
2. Create `src/lib/coupons.ts` — Server functions (validate, apply, sync with Stripe)
3. Create `src/routes/admin.coupons.tsx` — Admin CRUD page
4. Update `src/routes/cart.tsx` — Add coupon input + discount display
5. Update `src/lib/stripe-checkout.ts` — Pass discount to Stripe Checkout Session

---

### Sprint 4 — Donations Page

**User Flow:**
1. User visits `/donate` page
2. Sees preset amounts ($5, $10, $25, $50, custom)
3. Clicks amount → redirected to Stripe Payment Link or custom Checkout Session
4. After payment, thank-you message displayed

**Implementation (Minimal):**
- Static `/donate` route with preset amount buttons
- Each button creates a Stripe Checkout Session with mode="payment", no product (direct donation)
- Or: Embed Stripe Payment Link directly as redirect

**Tracker:** Track donation conversions via Google Analytics event on checkout redirect.

---

### Sprint 4 — Purchase History Page

**User Flow:**
1. User visits `/profile` → sees "My Purchases" section
2. Lists all books purchased, with: cover, title, purchase date, amount paid
3. Links to reader for each book
4. Empty state: "You haven't purchased any books yet. Browse the library."

**Implementation:**
- Extends existing profile page (`src/routes/profile.tsx`)
- Server function `getUserPurchaseHistory(userId)` joins purchases + books
- Reuses existing `LibraryBookCard` component

---

### Sprint 5 — Podcasts Module (Castopod Integration)

**Architecture Decision:** AD-016 (Castopod)

**Integration Strategy:**
1. Deploy Castopod on a subdomain (e.g., `podcast.bodhimitra.test`) or `/podcasts` path
2. Main site links to Castopod for full podcast experience
3. Embed Castopod player widget on relevant pages (episode pages, blog posts)
4. Cross-link between site and Castopod

**Sitemap Update:** Add podcast episodes to sitemap if Castopod exposes RSS.

**Nav Link:** Add "Podcasts" to public navigation if Castopod URL is configured.

**Castopod Admin:** Managed separately via Castopod's own admin panel (not through Sabbe Satta admin).

---

### Sprint 5 — Course Completion Certificates

**User Flow:**
1. User completes all lessons in a course (all lesson_progress entries = completed)
2. A "Download Certificate" button appears on the course page
3. Certificate is a dynamically generated PDF/image with:
   - User's name, course title, completion date
   - Bodhi Mitra branding
4. Certificate data is stored in `enrollments.completed_at`

**Implementation Options:**
1. **Server-side PDF (Recommended):** Use a library like `pdf-lib` or `jsPDF` on the server to generate a certificate PDF
2. **HTML→PDF:** Render HTML template server-side, convert via Puppeteer/Playwright
3. **Canvas-based:** Generate certificate as an image on the client using HTML Canvas

**Recommendation:** Server-side PDF generation via `pdf-lib` (lightweight, no headless browser needed).

**Data:** No new table. `enrollments` already has `completed_at` column.

**Server Function:**
```ts
generateCertificate(courseId, userId): { pdfUrl: string; completedAt: string }
```

---

### Sprint 5 — Newsletter Automation (Welcome Series)

**User Flow:**
1. User subscribes via footer or article sidebar
2. Welcome email sent automatically via Resend
3. Optionally: sequence of 3 emails (Welcome, Featured Books, Community)

**Implementation:**
1. Create `src/lib/newsletter-emails.ts` — Server functions for welcome/sequence emails
2. Integrate with existing `subscribeToNewsletter` — send welcome on subscription
3. Use Resend's `contact` API to manage audience if needed, or keep simple server function

**Email Templates:**
```html
<!-- Welcome email -->
<h1>Welcome to Bodhi Mitra</h1>
<p>Dear {{name}},</p>
<p>Thank you for subscribing to the Bodhi Mitra newsletter...</p>
<hr/>
<a href="{{siteUrl}}/books">Browse Books</a>
```

---

### Sprint 6 — Bundle Optimization

**Current Large Chunks:**
| Chunk | Size | Issue |
|-------|------|-------|
| echarts.js | 2,264 kB | Largest single dependency |
| admin.index.js | 1,154 kB | Admin dashboard page |
| index.js (main) | 855 kB | Main app bundle |
| pdfjs-dist | 1,255 kB (worker) + 846 kB (main) | PDF.js library |

**Actions:**
1. **Code-split ECharts** — Dynamic import in analytics widgets (only loaded on admin dashboard)
2. **Code-split PDF.js** — Already lazy-loaded? Verify `PdfViewer` lazy import pattern
3. **Manual Vite chunks** — Configure `build.rollupOptions.output.manualChunks` to separate vendor chunks
4. **Remove unused exports** — Tree-shake lucide-react (replace with direct imports)
5. **Analyze bundle** — Use `vite build --mode development --analyze` or rollup-plugin-visualizer

**Configuration:** Update `vite.config.ts` with chunk splitting rules.

---

### Sprint 6 — Lighthouse Audit

**Target:** >90 on all categories (Performance, Accessibility, Best Practices, SEO)

**Common Fixes to Apply:**
- Add `loading="lazy"` to all below-fold images
- Ensure proper `alt` attributes (already done in V1 freeze)
- Add `rel="preconnect"` for Supabase + external CDN origins
- Inline critical CSS (via Vite plugin if available)
- Add `font-display: swap` for all custom fonts
- Ensure color contrast ratios meet WCAG AA (4.5:1 for text)
- Add proper `aria-label` to interactive elements

---

### Sprint 6 — Accessibility Audit

**Checklist:**
- [ ] All form elements have associated labels
- [ ] All images have meaningful `alt` text
- [ ] Color contrast meets WCAG AA (checked on light, dark, and sepia themes)
- [ ] Keyboard navigation works (Tab, Enter, Escape) across all interactive elements
- [ ] Focus indicators visible (not removed via `outline: none`)
- [ ] Screen reader announcements for dynamic content (aria-live regions)
- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Link text is descriptive (not "click here")
- [ ] Modal/dialog focus trapping
- [ ] Touch targets at least 44x44px on mobile

**Tools:**
- axe DevTools for automated audit
- VoiceOver (macOS) / NVDA (Windows) for screen reader testing
- Chrome DevTools Rendering tab for color contrast checking

---

*Last updated: 2026-07-22*

---

## 27. Appendix B — Version 3 Roadmap

### V3 Vision

Transform Sabbe Satta from a **publishing platform** into an **intelligent learning ecosystem**. Every piece of content becomes queryable, discoverable, and personalized. Readers become an active community. The platform meets users everywhere — web, mobile, offline.

### Strategic Themes

| Theme | Description | Sprint |
|-------|-------------|--------|
| **AI Foundation** | RAG-powered chat assistant, semantic recommendations, AI-guided reading | 1 |
| **Community & Engagement** | Discussion forums, Q&A, reading groups, achievements | 2 |
| **Mobile + Analytics** | React Native (Expo) app, offline reading, push notifications, Umami analytics | 3 |

### V3 Architecture Decisions

#### AD-017: Vercel AI SDK for LLM Integration

**Decision:** Use the Vercel AI SDK as the unified interface for all LLM interactions.

**Rationale:** Provides provider-agnostic abstractions (`useChat`, `streamText`, `embed`). Swap between OpenAI, Anthropic, or local Ollama models by changing a single import. Built-in streaming support for React. Already compatible with React 19 and TanStack Start.

**Provider Strategy (Hybrid):**
- **Sprint 1**: OpenAI GPT-4o-mini + `text-embedding-3-small` — fastest to production, highest quality
- **Post-V3**: Add Ollama (Llama 3) fallback for privacy-sensitive content — zero API cost, 100% private
- **Swapping**: Single import change via Vercel AI SDK provider abstraction

**Date:** 2026-07-12

#### AD-018: pgvector for Vector Storage

**Decision:** Use Supabase pgvector extension for all embedding storage and similarity search.

**Rationale:** pgvector is already available in Supabase PostgreSQL. No new infrastructure, no additional services. RLS policies apply directly to vector queries — content access control is automatic. Cosine similarity search via `match_content_sections` RPC function.

**Schema:**
```sql
CREATE TABLE public.content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'book' | 'post' | 'course' | 'video' | 'podcast'
  content_id UUID NOT NULL,
  section_index INTEGER NOT NULL,
  heading TEXT DEFAULT '',
  body_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_sections_embedding
  ON public.content_sections
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Date:** 2026-07-12

#### AD-019: Custom Supabase Community (Not Discourse/Circle)

**Decision:** Build discussion forums, Q&A, and reading groups as a custom module on Supabase rather than embedding Discourse or using Circle.

**Rationale:** Tight auth integration (no SSO bridge, no session management issues). Unified UI using existing shadcn design system. Supabase Realtime provides live thread updates without additional infrastructure. RLS enforces access control via existing roles and permissions. Zero additional hosting costs.

**Trade-off accepted:** Custom build requires more development effort upfront than embedding Discourse, but eliminates ongoing maintenance of a second platform with separate hosting, auth, and theming.

**Data Model:**
```sql
-- Discussion forums
CREATE TABLE public.discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.discussion_threads(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reading groups
CREATE TABLE public.reading_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 20,
  start_date DATE,
  schedule TEXT, -- 'weekly' | 'biweekly' | 'monthly'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.reading_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'creator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Q&A
CREATE TABLE public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'first_book', 'ten_books', 'reading_streak_7', 'reading_streak_30',
    'first_comment', 'first_discussion', 'helpful_answer', 'course_complete'
  )),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);
```

**Date:** 2026-07-12

#### AD-020: React Native (Expo) for Mobile

**Decision:** Build native mobile apps using React Native with Expo rather than PWA or Tauri.

**Rationale:** Expo provides native file system APIs (`expo-file-system`) for reliable offline PDF storage — critical for the book reader use case. Push notifications are native-grade reliable (unreliable on iOS PWA). 70-80% code reuse via monorepo shared packages (types, Zod schemas, TanStack Query hooks, Supabase client). TanStack Query and Supabase have first-class React Native support.

**Monorepo Structure:**
```
bodhi-mitra/
  apps/
    web/           -- Existing TanStack Start app
    mobile/        -- New Expo app
  packages/
    shared/        -- Types, Zod schemas, hooks, API clients
    ui/            -- Shared design system components
```

**Code Sharing Strategy:**
| Layer | What's Shared | How |
|-------|---------------|-----|
| Types | Zod schemas, TS interfaces | Direct import from `@bodhi-mitra/shared` |
| API | TanStack Query hooks, Supabase client | Factory functions in shared package |
| Business logic | Server functions → REST routes | Web uses server functions, mobile uses REST |
| UI | Design tokens, colors, icons | CSS variables → Expo theme provider |

**Date:** 2026-07-12

#### AD-021: Umami Self-Hosted Analytics

**Decision:** Deploy Umami (self-hosted via Docker) for privacy-first web analytics alongside existing Google Analytics.

**Rationale:** Umami is lightweight (single Docker container, minimal resource usage), MIT licensed, and provides essential metrics (pageviews, referrers, countries) without cookie banners or GDPR concerns. Keeps Google Analytics for advanced features (conversion tracking, audience insights).

**Product Analytics:** Evaluate PostHog Cloud free tier if user-journey analysis becomes critical, but start with Umami for simplicity.

**Date:** 2026-07-12

#### AD-022: Edge Functions for AI Core

**Decision:** Run all AI-related server logic (content chunking, embedding, RAG queries) in Supabase Edge Functions (Deno) rather than Vercel serverless functions.

**Rationale:** Edge Functions co-locate with Supabase PostgreSQL — minimizing latency for vector queries. Deno runtime supports streaming responses for chat. No overhead of fetching data from Vercel → Supabase → LLM → back. Edge Functions are included in Supabase pricing.

**Exception:** The chat stream to the client can be proxied through Vercel if needed for caching/auth middleware, but the core AI logic (embedding, vector search, prompt assembly) runs in Edge Functions.

**Date:** 2026-07-12

---

### V3 Sprint Roadmap

#### Sprint 1 — AI Foundation (8 weeks) 🥇

**Theme:** Make every piece of content queryable, discoverable, and personalized.

| Task | Effort | Dependencies |
|------|--------|-------------|
| 1.1 Enable pgvector + create `content_sections` migration | 1 day | None |
| 1.2 Build content chunking Edge Function (chunk + embed on content changes) | 3 days | 1.1 |
| 1.3 Build chat-assistant Edge Function (search + RAG + LLM streaming) | 1 week | 1.2 |
| 1.4 Create `src/lib/ai/chat.ts` — Chat server functions | 2 days | 1.3 |
| 1.5 Create `src/lib/ai/recommendations.ts` — Recommendation server functions | 2 days | 1.2 |
| 1.6 Build `AiChatPanel` component — Floating chat UI with streaming | 1 week | 1.4 |
| 1.7 Build `BookRecommendations` component — Recommendation carousel | 3 days | 1.5 |
| 1.8 Add "Ask Bodhi" FAB to public layout | 1 day | 1.6 |
| 1.9 Seed initial embeddings via one-time script | 1 day | 1.2 |
| 1.10 Monorepo setup: Turborepo + `packages/shared` extraction | 1 week | None (parallel) |
| 1.11 Test coverage expansion (AI + existing modules) | Ongoing | — |

**User Flows:**
- **Chat**: Floating "Ask Bodhi" button → opens chat panel → user asks question → AI searches all content → answers with citations → "Read more" links to source
- **Recommendations**: Book detail page shows "You might also like" → embedding similarity across categories/author/tags
- **Reading Guide**: While reading, user asks "Summarize this chapter" → AI searches current book content → generates context-aware summary

**Architecture:**
```
Content DB (posts, books, courses, videos)
  |
  +-- Database Webhook (on insert/update/delete)
  |     |
  |     +-- Edge Function: content-embedder
  |           |-- Chunk text (langchain/text-splitter)
  |           |-- Generate embedding (OpenAI / local BGE-m3)
  |           |-- Store in content_sections with VECTOR(1536)
  |
  +-- Edge Function: chat-assistant
  |     |-- Receives user query from client
  |     |-- Vector search: match_content_sections RPC
  |     |-- Assemble prompt: system + top-5 context chunks + user question
  |     |-- Stream response via Vercel AI SDK
  |
  +-- React UI: AiChatPanel
        |-- useChat() from Vercel AI SDK
        |-- Streaming markdown responses
        |-- Citation links back to content
```

---

#### Sprint 2 — Community & Engagement (6 weeks)

**Theme:** Turn passive readers into an active learning community.

| Task | Effort | Dependencies |
|------|--------|-------------|
| 2.1 Create discussion tables migration (threads + posts + RLS) | 1 day | None |
| 2.2 Create Q&A tables migration (questions + answers + voting) | 1 day | None |
| 2.3 Create reading groups migration (groups + members) | 1 day | 2.1 |
| 2.4 Create achievements migration | 1 day | None |
| 2.5 Build `src/lib/discussions.ts` — Server functions | 3 days | 2.1 |
| 2.6 Build `src/lib/qa.ts` — Server functions | 2 days | 2.2 |
| 2.7 Build `src/lib/groups.ts` — Server functions | 2 days | 2.3 |
| 2.8 Build `src/lib/achievements.ts` — Server functions | 1 day | 2.4 |
| 2.9 Build Discussion UI: thread list, post composer, nested replies | 1 week | 2.5 |
| 2.10 Build Q&A UI: question list, voting, accepted answer | 3 days | 2.6 |
| 2.11 Build Reading Groups UI: creation, member management, schedule | 3 days | 2.7 |
| 2.12 Build Achievements UI: profile badges, streak display | 2 days | 2.8 |
| 2.13 Wire into profile, book detail, and course pages | 2 days | 2.9-2.12 |
| 2.14 Build Expo app scaffold + auth integration | 2 weeks | 1.10 (shared packages) |
| 2.15 Test coverage expansion | Ongoing | — |

**User Flows:**
- **Discussions**: Book/course page has "Discussions" tab → threaded conversations with real-time updates → reply to threads → @mention users
- **Q&A**: Each content page has "Ask a Question" → other users answer → upvote/downvote → asker can mark accepted answer
- **Reading Groups**: User creates group for a book → sets schedule (weekly chapters) → members discuss on schedule → progress tracked per member
- **Achievements**: Profile shows badges (First Book Read, 7-Day Streak, Course Complete) → streaks in reading stats

---

#### Sprint 3 — Mobile + Analytics (6 weeks)

**Theme:** Meet users everywhere — mobile reading with offline support.

| Task | Effort | Dependencies |
|------|--------|-------------|
| 3.1 Build offline PDF reader with `expo-file-system` | 3 weeks | 2.14 (Expo scaffold) |
| 3.2 Implement progress sync (online → storage → upload when connected) | 1 week | 3.1 |
| 3.3 Add push notifications (Expo Push API) | 1 week | 2.14 |
| 3.4 Deploy Umami on Docker | 0.5 week | None |
| 3.5 Configure PostHog for product analytics | 0.5 week | None |
| 3.6 Bundle optimization (code-split ECharts/PDF.js) | 1 week | None |
| 3.7 Lighthouse audit + fixes (>95 all categories) | 1 week | 3.6 |
| 3.8 Accessibility audit + fixes | 1 week | None |
| 3.9 Final test coverage push (target 150+) | 1 week | — |
| 3.10 Release documentation + CHANGELOG | 1 day | — |

**User Flows:**
- **Offline Reading**: User downloads book PDF → reads offline on commute → progress syncs when connectivity returns → seamless web/mobile handoff
- **Push Notifications**: New book in favorite category → reply to discussion → achievement earned → reading streak reminder
- **Analytics**: Privacy-first pageviews via Umami dashboard → product analytics via PostHog for feature adoption

---

### V3 Targets

| Metric | V2 Baseline | V3 Target |
|--------|-------------|-----------|
| TypeScript errors | 0 | 0 |
| Tests | 62 | 150+ |
| Lighthouse (all categories) | Unknown | >95 |
| Content types | 6 | 7 (+ discussion) |
| AI features | 0 | 3 (chat, recommendations, reading guide) |
| Community features | Comments only | Full forums + Q&A + reading groups |
| Mobile apps | None | iOS + Android (Expo) |
| Analytics | Google Analytics | GA + Umami + PostHog |
| Test coverage (lib/ modules) | ~15% | >60% |
| User-facing search | Meilisearch | Meilisearch + semantic search |

---

### V3 Development Timeline

```
Week 1-4                                     Week 5-8                                     Week 9-14                                   Week 15-20
┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────┐ ┌──────────────────────────────┐
│ SPRINT 1: AI FOUNDATION                  │ │ SPRINT 1 (cont.) + MONOREPO              │ │ SPRINT 2: COMMUNITY                       │ │ SPRINT 3: MOBILE + ANALYTICS │
│                                          │ │                                          │ │                                          │ │                              │
│ 1.1 pgvector + migration                 │ │ 1.6 AiChatPanel UI                      │ │ 2.1-2.4 Migrations (4)                    │ │ 3.1 Offline PDF reader      │
│ 1.2 Content chunker Edge Function        │ │ 1.7 BookRecommendations UI              │ │ 2.5-2.8 Server functions (4)             │ │ 3.2 Progress sync           │
│ 1.3 Chat-assistant Edge Function         │ │ 1.8 Ask Bodhi FAB                      │ │ 2.9 Discussion UI                        │ │ 3.3 Push notifications      │
│ 1.4 Chat server functions                │ │ 1.9 Seed embeddings                    │ │ 2.10 Q&A UI                              │ │ 3.4 Umami deployment        │
│ 1.5 Recommendations server functions     │ │ 1.10 Monorepo setup                     │ │ 2.11 Reading Groups UI                    │ │ 3.5 PostHog config          │
│                                          │ │ 1.11 Test coverage                     │ │ 2.12 Achievements UI                      │ │ 3.6 Bundle optimization     │
│                                          │ │                                          │ │ 2.13 Wire into existing pages             │ │ 3.7 Lighthouse audit        │
│                                          │ │                                          │ │ 2.14 Expo scaffold + auth                 │ │ 3.8 Accessibility audit     │
│                                          │ │                                          │ │ 2.15 Test coverage                        │ │ 3.9-3.10 Finalize + release │
└──────────────────────────────────────────┘ └──────────────────────────────────────────┘ └──────────────────────────────────────────┘ └──────────────────────────────┘
```

---

### Technology Stack Additions (V3)

| Layer | Technology | Purpose | Sprint |
|-------|-----------|---------|--------|
| **AI/LLM** | Vercel AI SDK + OpenAI | LLM integration with provider abstraction | 1 |
| **Vector DB** | pgvector (Supabase) | Embedding storage + similarity search | 1 |
| **Content Chunking** | langchain/text-splitter | Smart text splitting for RAG | 1 |
| **Streaming** | Server-Sent Events (via Edge Functions) | Real-time chat responses | 1 |
| **Community** | Supabase Realtime | Live discussion updates | 2 |
| **Mobile** | React Native (Expo SDK 50+) | Cross-platform mobile apps | 2-3 |
| **Push** | Expo Push Notifications API | Native push notifications | 3 |
| **Offline** | expo-file-system, expo-sqlite | Offline PDF storage + sync | 3 |
| **Analytics** | Umami (self-hosted) | Privacy-first web analytics | 3 |
| **Product Analytics** | PostHog (Cloud) | User behavior, feature flags | 3 |
| **Monorepo** | Turborepo | Shared packages management | 1 |

---

### V3 External Service Status

| Service | Purpose | Status |
|---------|---------|--------|
| OpenAI API | LLM + embeddings | Planned (Sprint 1) |
| Meilisearch | Full-text search | V2 Sprint 2 (carried forward) |
| Castopod | Podcast hosting | V2 Sprint 5 (carried forward) |
| Umami | Web analytics | Planned (Sprint 3) |
| PostHog | Product analytics | Planned (Sprint 3) |
| Expo | Mobile framework | Planned (Sprint 2-3) |

---

### V3 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OpenAI API costs exceed budget for LLM queries | Medium | Medium | Implement rate limiting, caching, and Ollama fallback for high-volume queries |
| pgvector query performance degrades at scale | Low | Medium | Monitor query times, add IVFFlat indexes, consider partitioning by content type |
| Monorepo migration breaks existing CI/CD | Medium | High | Extract shared packages incrementally, keep existing web app untouched during migration |
| Expo build complexity for PDF rendering | Medium | High | Prototype PDF rendering in Expo early (Sprint 2), have PWA fallback ready |
| Community features require moderation effort | Low | Medium | Implement automated content filtering, user reporting, and admin moderation panel |

---

### V3 Success Criteria

1. **AI Chat Assistant** — Users can ask questions about any content and receive accurate, cited answers
2. **Semantic Recommendations** — Book detail pages show relevant recommendations based on content similarity
3. **Active Community** — At least 5 discussion threads per book, Q&A with answered questions
4. **Mobile App** — iOS and Android apps published with offline reading capability
5. **Performance** — Lighthouse >95, bundle size reduced by 30%+, first contentful paint <1.5s
6. **Quality** — 0 TypeScript errors, 150+ passing tests, accessibility WCAG AA compliance

---

### 2026-07-11 — Version 3 Planning

- **V3 Roadmap defined** — 3 sprints across AI Foundation, Community & Engagement, and Mobile + Analytics.
- **5 new Architecture Decisions**: AD-017 (Vercel AI SDK for LLM), AD-018 (pgvector for vector storage), AD-019 (Custom Supabase community), AD-020 (React Native Expo for mobile), AD-021 (Umami self-hosted analytics), AD-022 (Edge Functions for AI core).
- **Market research completed** across 4 domains: AI/LLM integration (OpenAI vs Claude vs Ollama), Mobile strategy (Expo vs PWA vs Tauri), Community platforms (Custom vs Discourse vs Circle), Analytics (Umami vs Plausible vs PostHog).
- **V3 targets set**: 3 AI features (chat, recommendations, reading guide), Full community features (forums, Q&A, reading groups), iOS + Android mobile apps, >95 Lighthouse, 150+ tests.
- **Hybrid AI strategy**: Start with OpenAI + Vercel AI SDK for speed, design for Ollama swap for privacy. pgvector on existing Supabase infrastructure.
- **Parallel mobile prep**: Monorepo setup (Turborepo + shared packages) starts Sprint 1 alongside AI foundation.

### 2026-07-11 — Version 2 Design


- **Complete V2 Design Specifications** compiled for all 6 sprints (see Appendix A):
  - Sprint 1: Email automation, Test expansion specs
  - Sprint 2: Meilisearch search, Search UI, Reading time
  - Sprint 3: Annotations, Reading stats, Book recommendations
  - Sprint 4: Coupons, Donations, Purchase history
  - Sprint 5: Podcasts, Course certs, Newsletter automation
  - Sprint 6: Bundle optimization, Lighthouse, Accessibility

### 2026-07-11 — Version 2 Planning

- **V2 Roadmap defined** — 6 sprints across Foundation Hardening, Search & Discoverability, Reading Experience, Commerce & Monetization, Content Expansion, and Polish & Performance.
- **4 new Architecture Decisions**: AD-013 (Meilisearch for search), AD-014 (Stripe Native Coupons), AD-015 (Custom PDF Annotations), AD-016 (Castopod for Podcasts).
- **Market research completed**: Evaluated Meilisearch vs Typesense vs pg_search for bilingual full-text search. Evaluated Castopod for podcasts. Evaluated Stripe Coupons vs Voucherify for discounts. Evaluated annotation libraries for PDF.js.
- **Targets set**: Reduce `as any` casts from 246 to <50. Expand test count from 62 to 150+. Achieve Lighthouse score >90.
- See PROJECT.md Section 20 for full sprint breakdown.

### 2026-07-10 — Stripe Payment Integration

- **`npm install stripe`** — Stripe SDK installed for server-side usage.
- **`src/integrations/stripe/server.ts`** — Singleton Stripe client configured with `STRIPE_SECRET_KEY`.
- **`src/integrations/stripe/config.ts`** — URL helpers for success/cancel redirects, webhook secret accessor.
- **`src/lib/stripe-checkout.ts`** — `createCheckoutSession` server function (TanStack Start): creates a Stripe Checkout Session for paid books, returns the redirect URL.
- **`src/routes/api/stripe-webhook.ts`** — Server route handling `checkout.session.completed` webhook events: verifies Stripe signature with `STRIPE_WEBHOOK_SECRET`, inserts purchase via `supabaseAdmin` (service role, bypasses RLS), handles idempotency (unique constraint violation).
- **`src/lib/books-reader.ts`** — `purchaseBookAction` updated: paid books now create a Checkout Session (dynamic import), free books remain direct purchase.
- **`src/routes/books.$slug.tsx`** — Purchase mutation passes `bookSlug`, checks `result.url` for Stripe redirect, handles `?purchase=success` / `?purchase=cancel` query params on return from Stripe.
- **`src/routes/books.tsx`** — Purchase dialog passes `bookSlug`, redirects to Stripe URL on confirm.
- **`.env` / `.env.example`** — Added `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`.
- Updated all PROJECT.md status sections to reflect Stripe integration.

### 2026-07-10 Update

- Created `useCrudManager` hook in `src/hooks/useCrudManager.ts` — encapsulates list state (query, pagination, filter, search), form modal state (open/close, edit/create), delete confirmation state, and standardized create/update/delete mutations with auto-query-invalidation and toast notifications.
- Created `FormDialog` component in `src/components/admin/form-dialog.tsx` — reusable modal wrapper for React Hook Form with configurable size, FormActions footer, and backdrop click-to-close.
- Created `ConfirmDelete` component in `src/components/admin/confirm-delete.tsx` — reusable AlertDialog wrapper for delete confirmation with standardized messaging and loading state.
- Updated PROJECT.md: marked Generic CRUD and Generic Form TODOs complete, updated status from 42% to 45%, updated blockers list.
- Built Permission framework: `src/lib/permissions.ts` (`requireMinRole`, `requirePermission` middleware factories), `src/hooks/usePermission.ts` (consolidated `usePermission()` hook), `src/components/admin/permission-guard.tsx` (`<Can>`, `<RequireRole>` components). Refactored 5 server functions in `admin.functions.ts` to use `requireMinRole` instead of inline RBAC checks. Refactored `admin.tsx` beforeLoad to use `checkAdminAccess` server function.
- Built Error framework: `src/lib/errors.ts` (`AppError` class with code, statusCode, category, userMessage), `src/lib/error-reporting.ts` (`captureError`, `reportError` service), `src/components/error-page.tsx` (reusable `ErrorPage`, `NotFoundPage` components), `src/components/error-boundary.tsx` (React `ErrorBoundary` class component). Refactored `__root.tsx`, `admin.tsx`, `posts.$slug.tsx` errorComponents to use new components. Added errorComponent to all 13 admin child routes.
- Built Notification framework: `src/lib/notifications.ts` (`notify` utility with success/error/info/warning/promise, `useSubscription` realtime hook, `useAdminNotifications` for comment alerts), `src/components/notification-bell.tsx` (replaces static bell in admin layout with live notification dropdown).
- Created `.env.example` documenting all 6 environment variables.
- Updated PROJECT.md: marked all Platform Foundation TODOs complete (CRUD, Forms, Permission, Error, Notification, .env.example); updated overall status from 45% to 52%.
- Built User Library page: `src/routes/books.library.tsx` at `/books/library`, `getMyLibrary` server function in `books-purchases.ts`, `LibraryBookCard` component with progress tracking, nav links in header and mobile nav for signed-in users.
- Built Unified Search: `src/lib/search.ts` (`searchContent` server function queries posts/pages/books/videos), `src/routes/search.tsx` (`/search` route with type filter tabs, pagination, loading/empty states), search icon link in public header.
- Built Sitemap & robots.txt: `public/robots.txt` static file, `src/routes/sitemap.xml.tsx` dynamic route, `src/lib/sitemap.ts` server function generating XML from all published content.
- Built Newsletter subscription: `src/lib/newsletter.ts` server function, `src/components/NewsletterSignup.tsx` form component, wired into post article sidebar and footer.
- Built Bookmarking system: `src/lib/bookmarks.ts` (3 server functions), `src/components/BookmarkButton.tsx` (toggle on post pages), `src/routes/bookmarks.tsx` (auth-gated bookmarks page), nav links in header/mobile nav.
- Built Typography controls: `src/components/TypographyControls.tsx` (font-size + line-height toggles, persisted to localStorage), `useTypography` hook, wired into post article pages.
- Built Analytics dashboard widget: extended `getDashboardStats` with posts-per-month trend, top commented posts, top rated books, engagement counters; `src/components/admin/analytics-widgets.tsx` (AnalyticsOverview, MonthlyPostChart, TopContent).
- Built PDF.js viewer: `src/components/PdfViewer.tsx` (canvas rendering, page nav, zoom, fullscreen, keyboard shortcuts), replaced iframes in both book reader views.
- Built Community features: `src/routes/profile.tsx` (profile page with display name editing, member-since, comment count), nav links in header/mobile nav.

---

## 28. Platform Architecture (Technical Blueprint)

> Formerly `ARCHITECTURE.md` — merged here 2026-08-08 during the docs consolidation. This chapter is the **technical blueprint**: how the system is structured (architecture principles, unified-backend responsibility, data flows, mock-platform seam, adapter contracts, navigation structure, hosting, security, env config, architecture decisions). **Revised 2026-08-14 (AD-029):** the target architecture is **Supabase unified backend + Refine/shadcn admin + Hostinger Managed Node.js**; the previous Strapi/VPS sections are marked historical. The living project plan lives in the sections above. Keep this chapter in sync when the architecture changes.

### Architecture Principles

### Single Source of Truth

Every domain has exactly one owner.

- Supabase → All backend data (content + application)
- PipraPay (via the payment abstraction) → Payment processing
- TanStack Start → Presentation + server orchestration (SSR, server functions, webhooks, email)
- Refine + shadcn admin → Admin/CRUD UI (inside the TanStack app)

Never duplicate ownership or business logic.

---

### Layered Architecture

Presentation
↓
Feature
↓
Content / Application
↓
Infrastructure

---

### Module Structure

Every module owns:

- UI
- API
- CMS
- Database
- Permissions
- Tests

Examples:

- Books
- Reader
- Commerce
- Learning
- Search
- Builder
- Settings

---

### Feature Development Lifecycle

Idea
→ UX/UI
→ Architecture
→ Data Model (if needed)
→ API
→ CMS
→ Frontend
→ Testing
→ Documentation
---

### Core Rules

1. One owner per domain.
2. Frontend never owns business logic.
3. Supabase manages ALL data (content + application).
4. Server functions enforce auth and business rules.
5. APIs connect all layers.
6. Build modular, reusable, and scalable features.
7. Prefer extending existing modules over creating new ones.


### 1. Architecture Overview

Sabbe Satta uses a **Unified Architecture** — Supabase is the single backend, and the admin lives inside the TanStack application:

| System | Owns | Lives On |
|--------|------|----------|
| **Supabase** | **Unified backend** — Auth, PostgreSQL (ALL data: content + application), Storage (book PDFs private, covers, avatars), RLS | Supabase Cloud |
| **TanStack Start (frontend)** | Frontend SSR, API server functions, payment webhook orchestration, email (Resend), PDF access control, **Refine + shadcn admin** | **Hostinger Managed Node.js** (managed platform — no VPS/Docker/Nginx/PM2/systemd) |
| **Refine Core + shadcn/ui** | Admin/CRUD/data-handling UI (target — P2), dataProvider → Supabase | Inside the TanStack app |
| **PipraPay** | Payment processing (initiation + verification; stopgap until direct bKash/Nagad, P8) | Hosted separately (managed hosting); the app only talks to it via the provider abstraction |

> **Strapi v5 (historical):** was the content management system under the hybrid architecture (AD-023). **Superseded 2026-08-14 (AD-029)** — no longer part of the target architecture; code stays in the repo pending migration to Supabase + removal (P2/P3).

---

### 2. Responsibility Split

#### Supabase Handles (Unified Backend — content + application)

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Auth** | `auth.users` (managed by Supabase) | User sign-up, login, Google OAuth, password reset, sessions, roles/authorization |
| **Content — Posts** | `public.posts` | Bilingual articles, categories, tags, cover images, SEO, status |
| **Content — Pages** | `public.pages` | Static pages, sections, banners, SEO, visibility |
| **Content — Books** | `public.books` + `chapters` + `authors` | Digital books: bilingual metadata, covers, pricing, ratings, featured; chapters/authors tables |
| **Content — Videos** | `public.videos` | YouTube-embedded video library, bilingual fields |
| **Content — Taxonomies** | `public.categories` + `tags` | Bilingual taxonomy with colors + visibility |
| **Content — Navigation** | `public.navigation_items` | Header/footer menu structure (tree) |
| **Content — Site settings** | `public.site_settings` + `book_grid_settings` | Singleton branding/SEO/theme config + grid layout config |
| **User Profiles** | `public.profiles` | User display names, avatars, preferences |
| **RBAC** | `public.user_roles` | Role-based access control (user, editor, admin, super_admin) |
| **Purchases** | `public.purchases` | Purchase records with UNIQUE(user_id, book_id) |
| **Orders** | `public.orders` + `public.order_items` | Server-side order state machine (pending → paid/failed/cancelled) |
| **Reading Progress** | `public.reading_progress` | Per-user page tracking per book |
| **Book Ratings** | `public.book_ratings` | 1-5 star ratings with auto-averaging (DB trigger → `books.avg_rating`) |
| **Bookmarks** | `public.bookmarks` | Polymorphic (post/book) user bookmarks |
| **Reader bookmarks + notes** | `public.reader_bookmarks` + `public.reader_notes` (+ `reader_highlights` reserved) | In-PDF bookmarks, annotations, highlights |
| **Cart** | `public.carts` + `public.cart_items` | Shopping cart per user |
| **Coupons** | `public.coupons` | Discount code management |
| **Comments** | `public.comments` | User comments on posts with moderation |
| **Newsletter** | `public.newsletter_subscribers` | Email subscriptions |
| **Contact Messages** | `public.contact_messages` | Contact form submissions |
| **Admin Notifications** | `public.admin_notifications` | System notifications per user |
| **Search Analytics / Audit** | `public.search_analytics` + `audit_log` | Query logs + audit trail |
| **Storage** | Supabase Storage buckets | Private book PDFs, covers, avatars, other application media (paid PDFs access-controlled) |

> **2026-08-14 (AD-029):** the previous split put content in Strapi and excluded legacy content tables from the fresh Supabase instance. That is **superseded** — Supabase owns content AND application data in one unified schema (P1).

#### Strapi Handles (historical — superseded 2026-08-14, AD-029)

> Strapi was the content layer under the hybrid architecture (AD-023): content management, admin panel, media library, taxonomies, navigation, site settings, i18n, REST/GraphQL APIs. **No longer part of the target architecture** — content moves to Supabase (P1/P3), the admin becomes Refine + shadcn (P2), and Strapi code is removed after the replacement is validated (P3). Kept in the repo until then; not to be described as the production CMS.

#### TanStack Start Handles (Frontend + Integration Layer)

| Domain | Details |
|--------|---------|
| **Frontend SSR** | React 19 + TanStack Start server-side rendering |
| **Payment Webhook** | `/api/payments/webhook` — provider-agnostic IPN: verify → fulfill/fail/cancel (AD-026) |
| **Email** | Resend integration for transactional emails |
| **Server Functions** | Auth-guarded data mutations (TanStack Start server functions) |
| **PDF Access** | Ownership check → Supabase signed URL (`/api/pdf?slug=`) |
| **Dynamic Metadata** | Per-route SEO meta tags, sitemap, robots.txt |

#### PipraPay Handles (Payment Layer — stopgap until P8)

| Domain | Details |
|--------|---------|
| **Initiation** | Create-payment (HMAC-signed), redirect customer to gateway |
| **Verification** | IPN webhook → HMAC signature verified server-side |
| **Webhooks** | Payment event notifications → `/api/payments/webhook` (amount-checked ±BDT 1) |

> **Removed 2026-08-14:** Stripe (not viable for Bangladesh — no BDT; dead code `stripe-checkout.ts`/`stripe-webhook.ts` scheduled for removal in P7).

---

### 3. Data Flow Architecture

```
                              ┌─────────────┐
                              │   Browser    │
                              └──────┬──────┘
                                     │
                          ┌──────────┴──────────┐
                          │  Hostinger Managed  │
                          │  Node.js (TanStack  │
                          │       Start SSR)    │
                          │  + Refine admin     │
                          └──────┬─────────┬─────┘
                                 │         │
                    ┌────────────┘         └────────────┐
                    │                                    │
                    ▼                                    ▼
          ┌─────────────────┐                ┌──────────────────┐
          │   Supabase API  │                │  PipraPay         │
          │  (Supabase Cloud│                │  (managed host,   │
          │   — unified)    │                │   P5 — via the    │
          │                 │                │   provider        │
          │  Auth: signup/  │                │   abstraction)    │
          │    login/OAuth  │                │                  │
          │  Storage: PDFs/ │                │  Initiate +       │
          │    covers       │                │  verify payments  │
          │  ALL data:      │                │  → webhook →      │
          │  - Content      │                │  /api/payments/   │
          │    (posts,      │                │    webhook        │
          │     pages,      │                └──────────────────┘
          │     books,      │
          │     videos,     │
          │     categories, │
          │     navigation, │
          │     settings)   │
          │  - App data     │
          │    (purchases,  │
          │     cart,       │
          │     orders,     │
          │     progress,   │
          │     bookmarks,  │
          │     comments)   │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │  Supabase DB    │
          │  (PostgreSQL —  │
          │   ALL data +    │
          │   Auth + RLS)   │
          └─────────────────┘
```

> Updated 2026-08-14 (AD-029): single backend (Supabase) — content and application data unified; frontend SSR + admin run on **Hostinger Managed Node.js** (no VPS, no Strapi).

#### Read Flow (Public Pages)

```
1. Browser requests /reflections
2. Hostinger Managed Node.js SSR renders route
3. Route calls src/lib/posts.ts (Supabase-backed reads after P3)
4. Supabase returns post data (RLS-guarded; content reads via server functions)
5. In mock mode (dev), mock data is returned first via isMockMode()
6. Route also calls Supabase for user-specific data (purchases, cart count)
7. Page renders with content + personalized data
```

#### Data-Source Dispatch (M6 E6.3 — supersedes the old fallback chain)

Since M6, service files follow a **mock-first dispatch** rather than a network-first fallback chain. The mock path is checked *first* via `isMockMode()` (fast, deterministic, offline); real adapters run only when a backend is configured:

```
if (isMockMode()) → use mock store/data (src/lib/mock-data.ts + src/lib/mock-*.ts)
else             → real adapter (Supabase — unified backend)  // per-module, unchanged for production
```

This means the old "try Strapi → try Supabase → mock" probe chains are no longer executed in mock mode — the reader, books grid, reflections, videos, search, and settings all short-circuit before touching the network. Real-mode chains remain intact behind the flag for when backends are configured. Mock data lives in `src/lib/mock-data.ts` — categories, posts, navigation items, books, videos, pages, and counts with bilingual fields.

> **2026-08-14 (AD-029):** `VITE_DATA_SOURCE` remains a **feature-level migration/dispatch mechanism only** — it is NOT the architectural definition of backend ownership. Ownership is: Supabase = all data; Refine admin = admin UI; TanStack Start = orchestration.

#### Mock Platform Data-Source Seam (2026-08-03)

The **Mock Platform Transformation** (milestones M0–M6, **completed 2026-08-07** — see `PROJECT.md §18` and `CHANGELOG.md`) extends the fallback-chain philosophy from *content reads only* to the **entire product** — auth, commerce, reader access, comments, search, notifications, admin. Its core architectural seam:

```ts
// src/lib/data-source.ts (implemented M0, 2026-08-04)
export type DataSource = "mock" | "strapi" | "supabase" | "auto";
export const DATA_SOURCE: DataSource = (import.meta.env.VITE_DATA_SOURCE as DataSource) ?? "auto";
export function isMockMode(): boolean { /* mock when flag=mock, or auto with no Supabase env */ }
```

- `VITE_DATA_SOURCE=mock` → all services take the fast, deterministic, offline mock path
- `VITE_DATA_SOURCE=strapi|supabase` (or `auto` with backends configured) → real backend adapters
- **Swap, not rewrite:** the mock path is checked first; the real chain stays intact behind the flag
- `setMockModeOverride()` — test seam so unit suites can force mock/real mode regardless of the build-time flag

**Mock stores** (implemented as per-domain modules rather than a single `mock-db/` — same localStorage-client / in-memory-SSR-safe pattern, so a unified store later is optional refactoring):

| Store | Module | Mirrors | Shipped |
|-------|--------|---------|---------|
| Session + profiles | `src/lib/mock-session.ts` | `auth` + `profiles` | M1 (2026-08-04) |
| Cart | `src/lib/mock-cart.ts` | `carts` + `cart_items` | M0 (F5) |
| Orders + purchases | `src/lib/mock-commerce.ts` | `orders` + `purchases` | M2 (2026-08-04) |
| Comments | `src/lib/mock-comments.ts` | `comments` | M4-early (2026-08-04) |
| Newsletter | `newsletter.ts` | `newsletter_subscribers` | M4-early (2026-08-04) |
| Reading progress | `src/lib/mock-progress.ts` | `reading_progress` | M3 (2026-08-07) |
| Ratings | `src/lib/mock-ratings.ts` | `book_ratings` (+ aggregate trigger in JS) | M3 (2026-08-07) |
| CMS overrides | `src/lib/mock-cms.ts` | admin CRUD over static content (books/posts/videos) | M5 (2026-08-07) |
| Site settings | `src/lib/mock-settings.ts` | `site_settings.config` (deep-partial overrides) | M5 (2026-08-07) |
| Bookmarks | `src/lib/mock-bookmarks.ts` | `bookmarks` (polymorphic) | M3 (2026-08-07) |
| Reader bookmarks + notes | `src/lib/mock-reader.ts` | `reader_bookmarks` + `reader_notes` | M3 (2026-08-07) |
| Notifications | `src/lib/mock-notifications.ts` | `admin_notifications` (per-user via mock `userId`) | M4 (2026-08-07) |
| Contact messages | `src/lib/contact-messages.ts` | `contact_messages` | M4 (2026-08-07) |

Demo accounts: `demo@sabbesatta.test` / `demo1234` (user), `admin@sabbesatta.test` / `admin1234` (super_admin). The demo user is seeded with 2 purchased books + 1 order so `/purchases` and premium reader gating are demoable immediately. Every feature works offline with production-like workflows; later Strapi/Supabase integration only replaces the data source.

#### Adapter Contract (M6 E6.1)

Each service module exposes a **fixed function signature** that the UI calls. The mock path satisfies that contract today; the real adapters (Strapi/Supabase/Stripe/Resend) must satisfy the **same inputs and outputs** — a swap is a config change, not a rewrite. Verification: `src/lib/__tests__/data-source.test.ts` (swap drill) forces mock mode and asserts every public read resolves.

| Service module | Functions (public contract) | Output shape | Real adapter (when connected — target) |
|----------------|-----------------------------|--------------|-------------------------------|
| `posts.ts` | `fetchPosts(category?, page, pageSize, search?, categories?)`, `fetchPostBySlug(slug)`, `fetchPostCounts()`, `fetchPostById(id)` | `PaginatedResult<Post>` / `Post \| null` / `Record<category, count>` | Supabase `posts` (P3; Strapi historical) |
| `books.ts` | `fetchPublishedBooks(page, pageSize, options?)`, `fetchBookBySlug(slug)`, `fetchBookById(id)`, `fetchAllBooks(page, pageSize, options?)` | `PaginatedBooks` / `Book \| null` (rating aggregates overlaid) | Supabase `books` (P3; no mirror needed — AD-029); rating aggregates from `book_ratings` trigger |
| `videos.ts` | `fetchPublishedVideos(page, pageSize)` | `PaginatedVideos` | Supabase `videos` (P3) |
| `navigation.ts` | `fetchPublicNavItems(location?)` | `NavItem[]` (flat; tree built via `safeBuildNavTree`) | Supabase `navigation_items` (P3) |
| `taxonomy.ts` | `fetchCategories()` | `Category[]` | Supabase `categories` (P3) |
| `pages.ts` | `fetchPageBySlug(slug)` | `Page \| null` | Supabase `pages` (P3) |
| `search.ts` | `searchContent(query)` | `SearchResult[]` (posts/books/videos/pages) | Supabase FTS (`20260714000007_add_full_text_search.sql`) |
| `siteSettings.tsx` | `fetchSiteSettings()` | `SiteConfig` (full merge over `DEFAULT_CONFIG`) | Supabase `site_settings` (P3) |
| `comments.ts` | `fetchComments(postId)`, `addComment`, `deleteCommentFn`, `updateCommentFn` | `Comment[]` / mutation results | Supabase `comments`; mock ids never hit the UUID column |
| `newsletter.ts` | `subscribeToNewsletter(email)`, `unsubscribeFromNewsletter(token)` | `{ subscribed, alreadySubscribed }` / `{ success, ... }` | Supabase `newsletter_subscribers` + Resend |
| `contact-messages.ts` | `submitContactMessage(input)` | `{ success }` | Supabase `contact_messages` + admin notification |
| Auth | `useAuthSession()`, `useIsAdmin()`, `signOut()` | session / role / void | Supabase Auth (mock session mirrors the shape) |
| Reader access | `canAccessPdf()`, `checkOwnership()`, `purchaseBook()`, `getUserPurchases()`, `getMyLibrary()` | ownership booleans / purchase lists | Supabase `purchases` (+ `orders`) |
| Progress / ratings / bookmarks | `books-progress.ts`, `books-ratings.ts`, `bookmarks.ts`, `books-reader.ts` | per-user rows + aggregates | Supabase `reading_progress`, `book_ratings` (+ trigger), `bookmarks`, `reader_bookmarks`, `reader_notes` |
| Commerce | `mock-cart` + `checkoutCart`, `completeMockCheckout`, coupon `validateCoupon`, `getOrders(userId)` | cart / order / purchase / receipt records | Supabase `carts` + `cart_items` + `orders` + `purchases`; provider-agnostic payment interface (simulated → PipraPay, AD-026) |
| Receipts | `getOrders()` → `OrderReceipt[]` (`orders.ts`) | items + discount + tax + total per order | mock path reads `mockGetOrders`; **real adapter**: the `orders` + `order_items` tables (P1/P4) — one row per checkout |
| Notifications | `mockGetNotifications(userId)`, `mockGetUnreadCount`, `mockMarkRead`, `mockMarkAllRead`, `mockGetAllNotifications` | `MockNotification[]` (mirrors `admin_notifications`) | Supabase `admin_notifications` |
| Admin CRUD (M5 mock panel) | `mockFetchAllBooks/Posts/Videos`, `mockUpsert*`, `mockDelete*`, `mockClearCms` | typed entity lists / void | **Refine + shadcn admin (P2)** — supersedes the Strapi redirect |
| Site settings editor (E5.4) | `mockGetSettings`, `mockUpdateSettings(patch)`, `mockClearSettings` | `SiteConfigPatch` | Refine admin → Supabase `site_settings` write (P2/P3) |

**Swap drill (how to verify E6.2):**
1. With `VITE_DATA_SOURCE=mock` (or `auto` + no Supabase env), run the app — every public page renders from mock stores with zero backend.
2. Configure the real Supabase env vars and set `VITE_DATA_SOURCE=supabase` (unified backend). No service file changes — the same UI renders from real data.
3. `npx vitest run src/lib/__tests__/data-source.test.ts` asserts the seam itself: mock mode short-circuits, flag values are the documented four, and site-settings overrides apply in mock mode.
4. Any adapter that cannot satisfy the contract above (same function name, same inputs/outputs) is the seam to fix — before connecting production.

> **2026-08-14 (AD-029):** the content adapters' target changed from Strapi to Supabase (P3). The `VITE_DATA_SOURCE` flag values stay the same (`mock|strapi|supabase|auto`) — `strapi` is retained for the legacy path until P3 removes it.

#### Dynamic Navigation from Categories

The Reflections dropdown children are **auto-generated** from the Categories collection:

```
fetchPublicNavItems()
  → fetch from Strapi API
  → find item with url="/reflections" and type="dropdown"
  → fetchCategories() → generate child items for each visible category
  → assign URLs like /reflections/meditation, /reflections/mindfulness, etc.
  → no hardcoded category routes
```

This works in both the (historical) Strapi path and the Supabase path. In the target architecture, adding a category in the **Refine admin** automatically creates the nav sub-item and a working route at `/reflections/:slug`.

#### Current Navigation Structure (source of truth)

> Nav items are defined in `src/lib/mock-data.ts` (mock) / the Supabase `navigation_items` table (real mode — P3; Strapi `navigation` was the historical source) and rendered by the layout engine (`src/lib/layout-engine.tsx`). This section supersedes the retired `NAV-SITEMAP.md` (merged 2026-08-08).

| Nav item | Type | Route | sort_order |
|----------|------|-------|-----------|
| Home | internal | `/` | 0 |
| Reflections | dropdown (clickable trigger) | `/reflections` | 1 |
| ├ Meditation | internal | `/reflections/meditation` | 0 |
| ├ Mindfulness | internal | `/reflections/mindfulness` | 1 |
| ├ Mental Health | internal | `/reflections/mental-health` | 2 |
| ├ Philosophy | internal | `/reflections/philosophy` | 3 |
| └ Buddhist Psychology | internal | `/reflections/buddhist-psychology` | 4 |
| Books | internal | `/books` | 2 |
| Videos | internal | `/videos` | 3 |
| About | internal | `/about` | 4 |

**Header layout (desktop, 4 sections):** `[Logo] | [Nav + Donate lotus icon] | [Notifications† + Wishlist + Cart] | [Theme + Lang toggles · divider · Profile / Sign in]`. The Donate CTA renders as a `LotusIcon` beside the nav links. **Mobile** collapses to `[Logo] | [Notifications† + Cart + ☰ MobileNav sheet]`.

**Footer:** Explore column (Reflections, Books, Videos, About, Donate) · Quick Links (FAQ, Privacy, Terms) · Follow (socials). †Notifications appear only when signed in.

#### Write Flow (User Actions)

```
1. User adds book to cart
2. TanStack Start server function fires
3. Middleware validates Supabase JWT
4. Server function writes to Supabase `cart_items` table
5. Response returned to frontend
```

#### Admin Flow (target — P2)

```
1. Admin visits sabbesatta.com/admin
2. Supabase Auth validates admin credentials (RBAC via user_roles)
3. Admin creates/edits content via the Refine + shadcn admin panel
4. Content saved to Supabase PostgreSQL (server functions + RLS)
5. Frontend reads updated content from Supabase
```

> Historical: under the Strapi architecture the admin lived at cms.sabbesatta.com/admin (Strapi auth → Strapi PostgreSQL → Strapi API). Superseded 2026-08-14 (AD-029).

#### Purchase Flow

```
1. User clicks "Buy" on a book
2. Frontend calls checkoutCart / purchaseBook server function
3. Server function creates a pending order (createPaymentOrder) with the server-side total
4. Provider: simulated (inline card form) → PipraPay redirect to pay.sabbesatta.com
5. After payment, the gateway sends an IPN webhook to /api/payments/webhook
6. Webhook verifies the HMAC signature + amount (±BDT 1), then fulfillOrder records the purchase in Supabase (idempotent, UNIQUE user×book)
7. Purchase confirmation email sent via Resend
8. User redirected to success page
9. Frontend checks Supabase for purchase status → PDF unlock (signed URL)
```

> Updated 2026-08-14 (AD-026): provider-agnostic flow — no Stripe. Gateway swap is config, not code.

---

### 4. Authentication Architecture

#### Frontend Auth (Supabase)

```
User signs up/logs in → Supabase Auth issues JWT
  → JWT stored in localStorage
  → TanStack Router beforeLoad middleware validates JWT
  → useAuthSession() hook provides user state
  → Server functions use requireSupabaseAuth middleware
```

#### Admin Auth (target — Refine admin inside the app)

```
Admin visits /admin (inside the TanStack app)
  → Supabase Auth (same accounts as frontend users; RBAC via user_roles)
  → Refine checks the admin role; guards non-admin routes
  → Data writes go through Supabase server functions + RLS
```

#### Public Content Reads (target)

```
Frontend reads public content from Supabase via server functions:
  RLS allows public read for published content (or anon key with RLS policies)
  No separate CMS API token needed (historical Strapi token removed at P3)
```

#### Admin Button in Header

```
Admin button in frontend header:
  - Links to /admin (Refine admin inside the app)
  - Only visible to admin/super_admin role users
  - (Historical: opened the Strapi admin in a new tab via VITE_STRAPI_URL — superseded)
```

---

### 5. Storage Architecture

> **2026-08-14 (AD-029):** Supabase Storage is the **single** storage layer — book PDFs (private), covers, avatars, and other application media. The Strapi local media library is historical (Strapi superseded).

#### Media Storage Strategy (target)

- **Book PDFs** → Supabase Storage `book-pdfs` bucket (**private**; signed URLs with 5-minute expiry, server-side ownership check via `/api/pdf?slug=`)
- **Covers / avatars / site assets** → Supabase Storage buckets (`covers`, `avatars`, `site-assets`, `documents`)
- **Paid PDFs must remain access-controlled** — never public; signed URLs only after `canAccessPdf()` verification

**Historical:** Strapi local uploads (`strapi/public/uploads/`) served admin-uploaded content media under the hybrid architecture; superseded 2026-08-14.

---

### 6. Production Hosting Plan

> **2026-08-14 (AD-029):** production hosting is **Hostinger Managed Node.js / Web Apps Hosting**. The VPS/Nginx/Docker/PM2/systemd topology below is **historical** (AD-028, superseded). Hostinger's managed platform supplies Node runtime, deployment, SSL, CDN, security/WAF, DDoS protection, and backups. **Cloudflare is optional** — introduce only if a specific requirement is demonstrated.

#### Production Topology (target)

```
Hostinger Managed Node.js (Web Apps Hosting)
  - Node runtime · Managed SSL · CDN
  - Security · WAF · DDoS · Backups
  - sabbesatta.com — TanStack Start SSR app
  - /admin — Refine + shadcn admin (inside the app)
        │
        ▼
Supabase Cloud — Auth · ALL data (content + app) · Storage (PDFs)
```

> **Approved 2026-08-14 (AD-029):** managed platform — **no VPS, no Docker, no manual Nginx, no PM2/systemd, no server-installed PostgreSQL**. Supabase (unified backend) + Resend stay free cloud services. PipraPay is hosted separately (managed hosting) and reached only through the provider abstraction (P5).

#### Historical Topology (AD-028 — superseded)

```
ONE VPS (natively installed): Nginx → Frontend SSR (PM2 :3001) + Strapi (systemd :1337) + PostgreSQL 16 (Strapi DB) + PipraPay (PHP-FPM + MySQL); Cloudflare (free) in front; Supabase for app data.
```

#### Hostinger Managed Node.js Requirements (target)

| Item | Notes |
|------|-------|
| Plan | Hostinger Managed Node.js / Web Apps plan (Node 22 runtime) |
| Deploy | Deploy the TanStack Start SSR build via Hostinger's managed flow (Git/repo or file upload per hPanel) |
| Env | Set `VITE_DATA_SOURCE`, `SITE_URL`, Supabase keys, `PAYMENT_PROVIDER`, `RESEND_API_KEY` in hPanel |
| SSL/CDN | Provided by the managed plan (free auto-renewed certificates; built-in CDN) |
| Backups | Hostinger managed backups + Supabase automatic backups |
| PipraPay | Separate managed host (P5); the app talks to it only via the provider abstraction |

#### Historical: VPS/Strapi on VPS (AD-028 — superseded)

```
Services on the old VPS (installed via apt/systemd, no containers):
  1. Node 22 — frontend SSR under PM2 (port 3001) + Strapi under systemd (port 1337)
  2. PostgreSQL 16 (apt) — Strapi database (pg_dump nightly)
  3. Nginx (apt) — reverse proxy, TLS termination
  4. Certbot (apt) — Let's Encrypt SSL auto-renewal
  5. PHP-FPM + MySQL — PipraPay stopgap (isolated vhost, P4)
```

#### Supabase Configuration

| Feature | Plan | Notes |
|---------|------|-------|
| **Auth** | Free tier | 50,000 users, email + OAuth |
| **Database** | Free tier | 500 MB, pgvector, full-text search |
| **Storage** | Free tier | 1 GB, CDN |
| **Edge Functions** | Free tier | 500K invocations/mo |

**Future scaling:** When exceeding free tier limits, migrate to Supabase Pro ($25/mo).

#### SSL/HTTPS (target)

- Managed TLS by Hostinger's platform (free, auto-renewed) for `sabbesatta.com` (+ subdomains as needed)
- All API calls from frontend to Supabase go through HTTPS (Supabase-managed)
- Cloudflare optional — only if a specific requirement (e.g., advanced CDN/WAF) is demonstrated

#### Database Backup Strategy

| Database | Backup Method | Frequency |
|----------|--------------|-----------|
| Supabase PostgreSQL (ALL data — content + application) | Supabase automatic backups | Daily + Point-in-time |

#### CDN Strategy (target)

- **Hostinger built-in CDN**: frontend assets
- **Supabase Storage**: built-in CDN for public buckets; private buckets via signed URLs
- **Cache purges**: after code deploys (Hostinger panel)

---

### 7. Domain Strategy (target)

| Domain | Points To | Service |
|--------|-----------|--------|
| `sabbesatta.com` | Hostinger Managed Node.js | Frontend SSR + Refine admin (`/admin`) |
| `pay.sabbesatta.com` (or managed host) | PipraPay host (P5) | PipraPay gateway (via provider abstraction) |

> Historical (AD-028): `cms.sabbesatta.com` → Strapi Admin + API; `api.sabbesatta.com` → Strapi API; Nginx on the VPS. Superseded 2026-08-14.

---

### 8. Migration Phases (historical — Strapi transition)

> **2026-08-14 (AD-029):** the Strapi transition phases below are **historical**. The active roadmap is the **P0–P8 revision** in §18 (Supabase unified backend + Refine/shadcn admin + Hostinger Managed Node.js). Strapi content migrates to Supabase in P1/P3; the Refine admin replaces the Strapi panel in P2.

#### Phase 1: Strapi Content API Foundation ✅ (2026-07-17, historical)
- **Strapi API client expanded** — `src/lib/strapi-client.ts` now has typed interfaces and operations for all 10 content types (posts, books, pages, videos, courses, categories, tags, navigation, comments, site settings)
- **8 service files wired** — `pages.ts`, `videos.ts`, `courses.ts`, `comments.ts`, `navigation.ts`, `posts.ts`, `books.ts`, `taxonomy.ts` all use Strapi-first + Supabase-fallback pattern with type-mapping functions
- **Frontend routes updated** — All content routes read from Strapi API first, fall back to Supabase
- **JWT bridge implemented (removed 2026-08-08)** — Strapi middleware validated Supabase JWTs for the 4 app-data content types (`purchase`, `reading-progress`, `bookmark`, `book-rating`) + `book`; all deleted — user data lives only in Supabase (AD-026/027)
- **Site settings** — Already handled independently with Strapi-first fetch

#### Phase 2: Admin Transition (historical — reversed by AD-029)
- Admin button in frontend → opens Strapi admin ✅ (done in earlier phase; superseded — the target admin is Refine + shadcn inside the app, P2)
- Train content editors on Strapi admin (historical; editors will use the Refine admin instead)

#### Phase 3: Data Migration (historical — now P1/P3 Supabase migration)
- **Migration script created** — `scripts/migrate-to-strapi.mjs` exports content from Supabase (via SDK), transforms HTML-to-blocks, imports via Strapi REST API
- Handles relations, self-references, content type transformations
- Unconditionally saves JSON export to `strapi-migration-data/migration-data.json`
- Verify data integrity post-migration

#### Phase 4: Legacy Code Cleanup ✅ (2026-07-17)
- Remove unused Supabase content tables ✅
- Remove Refine data provider, admin routes, admin components ✅
- Remove duplicated content type definitions ✅
- Remove hardcoded `POST_CATEGORIES` enum ✅
- Remove stale category-specific components (`MindfulConnection`) ✅

#### Phase 5: Frontend Development with Mock Data (Current — 2026-07-18)
- **Mock data layer** — `src/lib/mock-data.ts` provides categories, posts, nav items for zero-backend development
- **Dynamic category routes** — `/reflections/:slug` handles ALL categories; no per-category route files
- **Auto-generated nav** — Reflections dropdown children derived from Categories collection
- **Data flow** — Strapi-first → Supabase-fallback → Mock-fallback, same pattern in every service
- **Next**: Build reader, books hub, commerce, user profile using mock data

#### Phase 5: Production Hardening (historical)
> Superseded 2026-08-14 by P7 — hardening happens on the Hostinger managed platform (no VPS/Nginx/PM2).
- (Historical VPS approach: Node 22 + PostgreSQL 16 + Nginx + SSL, frontend via PM2)
- Monitoring, backup verification, performance tuning move to P7 (managed platform)

---

### 9. Development vs Production

| Aspect | Development | Production (target — AD-029) |
|--------|------------|------------|
| **Database** | Supabase dev project (mock-first in dev) | Supabase production (unified content + application) |
| **Admin** | MockAdminPanel (/admin) | Refine + shadcn admin (/admin, P2) |
| **Frontend** | localhost:3000 (Vite) | sabbesatta.com (Hostinger Managed Node.js, P0) |
| **CMS** | (historical) Strapi localhost:1337 | Supabase unified (P1/P3) — Strapi removed after migration |
| **Payments** | Simulated provider | PipraPay (P5) → bKash/Nagad (P8) |
| **Email** | Resend dev (onboarding@resend.dev) | Resend with verified domain |
| **Storage** | Local + Supabase dev | Supabase production (private PDFs, signed URLs) |
| **SSL** | None (local) | Managed TLS by Hostinger (+ optional Cloudflare later) |

---

### 10. Environmental Configuration

#### App (.env)

```env
# Required
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Payments (provider-agnostic — AD-026)
PAYMENT_PROVIDER=simulated            # simulated | piprapay
PIPRAPAY_BASE_URL=
PIPRAPAY_MERCHANT_ID=
PIPRAPAY_API_KEY=
PIPRAPAY_API_SECRET=
PIPRAPAY_WEBHOOK_SECRET=

# Supabase (server-side)
SUPABASE_URL=your-supabase-url
SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site
SITE_URL=https://sabbesatta.com
SITE_ADMIN_EMAIL=admin@sabbesatta.com

# Email
RESEND_API_KEY=your-resend-api-key

# AI
OPENAI_API_KEY=your-openai-api-key
```

> **2026-08-14 (AD-029):** `VITE_STRAPI_URL` / `VITE_STRAPI_API_TOKEN` are **historical** — the Strapi REST reads are replaced by Supabase-backed reads (P3). `VITE_DATA_SOURCE` stays as the feature-level migration/dispatch seam (`mock|strapi|supabase|auto`).

#### Strapi (.env) — HISTORICAL (superseded, AD-029)

> The Strapi server env (HOST/PORT/DATABASE_*/secrets) belongs to the superseded Strapi architecture. Strapi runs locally in dev only, pending migration to Supabase + removal (P2/P3). Kept for historical reference:

```env
# Server
HOST=0.0.0.0
PORT=1337

# Database (SQLite for dev)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Secrets (generate unique values for production)
APP_KEYS=key1,key2
API_TOKEN_SALT=salt
ADMIN_JWT_SECRET=secret
JWT_SECRET=secret
TRANSFER_TOKEN_SALT=salt

# Environment
NODE_ENV=development
```

---

### 11. Architecture Decisions

#### AD-023: Hybrid Strapi + Supabase Architecture — **SUPERSEDED 2026-08-14 (AD-029)**

> Superseded: Supabase is now the unified backend (content + application); the admin is Refine + shadcn inside the TanStack app. Strapi is historical/pending removal. Kept for historical reference.

**Decision:** Use Strapi for content management and Supabase for application data, rather than putting everything in one system.

**Date:** 2026-07-17

**Rationale:**
- Strapi excels at content management (admin panel, i18n, media library, RBAC for editors)
- Strapi is NOT designed for cart, purchases, or per-user data tracking
- Supabase already has 42 migrations of app data (purchases, progress, bookmarks, cart, etc.)
- Supabase Auth is already integrated with the frontend
- Payment webhooks, email, and server functions run in the same Node process as the frontend
- The data already lives where it should — we just need to wire content reads to Strapi

**Consequences (historical):**
- Two backend systems to maintain, but each does what it's best at
- Frontend reads content from Strapi API, app data from Supabase
- No data duplication or sync issues (content ↔ app data are separate domains)
- Strapi serves as the admin panel for editors, Supabase handles user-facing operations

#### AD-024: Supabase JWT Validation in Strapi (Phase 1 — Implemented, **Removed 2026-08-08**)

**Decision:** Custom Strapi middleware validates Supabase JWTs for user-specific operations.

**Status:** ✅ Implemented (2026-07-17) → 🗑 **Removed 2026-08-08** — superseded by AD-026/027: user data lives only in Supabase. `supabase-auth.js`, its config registration, the 4 app-data content types, and the `strapi-client.ts` user functions were all deleted. Recorded here for historical reference only.

**Implementation:**
- `strapi/src/middlewares/supabase-auth.js` — Global middleware that validates Supabase JWTs via HTTPS call to `auth/v1/user` endpoint
- Registered in `strapi/config/middlewares.ts` with `'global::supabase-auth'`
- On successful validation, attaches user identity to `ctx.state.supabaseUser` (`{ sub, email, role }`)
- Skips Strapi API tokens (only processes 3-segment JWTs)
- Graceful degradation: no Supabase URL configured → middleware silently passes

**Controller integration:**
- 5 custom controllers updated to read user from `ctx.state.supabaseUser`: `purchase`, `reading-progress`, `bookmark`, `book-rating`, `book`
- Pattern: `const email = ctx.state?.supabaseUser?.email || ctx.query.email`
- Fully backward compatible — legacy `?email=user@example.com` query param continues to work

**Frontend integration:**
- `src/lib/strapi-client.ts` updated with `supabaseToken` option on `strapiFetch`
- 12 user-specific functions accept optional `supabaseToken` parameter
- Dual auth: Supabase JWT for user-specific calls, static API token for public reads

**Rationale:** User-specific operations from Strapi require identifying the frontend user. Rather than duplicating user accounts in Strapi, the middleware validates the Supabase JWT that the frontend already has via `useAuthSession()`. This keeps Strapi's user system clean (admin-only) while allowing user-scoped content queries.

#### AD-025: Keep Supabase Storage for Sensitive Files

**Decision:** Book PDFs remain in Supabase Storage (private bucket) with signed URL access control, rather than moving to Strapi's media library.

**Rationale:** Strapi's media library doesn't support per-user access control for files. Supabase Storage has signed URLs with 5-minute expiry, which is critical for DRM/copyright protection of paid book PDFs.

---

### 12. Free Tools Policy

**Always fully free. No exceptions.**

| Priority | Approach | Example |
|----------|----------|---------|
| 1 | Fully free open-source (MIT/Apache/ISC) | React, TanStack, shadcn, Refine |
| 2 | Free tier with no caps/vendor lock-in | Supabase (free tier), Resend (free tier) |
| 3 | Combine free tools + custom code | Free DB + custom hooks + raw API calls |
| 4 | Paid tools (last resort, documented) | Only with explicit justification |

**Never use:** Free tiers with growth limits, trial versions, freemium services requiring paid plans for essentials, any tool creating vendor lock-in.

**Production scaling:** When free tier limits are approached, upgrade to paid plans as documented in Section 6.

---

### 13. Mandatory Security Requirements

> **Core architectural rule: “Never trust the client.”** All security enforcement happens **server-side** (Supabase RLS, Supabase Auth, server functions) — frontend restrictions are UX only, never security. Documented now; **implementation is part of the production phases (P1 schema/RLS, P4 application data, P5 payments, P6 storage, P7 hardening) — do not treat these as already implemented.**

| # | Requirement | Mandate | Implemented in |
|---|-------------|---------|----------------|
| 1 | **Supabase RLS** | Enable RLS on **all** tables (content + application); enforce ownership and access at the **database level** (owner-scoped rows, admin roles, public-read policies only where intended). Never rely on the app layer alone | P1 (schema + RLS), P4 (application data) |
| 2 | **Auth & RBAC** | Supabase Auth for authentication; **server-side** role/permission checks (user_roles + RLS + server functions). Never rely on frontend restrictions for authorization | P4 |
| 3 | **Secrets** | Service-role keys, payment credentials, Resend keys etc. are **server-only** — never in `VITE_*` env, never in Git, never in browser code. Only anon/publishable keys may reach the client; server functions hold privileged keys | P0/P7 |
| 4 | **API/server routes** | Authenticate, authorize, and **validate inputs** (Zod schemas) on every server function/API route; apply **rate limiting** where appropriate (contact form, auth, checkout) | P4/P7 |
| 5 | **Payments** | **Never trust frontend payment success.** Verify webhook signature, amount (order total ±BDT 1), order state, and **idempotency** server-side before granting entitlement; grant purchases/unlock PDFs only after verification (AD-026) | P5 |
| 6 | **Storage / PDFs** | Private paid PDFs in private buckets; **verify authentication + purchase entitlement** (`canAccessPdf`) before issuing signed URLs; short expiry; no public `.pdf` URLs | P6 |
| 7 | **Database** | RLS + foreign keys + constraints (UNIQUE user×book, NOT NULL, checks) + **least-privilege** access (service role used only server-side; anon key minimal) | P1/P4 |
| 8 | **Input / content security** | Protect against **XSS** (escape output, sanitize user content/comments), **SQL injection** (parameterized queries via Supabase SDK), **malicious uploads** (validate file type/size, scan, private storage), and unsafe user content | P4/P6 |
| 9 | **Production posture** | Secure headers, **HTTPS** everywhere (Hostinger managed TLS), safe logging (no secrets/PII in logs), dependency updates, **backups + restore testing** (Supabase PITR + Hostinger backups) | P7 |

**Historical:** Strapi API token + Strapi built-in rate limiting + Nginx/Certbot — superseded 2026-08-14 (AD-029).

---

### 14. Monitoring & Observability

| Tool | Purpose | Cost |
|------|---------|------|
| Hostinger managed monitoring | App health, logs, uptime (managed platform) | Included |
| Uptime monitoring | UptimeRobot — frontend, admin, webhook endpoint | Free |
| Supabase dashboard | DB/storage/auth metrics + logs | Free |

> Historical: Cloudflare analytics + Nginx access logs + PM2/systemd (AD-028 VPS era) — superseded 2026-08-14.

---

### 15. Related Documents

| Document | Purpose |
|----------|---------|
| `DESIGN.md` | Canonical UI design system (single source of truth) |
| This document (§1–27) | Living project plan — vision, modules, milestones, status, V2/V3 specs |
| `AGENTS.md` | Development agent instructions, library stack |
| `RULES.md` | Engineering rules and conventions |
| `CHANGELOG.md` | Version history and changes |
| `strapi/README.md` | Strapi setup guide (**historical** — Strapi superseded, AD-029) |
| `research/cms-evaluation/REPORT.md` | CMS platform evaluation (**historical** — evaluated Strapi) |

---

*Last updated: 2026-08-14 — Architecture revision (AD-029): Supabase unified backend + Refine/shadcn admin (target) + Hostinger Managed Node.js; Strapi/VPS/Docker superseded (historical); Mock Platform (M0–M6) complete; design system lives in `DESIGN.md`*
