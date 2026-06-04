# 📊 PROJECT STATE

## PURPOSE
Single source of truth for project progress. Must always reflect the real system state.

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

### Comment System
- Nested threads with parent-child relationships
- CRUD: signed-in users can comment; admin can reply/edit/delete any
- Edit history tracked via updated_at timestamp
- Admin reply UI with quote preview
- LetterAvatar for comment authors (deterministic color palette)
- 2,000 character limit per comment

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
- TypeScript typecheck passes cleanly
- Dev server verified: all pages load, language toggle works, admin redirects
- 142 files in initial commit

---

## 🟡 IN PROGRESS
- (None currently)

---

## 🔴 PENDING

### Database & Data
- No Supabase project connected for development (needs env vars + migrations)
- No seed data (no posts or comments in the database yet)
- Site settings stored as monolithic JSON blob -- write contention risk

### Testing
- No test files or test framework configured
- No Storybook or visual regression tests

### Performance
- No pagination on post lists (all rows fetched at once)
- No database indexes beyond Supabase defaults
- No staleTime on most React Query hooks (re-fetches on every mount)
- No route-level code splitting

### Security
- No rate limiting on auth endpoints
- supabaseAdmin service-role client exists but unused (risk if imported client-side)
- Direct Supabase queries from browser for writes (RLS is only protection)

### Code Quality
- admin.settings.tsx (~830 lines) should be decomposed
- PostForm.tsx (~400 lines) could be decomposed
- Comments.tsx (~300 lines) could be decomposed
- Legacy single-language post fields should be cleaned up after migration
- Translation dict has some overlap with DEFAULT_CONFIG content

### Features
- Contact form uses mailto: -- no backend delivery
- Hardcoded hero image (/assets/hero.jpg) not configurable from admin
- Some route-level meta titles still hardcoded with Bodhi Mitra
- No RSS feed or newsletter subscription backend

---

## RULE
Must be updated after every completed task.