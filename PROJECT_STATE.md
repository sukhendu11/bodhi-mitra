# 📊 PROJECT STATE

## PURPOSE
Single source of truth for project progress. Must always reflect the real system state.

# ⚠️ VALIDATION RULE

The agent must NOT mark any task as "fixed", "completed", or "working" unless explicitly validated and confirmed by the user.

If a change is made:
- It must be marked as "pending validation"
- Only the user can confirm completion
- The agent cannot assume success based on implementation alone

---

## 🟢 DONE

### Core Infrastructure
- TanStack Start SSR with Cloudflare Workers deployment
- TanStack Router file-based routing (15 routes with route tree generation)
- TanStack React Query for all server state
- Tailwind CSS v4 + shadcn/ui (New York style, 40+ components)
- TypeScript strict mode with path aliases
- ESLint + Prettier for code quality
- npm dependencies installed (564 packages, 0 vulnerabilities)

### Auth System
- Supabase Auth (email/password + Google OAuth)
- useAuthSession hook with onAuthStateChange subscription
- useIsAdmin hook querying user_roles table
- Admin route guard (beforeLoad with Supabase auth + role check)
- Google OAuth error handling (URL hash/query parsing)
- Onboarding flow at /onboarding with claim_admin_role RPC
- Server function middleware chain: attachSupabaseAuth + requireSupabaseAuth

### CMS / Admin Panel
- Admin layout at /admin with auth guard
- Post list with All / Published / Drafts tabs
- Create post (/admin/new) -- bilingual EN/BN TipTap editor
- Edit post (/admin/$id) -- pre-filled form
- Delete post with confirmation dialog
- Site Settings customizer at /admin/settings (10 tabs):
  - Branding (logo upload, favicon, site name)
  - Homepage hero (visibility, content, CTA -- bilingual)
  - Article page toggles (author bio, related posts, sidebar, newsletter)
  - About page (hero, body, mission, editorial note -- bilingual)
  - Contact page (form labels, details, map embed -- bilingual)
  - Dynamic Pages CRUD (add/remove/configure pages)
  - Theme (accent color picker, dark mode, logo slider)
  - Nav & Footer labels (bilingual)
  - Social media links
  - SEO (meta descriptions, OG image upload, Google Analytics ID)

### Post System
- Full CRUD with Supabase posts table
- Bilingual fields (title_en/bn, content_en/bn, excerpt_en/bn)
- Legacy single-language field mirroring via toRow() helper
- Cover image upload (drag-drop, file picker, URL paste, 8 MB limit)
- TipTap rich text editor (Bold, Italic, H2, H3, Quote, Lists, Undo)
- Preview mode with live article rendering
- Draft / publish workflow
- Tags with comma/enter input and visual chips
- Author name + profile picture upload (Supabase Storage)
- Category filters: All / Buddhist Psychology / Wisdom / Books
- **PostForm.tsx decomposed** — CoverUploader, TagInput, PostPreview extracted (~400→160 lines)

### Comment System
- Nested threads with parent-child relationships
- CRUD via server functions with auth/permission enforcement (add, edit own, delete own or admin)
- AuthModal: sign in/sign up modal (email + Google OAuth) triggers on guest comment/reply actions
- ConfirmDialog: shadcn AlertDialog for delete confirmation ("Yes, delete" / "Cancel")
- Any authenticated user can reply (not just admins)
- Instant rendering: skeleton loading animation + placeholderData, no lazy/Suspense delay
- "Comment" label replaces "Post" throughout UI
- Edit history tracked via updated_at timestamp
- LetterAvatar for comment authors (deterministic color palette)
- 2,000 character limit per comment, validated client + server side

### Media Upload
- Cover images to blog-images Supabase Storage bucket
- Author avatars to avatars bucket (user-scoped folders, RLS policies)
- Site assets to site-assets bucket (signed URL upload, admin-only)
- File validation: type restriction (JPG/PNG/WEBP/GIF/AVIF), size limits

### SEO System
- Dynamic root route head() with OG image, site name, meta from settings
- Route-level meta tags on every page (title, description, OG, Twitter)
- Google Analytics injection (GA4 + UA, regex-validated)
- Custom 404 and error components
- SSR error fallback page

