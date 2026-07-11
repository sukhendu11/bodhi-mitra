# Changelog

## 2026-07-11

### Added

- **CMS Engine** — Reusable CMS foundation layer for all content types:
  - `src/lib/cms-engine/content-type.ts` — `ContentTypeDefinition` interface with table, slug, workflow, field, route, and feature flag (revisions, SEO, tags) support. `ContentTypeRegistry` with `registerContentType`/`getContentType`/`getAllContentTypes`/`getContentTypesByTable`. Predefined workflows (`BASIC_WORKFLOW`: draft/published, `EXTENDED_WORKFLOW`: draft/published/archived). Predefined field sets (`BILINGUAL_TITLE_FIELDS`, `BILINGUAL_DESCRIPTION_FIELDS`, `SEO_METADATA_FIELDS`, `TIMESTAMP_FIELDS`). Status helpers (`isValidTransition`, `getValidNextStatuses`, `getStatusLabel`, `getStatusColor`).
  - `src/lib/cms-engine/metadata.ts` — Field filtering (`getFormFields`, `getSeoFields`, `getSystemFields`, `getRequiredFields`, `getBilingualFields`). `mergeFields` for combining field arrays. `groupFields` for organizing into logical sections. `getDefaultValues` for generating form defaults.
  - `src/lib/cms-engine/slug.ts` — Unified `slugify` with options (separator, maxLength, lowercase, preserve). `validateSlug` against content type patterns. `autoGenerateSlug` from source fields. `ensureUniqueSlug` with counter suffix. Module-specific wrappers: `slugifyBook`, `slugifyTaxonomy`, `slugifyPage`, `slugifyPost`.
  - `src/lib/cms-engine/workflow.ts` — `getWorkflowActions` for status transition buttons. `isPubliclyVisible` check. `getDefaultStatus`, `getAvailableStatuses`. `buildStatusConfig` for rich status configs. `validateTransition` with descriptive error messages.
  - `src/lib/cms-engine/relationships.ts` — `RelationshipDef` with 4 types (`belongs_to`, `has_many`, `has_one`, `many_to_many`). `registerRelationships`/`getRelationships`/`getRelationship`/`getRelatedContentTypes`. `buildRelationshipQuery` for Supabase/RQL queries. Pre-built `CATEGORY_RELATIONSHIP`, `TAGS_RELATIONSHIP`, `authorRelationship()`, `childrenRelationship()`.
  - `src/lib/cms-engine/revisions.ts` — `Revision` type with version tracking. `computeDiff` for field-level comparison with `FieldDiff`. `summarizeChanges` for human-readable summaries. `createRevisionSnapshot` with system field stripping. `buildRevision` for creating revision records.
  - `src/lib/cms-engine/seo.ts` — `SeoData` type. `extractSeoData` from content data. `generateMetaTags` for HTML meta/OG/canonical/JSON-LD. `buildRouteMeta` for TanStack Router head config. `extractBilingualSeoData` for EN/BN pairs.
  - `src/lib/cms-engine/index.ts` — Barrel export with all 7 modules' exports. Side-effect import of `register-content-types.ts` to ensure content type registrations execute.
  - `src/lib/cms-engine/register-content-types.ts` — 5 content types registered: Post, Page, Book, Video, Course. Each with full config (table, slug, workflow, fields, routes, relationships).
  - **CMS Engine adoptions** — Ad-hoc slugify functions in `posts.ts`, `pages.ts`, `books.ts`, `taxonomy.ts` now delegate to CMS Engine versions.

