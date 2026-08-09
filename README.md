# Sabbe Satta

> **A modern digital platform for wisdom, mindfulness, learning, and compassionate living.**

Sabbe Satta is a full-stack platform for publishing, digital reading, multimedia learning, community engagement, and digital commerce. Built with Strapi v5 CMS, React 19 + TanStack Start frontend, and Supabase services.

---

## Features

### Public Platform

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

### Administration (Strapi v5)

- Admin Dashboard
- Content Management System (CMS)
- Post Management
- Page Management (with Visual Page Builder)
- Book Management
- Media Library
- User & Role Management
- Site-wide Configuration
- Feature Flags
- REST & GraphQL APIs
- Internationalization (500+ locales)
- Draft & Publish
- Role-Based Access Control (RBAC)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| CMS / Admin | Strapi v5 (self-hosted) | Content management, admin panel, REST/GraphQL APIs |
| Frontend | React 19 + TanStack Start | Public website, reader, commerce |
| Routing | TanStack Router | File-based, type-safe routing |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Components | shadcn/ui | Accessible primitives |
| Rich Text | TipTap | WYSIWYG editor |
| Forms | React Hook Form + Zod | Schema-driven validation |
| Database | SQLite (dev) → PostgreSQL (prod) | Strapi database |
| Auth | Supabase Auth | Frontend auth |
| Storage | Supabase Storage | File uploads |
| Hosting | VPS (Hostinger/Namecheap) + Vercel | Backend + Frontend |
| Package Manager | npm / Bun | Package management |

---

## Getting Started

### Requirements

- Node.js 22+
- npm or Bun
- Docker (optional, for containerized setup)
- Supabase Project (for Auth and Storage)

### Installation

```bash
git clone https://github.com/sukhendu11/bodhi-mitra.git
cd bodhi-mitra
npm install
```

### Strapi CMS Setup

```bash
cd strapi
npm install
npm run develop
```

Strapi admin panel: http://localhost:1337/admin

### Frontend Setup

```bash
npm run dev
```

Frontend: http://localhost:5173

---

## Environment Variables

### Frontend (.env)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Strapi (strapi/.env)

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=key1,key2
API_TOKEN_SALT=salt
ADMIN_JWT_SECRET=secret
JWT_SECRET=secret
TRANSFER_TOKEN_SALT=salt
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
NODE_ENV=development
```

---

## Project Structure

```text
bodhi-mitra/
├── src/                    # Frontend (React + TanStack)
├── strapi/                 # CMS (Strapi v5)
│   ├── config/             # Strapi configuration
│   ├── src/api/            # Content types & APIs
│   ├── public/uploads/     # Media uploads
│   └── docker-compose.yml  # Docker setup
├── supabase/               # Database migrations
├── research/               # Research & evaluation docs
├── design-references/      # Shared design research library (awesome-design-md)
├── public/                 # Static assets
├── DESIGN.md               # Canonical UI design system (single source of truth)
├── AGENTS.md               # Development agent instructions
├── PROJECT.md              # Architecture & roadmap
├── RULES.md                # Engineering standards
├── CHANGELOG.md            # Change history
└── README.md               # This file
```

---

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import into [Vercel](https://vercel.com/new)
3. Configure environment variables
4. Deploy

### Backend (VPS on Hostinger/Namecheap)

1. Buy VPS (4GB RAM minimum)
2. Install Docker
3. Deploy Strapi + PostgreSQL via Docker Compose
4. Configure Nginx reverse proxy + SSL

---

## Documentation

| File | Purpose |
|------|---------|
| README.md | Project overview and setup |
| DESIGN.md | Canonical UI design system — colors, typography, layout, components, reader design |
| RULES.md | Engineering standards and workflow |
| PROJECT.md | Architecture + roadmap in one doc (technical blueprint in §28 — formerly ARCHITECTURE.md) |
| CHANGELOG.md | Completed changes and history |
| AGENTS.md | Development agent instructions (incl. Shared Design Research Library rule) |
| strapi/README.md | Strapi CMS setup guide |

---

## License

MIT License