### Internationalization
- Bilingual EN/BN toggle persisted to localStorage
- LanguageProvider + useLang hook with translation dictionary
- pickLocalized() utility for content field selection
- data-lang attribute for Bangla font switching (Hind Siliguri)

### Error Handling
- Global error/rejection capture for SSR recovery
- h3 SSR error detection -- catches swallowed errors, returns branded HTML
- Middleware error wrapper in start.ts
- errorComponent and notFoundComponent on every route

### Documentation
- README.md -- full project description, tech stack, setup, features, architecture
- DESIGN_FLOW.md -- system philosophy, user flows, route map, design system
- CODING_FLOW.md -- architecture pattern, file conventions, naming, best practices
- PROJECT_STATE.md -- this file

### Infrastructure
- GitHub repo connected: https://github.com/sukhendu11/bodhi-mitra
- TypeScript typecheck passes cleanly (zero errors)
- Dev server verified: all pages load, language toggle works, admin redirects
- 📄 LICENSE file added (MIT)
- `.env` added to `.gitignore`, `node_modules_old/` added to `.gitignore`
- npm dependencies installed (564 packages)
- Supabase project credentials present (anon + service_role keys configured)
- Supabase CLI authenticated and project linked

### Database
- **23/23 migrations applied** — all tables created (posts, comments, profiles, user_roles, site_settings)
- RLS policies configured for all tables and storage buckets
- Storage buckets created: blog-images, avatars, site-assets
- Admin RPC functions deployed: claim_admin_role(), get_admin_claim_status()
- Site settings seeded with default singleton row

### Documentation
- README.md -- comprehensive project docs (description, tech stack, setup, architecture)
- DESIGN_FLOW.md -- system philosophy, user flows, route map, design system
- CODING_FLOW.md -- architecture pattern, file organization, naming, best practices
- PROJECT_STATE.md -- this file

### CMS Architecture Expansion — Pending Validation
- **Database migrations (8 new):**
  - `20260605000001` — `media_assets` table with full-text search, RLS policies, auto-timestamp trigger
  - `20260605000002` — `pages` table with bilingual fields, visibility, sort order, auto-timestamp trigger. Seeded with 4 default pages (buddhist-psychology, wisdom, books, satsang)
  - `20260605000003` — `books` table (PDF-based digital products) with full-text search, price/is_free/status/featured fields, RLS policies
  - `20260605000004` — Taxonomy system: `categories` (bilingual, color, sort, visibility), `tags` (bilingual, color), and polymorphic junction tables `content_categories` + `content_tags` for any content type (post/book/page). Seeded with 3 default categories.
  - `20260605000005` — `book-covers` storage bucket (50MB limit, JPG/PNG/WEBP/PDF) with RLS policies
  - `20260605000006` — Storage RLS policies for `blog-images` bucket (was missing from earlier migrations)
  - `20260605000007` — `navigation_items` table with parent/child relationships, type (link/dropdown/heading/external), visibility, sort order, RLS policies
  - `20260605000008` — `storage_provider` column on `media_assets` (REVERTED in 00009)
  - `20260605000009` — DROP `storage_provider` column (R2 removed, Supabase-only restored)

- **Library modules (7 new):**
  - `lib/pages.ts` — Full CRUD for static pages (fetchAllPages, createPage, updatePage, deletePage, fetchPageBySlug)
  - `lib/media.ts` — Centralized media asset management (fetchMediaAssets with pagination/search/bucket filter, trackUpload, deleteMediaAsset with storage cleanup, getMediaStats)
  - `lib/books.ts` — Book CRUD (fetchPublishedBooks for public, fetchAllBooks for admin, createBook, updateBook, deleteBook, getBookStats, fetchBookBySlug)
  - `lib/taxonomy.ts` — Categories & tags CRUD (fetchAllCategories, createTag, setContentCategories/setContentTags for polymorphic assignment, findOrCreateTag)
  - `lib/navigation.ts` — Navigation items CRUD (fetchNavItems, create/update/delete, buildNavTree)
  - `lib/admin-comments.ts` — Admin comment moderation server functions (delete, edit, fetch contact messages)
  - `lib/seo.ts` — Server-side SEO functions (isSitemapEnabled, generateSitemapXml, generateRobotsTxt)