- **Posts Module** — Dedicated `/admin/posts` page built on Resource Engine, Table Engine, Form Engine, Media Engine and CMS Engine:
  - `src/routes/admin.posts.tsx` — Post management using `ResourceListPage` with column definitions (title with cover thumbnail, author, status, created date, view link)
  - **PostFormContent** — Uses `FormRenderer` with 5 field groups (Content, Metadata, Excerpt, SEO, Publishing) plus custom children for language-tabbed TipTap Editors, TagInput, MediaPicker for featured image, and Preview toggle
  - **Features**: List, Create, Edit, Delete, Draft/Publish (filter + select), Categories (select), Tags (TagInput), SEO (meta description EN/BN), Featured Image (MediaPicker), Author (auto-fetch from Supabase profile), Preview (PostPreview component)
  - Slug auto-generation from English title, author fallback from authenticated user profile
  - All engines reused: Resource Engine (registerResource + ResourceListPage), Table Engine (DataTable), Form Engine (FormRenderer), Media Engine (MediaPicker)
  - `src/routes/admin.index.tsx` — Simplified to pure dashboard (stats, analytics, quick actions, recent activity, posts CTA card linking to /admin/posts). Removed full posts DataTable + filters + ConfirmDelete.
  - `src/routes/admin.$id.tsx` — Simplified to redirect to /admin/posts (editing handled via FormDrawer)
  - `src/routes/admin.new.tsx` — Simplified to redirect to /admin/posts (creation handled via FormDrawer)
  - `src/routes/admin.tsx` — Sidebar updated: Posts → /admin/posts, removed "New Post" sidebar item
  - `src/integrations/refine/resources.ts` — Posts resource list → /admin/posts, removed separate create/edit routes
  - `src/routeTree.gen.ts` — Added AdminPostsRoute to all type sections
  - `src/lib/schemas.ts` — Added `meta_description_en` and `meta_description_bn` to postSchema

- **Media Engine** — Centralized Media Manager with:
  - `src/components/admin/media-engine/types.ts` — `MediaPickerResult`, `MediaPickerOptions`, `MediaBucketDef` types. `MEDIA_BUCKETS` constant with 4 buckets (blog-images, site-assets, book-covers, avatars). `formatFileSize` utility.
  - `src/components/admin/media-engine/media-picker.tsx` — Reusable `MediaPicker` modal with Browse and Upload tabs. Browse tab: search, bucket filter, asset grid with selection checkmarks and confirm button. Upload tab: UppyUploader with bucket selector. Footer shows context-sensitive help text.
  - `src/components/admin/media-engine/use-media-picker.ts` — Simplified hook managing only `isOpen`/`options` state (callers provide own callbacks). Removed dead `handleSelect`/`onSelectRef`/`onCloseRef`.
  - `src/components/admin/media-engine/index.ts` — Barrel export.

- **Media Engine form integrations:**
  - `CoverUploader.tsx` — Refactored to use MediaPicker. Fixed optional chaining for `onSelect` callback.
  - `admin.videos.tsx` — Thumbnail URL input replaced with MediaPicker (browse/upload/search).
  - `admin.books.tsx` — Cover image + PDF uploads replaced with MediaPicker. Removed dead `supabase` import and inline `handleImageUpload`/`handlePdfUpload` functions. Fixed `columns: 3 as any` to `columns: 3 as const`.
  - `admin.pages.tsx` — Banner image upload replaced with MediaPicker. Removed dead `supabase`/`Input` imports.
  - `MediaPickerOptions.onSelect` made optional (component uses direct `onSelect` prop instead). Cleaned stale `onSelect: () => {}` callbacks from `options` prop across all consumers.

- **Media Library enhancements** (`admin.media.tsx`):
  - **Replace** — Replace modal with file input, upsert storage upload, and Refine `useUpdate` for metadata. Available in grid overlay, list actions, and asset detail panel.
  - **File type filtering** — All Types / Images / PDFs toggle via `mime_type` startswith filter.
  - **Multi-select bulk actions** — Selection checkboxes in grid and list views. Bulk delete confirmation banner with sequential Refine deletes and best-effort storage cleanup.
  - **Refactored to use `MEDIA_BUCKETS`** from the engine instead of local `BUCKETS` constant. Uses shared `formatFileSize` utility.

