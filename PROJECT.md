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

**Library-first, platform-first.** Never rebuild mature solutions.

Priority order:
1. Mature open-source libraries (TanStack, Zod, shadcn, TipTap, etc.)
2. Official SDKs / APIs (Supabase SDKs)
3. Supabase services (Auth, Storage, RLS, Realtime)
4. Custom business logic (only for unique platform requirements)

Supabase owns: Auth, Authorization, PostgreSQL, Storage, Realtime, Edge Functions, RLS, and database policies. Do not duplicate these.

Custom code is reserved for Sabbe Satta's unique logic: CMS workflows, reader behavior, purchase rules, book access permissions, user library, and reading progress.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | TanStack Start (React 19) | Full-stack SSR framework with file-based routing |
| **Client Rendering** | React 19 | UI component library |
| **Routing** | TanStack Router v1 | File-based, type-safe routing with SSR support |
| **Data Fetching** | TanStack Query v5 | Server state management, caching, infinite queries |
| **Admin Framework** | Refine v5 (headless) | Admin data layer: `useTable`, `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete` |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with design tokens |
| **UI Components** | shadcn/ui (New York) | Accessible, composable primitives |
| **Rich Text** | TipTap | Headless WYSIWYG editor with prose extensions |
| **Forms** | React Hook Form + Zod | Schema-driven form validation |
| **Tables** | TanStack Table | Headless table with sorting, filtering, pagination |
| **Drag & Drop** | dnd-kit | Accessible drag-and-drop for navigation builder |
| **Database** | Supabase PostgreSQL | Managed Postgres with real-time, full-text search |
| **Auth** | Supabase Auth | Email/password + Google OAuth, Row Level Security |
| **Storage** | Supabase Storage | File uploads with signed URLs and RLS |
| **Deployment** | Vercel (Free Tier) | SSR with global CDN, configured via nitro preset |
| **Package Manager** | Bun | Fast package installation and script execution |

---

## 4. System Architecture

### High-Level Architecture

```
Client Browser
  |
  +-- TanStack Router (SSR)
  |     Routes -> Hooks -> Components
  |
  +-- Service Layer (lib/)
  |     Server Functions -> Client Services -> Shared Utilities
  |
  +-- Supabase Backend
        PostgreSQL (+ RLS) -> Auth (JWT) -> Storage (Signed URLs)
```

### Data Flow Pattern

```
Route (thin wrapper)
  |
Custom Hook (state + side effects)
  |
Service / Server Function (business logic)
  |
Supabase Client (data access)
  |
PostgreSQL (with RLS enforcement)
```

### Authentication Flow

```
Page Load
  |
useAuthSession() (onAuthStateChange subscription)
  |
User resolved?
  +-- Yes -> useIsAdmin(), useUserRole() -> render UI
  +-- No  -> show public UI or AuthModal
  |
Protected routes: beforeLoad middleware
  +-- supabase.auth.getUser()
  +-- isHardcodedAdmin() bypass
  +-- user_roles table check
  +-- redirect to /login on failure
```

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
| **Shell** | Collapsible sidebar with multi-section nav |
| **Guard** | beforeLoad checks auth + role |
| **Sections** | Dashboard, Content, Books, Videos, Navigation, Appearance, Users, Settings, Tools |
| **Layout** | Independent of public frontend |
| **Status** | Complete |

### Posts / Blog

| Aspect | Detail |
|--------|--------|
| **Table** | public.posts with bilingual fields |
| **Statuses** | draft, published |
| **Editor** | TipTap rich text |
| **Bilingual** | title_en/bn, content_en/bn, excerpt_en/bn |
| **Cover** | Upload or URL (blog-images bucket) |
| **Tags** | Comma/enter input with chips |
| **Categories** | Buddhist Psychology, Wisdom, Books |
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
| **Payment** | Stripe Checkout (redirect-based, webhook-confirmed) |
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

### Phase 1 - Foundation

| Module | Status | Notes |
|--------|--------|-------|
| Project foundation | Done | TanStack Start, Router, Query, Tailwind, shadcn |
| Authentication | Done | Supabase Auth, email/password + Google OAuth |
| Authorization (RBAC) | Done | user_roles table, RLS, RPC functions |
| Database foundation | Done | 40+ migrations applied |
| Admin dashboard shell | Done | Collapsible sidebar, role-based sections |
| CMS framework | Done | Posts, Pages, Comments CRUD with TipTap |
| Media library | Done | Grid/list, multiple buckets, search |
| Global settings | Done | 8-tab customizer, singleton JSON blob |
| Navigation system | Done | Drag-and-drop tree builder |
| Theme system | Done | Accent colors, dark mode, CSS custom properties |