- **Admin routes (6 new):** (R2 implementation removed — Supabase Storage is the sole storage backend)
  - `/admin/pages` — Page list with visibility indicators (green/grey dot), modal CRUD form with bilingual content, banner upload, SEO fields, visibility toggle, sort order, AlertDialog delete confirmation
  - `/admin/media` — Media Library with grid/list toggle view, bucket filter (blog-images/site-assets/book-covers/avatars), file upload with multi-file support, text search, pagination, detail slide-over panel with copy URL / open / delete actions, file size formatting
  - `/admin/books` — Shopify-style product grid with cover images, status badges (green=published/amber=draft/slate=archived), Free/Paid price badges. Stats cards (Total/Published/Drafts/Archived/Free). Modal CRUD form with cover image upload, PDF upload with file size tracking, bilingual fields, price/is_free toggle, featured toggle, pages/isbn metadata, status workflow selector (draft/published/archived). Hover overlay with View/Edit/Delete actions.
  - `/admin/taxonomy` — Tabs UI for Categories (color picker, bilingual name/description, visibility toggle, sort order, inline edit/create/delete) and Tags (color-coded chips with inline edit/delete, create form)
  - `/admin/comments` — Comments Moderation with separate Comments (stats, search, inline edit/delete via server functions with supabaseAdmin) and Contact Messages (unread filter, detail panel, reply via email) tabs
  - `/admin/navigation` — Menu Management with drag-and-drop tree builder, inline editing, nested items, external/internal/dropdown types, visibility toggles

- **Public routes (2 updated):**
  - `/books` — Rebuilt from CategoryPage wrapper into full-featured Books page. Shopify-style 4-column grid with cover images, hover preview overlay, Free/Featured badges, page/size metadata. Detail modal with cover + bilingual description + metadata (pages, ISBN, price) + inline PDF viewer (iframe) + download button.
  - `__root.tsx` — Dynamic Header + Footer navigation sourced from DB navigation_items table

- **Navigation updated:**
  - Admin sidebar restructured into 3 sections: Content (Posts, New Post, Books, Pages, Media, Comments Moderation), Structure (Navigation, Taxonomy, Users), Management (Audit Log, Settings)
  - Mobile nav bar updated with all new admin routes
  - Breadcrumb labels for all new routes

### Visual Polish
- Tags now render as modern rounded-full pills with border, hover transitions, and subtle transparency
- Consistent tag styling across post page, post cards, and admin preview

### UI/UX Enhancements (Session 2)
- **Footer redesign** — 4-column grid (Brand, Philosophy, Practice, Explore) with SVG social icons, CMS-driven bilingual labels, SPA navigation
- **Global hover effects** — Consistent `hover:translate-x-0.5` nudge + sliding underline pattern across all nav elements (header top-level links, dropdown triggers, dropdown items, mobile nav items, admin/sign-in buttons)
- **Page fade-in animation** — `@keyframes page-enter` on `<main>` element (opacity + 6px translateY, 350ms, respects reduced motion)
- **Post card hover lift** — `hover:-translate-y-1 hover:shadow-md` with 300ms transition
- **Staggered post card entrance** — Cards animate in one-by-one via `stagger-enter` utility with 60ms delay increments, re-triggers on pagination
- **Auto scroll-to-top** — Smooth scroll on route navigation via `router.subscribe`, properly cleaned up in `useEffect`
- **Filter active indicator** — Absolute `<span>` underline on category filter buttons
- **Shimmer loading skeletons** — `@keyframes shimmer` with moving gradient overlay on skeleton elements
- **PostCardSkeleton** — Ghost element matching PostCard layout (cover area, category, title, excerpt, tags, author)
- **ArticleSkeleton** — Ghost element matching article page (header, cover, paragraphs, related posts)
- **Reading progress bar** — Fixed 3px saffron bar at top of viewport, tracks scroll position via RAF-throttled listener
- **Scroll-triggered reveal** — `Reveal` IntersectionObserver component: fade-up on scroll with configurable delay/distance/duration, applied to hero sections, about page, article sections, contact page, satsang page, category pages
- **Reading time badge** — Word count calculation (~200 wpm), displayed as uppercase badge in article header author line
- **Mobile responsiveness fixes** — Pagination buttons `min-h-[44px]`, filter buttons larger touch targets, author bio `flex-wrap` for overflow protection, shimmer `will-change` GPU hint
- **Scroll-to-top button** — Fixed bottom-right circular button, appears after 400px scroll, RAF-throttled, 44px mobile touch target
- **Table of Contents** — Sticky desktop sidebar + mobile collapsible accordion, parses HTML headings, injects `id` + `scroll-mt-24` anchors, IntersectionObserver tracks active section, smooth scroll navigation
- **Hover dropdown menu** — Philosophy/Practice dropdowns in desktop nav now open on hover (not click) with 150ms close delay, smooth zoom+fade+slide animation via `tw-animate-css`, click still works on mobile