- **Form Engine** — Generic form rendering system for admin resources:
  - `src/components/admin/form-engine/types.ts` — `FormFieldDef`, `FormGroup`, `FormEngineConfig` types supporting 11 field types: text, textarea, number, select, checkbox, switch, color, url, email, bilingual, bilingual-textarea. Supports custom render overrides, conditional visibility, and 1/2/3-column group layouts.
  - `src/components/admin/form-engine/field-renderer.tsx` — `RenderField` component mapping field definitions to shadcn/ui components (Input, Textarea, Select, Switch, color input, checkbox). `renderGroupFields` handles group layout with grid columns. Bilingual fields render side-by-side EN/BN pairs.
  - `src/components/admin/form-engine/form-renderer.tsx` — `FormRenderer` wraps FormProvider, renders ValidationSummary at top, iterates field groups, and accepts custom children. Includes `AdminTextField` shorthand for custom inline fields.
  - `src/components/admin/form-engine/validation-summary.tsx` — Recursive error extraction from form state with destuctive-themed banner showing all field errors.
  - `src/components/admin/form-engine/use-autosave.ts` — Debounced autosave hook using Refine `useCreate`/`useUpdate`. Configurable delay, transform, success/error callbacks. Reactive `isSaving` state.
  - `src/components/admin/form-engine/index.ts` — Barrel export.

- **Form Engine refactored pages:**
  - `admin.videos.tsx` — VideoFormContent now uses FormRenderer with 3 field groups + custom thumbnail URL with preview.
  - `admin.books.tsx` — BookFormContent uses FormRenderer with 6 field groups + custom cover image/PDF uploads as children.
  - `admin.taxonomy.tsx` — CategoryManager and TagManager use FormRenderer with field groups instead of manual shadcn FormField rendering.- **Users Module** (`admin.users.tsx` + `admin.functions.ts`) — Enhanced with expandable user detail panel, account status, and per-user data:
  - **Account Status badges** — 3 states: Active (has role), Pending (new with role <7d), Unassigned (no role). Shown on each user row and in Profile tab.
  - **Stats cards** — 4 summary cards: Total Users, Active, No Role, Super Admins.
  - **Search bar** — Filters users by name, email, or role.
  - **Expandable Detail Panel** — Click chevron to toggle a panel with 3 tabs:
    - **Profile tab**: Account status, role, join date, user ID (truncated), email, display name in a 3-column grid.
    - **Library tab**: Fetches user's purchased books via `getUserLibraryAdmin` server function. Shows cover image, title (links to public book page), price, progress percentage with progress bar, purchase date.
    - **Activity tab**: Fetches audit log entries via `getUserAuditEvents` server function. Shows action badges with relative time stamps.
  - **`getUserAuditEvents`** — New server function: fetches audit_log entries where user is actor or target (uses `.or()` filter). Requires admin role.
  - **`getUserLibraryAdmin`** — New server function: fetches user's purchases joined with books + reading_progress. Returns enriched library items with progress data. Requires admin role.
  - **`AuditEvent`** — Exported type with `Json`-typed details for serializability.

- **Books Module enhancements** (`admin.books.tsx`):
  - **Preview column** — Eye icon link to `/books/$slug` for published books with slug (integrates with public book detail page, purchase flow, and PDF reader)
  - **Ratings column** — Displays `avg_rating` with Star icon and `total_ratings` count in parentheses. Color-filled star for visual clarity.
  - **Category as Select** — Changed from free-text input to a select with 9 predefined categories (general, buddhist-psychology, wisdom, meditation, philosophy, sutra, commentary, biography, reference) with proper title-case formatting.
  - **SEO fields** — Added `meta_description_en` and `meta_description_bn` textareas in a dedicated "SEO" section with 2-column layout.
  - **Sort order field** — Added `sort_order` number field in the "Publishing" group alongside status.
  - **Slug auto-generation** — `useEffect` that auto-generates slug from `title_en` via CMS Engine's `slugifyBook` when slug hasn't been manually touched.
  - **Organized form groups** — Added logical section titles (Basic Info, Description, Details, Publishing, SEO). Free/price hint shown when `is_free` is checked.
  - **Dead import removal** — Removed unused `ArrowUpDown` icon import.

