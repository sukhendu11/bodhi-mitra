# Sabbe Satta — Strapi CMS

> ⚠️ **HISTORICAL — SUPERSEDED (2026-08-14, AD-029).** Strapi is **no longer part of the target architecture**. The approved direction is **Supabase as the unified backend** (content + application data) with a **Refine + shadcn/ui admin** inside the TanStack app, hosted on **Hostinger Managed Node.js**. This guide is kept for historical reference / local dev only; Strapi is pending migration to Supabase and removal (roadmap P2/P3). Do not describe Strapi as the production CMS.

> Strapi v5 CMS for Sabbe Satta content management (historical).

## Quick Start (historical — dev only)

### Development (SQLite)

```bash
cd strapi
npm install
npm run develop
```

Access: http://localhost:1337/admin

### Docker (PostgreSQL)

```bash
cd strapi
docker compose up -d
```

Access: http://localhost:1337/admin

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
HOST=0.0.0.0
PORT=1337

# Database (SQLite for dev, PostgreSQL for production)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Secrets (generate unique values for production)
APP_KEYS=key1,key2
API_TOKEN_SALT=salt
ADMIN_JWT_SECRET=secret
JWT_SECRET=secret
TRANSFER_TOKEN_SALT=salt

# Environment
NODE_ENV=development
```

### Production (PostgreSQL on VPS)

```env
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=sabbe_satta
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=your-secure-password
NODE_ENV=production
```

## Content Types

### Posts
- Bilingual: title_en/title_bn, content_en/content_bn, excerpt_en/excerpt_bn
- Status: draft, published
- Categories, tags, cover image, author, SEO, reading time, featured flag

### Pages
- Bilingual: title_en/title_bn, content_en/content_bn
- Sections: JSON array (hero/text/image/quote/video/cta)
- Banner URL, visibility toggle, sort order, SEO

### Books
- Bilingual: title_en/title_bn, description_en/description_bn
- Status: draft, published, archived
- Author, cover image, PDF file, price, rating, featured flag, categories, tags, SEO

### Videos
- Bilingual: title_en/title_bn, description_en/description_bn
- Embed URL, thumbnail, duration, sort order

### Courses
- Bilingual: title_en/title_bn, description_en/description_bn
- Cover image, price, status, lessons (JSON), sort order

### Categories
- Bilingual: name_en/name_bn, description_en/description_bn
- Color, visibility, sort order
- Related to posts and books

### Tags
- Bilingual: name_en/name_bn
- Color
- Related to posts and books

### Navigation
- Self-referencing parent_id for tree structure
- Types: internal, external, dropdown
- Locations: header, footer
- Visibility, sort order

### Comments
- Threading: parent_id for nesting
- Status: pending, approved, rejected
- Author name, email

### Site Settings
- Singleton (one record)
- Branding: site name, tagline, logo, favicon
- Theme: accent color, dark mode
- Maintenance: mode toggle, message
- SEO: meta title, description, OG image
- Social: Facebook, Twitter, YouTube
- Contact: email, phone, address

## Docker Compose

```yaml
services:
  strapi:
    build: .
    ports:
      - "1337:1337"
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: sabbe_satta
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sabbe_satta
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U strapi -d sabbe_satta"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

## Deployment

### Local Development

```bash
npm run develop
```

### Production (VPS)

```bash
docker compose -f docker-compose.prod.yml up -d
```

### VPS Setup (Hostinger/Namecheap)

1. Buy VPS (4GB RAM minimum)
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone repository
4. Configure `.env` with production values
5. Run: `docker compose -f docker-compose.prod.yml up -d`
6. Configure Nginx reverse proxy
7. Set up SSL with Let's Encrypt

## API Endpoints

### REST API

- `GET /api/posts` — List posts
- `GET /api/posts/:id` — Get post
- `POST /api/posts` — Create post
- `PUT /api/posts/:id` — Update post
- `DELETE /api/posts/:id` — Delete post

### GraphQL

- `POST /graphql` — GraphQL endpoint

## Admin Panel

- URL: http://localhost:1337/admin
- Create admin account on first visit
- Manage content types, media, users, permissions

## Learn More

- [Strapi Documentation](https://docs.strapi.io)
- [Strapi v5 Migration Guide](https://docs.strapi.io/migration/v4-to-v5/introduction-and-faq)
- [Strapi Docker Guide](https://docs.strapi.io/dev-docs/installation/docker)
