## Objective
- Build the Admin Panel using mature React ecosystem libraries: Refine, shadcn/ui, Radix UI, TanStack Query, TanStack Table, React Hook Form + Zod, TipTap, Uppy, dnd-kit, cmdk, Sonner, Apache ECharts.
- Custom code only for Sabbe Satta business logic.

## Library Stack

| Concern | Library | Status |
|---------|---------|--------|
| Resource CRUD | Refine v5 (headless) | ✅ Integrated |
| UI Components | shadcn/ui + Radix UI | ✅ Integrated |
| Forms | React Hook Form + Zod | ✅ Integrated |
| Tables | TanStack Table | ✅ Integrated |
| Drag & Drop | dnd-kit | ✅ Integrated |
| Rich Editor | TipTap | ✅ Integrated |
| Search | cmdk | ✅ Integrated |
| Notifications | Sonner | ✅ Integrated |
| Charts | Apache ECharts | ✅ Replaced Recharts |
| File Uploads | Uppy | ✅ Media library integrated |
| Auth | Supabase Auth | ✅ Integrated |

## Important Details
- Refine v5 headless mode — embedded within TanStack Router routes, used only for data layer (hooks + provider).
- **Framework decision**: Refine selected over React Admin (see `ARCHITECTURE.md`). React Admin's React Router dependency conflicts with TanStack Router; Refine is already integrated across 15 pages with zero TS errors.
- Build passes with zero TypeScript errors.
- `admin.users.tsx`, `admin.comments.tsx` kept as-is (RPC-based / service-role blockers documented).

## V1 Completed

- **All 10 TASKs complete**: Refine Framework, Admin Shell, Posts, Books, Media Engine, CMS Engine, Form/Table/Resource Engines, Posts Module, Books Module, Users Module.
- **V1 Freeze Stabilization**: 0 TS errors, 62/62 tests passing, accessibility fixes (15 alt text improvements), UI polish (reader sepia icon, mobile panel), code cleanup.
- **QA Pass**: Home page, books grid, book detail pages render correctly. Minor console warning (form field attributes).

## V2 Planning Complete

### V2 Objective
Production-harden the platform and fill remaining feature gaps across Commerce and Extended Features.

### V2 Sprint Roadmap
| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| 1 | Foundation Hardening | Supabase types regeneration (eliminate 246 `as any`), Orders panel, Test coverage (62→150+), Email automation |
| 2 | Search & Discoverability | Meilisearch deployment, Search UI upgrade, Reading time estimation |
| 3 | Reading Experience | Reader annotations (highlights + notes UI), Reading stats/streaks, Book recommendations |
| 4 | Commerce & Monetization | Coupon codes (Stripe native), Donations page, Purchase history |
| 5 | Content Expansion | Podcasts (Castopod integration), Course certificates, Newsletter automation |
| 6 | Polish & Performance | Bundle optimization, Lighthouse audit, Accessibility audit |

### Key V2 Technology Decisions
- **Search**: Meilisearch (AD-013) — replaces PostgreSQL ILIKE for public search
- **Coupons**: Stripe native API (AD-014) — start simple, upgrade only if needed
- **Annotations**: Custom PDF.js overlay (AD-015) — no third-party library fits DRM model
- **Podcasts**: Castopod (AD-016) — self-hosted, open-source, Podcasting 2.0

### V2 Targets
- `as any` casts: 246 → <50
- Tests: 62 → 150+
- Lighthouse: >90 all categories

## Phase 04 Complete (2026-07-13)

### Area 2 — BlockEditor Editing Enhancements
- DraftComparison component (side-by-side/inline diff with char stats)
- KeyboardShortcuts dialog (30+ shortcuts, 6 groups, SSR-safe)
- BlockEditor autosave indicator (isSaving/lastSavedAt props)
- Keyboard shortcuts: ?, Ctrl+Shift+C/P/H, Ctrl+D duplicate block
- 35 unit tests for BlockEditor

### Area 3 — BlockEditor Media Integration
- MediaExtension: EmbedExtension (YouTube/Vimeo/X), ImageNodeView (inline editing)
- MediaPicker integration for image button
- Drag-and-drop image upload to Supabase
- URL auto-detection for embeds

### Area 4 — Form Engine Keyboard Shortcuts & Accessibility
- useFormKeyboard hook (Ctrl+S save, Escape cancel)
- aria-required/aria-describedby/aria-label on all 13+ field types
- RequiredIndicator + FieldDescription components
- FormRenderer onSave/onCancel props
- Wired into ResourceListPage (all resource forms) and admin.pages.tsx
- 16 unit tests for useFormKeyboard

### Autosave Indicator Integration
- BlockEditorSaveContext for threading status through FormEngine
- useAutoSave in admin.pages.tsx (pages editor)
- useContentAutosave in admin.collections.$type.$id.tsx (collections editor)

## Phase 06 — Section Library Expansion (2026-07-14)

### Section Export/Import
- `exportSectionToJson()`, `exportAllSectionsToJson()`, `importSectionsFromJson()` with 4-format support
- JSON download/upload UI with success/error feedback
- Bug fixes: event propagation isolation, stale state cleanup

### Section Marketplace
- **10 bundled sections**, 7 categories: Hero (2), Features (2), Content (1), CTA (2), Testimonials (1), Contact (1), Footer (1)
- `src/lib/page-builder/marketplace-sections.ts` — MarketplaceSection type, helpers, 7 MARKETPLACE_CATEGORIES
- Marketplace tab in SectionLibrary with save/insert actions, category grouping

### Section Preview System
- `src/components/admin/page-builder/SectionPreview.tsx` — Structured block wireframe renderer
- TYPE_COLORS per component type, leaf/container/gradient detection/depth limiting
- Integrated into marketplace cards (130px preview, auto-tinted backgrounds)

### Folder/Category System
- SectionFolder data model (id, name, sectionIds, createdAt, updatedAt) in localStorage
- 9 server functions for folder CRUD + section assignment
- Folder sidebar in SectionLibrary (190px) with inline rename/delete/create, count badges
- Section folder badge + move dropdown; handleDelete clears orphaned folder references

### Testing
- 43 new marketplace tests: data integrity, tree validation, category grouping, search filtering
- **Total: 319 tests passing** (from 147)

## Next Move
1. **Phase 06 complete** — Section Library fully expanded with marketplace, previews, folders.
2. Continue **V2 Sprint 1**: Supabase types regeneration → Orders panel → Email automation.
3. Update CHANGELOG.md after each sprint.

## Relevant Files
- `src/lib/page-builder/`: core types, defaults, utils, section-library, marketplace-sections
- `src/components/admin/page-builder/`: PageBuilder, SectionLibrary, SectionPreview, BuilderCanvas, etc.
- `src/lib/__tests__/marketplace-sections.test.ts`: 43 marketplace unit tests
- `src/integrations/refine/`: Refine integration layer (data provider, auth, access control, resources).
- `src/routes/admin.tsx`: `<Refine>` wrapper around admin layout.
- `src/hooks/useAuth.ts`: Single source for auth, roles, permissions.
