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

## Work State
### Completed (Tasks 1-10)

**TASK 01 — Refine Framework**: @refinedev/core + @refinedev/supabase integrated. Data provider, auth provider, access control, 16 resources defined. Headless mode within TanStack Router.

**TASK 02 — Admin Shell**: 3-column layout (sidebar | workspace | inspector). Collapsible sidebar with multi-section nav. AdminTopBar with user menu. AdminMobileNav. Command palette. Keyboard shortcuts. AdminInspector with page info, quick actions, system status.

**TASK 03 — Posts (original)**: TipTap editor, bilingual content, category/tag support, slug generation, cover image, author.

**TASK 04 — Books (original)**: Rating (1-5 stars), featured flag, PDF upload, eye icon with purchase/auth modal, signed URL reader.

**TASK 05 — Media Engine**: MediaPicker modal (Browse/Upload tabs, search, bucket filter). Integrated into CoverUploader, admin.videos, admin.books, admin.pages. Media Library enhanced: Replace modal, file type filtering, multi-select bulk delete.

**TASK 06 — CMS Engine**: 7 modules (content-type, metadata, slug, workflow, relationships, revisions, seo). 5 registered content types. Slugify delegations in 4 lib modules.

**TASK 07 — Engines**: Form Engine (FormRenderer, 11 field types, auto-save, validation). Table Engine (DataTable with search/sort/pagination/expand). Resource Engine (registerResource, ResourceListPage generic CRUD).

**TASK 08 — Posts Module**: /admin/posts via ResourceListPage. FormRenderer + TipTap + TagInput + MediaPicker + PostPreview. SEO fields, slug auto-generation, author auto-fetch.

**TASK 09 — Books Module**: Preview (Eye icon), ratings display, category select (9), SEO fields, sort order, slug auto-generation, organized form groups.

**TASK 10 — Users Module**: Expandable detail panel (Profile/Library/Activity tabs). Account status badges, search, stats cards. getUserAuditEvents + getUserLibraryAdmin server functions.

**Cross-Check (all 10 tasks)**: 0 TS errors, 29/29 tests pass, no TODO/FIXME, no dead imports, route tree consistent, all components exist, all resources defined.

### Ready
- All 10 tasks complete. Zero TypeScript errors. All 29 tests passing.
- CMS Engine, Media Engine, Form Engine, Table Engine, Resource Engine — all reusable engines built.
- Admin pages consistent: Refine hooks + React Hook Form + Zod + shared components.

## Next Move
1. Production deployment prep (live Stripe keys, DNS, SSL).
2. Start interactive testing via `npm run dev`.
3. Begin user acceptance testing.

## Relevant Files
- `src/integrations/refine/`: Refine integration layer (data provider, auth, access control, resources).
- `src/routes/admin.tsx`: `<Refine>` wrapper around admin layout.
- `src/hooks/useAuth.ts`: Single source for auth, roles, permissions.
- `src/components/admin/analytics-widgets.tsx`: ECharts `MonthlyPostChart`.
- `src/components/admin/uppy-uploader.tsx`: Reusable Uppy Dashboard uploader.
- `src/routes/admin.media.tsx`: Uppy-powered media library.
- `src/routes/admin.users.tsx`, `admin.comments.tsx`: Kept as-is (blockers documented).