- **Vitest + Testing Library** — Test infrastructure installed and configured.
  - `vitest.config.ts` with jsdom environment, React plugin, path alias support
  - `src/test/setup.ts` with jest-dom matchers
  - `npm run test` / `npm run test:watch` scripts
  - Sample tests: `src/lib/utils.test.ts` (6 tests for `cn()`), `src/lib/schemas.test.ts` (23 tests for all 7 Zod schemas)
  - **29 tests passing**, 0 failing, avg <2s runtime

### Added

- **Table Engine** — Admin audit log migrated from custom card list to the shared `DataTable` component (`admin.audit.tsx`). Now every resource with tabular data uses the same TanStack Table-based component with search, sorting, pagination, column visibility, and expandable sub-rows.
  - Action column with styled badges (color-coded per action type)
  - Actor/Target columns with monospace UUID truncation
  - Relative time display with Clock icon
  - `renderSubRow` for expandable JSON detail view
  - Action filter buttons preserved above DataTable

- **Resource Engine** — Reusable generic CRUD architecture for admin resources:
  - `src/components/admin/resource-engine/types.ts` — `ResourceDefinition<TData, TForm>` generic type with `registerResource()`/`getResource()`/`getAllResources()` registry pattern. Supports typed columns, Zod schemas, form content injection, stats, filters, and bulk actions.
  - `src/components/admin/resource-engine/resource-list-page.tsx` — Generic `ResourceListPage` component that handles all CRUD operations: `useTable`/`useCreate`/`useUpdate`/`useDelete` via Refine, auto-appended action columns (Edit/Delete), loading/empty states, stat cards, filter tabs, FormDrawer with injected form content, ConfirmDelete, unsaved changes tracking, and proper mutation success/error handling.
  - `src/routes/admin.videos.tsx` — Refactored from 250+ lines to ~120 lines using ResourceListPage. Columns are pure data columns; form content extracted to `VideoFormContent`.
  - `src/routes/admin.books.tsx` — Refactored from 700+ lines to ~195 lines using ResourceListPage. Same pattern with `BookFormContent` including image/PDF upload handlers.

- **Professional Admin Shell** — Complete 3-column SaaS admin layout:
  - **AdminInspector** — Collapsible right-side Inspector panel using shadcn Collapsible, Separator, ScrollArea, Tooltip. Shows Page Info (route/section), Quick Actions (New Post, Media Library, View Site with SPA navigation), Keyboard Shortcuts reference, and System info. Collapses to a 42px strip with icon buttons + tooltips. Desktop-only (`lg:` breakpoint).
  - **3-column layout** — Sidebar | Workspace | Inspector via flex layout. Inspector defaults to collapsed.
  - **TooltipProvider** — Wraps entire admin tree, used by sidebar (collapsed nav items) and inspector.
  - **Sidebar enhancements** — shadcn Tooltip for collapsed nav items and brand link. Smooth `ease-in-out` transitions. Active indicator dot refinement.
  - **Topbar polish** — Custom user menu replaced with shadcn DropdownMenu + Avatar components. Added Profile and Settings menu items. Search bar has focus ring. Removed dead `cn` import.

### Removed

- **6 error files consolidated to 1** — Merged `src/lib/errors.ts`, `error-reporting.ts`, `error-capture.ts`, and `error-page.ts` into a single `src/lib/errors.ts` (120 lines). Deleted `error-reporting.ts`, `error-capture.ts`, `error-page.ts`. Updated imports in `error-page.tsx`, `error-boundary.tsx`, `start.ts`, and `server.ts`.

- **`recharts` dependency** — Removed duplicate charting library. The dashboard's `MonthlyPostChart` already uses ECharts (`echarts-for-react`). Deleted unused `src/components/ui/chart.tsx` (shadcn/ui recharts wrapper, never imported).

### Added

