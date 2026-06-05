# 🧠 DESIGN FLOW

## PURPOSE
Defines WHAT the system is, who uses it, and how users move through it.

---

## SYSTEM PHILOSOPHY

Bodhi Mitra ("Friend on the path of awakening") is a contemplative bilingual blog that bridges Buddhist wisdom with modern psychiatry. The design prioritizes:

- **Serenity** — Warm, minimal, earth-toned UI with generous whitespace
- **Slowness** — Content-first reading experience; no popups, no intrusive CTAs
- **Bilingual parity** — Every content field exists in English and Bangla
- **Configurability** — Site owner controls all text and visuals from an admin panel

---

## USER ROLES

| Role | Access | Capabilities |
|------|--------|-------------|
| **Visitor** | Public pages | Read posts, browse categories, view comments, toggle language |
| **Commenter** | Public + login | All visitor features + post comments, edit own comments |
| **Admin** | Public + /admin | All above + CRUD posts, manage comments, customize every page/setting, upload media |
| **Super-admin (first user)** | Public + /admin | All admin features + the ability to claim admin via /onboarding when no admin exists |

---

## USER FLOWS

### Public User Flow

```
[Homepage]
  |
  +-- Scroll post grid -> Click post -> [Post Page]
  |     +-- Read article
  |     +-- Scroll to comments -> Sign in -> Write comment
  |     +-- Related posts -> Another [Post Page]
  |
  +-- Navigate via header
  |     +-- /buddhist-psychology -> Category page -> Post grid -> Post
  |     +-- /wisdom -> Category page -> Post grid -> Post
  |     +-- /books -> Category page -> Post grid -> Post
  |     +-- /about -> About page
  |     +-- /contact -> Contact form (mailto)
  |
  +-- Toggle language (EN <-> Bangla)
  |     +-- All content switches language
  |
  +-- /login -> Sign in / Create account
        +-- Redirects to previous page after auth
```

### Admin User Flow

```
[Sign in] -> /login
  |
  +-- First time? -> /onboarding
  |     +-- Step 1: Sign in with email
  |     +-- Step 2: Claim admin role (only first user)
  |
  +-- /admin (dashboard)
        +-- [Posts tab] -> List of all posts (All / Published / Drafts)
        |     +-- Click post -> /admin/$id (edit)
        |     +-- Click "New post" -> /admin/new (create)
        |     +-- Delete post (with confirmation)
        |
        +-- [New post] -> /admin/new
        |     +-- Fill bilingual title, content, excerpt (TipTap editor)
        |     +-- Set slug, category, tags, author
        |     +-- Upload cover image (drag-drop or URL)
        |     +-- Preview in both languages
        |     +-- Save as Draft or Publish
        |
        +-- [Site Settings] -> /admin/settings
        |     +-- Branding tab (logo, favicon, site name, logo width)
        |     +-- Homepage tab (hero content, CTA - bilingual)
        |     +-- Article tab (author bio toggle, sidebar, newsletter)
        |     +-- About tab (hero image, body, mission, note)
        |     +-- Contact tab (form labels, details, map)
        |     +-- Theme tab (accent colors, dark mode)
        |     +-- Social tab (social media URLs)
        |     +-- SEO tab (meta desc, OG image, Google Analytics)
        |
        +-- Sign out
```

---

## ROUTE MAP

```
/                     -> Homepage (hero + post grid with category filters)
/about                -> About page (dynamic from site settings)
/books                -> Books category (dynamic from site settings)
/buddhist-psychology  -> Buddhist Psychology category
/contact              -> Contact page (form + details)
/login                -> Auth (email/password + Google OAuth)
/onboarding           -> First-time admin setup flow
/posts/$slug          -> Individual post article
/satsang              -> Dynamic page (from site settings)
/wisdom               -> Wisdom category
/admin                -> Admin dashboard (auth-guarded layout)
/admin/               -> Post list (All / Published / Drafts)
/admin/$id            -> Edit post
/admin/new            -> Create post
/admin/settings       -> Site customizer (8 tabs: branding, homepage, article, about, contact, theme, social, SEO)
/admin/pages          -> Pages manager (bilingual content, visibility, sections)
/admin/navigation     -> Menu manager (drag-and-drop tree, nested items, types)
/pages/$slug          -> Public page (section-based dynamic rendering)
/*                    -> 404: "This page has drifted into stillness"
```

