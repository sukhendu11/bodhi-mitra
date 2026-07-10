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
| **Payment** | Not yet connected |
| **Status** | Partial (no payment provider) |

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
| Content engine | In Progress | Page builder exists, needs generalization |
| CRUD framework | In Progress | RHF + Zod patterns exist, not abstracted |
| Schema-driven forms | Not started | Forms are hand-built per module |
| Taxonomies | Done | Categories + Tags with junction tables |
| SEO foundation | Done | Per-route meta, GA injection, sitemap |
| Search foundation | In Progress | Full-text search needs unified layer |

### Phase 3 - Books & Reading

| Module | Status | Notes |
|--------|--------|-------|
| Books module | Done | CRUD, grid, detail, ratings, search |
| Reader module | Done | PDF viewer with signed URLs |
| User library | Not started | Needs personal library page |
| Reading progress | Done | Per-user tracking per book |
| Bookmarks | Not started | |
| Notes | Not started | |
| Highlights | Not started | |

### Phase 4 - Commerce (Not Started)

| Module | Status |
|--------|--------|
| Commerce core | Not started |
| Cart | Not started |
| Checkout | Not started |
| Orders | Not started |
| Payments | Not started |
| Coupons | Not started |
| Purchases | In Progress |
| Digital access | In Progress |

### Phase 5 - Extended Features (Not Started)

| Module | Status |
|--------|--------|
| Videos | MVP Complete |
| Courses | Not started |
| Podcasts | Not started |
| Community | Not started |
| Newsletter | Not started |
| Donations | Not started |
| Analytics | Not started |

---

## 7. CMS Architecture

### Core Pattern

```
Route (/admin/[resource])
  |
beforeLoad (auth + role guard)
  |
DataTable (TanStack Table) - list view
  |
Dialog / Sheet - create/edit form
  |
Server Function - CRUD operation
  |
React Query - cache invalidation
```

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
Overall: 42% complete
Phase 1: 95% | Phase 2: 40% | Phase 3: 60% | Phase 4: 5% | Phase 5: 10%

Completed: Auth, RBAC, Admin Shell, Navigation, Media Library, Global Settings, Theme System, Post/Page CRUD, Taxonomies, Comments, Service Layer, Books module (CRUD, ratings, eye icon, PDF reader), Reading progress, Documentation

Current Objective: Complete the remaining platform foundation before building any new feature modules

Blockers: Generic CRUD framework not abstracted, Generic form framework not abstracted, Permission framework not systematic, Error handling not standardized, No notification framework, No .env.example

---

## 19. Current TODO

### Platform Foundation (Build First)

- [ ] **Generic CRUD framework** — Abstract TanStack Table patterns into reusable DataTable component with sorting, filtering, pagination, and row actions
- [ ] **Generic form framework** — Abstract React Hook Form + Zod patterns into reusable FormField, FormDialog, and FormSheet components
- [ ] **Permission framework** — Systematic `withPermission` middleware, permission-gated UI components, and role-based route configuration
- [ ] **Error handling** — Standardized error boundary, error page components, and error reporting service
- [ ] **Notification framework** — Systematic toast patterns for success/error/info, subscription-based notifications
- [ ] **Create .env.example** — Document all required environment variables

### Feature Modules (Only After Foundation Complete)

- [ ] User library page
- [ ] Bookmarking system
- [ ] PDF.js integration (replace iframe)
- [ ] Table of contents extraction from PDFs
- [ ] Typography controls in reader
- [ ] Unified search across all content types
- [ ] Sitemap.xml and robots.txt at standard routes
- [ ] Newsletter subscription form
- [ ] Contact form with server-side email
- [ ] Payment provider integration (Stripe)
- [ ] Cart + checkout flow
- [ ] Course module
- [ ] Community features
- [ ] Analytics dashboard widget

---

## 20. Future Roadmap

| Phase | Progress | Key Modules |
|-------|----------|-------------|
| 1 Foundation | 95% | Auth, RBAC, Database, Admin, CMS, Media, Settings, Nav, Theme |
| 2 Content | 40% | Content engine, CRUD framework, Forms, Taxonomies, SEO, Search |
| 3 Books | 60% | Books, Reader, Library, Progress, Bookmarks, Notes, Highlights |
| 4 Commerce | 5% | Cart, Checkout, Orders, Payments, Coupons, Purchases |
| 5 Extended | 10% | Videos, Courses, Podcasts, Community, Newsletter, Donations |

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
| Payment provider (Stripe) | Not connected |
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
| Overall completion | 42% |
| Completed modules | 18 |
| Modules in progress | 4 |
| Database migrations | 40+ |
| TypeScript errors | 0 |
| Current phase | Phase 3 (Books & Reading) |
| Next milestone | User Library + Reader improvements |

---

*Last updated: 2026-07-10*