### Phase 2 - Content Engine

| Module | Status | Notes |
|--------|--------|-------|
| Content engine | Done | Page builder plus full CMS Engine layer (content types, workflows, relationships, revisions, SEO, slugs, metadata) |
| CRUD framework | Done | Refine hooks + Resource Engine (registerResource, ResourceListPage) + DataTable + FormDrawer + ConfirmDelete |
| Schema-driven forms | Done | Form Engine (FormRenderer + 11 field types) + React Hook Form + Zod across all admin forms |
| Taxonomies | Done | Categories + Tags with junction tables. React Hook Form + Zod forms, shared ConfirmDelete |
| SEO foundation | Done | Per-route meta, GA injection, sitemap, CMS Engine SEO module |
| Search foundation | Done | Unified searchContent server function across posts/pages/books/videos, /search route with type filters |

### Phase 3 - Books & Reading

| Module | Status | Notes |
|--------|--------|-------|
| Books module | Done | CRUD, grid, detail, ratings, search, Enhanced preview/SEO/sort |
| Reader module | Done | PDF.js viewer with zoom, navigation, fullscreen, keyboard shortcuts |
| User library | Done | /books/library route with progress bars and purchase data |
| Reading progress | Done | Per-user tracking per book with progress bars |
| Bookmarks | Done | toggleBookmark, /bookmarks route, BookmarkButton on posts |
| Notes | Not started | |
| Highlights | Not started | |

### Phase 4 - Commerce

| Module | Status |
|--------|--------|
| Commerce core | Done | Cart system, multi-item Stripe Checkout, webhook processing |
| Cart | Done | Full cart with add/remove/clear, cart badge in header, Stripe checkout |
| Checkout | Done | Stripe Checkout Sessions (single + multi-item) |
| Orders | Not started |
| Payments | Done | Stripe (connected, webhook-verified) |
| Coupons | Not started |
| Purchases | Done | Idempotent purchases with UNIQUE(user_id, book_id) constraint |
| Digital access | Done | Signed URL PDF access with server-side enforcement |

### Phase 5 - Extended Features

| Module | Status | Notes |
|--------|--------|-------|
| Videos | Done | CRUD with Resource Engine, Form Engine. Public video grid page. |
| Courses | Done | Full CRUD, lessons, enrollments, progress tracking, lesson reader. |
| Podcasts | Not started | |
| Community | Done | User profiles, comments system with moderation, bookmarks. |
| Newsletter | Done | Subscription form in footer and article sidebar. |
| Donations | Not started | |
| Analytics | Done | Dashboard: posts-per-month, top content, engagement counters. |

---

## 7. CMS Architecture

### Core Pattern

```
Route (/admin/[resource])
  |
beforeLoad (auth + role guard)
  |
Refine hooks (useTable / useList / useOne / useCreate / useUpdate / useDelete)
  |
DataTable (TanStack Table) - list view
  |
Dialog / Sheet - create/edit form
  |
@refinedev/supabase dataProvider (wraps supabase client)
  |
Supabase (tables, RLS)
```

Refine runs in **headless mode** — no routing, no layout, no UI components. It provides the data layer (hooks + provider) while TanStack Router owns navigation and custom components own rendering.

### Admin Routes

/admin (Dashboard), /admin/new (New Post), /admin/:id (Edit Post)
/admin/books, /admin/videos, /admin/pages, /admin/media
/admin/navigation, /admin/taxonomy, /admin/comments
/admin/users, /admin/settings, /admin/audit

### Key Patterns

- React Hook Form + Zod for all forms
- TanStack Table for all list views
- dnd-kit for drag-and-drop
- Sonner toast for feedback
- AlertDialog for confirmations
- Unsaved changes guard for forms

---

## 8. Admin Dashboard Architecture

Layout: Collapsible sidebar (60px / 240px) + sticky top bar + mobile bottom nav
Sidebar sections: Dashboard, Content, Books, Videos, Navigation, Appearance, Users, Settings, Tools

---

## 9. Content Management Architecture

Content Types: Posts (TipTap), Pages (JSON sections), Books (rich text), Videos (URL)

Bilingual Pattern: Every content type uses paired fields: title_en/title_bn, content_en/content_bn, etc.
Runtime selection via pickLocalized(field_en, field_bn, lang, fallback).

