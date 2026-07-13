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
| **Search (V2)** | Meilisearch (planned) | Self-hosted full-text search with Bangla language support |
| **Podcasts (V2)** | Castopod (planned) | Self-hosted podcast hosting with Podcasting 2.0 standards |

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
V2 (planned): Meilisearch — self-hosted Docker container with Supabase sync via Edge Functions. Automatic language detection for English + Bangla, typo-tolerant search-as-you-type.
Fallback: PostgreSQL tsvector + pg_trgm retained for admin/internal search.

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

Milestone: Phase 08 — Website Settings & Global Configuration Complete
Overall: 99% complete
Phase 1: 100% | Phase 2: 100% | Phase 3: 100% | Phase 4: 72% | Phase 5: 62% | Phase 6: 100% | Phase 7: 100% | Phase 8: 100%

Completed: Auth, RBAC, Admin Shell, Navigation, Media Library, Global Settings, Theme System, Post/Page CRUD, Taxonomies, Comments, Service Layer, Books module (CRUD, ratings, eye icon, PDF reader), Reading progress, Documentation, Permission framework, Error framework, Notification framework, `.env.example`, User Library page, Stripe payment integration, Cart + Checkout flow, Course module, Videos module, Community features, Newsletter, Analytics dashboard, CMS Engine, Media Engine, Form Engine, Table Engine, Resource Engine, Posts Module, Books Module enhancements, Users Module enhancements, Contact form with email notification, **BlockEditor v2** (DraftComparison, KeyboardShortcuts dialog, autosave indicator, media picker, drag-and-drop upload, embed support, inline image editing, Ctrl+D duplicate block, 147 tests), **Visual Page Builder** (20 component types, drag-and-drop, live editing, responsive preview, undo/redo, auto-save, 5 templates, style panel with typography/colors/gradients/borders/shadows/spacing/sizing/position/flex/grid/animations/hover effects, responsive breakpoint overrides sm/md/lg/xl, Section Library with export/import, marketplace of 10 bundled sections, SectionPreview wireframes, Folder organization, frontend rendering with hover/responsive CSS injection), **Theme Builder & Design System** (accent color propagation to --primary semantic tokens, 6 theme presets, typography controls with font family selection, border radius scale, custom CSS injection, deep recursive config merge), **Website Settings & Global Configuration** (maintenance mode with bilingual page, 8 feature flags with hook, reader settings defaults, commerce settings with currency/tax/refund, dynamic Google Fonts loading), **319 tests**

Current Objective: V2 Sprint 1 continued — Supabase types regeneration, Orders panel, Email automation

### Phase 04 — BlockEditor & Form Engine (2026-07-13)

**Completed:**
- BlockEditor v2: DraftComparison, KeyboardShortcuts, save status indicator, media integration (MediaPicker, drag-and-drop, embeds), inline image editing (alt/width/remove)
- Form Engine: useFormKeyboard hook (Ctrl+S save, Escape cancel), accessibility attributes across all 13+ field types (aria-required, aria-describedby, aria-label, role=group), RequiredIndicator component, FieldDescription component with unique ID linkage
- Autosave indicator: BlockEditorSaveContext for threading status through form engine, useAutoSave integration in admin.pages.tsx, useContentAutosave in admin.collections.$type.$id.tsx
- onSave/onCancel wiring: ResourceListPage (all resource forms), admin.pages.tsx
- Test expansion: 35 BlockEditor tests + 16 useFormKeyboard tests = 51 new tests (147 total)

**New files created:**
- src/components/admin/block-editor/DraftComparison.tsx
- src/components/admin/block-editor/KeyboardShortcuts.tsx
- src/components/admin/block-editor/MediaExtension.tsx
- src/components/admin/form-engine/use-form-keyboard.ts
- src/components/admin/block-editor/__tests__/BlockEditor.test.tsx
- src/components/admin/form-engine/__tests__/use-form-keyboard.test.tsx

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

## 20. Version 2 — Sprint Roadmap

### Sprint 1 — Foundation Hardening

| Task | Effort | Value |
|------|--------|-------|
| Supabase types regeneration (eliminate 246 `as any`) | Low | High |
| Orders management panel (purchase admin view) | Low | High |
| Test coverage expansion (reader, cart, courses) | Medium | High |
| Email automation (purchase confirmation emails) | Low | High |

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
| Coupon/discount codes (Stripe native API) | Low | Medium |
| Donations page (Stripe Payment Links) | Low | Medium |
| Purchase history page for users | Low | Medium |

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

| Metric | V1 Baseline | V2 Target |
|--------|-------------|-----------|
| TypeScript errors | 0 | 0 |
| `as any` casts | 246 | <50 |
| Test count | 62 | 150+ |
| Test coverage | ~15% of lib/ | >60% of lib/ |
| User-facing search | ILIKE (basic) | Meilisearch (production) |
| Reading features | View + progress | View + progress + annotate |
| Commerce features | Purchase + cart | Purchase + cart + coupons |
| Content types | 5 | 6 (+ podcast) |
| Lighthouse score | Unknown | >90 all categories |

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

### AD-013: Meilisearch for Public Search

**Decision:** Use Meilisearch (self-hosted Docker) as the dedicated search engine for public-facing search, replacing PostgreSQL ILIKE queries for user-facing features.

**Rationale:** PostgreSQL ILIKE queries do not handle Bangla (non-Latin script) well. Meilisearch offers automatic language detection, typo tolerance, search-as-you-type, and disk-based scalability. Keeps PostgreSQL FTS as fallback for admin/internal search.

**Architecture:** Sidecar Docker container, sync via Supabase Edge Functions + Database Webhooks. Initial load via one-time script.

**Date:** 2026-07-11 (V2 Planning)

### AD-014: Stripe Native Coupons (Not External Platform)

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
| V1 overall completion | 99% |
| V2 planning | Complete |
| Completed modules | 33 |
| Modules in progress | 5 (V2 Sprints) |
| Database migrations | 42 |
| TypeScript errors | 0 |
| `as any` casts | 246 (target: <50) |
| Test count | 319 (target: 150+) ✅ |
| Current phase | Phase 06 — Section Library Expansion |
| Next milestone | V2 Sprint 1 continued (Supabase types, Orders, Email automation)

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

*Last updated: 2026-07-13*

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
