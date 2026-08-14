# Sabbe Satta

> **A modern digital platform for wisdom, mindfulness, learning, and compassionate living.**

Sabbe Satta is a full-stack platform for publishing, digital reading, multimedia learning, community engagement, and digital commerce. Built with **TanStack Start** (React 19), **Supabase** as the unified backend (Auth, PostgreSQL, Storage), and a **Refine + shadcn/ui admin** living inside the TanStack app.

> **Architecture note (2026-08-14, AD-029):** the target production architecture is **Hostinger Managed Node.js + TanStack Start + Refine + shadcn/ui + Supabase**. Supabase is the single backend for both content and application data. **Strapi is superseded** (historical) — its code remains in the repo pending migration to Supabase and removal; it is not the production CMS. See `PROJECT.md §18/§21/§28` for the full roadmap and decision records.

---

## Features

### Public Platform

- Bilingual (English & Bangla)
- Responsive modern interface
- Articles & Blog (Reflections)
- Digital Books
- PDF Reader (with configurable themes, zoom, bookmarks, notes)
- Categories & Collections
- Search
- User Authentication
- Reading Progress
- Bookmarks
- Comments & Discussions
- Videos & Multimedia
- Shopping Cart & Checkout
- AI Chat Assistant
- Book Recommendations
- SEO Optimized
- Newsletter
- Contact & About Pages
- Maintenance Mode

### Administration (target — Refine + shadcn/ui, inside the app)

- Admin Dashboard (`/admin`)
- Content Management (posts, pages, books, videos, categories, tags, navigation, site settings)
- Media management (Supabase Storage)
- User & Role Management
- Site-wide Configuration
- Commerce administration (orders, purchases, coupons)
- Draft & Publish / content status
- Role-Based Access Control (RBAC)

> **Status:** the Refine + shadcn admin is the **target** (roadmap P2) — not yet installed. The current `/admin` route renders the offline MockAdminPanel in mock mode. **Strapi is not the target admin** (superseded, pending removal).

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend (unified) | Supabase (Auth + PostgreSQL + Storage + RLS) | All data (content + application), auth, file storage |
| Admin (target) | Refine Core + shadcn/ui (inside the TanStack app) | Admin/CRUD/data-handling patterns + component system |
| Frontend | React 19 + TanStack Start | Public website, reader, commerce, SSR |
| Routing | TanStack Router | File-based, type-safe routing |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Components | shadcn/ui | Accessible primitives |
| Rich Text | TipTap | WYSIWYG editor |
| Forms | React Hook Form + Zod | Schema-driven validation |
| Database | Supabase PostgreSQL | Unified content + application database |
| Auth | Supabase Auth | Frontend auth (email + Google OAuth) + admin RBAC |
| Storage | Supabase Storage | Private book PDFs, covers, avatars, media |
| Payments | Provider-agnostic interface (simulated → PipraPay → bKash/Nagad) | Checkout, redirects, IPN webhooks |
| Email | Resend | Transactional email |
| Hosting (target) | Hostinger Managed Node.js | Managed SSR hosting (no VPS/Docker/Nginx/PM2) |
| Package Manager | npm / Bun | Package management |

> **Strapi v5 (historical):** previously the CMS (admin panel, content types, media library). Superseded 2026-08-14 (AD-029) — pending migration to Supabase + removal (P2/P3). Docker/VPS hosting is also historical (superseded by Hostinger Managed Node.js).

---

## Getting Started

### Requirements

- Node.js 22+
- npm or Bun
- Supabase Project (for Auth, database, and Storage)
- (Dev only, historical) Strapi local instance — not required for mock-first frontend work

### Installation

```bash
git clone https://github.com/sukhendu11/bodhi-mitra.git
cd bodhi-mitra
npm install
```

### Frontend Setup

```bash
npm run dev
```

Frontend: http://localhost:5173