- **Contact form email notification** — Server-side email notification via Resend when a contact form is submitted. Site admin receives a styled HTML email with the sender's name, email, and message, plus a direct link to the admin panel.
- **`src/integrations/resend/client.ts`** — Resend client singleton (returns `Resend | null` when `RESEND_API_KEY` is not configured).
- **`src/lib/contact-notification.ts`** — `sendContactNotification` server function with HTML email template, graceful fallback when `RESEND_API_KEY` or `SITE_ADMIN_EMAIL` is not set, and reply-to support.
- **`.env.example`** — Added `RESEND_API_KEY` and `SITE_ADMIN_EMAIL` environment variables with documentation.

- **Cart + Checkout flow** — Full shopping cart system for purchasing multiple books in a single checkout.
- **`supabase/migrations/20260711000002_create_carts.sql`** — New database tables: `carts` (one per user) and `cart_items` (books in cart) with full RLS policies (SELECT/INSERT/UPDATE/DELETE scoped to authenticated user).
- **`src/lib/cart.ts`** — Cart service library with 6 server functions: `addToCart` (add book, idempotent), `removeFromCart` (remove single item), `clearCart` (clear all items), `getCart` (enriched with book details), `getCartCount` (lightweight count for badge), `checkoutCart` (creates multi-item Stripe Checkout Session).
- **`src/routes/cart.tsx`** — New `/cart` route with loading/empty/signed-out/checkout states, Stripe redirect feedback (`?checkout=success`, `?checkout=cancel`), remove/clear actions, and summary with checkout button.
- **Cart badge in header** — `CartBadge` component in `__root.tsx` fetching cart count via React Query with 60s refetch interval, positioned badge showing item count, only visible to signed-in users with items in cart.

### Changed

- **`src/lib/stripe-checkout.ts`** — Updated `createCheckoutSession` to accept both single-book (`{ bookId, bookSlug }`) and multi-item (`{ items: CheckoutItem[] }`) payloads. Cart checkout stores `book_ids` as comma-separated metadata for reliable webhook processing.
- **`src/integrations/stripe/config.ts`** — Added `CHECKOUT_CART_SUCCESS_URL` and `CHECKOUT_CART_CANCEL_URL` for cart-specific Stripe redirects.
- **`src/routes/api/stripe-webhook.ts`** — Updated to handle `cart_checkout` sessions: parses `book_ids` from metadata, creates purchases for each book, clears user's cart after successful checkout (using `supabaseAdmin` service role).
- **`src/routes/books.tsx`** — Added cart mutation and "Add to Cart" button on book cards for paid, non-owned books (appears in the card footer area).
- **`src/routes/books.$slug.tsx`** — Added cart mutation and "Add to Cart" button on book detail page alongside the existing purchase button (only for paid books).
- **`src/routeTree.gen.ts`** — Added `/cart` route entry for TypeScript route type safety.

### Added

- **Refine v5 admin framework** — `@refinedev/core`, `@refinedev/supabase` installed in headless mode within existing TanStack Router routes.
- **`src/integrations/refine/**`** — Data provider (`data-provider.ts` wraps `dataProvider(supabase)`), auth provider (`auth-provider.ts` wraps existing `supabase.auth` + `isHardcodedAdmin`), access control (`access-control.ts` maps `ROLE_LEVELS` to resource/action), resources (`resources.ts` defines 16 resources mapping to DB tables).
- **`src/routes/admin.tsx`** — `<Refine>` component wrapper around admin layout with `dataProvider`, `authProvider`, `accessControlProvider`, `resources`.
- **Zod schemas for taxonomy**: `categorySchema` and `tagSchema` with validation for slug, bilingual names, color, visibility, and sort order.

### Changed

