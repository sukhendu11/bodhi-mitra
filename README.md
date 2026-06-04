# Bodhi Mitra

**Where ancient wisdom meets modern psychology.**

A serene bilingual (English/Bengali) blog blending Buddhist teachings with modern mental health science, built by practicing psychiatrists. The name means "Friend on the path of awakening" — a small journal of quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.

🌐 **Live site:** [bodhi-mitra.com](https://bodhi-mitra.com) (if deployed)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [TanStack Start](https://tanstack.com/start/latest) (SSR React) |
| **Routing** | [TanStack Router](https://tanstack.com/router/latest) (file-based, type-safe) |
| **UI** | React 19 + Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) |
| **Rich Editor** | [TipTap](https://tiptap.dev/) (ProseMirror-based) |
| **Data Fetching** | [TanStack React Query](https://tanstack.com/query/latest) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Storage** | Supabase Storage (images, avatars, site assets) |
| **i18n** | English ↔ বাংলা (custom React Context) |
| **Deployment** | Vercel (via Nitro) |
| **Package Manager** | npm / bun |

---

## Features

### Public Site
- **Bilingual EN/BN** — Full language toggle persisted to localStorage. All content (posts, pages, nav, footer) in both English and Bangla.
- **Homepage** — Hero section (configurable via admin) + post grid with category filters (All / Buddhist Psychology / Wisdom / Books).
- **Post Articles** — Rich text (TipTap-edited or plain text), cover images, tags, author bios, related posts, and a contemplative "Mindful Connection" pullout.
- **Category Pages** — Dedicated pages with dynamic headers, descriptions, and banners.
- **Comments** — Nested threads. Signed-in users can comment. Admin can reply, edit, or delete any comment.
- **About + Contact** — Dynamic pages managed through the admin panel. Contact form opens the user's email client (no backend needed).
- **SEO** — Route-level meta tags (title, description, Open Graph, Twitter Cards). Dynamic OG image from admin settings. Google Analytics support.
- **Satsang Page** — A dynamic page for gathering announcements.

### Admin Panel (`/admin`)
- **Auth-guarded dashboard** — Supabase auth + `user_roles` table check.
- **Post CRUD** — Create, edit, delete. Bilingual fields (title, excerpt, content). TipTap rich editor. Cover image upload (drag-drop, URL paste). Tags input. Draft/publish workflow. Live preview mode.
- **Site Customizer** — Full CMS with 10 tabs:
  - Branding (logo, favicon, site name, logo scaling)
  - Homepage hero (content, CTA — bilingual)
  - Article page toggles (author bio, related posts, sidebar, newsletter)
  - About page (eyebrow, title, body, mission, editorial note — bilingual)
  - Contact page (form labels, details, map embed — bilingual)
  - Dynamic Pages (add/remove/configure any page slug, title, body, banner)
  - Theme (accent colors, dark mode)
  - Nav & Footer labels (bilingual)
  - Social links
  - SEO (meta descriptions, OG image, Google Analytics ID)
- **Onboarding** — First-time admin setup at `/onboarding`: sign in → claim admin role via Supabase RPC.

---

## Project Structure

```
src/
├── start.ts                 # TanStack Start instance (middleware registration)
├── server.ts                # Cloudflare Workers entry (SSR error wrapper)
├── router.tsx               # TanStack Router setup
├── routeTree.gen.ts         # Auto-generated route tree
├── styles.css               # Tailwind v4 + custom theme (prose-mitra, Bangla fonts)
│
├── routes/                  # 15 file-based route components
│   ├── __root.tsx           # Root layout (header, footer, providers, dynamic SEO)
│   ├── index.tsx            # Homepage
│   ├── posts.$slug.tsx      # Post detail page
│   ├── books.tsx            # Books category
│   ├── buddhist-psychology.tsx
│   ├── wisdom.tsx
│   ├── about.tsx
│   ├── contact.tsx
│   ├── login.tsx            # Auth (email/password + Google OAuth)
│   ├── onboarding.tsx       # First admin setup
│   ├── satsang.tsx          # Dynamic page
│   ├── admin.tsx            # Admin layout (auth guard)
│   ├── admin.index.tsx      # Post list
│   ├── admin.$id.tsx        # Edit post
│   ├── admin.new.tsx        # Create post
│   └── admin.settings.tsx   # Site customizer (~830 lines, 10 tabs)
│
├── components/
│   ├── PostCard.tsx         # Post preview card
│   ├── PostGrid.tsx         # 3-column grid with loading/error/empty states
│   ├── PostForm.tsx         # Bilingual post editor (~400 lines)
│   ├── Editor.tsx           # TipTap toolbar
│   ├── Comments.tsx         # Nested comment threads
│   ├── CategoryPage.tsx     # Shared category layout
│   ├── LetterAvatar.tsx     # Deterministic-color initial avatar
│   └── ui/                  # 40+ shadcn/ui components
│
├── hooks/
│   ├── useAuth.ts           # Supabase auth session + admin check
│   └── use-mobile.tsx       # Responsive breakpoint
│
├── lib/                     # Business logic
│   ├── posts.ts             # Post CRUD + image upload
│   ├── comments.ts          # Comment CRUD
│   ├── siteSettings.tsx     # Config types, defaults, context, GA injection
│   ├── i18n.tsx             # Bilingual EN/BN context
│   ├── admin.functions.ts   # Server function: admin check
│   ├── onboarding.functions.ts  # Server functions: claim admin
│   ├── siteAssets.functions.ts  # Server function: signed URL upload
│   ├── error-capture.ts     # SSR error recovery
│   ├── error-page.ts        # HTML error page
│   └── utils.ts             # cn() utility
│
├── integrations/supabase/
│   ├── client.ts            # Browser Supabase client
│   ├── client.server.ts     # Server admin client (service role)
│   ├── auth-attacher.ts     # Client middleware (Bearer token)
│   ├── auth-middleware.ts   # Server middleware (JWT validation)
│   └── types.ts             # Auto-generated database types
│
└── assets/hero.jpg          # Homepage hero background

supabase/
└── migrations/              # 23 SQL migration files
    (tables: posts, comments, profiles, site_settings, user_roles
     functions: claim_admin_role, get_admin_claim_status, has_role
     buckets: avatars, blog-images, site-assets)
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (or Bun)
- A Supabase project (free tier works)
- Vercel account (for deployment — free tier works)

### 1. Clone and install

```bash
git clone https://github.com/sukhendu11/bodhi-mitra.git
cd bodhi-mitra
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Run database migrations

Apply the SQL migrations from `supabase/migrations/` in your Supabase dashboard or via the CLI.

### 4. Start development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Set up admin

1. Navigate to `/onboarding`
2. Sign in with your email
3. Click "Grant me admin access"
4. You'll be redirected to `/admin` where you can create posts and customize the site.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

---

## Architecture

### Data Flow

```
[Browser] → TanStack Router → Route Component
  → useQuery / useMutation → Supabase Client (direct, RLS)
  → or useServerFn → Middleware chain → Supabase (authenticated)
  → React Query Cache → UI re-render
```

### Middleware Chain (Server Functions)

```
Client: useServerFn()
  → attachSupabaseAuth (adds Bearer token)
  → Server: requireSupabaseAuth (validates JWT)
  → Handler (has supabase + userId context)
```

### Key Design Decisions

- **Bilingual from day one**: All content fields have `_en`/`_bn` variants. The `pickLocalized()` helper selects the right variant based on the user's language preference.
- **Site settings as a single JSON blob**: Stored in `site_settings.config`. A `mergeConfig()` function ensures missing keys resolve to defaults, so new config fields don't require migrations.
- **RLS for auth**: Row-Level Security on Supabase tables protects data. `user_roles` table mutations are denied from the client — only the `claim_admin_role` RPC can grant admin.
- **SSR error recovery**: A custom `server.ts` wrapper detects h3-swallowed errors and returns a branded HTML error page instead of a raw JSON 500.

---

## Deployment

### Vercel (recommended)

This project is configured for Vercel via Nitro:

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel auto-detects the build settings — no manual config needed
4. Add these environment variables in the Vercel dashboard:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
5. Deploy — the site goes live immediately

Every push to `main` triggers an automatic redeploy on Vercel.

---

## License

[MIT](LICENSE) (or your chosen license)
