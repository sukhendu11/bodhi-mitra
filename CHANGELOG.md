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

### Changed

- Deployment: Cloudflare Workers -> Vercel Free Tier (docs aligned with existing nitro preset)

### Fixed

- Login redirect loop (includes("/admin") catches full URLs)
- Auth resume closure bug (pendingBookRef + userRef pattern)
- TypeScript errors in books.tsx (missing search params, queryClient, Download import)