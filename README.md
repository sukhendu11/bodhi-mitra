# Sabbe Satta

> **A modern digital platform for wisdom, mindfulness, learning, and compassionate living.**

Sabbe Satta is a full-stack platform for publishing, digital reading, multimedia learning, community engagement, and digital commerce. Built with TanStack Start and Supabase, it delivers a premium experience for readers, learners, creators, and administrators.

---

# Features

## Public Platform

- Bilingual (English & Bangla)
- Responsive modern interface
- Articles & Blog
- Digital Books
- PDF Reader (with configurable themes, zoom, bookmarks, notes)
- Categories & Collections
- Search
- User Authentication
- Reading Progress
- Bookmarks
- Comments & Discussions
- Videos & Multimedia
- Courses & Enrollments
- Shopping Cart & Checkout
- AI Chat Assistant
- Book Recommendations
- SEO Optimized
- Newsletter
- Contact & About Pages
- Maintenance Mode

---

## Administration

- Secure Admin Dashboard
- Content Management System (CMS)
- Post Management
- Page Management (with Visual Page Builder)
- Book Management
- Media Library (full DAM with folders, tags, favorites)
- Navigation Builder (drag-and-drop)
- Theme Builder (6 presets, typography, colors, custom CSS)
- Homepage Builder
- SEO Settings
- User & Role Management
- Analytics Configuration
- Site-wide Configuration (13 settings tabs)
- Feature Flags
- Maintenance Mode Toggle
- Commerce Settings (currency, tax, refund policy)

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| Framework | TanStack Start |
| UI | React 19 |
| Routing | TanStack Router |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Rich Text Editor | TipTap |
| Data Fetching | TanStack Query |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Deployment | Vercel (Free Tier) |
| Package Manager | npm / Bun |

---

# Getting Started

## Requirements

- Node.js 18+
- npm or Bun
- Supabase Project
- Vercel Account (free tier)

---

## Installation

```bash
git clone https://github.com/sukhendu11/bodhi-mitra.git

cd bodhi-mitra

npm install
```

---

## Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=

VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=

SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=
```

---

## Database

Apply all migrations inside:

```text
supabase/migrations/
```

---

## Development

```bash
npm run dev
```

Default development server:

```text
http://localhost:5173
```

---

## Production Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

# Available Scripts

| Command | Description |
|----------|-------------|
| npm run dev | Start development server |
| npm run build | Build for production |
| npm run preview | Preview production build |
| npm run lint | Run ESLint |
| npm run format | Format code (Prettier) — requires Prettier to be installed |

---

# Documentation

Project documentation is organized as follows.

| File | Purpose |
|------|---------|
| README.md | Project overview and setup |
| RULES.md | Engineering standards and development workflow |
| PROJECT.md | Architecture, roadmap, modules, and active development |
| CHANGELOG.md | Completed changes and release history |

---

# Project Structure

```text
src/
supabase/
public/
docs/

README.md
RULES.md
PROJECT.md
CHANGELOG.md
```

---

# Deployment

The recommended deployment platform is **Vercel (Free Tier)**.

Vercel provides a generous free tier with SSR support, automatic HTTPS, and global CDN.

The project is already configured for Vercel via `nitro.config.ts` (`preset: "vercel"`).

1. Push the repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Configure the required environment variables.
4. Deploy.

Every push to the main branch triggers an automated deployment.

---

# Contributing

Contributions are welcome.

Please read the project documentation before submitting significant changes.

- Follow `RULES.md`
- Review `PROJECT.md`
- Update `CHANGELOG.md` for completed work

---

# License

MIT License