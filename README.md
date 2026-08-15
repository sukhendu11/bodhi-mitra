# Sabbe Satta

> A modern digital platform for wisdom, mindfulness, learning, and compassionate living.

Sabbe Satta (সব্বে সত্তা) is a bilingual (English & Bangla) digital platform for publishing, digital reading, multimedia learning, community engagement, and digital commerce. It brings together reflections and articles on meditation, mindfulness, mental health, and philosophy; a digital book collection with a full-featured reading experience; videos; and a community space with comments, ratings, and reviews — all wrapped in a calm, content-focused design.

## About

Sabbe Satta is built for readers who want thoughtful, practice-oriented content. The platform centers on:

- **Reflections** — articles across meditation, mindfulness, mental health, philosophy, and Buddhist psychology, with full-text search and topic-based browsing.
- **Books & the Reader** — a growing digital library with a dedicated PDF reader (zoom modes, reading themes, table of contents, full-text search, bookmarks, and notes) and per-book reading progress.
- **Videos** — a curated collection of talks and guided content.
- **Community** — comments on posts, book ratings and reviews, bookmarks, and wishlists.
- **Commerce** — a secure checkout for digital books, purchase history, and your personal library of owned titles.

The site is fully bilingual, responsive, and SEO-optimized, with a public site and an in-app administrative interface.

## Features

**Public platform**

- Bilingual interface (English & Bangla)
- Reflections (articles) with topic categories and full-text search
- Digital books with a dedicated PDF reader (themes, zoom, contents, search, bookmarks, notes)
- Reading progress and reading statistics
- Videos
- Bookmarks and wishlists
- Comments, book ratings, and reviews
- User accounts, profiles, and settings
- Shopping cart, secure checkout, orders, and a personal library of purchased books
- Notifications
- Newsletter
- AI assistant
- SEO optimization (per-page metadata, sitemap)
- About, Contact, FAQ, Terms, Privacy, and Donate pages

**Administration** (`/admin`)

- Dashboard with analytics (content stats, orders, revenue)
- Content management — posts, pages, books, videos, categories, tags, navigation, and site settings
- Order and purchase administration
- User and role management
- Role-based access control

## Technology Stack

| Area | Technology |
|------|-----------|
| Frontend | React 19 + TanStack Start (server-side rendering) |
| Routing | TanStack Router (type-safe, file-based) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Radix UI) |
| Admin interface | Refine Core + shadcn/ui |
| Backend | Supabase — Auth, PostgreSQL, Storage, RLS |
| Forms & validation | React Hook Form + Zod |
| Rich text | TipTap |
| Data tables | TanStack Table |
| Charts | Apache ECharts |
| PDF rendering | pdf.js |
| Email | Resend |
| Payments | Provider-agnostic interface (simulated in development) |
| Testing | Vitest + Testing Library |

## High-Level Architecture

```text
TanStack Start
   ├── Public Website
   └── Admin (Refine + shadcn/ui)
             │
          Supabase
      ┌──────┼──────┐
     Auth  Database Storage
```

## Getting Started

### Requirements

- Node.js 22 or newer
- npm

### Installation

```bash
git clone <repository-url>
cd <repository>
npm install
```

### Run the development server

```bash
npm run dev
```

The app is served at `http://localhost:3001`.

The development build runs **fully offline** with built-in demo data — auth, catalog, cart, checkout, and admin all work without any external services (set `VITE_DATA_SOURCE=mock`, the default in `.env.example`). Demo accounts are documented in the codebase.

### Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the development server |
| `npm test` | Run the test suite (Vitest) |
| `npx tsc --noEmit` | Type-check the project |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the production bundle (Nitro `node-server` preset → `.output/`) |
| `npm start` | Run the production server (`node .output/server/index.mjs`) |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you need:

```bash
cp .env.example .env
```

For the offline development experience, `VITE_DATA_SOURCE=mock` is all you need — no keys required. To connect real backends (Supabase Auth/database/storage, transactional email, payments), set the corresponding values documented in `.env.example`. Secrets are only ever read server-side; never expose service-role or API keys in client code.

## Project Structure

```text
src/                    Application source code
├── routes/             File-based routes (pages and API endpoints)
├── components/         Reusable UI components
├── lib/                Services, mock data, and utilities
├── hooks/              Shared React hooks
└── integrations/       External service clients (Supabase, Resend, etc.)
supabase/               Database migrations and setup SQL
scripts/                Utility and generation scripts
public/                 Static assets
```

## Development

The codebase is organized as a standard TanStack Start application: routes in `src/routes/`, shared UI in `src/components/`, and business logic/services in `src/lib/`. The data layer is swappable between built-in demo data and real backends via the `VITE_DATA_SOURCE` environment variable — you can develop the full product experience offline without standing up any services.

Run `npm test` before pushing changes; the suite includes unit tests, component tests, and browser-level verification scripts (in `scripts/`).

## Documentation

- **[PROJECT.md](PROJECT.md)** — Architecture, security model, and project state
- **[DESIGN.md](DESIGN.md)** — The Sabbe Satta design system (colors, typography, components)
- **[RULES.md](RULES.md)** — Engineering standards and workflow
- **[CHANGELOG.md](CHANGELOG.md)** — Change history

## License

MIT
