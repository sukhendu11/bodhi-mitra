# Changelog

## 2026-07-10

### Documentation

- Rewrote PROJECT.md with full architecture, 5-phase roadmap, 17 core modules, 10 architecture decisions
- Restructured docs into 3 tiers: README.md (public), RULES.md (engineering), PROJECT.md (architecture)
- Removed deprecated CODING_FLOW.md, DESIGN_FLOW.md, PROJECT_STATE.md

### Added

- Interactive eye icon on Books page: opens PDF (free/owned), purchase modal (premium), or auth modal (unauthenticated)
- Purchase modal + inline PDF reader with signed URL session handling
- Locked/unlocked visual badges on book cards
- Auth resume flow (useRef pattern, AD-010)
- Books backend: purchases, reading_progress, book_ratings tables with triggers
- Private book-pdfs bucket with RLS
- **Permission framework**: `src/lib/permissions.ts` (`requireMinRole`, `requirePermission` middleware factories), `src/hooks/usePermission.ts` (consolidated `usePermission()` hook with `can()` helper), `src/components/admin/permission-guard.tsx` (`<Can>`, `<RequireRole>` UI components)
- **Error framework**: `src/lib/errors.ts` (`AppError` class with factory methods — `AppError.auth()`, `.permission()`, `.notFound()`, `.validation()`, `.server()`), `src/lib/error-reporting.ts` (`captureError`, `reportError` service), `src/components/error-page.tsx` (reusable `ErrorPage`, `NotFoundPage` components), `src/components/error-boundary.tsx` (React `ErrorBoundary` class component)

### Changed

- Deployment: Cloudflare Workers -> Vercel Free Tier (docs aligned with existing nitro preset)
- **Server functions refactored**: `getAuditLog`, `inviteUserFn`, `deleteUserFn`, `bulkSetRoleFn`, `bulkDeleteUsersFn` now use `requireMinRole` middleware instead of inline RBAC queries
- **Admin route guard**: `admin.tsx` `beforeLoad` now calls `checkAdminAccess()` server function instead of inline `supabase.auth.getUser()` + DB query
- **Error components standardized**: `__root.tsx`, `admin.tsx`, `posts.$slug.tsx` errorComponents replaced with `ErrorPage`; `__root.tsx` `NotFoundComponent` replaced with `NotFoundPage`
- **Error coverage**: All 13 admin child routes now have an `errorComponent` via `ErrorPage`
- **Error boundary**: `__root.tsx` wraps both admin and public sections with `ErrorBoundary`
- **Notification framework**: `src/lib/notifications.ts` (`notify` utility with `success/error/info/warning/promise`, `useSubscription` realtime hook, `useAdminNotifications` for comment alerts), `src/components/notification-bell.tsx` (replaces static bell in admin layout with live dropdown showing new comment/reply notifications)
- **Admin notification bell**: Wired into `admin.tsx` — replaces the dummy placeholder with a real `NotificationBell` component showing unread count with ping animation, dropdown with time-ago formatting, and mark-all-read action
- **`.env.example`**: Created with all 6 required environment variables documented (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MANAGEMENT_KEY)
- **User Library page**: `src/routes/books.library.tsx` (`/books/library` route), `getMyLibrary` server function in `books-purchases.ts` (joins purchases + books + progress server-side), `LibraryBookCard` component with cover, progress bar, status badges, "My Library" link added to desktop nav header and mobile nav for signed-in users
- **Unified search**: `src/lib/search.ts` (`searchContent` server function), `src/routes/search.tsx` (`/search` route with search bar, type filter tabs, paginated result cards, loading/empty states), search icon link in public header desktop nav
- **Sitemap & robots.txt**: `public/robots.txt` (static, allows all, points to sitemap), `src/routes/sitemap.xml.tsx` (dynamic sitemap route), `src/lib/sitemap.ts` (`generateSitemap` server function queries posts/pages/books/videos and returns XML)
- **Newsletter subscription**: `supabase/migrations/20260710000001_create_newsletter_subscribers.sql` (table with RLS), `src/lib/newsletter.ts` (`subscribeToNewsletter` server function with email validation + duplicate handling), `src/components/NewsletterSignup.tsx` (form with loading/success/error states), wired into post article sidebar and footer
- **Bookmarking system**: `supabase/migrations/20260710000002_create_bookmarks.sql` (table with unique user+post, RLS), `src/lib/bookmarks.ts` (toggleBookmark/getUserBookmarks/getBookmarkStatus server functions), `src/components/BookmarkButton.tsx` (toggle button on post pages with auth check), `src/routes/bookmarks.tsx` (`/bookmarks` route with list/empty/signed-out states), nav links in desktop header and mobile nav
- **Typography controls**: `src/components/TypographyControls.tsx` (font-size S/M/L/XL, line-height Tight/Normal/Relaxed, dropdown panel, persisted to localStorage), `useTypography` hook wrapping settings, wired into post article content via CSS class
- **Analytics dashboard widget**: Extended `getDashboardStats` server function with posts-per-month trend (6-month), top commented posts (top-5 via join), top rated books (top-5 by avg_rating), engagement counters (comments/purchases/ratings). `src/components/admin/analytics-widgets.tsx` — `AnalyticsOverview` (3 stat cards), `MonthlyPostChart` (CSS bar chart), `TopContent` (commented posts + top rated books). Wired into admin dashboard below stats grid.
- **PDF.js integration**: `npm install pdfjs-dist`, `src/components/PdfViewer.tsx` (canvas rendering, page navigation, zoom in/out, fullscreen toggle, keyboard shortcuts, loading/error states). Replaced iframe-based readers in `books.$slug.tsx` (full page) and `books.tsx` (dialog) with PdfViewer.
- **Community features**: `src/routes/profile.tsx` (`/profile` route with display name editing, member-since date, comment count, avatar with initials fallback), profile links in desktop header and mobile nav for signed-in users.
- **Course module**: `supabase/migrations/20260711000001_create_courses.sql` (courses, course_lessons, enrollments, lesson_progress), `src/lib/courses.ts` (20+ server functions), public routes (`/courses`, `/courses/$slug`, `/courses/$courseSlug/lessons/$lessonSlug` lesson reader with prev/next navigation), admin routes (`/admin/courses` list, `/admin/courses/$id` form with inline lesson CRUD)
- **Admin course form**: `src/routes/admin.courses.$id.tsx` (create/edit form with slug/title/description/cover/level/duration/published fields, inline lesson add/edit/delete, wired into admin sidebar, mobile nav, and route labels)
- **Stripe payment integration**: `npm install stripe`, `src/integrations/stripe/server.ts` (Stripe client singleton), `src/integrations/stripe/config.ts` (redirect URL helpers), `src/lib/stripe-checkout.ts` (`createCheckoutSession` server function), `src/routes/api/stripe-webhook.ts` (server route for `checkout.session.completed` webhook with signature verification), updated `purchaseBookAction` (creates Checkout Session for paid books), updated frontend `books.$slug.tsx` / `books.tsx` (redirect to Stripe, handle success/cancel return), `.env`/`.env.example` (added `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`)
- **PROJECT.md**: Updated all status sections, phase percentages (Phase 3 → 100%, Phase 4 → 40%, overall → 95%), added Stripe update entry

### Fixed

- Login redirect loop (includes("/admin") catches full URLs)
- Auth resume closure bug (pendingBookRef + userRef pattern)
- TypeScript errors in books.tsx (missing search params, queryClient, Download import)
- Pre-existing TS error in admin.functions.ts (implicit `any` in `forEach` callback)