- 13 of 13 admin pages now migrated from custom TanStack Query + Server Functions to Refine hooks (Phase 2 + post-audit):
  - `admin.books.tsx` — `useTable` + `useCreate`/`useUpdate`/`useDelete`
  - `admin.videos.tsx` — same pattern
  - `admin.new.tsx` — `useCreate`
  - `admin.$id.tsx` — `useUpdate`
  - `admin.courses.tsx` — `useTable` + `useDelete`
  - `admin.taxonomy.tsx` — `useList` + `useCreate`/`useUpdate`/`useDelete` (categories + tags)
  - `admin.index.tsx` — `useTable` + `useDelete` (posts list; dashboard stats kept as server function)
  - `admin.courses.$id.tsx` — `useOne` + `useCreate`/`useUpdate` (courses); `useList` + `useCreate`/`useUpdate`/`useDelete` (lessons)
  - `admin.audit.tsx` — `useList`
  - `admin.media.tsx` — `useList` + `useCreate` + `useDelete` (Storage ops kept as direct Supabase calls)
  - `admin.settings.tsx` — `useOne` + `useUpdate` (resource `site_settings`)
  - `admin.pages.tsx` — `useList`/`useCreate`/`useUpdate`/`useDelete` (section builder kept custom)
  - `admin.navigation.tsx` — `useList`/`useCreate`/`useUpdate`/`useDelete` (drag-and-drop reorder + batch mutations kept custom)
- `admin.users.tsx`, `admin.comments.tsx` kept as-is (RPC-based / service-role blockers).
- Resource name corrected from `settings` to `site_settings` to match DB table.
- Pre-existing TS error in `admin.settings.tsx` fixed (type assertion in `useOne`).
- **Audit-driven dead code removal**: deleted `useCrudManager.ts`, removed dead server functions from `taxonomy.ts`, `posts.ts`, `courses.ts`, `media.ts`, `admin.functions.ts`, `siteSettings.tsx`, `pages.ts`, `navigation.ts`. Removed `SECTION_TYPES` dead export from `pages.ts`.
- **ROLE_LEVELS consolidated**: moved into `useAuth.ts` as single source of truth; deleted `useRole.ts`.
- **Dashboard chart replaced**: CSS bar chart → Recharts `BarChart` with `Tooltip`, `CartesianGrid`, `ResponsiveContainer`.
- **13 pre-existing TS errors fixed**: `loaderData` destructuring in `books.tsx`, `buddhist-psychology.tsx`, `courses.tsx`, `satsang.tsx`, `videos.tsx`, `wisdom.tsx` replaced with optional chaining; missing `fetchSiteSettings` import added to `videos.tsx`.
- Build now passes with **zero TypeScript errors** (previously 14).
- **Phase 2 — Component Standardization**:
  - `admin.taxonomy.tsx`: CategoryManager and TagManager migrated from raw `useState` form state to React Hook Form + Zod (`useForm`, `zodResolver`, `<Form>` wrapper, shadcn `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` components). Better unsaved changes tracking via `form.formState.isDirty`.
  - `admin.courses.tsx`, `admin.courses.$id.tsx`, `admin.media.tsx` already conformed to the standardized patterns.
- **Phase 3 — Shared Components Adoption**:
  - `admin.index.tsx`: Raw `<AlertDialog>` for post deletion replaced with shared `<ConfirmDelete>` component.
  - `admin.pages.tsx`: Raw `<AlertDialog>` for page deletion replaced with shared `<ConfirmDelete>` component.
  - `admin.taxonomy.tsx`: Raw `<AlertDialog>` for category/tag deletion replaced with shared `<ConfirmDelete>` component.
  - All 15 admin pages now use consistent patterns: Refine hooks, shared `DataTable`, shared `FormDrawer`, shared `ConfirmDelete`, React Hook Form + Zod.

### Documentation

- **PROJECT.md**: Added Refine to Technology Stack, updated CMS Architecture pattern to include Refine hooks + dataProvider, added AD-012 (Refine as Headless Admin Data Layer), added Refine Migration note to Current Milestone. Updated Phase 2 progress to 85%, schema-driven forms marked Done.
- **AGENTS.md**: Updated with migration details, remaining pages, and next steps. Phase 2 and Phase 3 marked complete.

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