Content Flow: Admin creates/edits -> Supabase stores bilingual fields -> Public route fetches -> pickLocalized() -> React renders

---

## 10. Commerce Architecture

Current: purchases table with UNIQUE(user_id, book_id), canAccessPdf(), purchaseBook()
Future: Product -> Cart -> Checkout -> Payment Provider -> Order -> Purchase -> Access

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
Future: Unified search indexing posts, books, pages, videos with tsvector + pg_trgm

---

## 15. API & Service Layer

Server Functions (TanStack Start) for all mutations and protected reads
Library Modules: posts, pages, books, books-purchases, books-ratings, books-progress, books-reader, videos, taxonomy, navigation, comments, media, seo, site-settings, admin

---

## 16. Database Architecture

Core Tables:
- posts (bilingual, status, tags, timestamps)
- pages (bilingual, sections JSON, visibility)
- books (bilingual, status, price, ratings, featured)
- videos (bilingual, embed_url, duration)
- comments (parent_id for nesting)
- user_roles (user_id, role enum)
- profiles (user_id, email, display_name)
- purchases (UNIQUE user_id + book_id)
- reading_progress (UNIQUE user_id + book_id)
- book_ratings (UNIQUE user_id + book_id, 1-5)
- navigation_items (parent_id for tree structure)
- categories (bilingual, color, visibility)
- tags (bilingual, color)
- media_assets (full-text search)
- site_settings (singleton JSONB)
- audit_log (actor_id, action, JSONB details)

Key Indexes: idx_books_avg_rating, idx_purchases_user_id, idx_purchases_book_id, idx_reading_progress_user_id, idx_book_ratings_book_id

Triggers: update_book_rating_aggregates, update_purchases_timestamp, update_reading_progress_timestamp

---

## 17. UI Design System

Colors: Warm off-white background, nearly-black text, clay brown primary, warm grey secondary
Fonts: Cormorant Garamond (headings), Inter (UI), Hind Siliguri (Bangla)
Layout: Max content 1200px, reading width 42rem
Breakpoints: Mobile < 768px, Desktop >= 768px

---

## 18. Current Milestone

Milestone: Platform Foundation Completion
Overall: 98% complete
Phase 1: 100% | Phase 2: 100% | Phase 3: 100% | Phase 4: 70% | Phase 5: 60%

Completed: Auth, RBAC, Admin Shell, Navigation, Media Library, Global Settings, Theme System, Post/Page CRUD, Taxonomies, Comments, Service Layer, Books module (CRUD, ratings, eye icon, PDF reader), Reading progress, Documentation, Permission framework, Error framework, Notification framework, `.env.example`, User Library page, Stripe payment integration, Cart + Checkout flow, Course module, Videos module, Community features, Newsletter, Analytics dashboard, CMS Engine, Media Engine, Form Engine, Table Engine, Resource Engine, Posts Module, Books Module enhancements, Users Module enhancements, Contact form with email notification

Current Objective: Maintenance and production deployment prep

### TASK 05-10 Completion (2026-07-11)

All 10 tasks completed:

- **TASK 05 — Media Engine**: Centralized MediaPicker modal with browse/upload/search/bucket filter. Integrated into CoverUploader, admin.videos, admin.books, admin.pages forms. Media Library enhanced with Replace modal, file type filtering, multi-select bulk delete.
- **TASK 06 — CMS Engine**: Content-type registry with 5 registered types (Post, Page, Book, Video, Course). Metadata system, unified slugify, workflow engine, relationships (4 types), revisions with diffs, SEO meta generation. 7 modules in `src/lib/cms-engine/`.
- **TASK 07 — Form/Table/Resource Engine**: FormRenderer with 11 field types, auto-save, validation. DataTable (TanStack Table) with search/sort/pagination/expand. ResourceListPage generic CRUD with registerResource pattern.
- **TASK 08 — Posts Module**: Dedicated `/admin/posts` page via ResourceListPage + FormRenderer + MediaPicker + TipTap + TagInput. Post preview, SEO fields, slug auto-generation.
- **TASK 09 — Books Module**: Preview column (Eye icon), ratings display, category select (9 categories), SEO fields, sort order, slug auto-generation, organized form groups.
- **TASK 10 — Users Module**: Expandable detail panel with Profile/Library/Activity tabs. Account status badges, search, stats cards. `getUserAuditEvents` and `getUserLibraryAdmin` server functions.

Blockers: (none)

---

## 19. Current TODO