---

## COMPONENT TREE

```
RootShell (HTML shell + Scripts)
+-- RootComponent
    +-- QueryClientProvider (TanStack React Query)
    |   +-- LanguageProvider (EN/BN context, localStorage)
    |       +-- SiteSettingsProvider (fetches config, injects CSS vars + GA)
    |           +-- LayoutProvider (nav tree, footer sections, branding)
    |               +-- Header
    |               |   +-- Logo / Site name (link to /)
    |               |   +-- Nav links (from NavTree, bilingual labels)
    |               |   +-- Admin button (visible only to admins)
    |               |   +-- Language toggle (EN <-> Bangla)
    |               |   +-- Sign in / Sign out
    |               +-- <Outlet /> (route content)
    |               |   +-- Home / CategoryPage / PostPage / PublicPage / AdminLayout / Login / Onboarding
    |               +-- Footer
    |                   +-- Brand name + description
    |                   +-- Nav-driven footer columns
    |                   +-- Contact details (email, phone, location)
    |                   +-- Social links (FB, X, IG, IN, YT)
    |                   +-- Copyright line
    +-- Toaster (sonner notifications)
```

---

## DESIGN SYSTEM

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| --background | oklch(0.985 0.008 80) | Warm off-white page background |
| --foreground | oklch(0.25 0.012 60) | Nearly-black text |
| --primary | oklch(0.45 0.06 50) | Clay brown for links, accents |
| --secondary | oklch(0.94 0.015 75) | Warm grey for cards, backgrounds |
| --color-saffron | #d35400 (configurable) | Sign-in button, accent highlights |
| --muted | oklch(0.95 0.012 78) | Subtle backgrounds |
| --muted-foreground | oklch(0.5 0.018 60) | Secondary text |
| --border | oklch(0.9 0.012 75) | Subtle borders, dividers |
| --destructive | oklch(0.55 0.18 25) | Delete actions, errors |

### Typography
| Font | Usage | Fallback |
|------|-------|----------|
| Cormorant Garamond | Serif headings, article body | Georgia, serif |
| Inter | UI text (nav, buttons, captions) | system-ui, sans-serif |
| Hind Siliguri | Bangla text | Inter, sans-serif |

### Spacing
- Max content width: 1200px (max-w-6xl)
- Article reading width: 42rem (max-w-2xl)
- Standard padding: 1.5rem on mobile, scales up
- Section gaps: 5rem vertical between major sections

### Prose
Custom `.prose-mitra` class for article typography:
- Font size: 1.18rem with 1.85 line height
- Blockquotes: left border + italic, secondary background
- Links: primary color with bottom border
- Lists: disc/decimal with proper indentation

### Responsive Breakpoints
- **Mobile**: < 768px -- stacked layout, scrollable nav row
- **Desktop**: >= 768px -- horizontal nav, multi-column grids

---

## DATA MODELS

### Post
```
id, slug (unique), category (enum), status (draft|published)
title_en, title_bn, content_en, content_bn, excerpt_en, excerpt_bn
cover_image, author_name, author_image, tags (string[])
created_at, updated_at
```

### Comment
```
id, post_id (FK), user_id, user_name, comment_text
parent_id (nullable, self-FK for nesting)
created_at, updated_at
```

### User Role
```
user_id, role (admin|user)
```

### Profile
```
user_id, display_name, email, avatar_url
```

### Site Settings
Single JSON blob stored in site_settings table:
```
branding, hero, theme, footer, social, contact,
seo, article, about
```
Settings controls ONLY configuration (branding, SEO, social, contact, hero, footer, article, theme).
Navigation and pages are independent modules.

### Page
Stored in dedicated `pages` Supabase table:
```
id, slug (unique), title_en/bn, header_en/bn, body_en/bn
banner_url, meta_description_en/bn, visible, sort_order
sections[] (JSON array of section objects: hero/text/image/quote/video/cta)
created_at, updated_at
```

### Navigation Item
Stored in dedicated `navigation_items` Supabase table:
```
id, parent_id (self-FK), type (internal|external|dropdown)
label_en/bn, url, slug, icon, sort_order, visible, location (header|footer)
created_at, updated_at
```

---

## RULE
Agent must understand this before coding anything. This document should be updated whenever significant design changes are made.