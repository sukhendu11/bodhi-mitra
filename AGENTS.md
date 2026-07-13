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

## Phase 06 — Visual Page Builder & Section Library (2026-07-14)

### Visual Page Builder
- 20 component types: Container, Row, Column, Text, Heading, Image, Video, Button, Icon, Divider, Spacer, Gallery, Slider, Tabs, Accordion, Card, Cards, Form, HTML, Custom
- Drag-and-drop editing with live canvas, hover/selection indicators, hover toolbar
- Responsive preview (desktop 1440px / tablet 768px / mobile 375px)
- Undo/redo history with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- Auto-save with save status indicator
- 5 section templates (Hero, Two-Column, Image & Text, CTA Banner, Feature Cards)
- Copy/paste with clipboard indicator (Ctrl+C/V)
- Keyboard shortcuts (Delete, Escape, Ctrl+S save)

### Style Panel
- Typography: font, size, weight, align, line height, letter spacing
- Colors: text, background
- Background: solid color, gradient (linear/radial) with stops, direction, preview
- Spacing: margin (T/R/B/L), padding (T/R/B/L), gap
- Sizing: width, height, max-width, min-height
- Borders: width, style, color, radius
- Shadows: small/medium/large presets
- Flex: display, direction, align, justify, wrap
- Position: position, z-index, opacity
- Animation: 9 keyframe presets with duration, easing, delay, repeat, fill, live preview
- Hover: scale, shadow, bg, text, border color
- **Responsive**: sm/md/lg/xl breakpoint tabs with 11 overridable properties
- **Grid**: gridTemplateColumns, gridTemplateRows, gridColumn, gridRow (when display=grid)

### Frontend Rendering
- `pages.$slug.tsx` detects `_builder` marker, renders `BuilderPreview` with animation keyframes
- `BuilderPreview` injects hover CSS + responsive CSS media queries via `data-pb-id` selectors
- `ComponentRenderer` wraps each component with `data-pb-id` attribute
- Utility functions `generateHoverCss()` and `generateResponsiveCss()` in `page-builder/utils.ts`

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

## Phase 07 — Theme Builder & Design System (2026-07-14)

### Design Token Propagation
- Accent color propagates to `--primary`/`--primary-foreground` semantic tokens
- Font families override `--font-serif`/`--font-sans`/`--font-bn` CSS variables
- Border radius scale overrides `--radius` base
- Custom CSS injected via `<style id="site-custom-css">` in document head

### Theme Builder UI
- 6 theme presets: Warm Saffron, Cool Indigo, Forest Green, Minimal Gray, Elegant Serif, Modern Clean
- Typography controls: heading font (8 options), body font (8 options), Bangla font (4 options), base font size (12-22px)
- Border radius scale (0-2x) with visual preview
- Custom CSS textarea for site-wide injection
- Accent color opacity preview swatch strip

### Config System
- `SiteConfig.theme` extended with `font_heading`, `font_body`, `font_bn`, `font_size_base`, `radius_scale`, `preset`, `custom_css`
- `mergeConfig()` fixed to use recursive deep merge

## Phase 08 — Website Settings & Global Configuration (2026-07-14)

### New SiteConfig Groups
- `maintenance` — enabled, message_en/bn
- `features` — 8 feature flags: reader_annotations, reading_stats, book_recommendations, ai_chat, podcasts, donations, course_certificates, newsletter_automation
- `reader` — default_theme, default_font_size, default_line_height, allow_download, show_page_numbers
- `commerce` — currency, currency_symbol, tax_rate, refund_policy_en/bn

### Maintenance Mode
- `MaintenanceGate` component in `__root.tsx` — bilingual maintenance page for non-admin users
- Admin toggle in Settings → Maintenance tab

### Feature Flags
- `useFeatureFlag(flag)` and `useFeatureFlags()` hooks in `src/hooks/useFeatureFlags.ts`
- Admin UI with toggle switches and on/off badges

### Reader Settings
- Reader page applies `config.reader.default_theme` on mount
- Admin UI: theme selector, font size/line height sliders, download/page number toggles

### Commerce Settings
- Currency selector (8 currencies), tax rate slider, refund policy fields

### Dynamic Google Fonts
- `__root.tsx` head builds Google Fonts URL from theme font settings

### New Settings Tabs
- Features, Reader, Commerce, Maintenance — 4 new tabs in admin.settings.tsx

## Next Move
1. **Phase 08 complete** — Global settings hub with maintenance, features, reader, commerce, dynamic fonts.
2. Continue **V2 Sprint 1**: Supabase types regeneration → Orders panel → Email automation.
3. Update CHANGELOG.md after each sprint.

## Relevant Files
- `src/lib/siteSettings.tsx`: SiteConfig type (13 groups), DEFAULT_CONFIG, mergeConfig (deep), SiteSettingsProvider (applies all tokens + custom CSS)
- `src/components/SettingsThemeTab.tsx`: Theme presets, typography, radius, custom CSS
- `src/components/SettingsMaintenanceTab.tsx`: Maintenance toggle + message
- `src/components/SettingsFeaturesTab.tsx`: 8 feature flag toggles
- `src/components/SettingsReaderTab.tsx`: Reader defaults (theme, font, download)
- `src/components/SettingsCommerceTab.tsx`: Currency, tax, refund policy
- `src/hooks/useFeatureFlags.ts`: useFeatureFlag/useFeatureFlags hooks
- `src/routes/__root.tsx`: MaintenanceGate, dynamic Google Fonts, SiteSettingsProvider
- `src/routes/reader.$bookId.tsx`: Reader applies default theme from settings
- `src/styles.css`: Design token CSS variables (overridden at runtime by SiteSettingsProvider)
- `src/integrations/refine/`: Refine integration layer (data provider, auth, access control, resources).
- `src/routes/admin.tsx`: `<Refine>` wrapper around admin layout.
- `src/hooks/useAuth.ts`: Single source for auth, roles, permissions.