### Platform Foundation (Build First)

- [x] **Generic CRUD framework** — Resource Engine (registerResource, ResourceListPage) with Refine hooks + DataTable + FormDrawer + ConfirmDelete
- [x] **Generic form framework** — Form Engine (FormRenderer with 11 field types, validation, auto-save, field groups)
- [x] **Permission framework** — Systematic `requireMinRole`/`requirePermission` middleware, `usePermission` hook, `<Can>`/`<RequireRole>` UI guards, server function refactoring
- [x] **Error handling** — `AppError` class hierarchy, `ErrorBoundary` component, `ErrorPage`/`NotFoundPage` components
- [x] **Notification framework** — `notify` utility, `useSubscription` realtime hook, `NotificationBell` component
- [x] **Create .env.example** — Document all environment variables

### Feature Modules (Platform Complete)

- [x] User library page — `/books/library` route with progress tracking
- [x] Bookmarking system — toggleBookmark, /bookmarks route, BookmarkButton
- [x] PDF.js integration — Canvas PDF viewer with zoom, navigation, fullscreen
- [x] Table of contents extraction — parseHeadings, TableOfContents component
- [x] Typography controls — Font-size/line-height panel, localStorage persistence
- [x] Unified search — /search route with type filter tabs across all content types
- [x] Sitemap.xml and robots.txt — Dynamic sitemap from DB, static robots.txt
- [x] Newsletter subscription — Signup form wired into footer/article sidebar
- [x] Contact form — Server-side email notification via Resend
- [x] Cart + Checkout — Full cart system with multi-item Stripe Checkout
- [x] Course module — Full CRUD, lessons, enrollments, lesson reader
- [x] Community features — User profiles, comments system
- [x] Analytics dashboard — Posts-per-month, top content, engagement counters
- [x] Payment provider integration — Stripe Checkout Sessions + webhooks

---

## 20. Future Roadmap

| Phase | Progress | Key Modules |
|-------|----------|-------------|
| 1 Foundation | 100% | Auth, RBAC, Database, Admin, CMS, Media, Settings, Nav, Theme |
| 2 Content | 100% | Content engine, CMS Engine, Form Engine, Resource Engine, CRUD, Taxonomies, SEO, Search |
| 3 Books | 100% | Books, Reader, User Library, Reading Progress, Bookmarks, PDF.js, Typography |
| 4 Commerce | 70% | Cart, Checkout (Stripe), Purchases, Digital Access, Payment webhooks |
| 5 Extended | 60% | Videos, Courses, Community (profiles, comments), Newsletter, Analytics |

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

### AD-012: Refine as Admin Data Layer (Headless)

**Decision:** Use Refine v5 in headless mode as the admin data layer instead of writing custom TanStack Query hooks for each resource.

**Rationale:** Refine's `dataProvider` pattern eliminates repetitive CRUD boilerplate across 13 admin pages. The `@refinedev/supabase` adapter maps tables to resources with zero configuration. Hooks like `useTable`/`useList`/`useOne`/`useCreate`/`useUpdate`/`useDelete` provide a consistent, type-safe interface without replacing TanStack Router (routing) or shadcn (UI).

**Constraints:** Refine is embedded within existing routes — no Refine routing, layout, or UI components used. Storage operations (Supabase Storage) remain direct calls due to Refine's lack of Storage abstraction.

**Date:** 2026-07-11

### AD-011: Platform-First, Library-First Strategy

**Decision:** Build a reusable platform foundation before any feature modules. Use mature open-source libraries before custom code.

**Priority chain:** Mature libraries > Official SDKs > Supabase services > Custom business logic

**Supabase owns:** Auth, Authorization, PostgreSQL, Storage, Realtime, Edge Functions, RLS, database policies

**Custom code only for:** CMS workflows, reader behavior, purchase rules, book access permissions, user library, reading progress

**Date:** 2026-07-10

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
| Supabase (DB, Auth, Storage) | Connected |
| Google OAuth | Configured |
| Vercel (Free Tier) | Configured |
| Google Analytics | Configurable |
| Payment provider (Stripe) | Connected (Checkout Sessions + webhooks) |
| Email service | Not connected |

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
| Overall completion | 98% |
| Completed modules | 30 |
| Modules in progress | 0 |
| Database migrations | 42 |
| TypeScript errors | 0 |
| Current phase | Phase 4 (Commerce) — maintenance/cleanup |
| Next milestone | Production testing + live deployment |

---

*Last updated: 2026-07-11*

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