The app runs **mock-first** in dev (`VITE_DATA_SOURCE=mock`) — the whole product (auth, commerce, reader, comments, search, admin) works offline with demo accounts. See `PROJECT.md §18` for the data-source seam and mock stores.

### Strapi CMS Setup (historical — dev only)

Strapi is superseded and scheduled for removal (P3). For legacy local runs only:

```bash
cd strapi
npm install
npm run develop
```

Strapi admin panel: http://localhost:1337/admin

---

## Environment Variables

### App (.env)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_DATA_SOURCE=mock              # feature-level migration/dispatch seam
SITE_URL=https://sabbesatta.com
PAYMENT_PROVIDER=simulated         # simulated | piprapay
PIPRAPAY_BASE_URL=
PIPRAPAY_MERCHANT_ID=
PIPRAPAY_API_KEY=
PIPRAPAY_API_SECRET=
PIPRAPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
OPENAI_API_KEY=
```

> **Strapi env vars (`VITE_STRAPI_URL` / `VITE_STRAPI_API_TOKEN`) are historical** — content reads move to Supabase (P3).

---

## Project Structure

```text
bodhi-mitra/
├── src/                    # Frontend + server functions (React + TanStack Start)
├── supabase/               # Database migrations / manual setup SQL
├── strapi/                 # (Historical — Strapi CMS, pending removal; dev only)
├── scripts/                # Utility + seed/migration scripts
├── research/               # Research & evaluation docs
├── design-references/      # Shared design research library (awesome-design-md)
├── public/                 # Static assets
├── DESIGN.md               # Canonical UI design system (single source of truth)
├── AGENTS.md               # Development agent instructions
├── PROJECT.md              # Architecture & roadmap (technical blueprint in §28)
├── RULES.md                # Engineering standards
├── CHANGELOG.md            # Change history
└── README.md               # This file
```

---

## Deployment (target — Hostinger Managed Node.js)

1. Create a **Hostinger Managed Node.js** web app (Node 22).
2. Deploy the TanStack Start SSR build via Hostinger's managed flow.
3. Configure environment variables in hPanel (`VITE_DATA_SOURCE`, `SITE_URL`, Supabase keys, `PAYMENT_PROVIDER`, `RESEND_API_KEY`).
4. Hostinger manages SSL, CDN, security/WAF, DDoS protection, and backups.
5. Point `sabbesatta.com` at the managed app.

> **Historical deployment models** (superseded 2026-08-14, AD-029): Vercel frontend + VPS backend (Docker Compose + Nginx + PM2/systemd), then a single self-managed VPS. Neither is the target. Cloudflare is optional, not required.

---

## Data Ownership

| Domain | Owner |
|--------|-------|
| Content (posts, pages, books, videos, categories, tags, navigation, site settings) | **Supabase** (unified schema — P1) |
| Application data (profiles, purchases, orders, cart, progress, bookmarks, ratings, comments, notifications, coupons, audit) | **Supabase** |
| Auth (email + Google OAuth, sessions, RBAC) | **Supabase Auth** |
| Storage (private PDFs, covers, avatars) | **Supabase Storage** |
| Payments | **Provider-agnostic interface** → PipraPay (stopgap) → direct bKash/Nagad (future) |
| Email | **Resend** |
| Admin UI | **Refine + shadcn** (inside the TanStack app — target, P2) |
| Presentation + orchestration | **TanStack Start** (Hostinger Managed Node.js) |

---

## Documentation

| File | Purpose |
|------|---------|
| README.md | Project overview and setup |
| DESIGN.md | Canonical UI design system — colors, typography, layout, components, reader design |
| RULES.md | Engineering standards and workflow |
| PROJECT.md | Architecture + roadmap in one doc (technical blueprint in §28; AD-029 = current target architecture) |
| CHANGELOG.md | Completed changes and history |
| AGENTS.md | Development agent instructions (incl. Shared Design Research Library rule) |
| strapi/README.md | Strapi CMS guide (**historical** — Strapi superseded, AD-029) |

---

## License

MIT License