### Bug Fixes
- Fixed TypeScript error in Comments.tsx: `<Link to="/login">` now passes required `search` prop

---

## 🔴 PENDING

### Database & Data
- **Seed data deployed** — 5 sample posts + 5 comments in the database
- Admin role granted to user `sukhenduchakma77@gmail.com` (UUID: `37357014-5df2-4877-a96b-8a8baef5cdb6`)
- Site settings stored as monolithic JSON blob -- write contention risk

### Testing
- No test files or test framework configured
- No Storybook or visual regression tests

### Performance
- No pagination on post lists (all rows fetched at once)
- Database indexes added on posts (slug, created_at, category, status) and comments (post_id)
- No staleTime on most React Query hooks (re-fetches on every mount)
- Route-level code splitting: lazy-loaded Comments, PostForm/TipTap, DOMPurify via SanitizedHtml

### Security
- No rate limiting on auth endpoints
- supabaseAdmin service-role client used in 3 server-only files (admin.functions.ts, admin-comments.ts, seo.ts) — properly isolated, never imported client-side
- Comment mutations now use server functions with auth/permission enforcement (add, edit, delete)
- Role-based RLS policies on all tables (posts, comments, site_settings, storage, contact_messages)
- Database-level permission checks via `has_permission()` and `has_min_role()` RPC functions
- Hierarchical role enforcement: admins cannot assign roles at or above their own level
- Super admin only can manage other super admins and modify role permissions

### Code Quality
- admin.settings.tsx decomposed into 11 tab components ✅
- PostForm.tsx decomposed into CoverUploader, TagInput, PostPreview ✅
- Comments.tsx partially decomposed (AuthModal, ConfirmDialog extracted)
- Legacy single-language post fields should be cleaned up after migration
- Translation dict has some overlap with DEFAULT_CONFIG content
- useRole.ts extracted for role-level client-side checks

### Features
- Route-level meta titles now dynamic from site settings (all routes) ✅
- Navbar restructured: Philosophy + Practice dropdowns with grouped sub-items ✅
- Mobile nav supports expandable accordion groups for dropdown items ✅
- Nav labels CMS-configurable via Site Settings (all 10 labels) ✅
- Dynamic menu management system with drag-and-drop admin UI (replaces hardcoded nav) — pending validation
- Role-based administration system with 6 tiers (super_admin → user) ✅
- Admin Users page with inline role assignment and hierarchical permission enforcement ✅
- Admin sidebar layout redesigned with nav + user info panel ✅
- Media Library page (grid/list toggle, bucket filter, multi-file upload, search, pagination) — pending validation
- Books admin module (Shopify-style grid CRUD with PDF upload, Free/Paid, status workflow) — pending validation
- Pages admin module (dedicated pages CRUD extracted from settings JSON) — pending validation
- Taxonomy admin module (categories & tags management) — pending validation
- Public Books page with grid layout + PDF viewer modal — pending validation
- Comments Moderation admin page (Comments tab with stats, search, inline edit/delete via server functions with supabaseAdmin; Contact Messages tab with unread filter, detail panel, reply via email) — pending validation
- Menu Management System at /admin/navigation with drag-and-drop tree builder, inline editing, nested items, external/internal/dropdown types, visibility toggles — pending validation
- Dynamic navigation in __root.tsx (Header + Footer) sourced from DB navigation_items table — pending validation
- Sitemap.xml generation at server level (static routes + published posts + visible pages) — pending validation
- Robots.txt generation with admin/auth disallows + sitemap link — pending validation
- No RSS feed or newsletter subscription backend

---

## RULE
Must be updated after every completed task.