# CMS Platform Evaluation: Strapi v5 vs Directus for Sabbe Satta

> Generated 2026-07-15 · depth: standard · 51 sources · workspace: research/cms-evaluation/

## Executive Summary

- **Recommendation: Directus** — for Sabbe Satta's specific constraints (fully free, minimal custom coding, existing Supabase stack), Directus is the stronger foundation. [F1-F5]
- Directus can connect to the existing Supabase PostgreSQL database with **zero schema migration** — it auto-introspects all 42 migrations of tables and relationships. [F3]
- Directus has a **native Supabase Storage driver**, making file migration a config-only change. [F3]
- Directus supports **external JWT validation**, meaning Supabase Auth tokens can be accepted without replacing the auth system. [F3][F2]
- Strapi **explicitly warns against connecting to pre-existing databases** not created by Strapi — "Attempting to connect to an unsupported database may, and most likely will, result in lost data." [F3]
- Strapi's Community Edition is **MIT licensed** (truly free forever), while Directus uses **MSCL** (Monospace Sustainable Core License) with a free core tier and Open Innovation Grant for organizations under $5M revenue / 50 employees. [F4][F2]
- Strapi has **2x GitHub stars** (72.7k vs 36.5k) and **10x npm weekly downloads** (183k vs 16.8k), indicating a larger community and ecosystem. [F4]
- **Neither platform has native commerce** — orders, payments, coupons, donations, and purchase history all require 100% custom code on either platform. [F5]
- **Neither platform natively handles courses or reading stats** — both need custom content types and business logic. [F5]
- Strapi's **i18n uses locale-separated entries** (one row per locale in a `_locale` table), which is an architectural mismatch with Sabbe Satta's current paired-field approach (`title_en`/`title_bn`). [F5]
- Directus's **junction-table translations** are cleaner but still require navigating to a translations sub-view. [F5]
- Strapi offers more **built-in publishing features** (Draft & Publish, Releases, Review Workflows) in its free tier. [F5]
- Directus offers **runtime schema changes** (no code deployment needed), while Strapi's Content-type Builder is dev-mode only. [F5]
- Directus includes a **native MCP server and AI Assistant** with RBAC — future-proof for V3 AI features. [F2]

## Background & Scope

**Question:** Which open-source headless CMS (Strapi v5 vs Directus) is the best foundation for Sabbe Satta?

**Constraints:**
- Fully free: Self-hosted, no paid cloud services, no paid plugins
- Less custom coding: Maximize what the CMS provides out-of-the-box
- Existing stack: React 19 + TanStack Start frontend, Supabase PostgreSQL with 42 migrations, 33+ modules, 319 tests

**Scope:** Compare on Admin UI/UX, Content modeling, Media library, Roles & permissions, APIs, Plugin ecosystem, Extensibility, Documentation, Long-term maintainability. Evaluate self-hosted Docker deployment.

---

## 1. License & Cost

| Aspect | Strapi v5 | Directus |
|--------|-----------|----------|
| License | MIT (Community Edition) | MSCL (Monospace Sustainable Core License) [F4] |
| Free tier | Unlimited entries, API calls, roles, locales, components [F1] | Core tier with entitlement limits; Open Innovation Grant for <$5M revenue / 50 employees [F2][F5] |
| Paid plans | Growth $45/mo, Enterprise custom [F1] | Team $499/mo [F4] |
| Self-hosted cost | $0 forever | $0 (qualifies for OIG at Sabbe Satta's scale) [F2] |

**Analysis:** Strapi's MIT license is truly unrestricted. Directus's MSCL is source-available with "Competing Use" restrictions, but the Open Innovation Grant provides free commercial use for organizations under $5M revenue and 50 employees [F2][F4]. For Sabbe Satta (a small-scale publishing platform), Directus qualifies for the grant. The 4-year GPL sunset clause means Directus code becomes GPL-3.0 after 4 years per version [F4].

**Verdict:** Strapi wins on license purity. Directus is free in practice for Sabbe Satta's scale but carries licensing risk if the platform grows significantly.

---

## 2. Migration from Supabase

This is the **decisive factor** for Sabbe Satta.

| Migration Aspect | Strapi v5 | Directus |
|------------------|-----------|----------|
| Existing database | Explicitly warns against it [F3] | Auto-introspects existing PostgreSQL [F3] |
| Schema migration | Full rebuild required | Zero migration needed [F3] |
| Supabase Storage | No native provider (local/S3/Cloudinary only) [F3] | Native `supabase` storage driver [F3] |
| Supabase Auth | Self-contained JWT, no external token validation in free tier [F3] | External JWT validation supported [F3] |
| System tables | N/A | `directus_` prefix, leaves user tables untouched [F3] |
| Table filtering | N/A | `DB_EXCLUDE_TABLES` to ignore Supabase system tables [F3] |

**Strapi's warning (verbatim):**
> "Strapi applications are not meant to be connected to a pre-existing database, not created by a Strapi application, nor connected to a Strapi v3 database. The Strapi team will not support such attempts. Attempting to connect to an unsupported database may, and most likely will, result in lost data." [F3]

**Directus's approach:**
> "When Directus is connected to an existing database, it will introspect existing tables and relationships and collections will be made available to admins via the Items API." [F3]

**Verdict:** Directus wins decisively. Adopting Strapi would require rebuilding all 42 migrations of content types from scratch — the opposite of "less custom coding." Directus connects to the existing database as-is.

---

## 3. Admin UI/UX

| Feature | Strapi v5 | Directus |
|---------|-----------|----------|
| Content modeling | Visual Content-type Builder (dev-mode only) [F5] | Runtime Data Studio (changes apply immediately) [F5] |
| Admin customization | Deep: React/plugin API, theme extension, logo/favicon, editor replacement [F5] | Limited: CSS variables, project color, logo/favicon, custom CSS [F5] |
| Field types | 15+ including Rich Text (Blocks), Media, Relations (6 types), Dynamic Zones, Components [F1] | Standard fields + interfaces/display templates [F2] |
| Content features | Draft & Publish, Releases, Review Workflows, Dynamic Zones [F5] | Basic draft/publish via status field [F5] |
| Schema changes | Require code deployment (dev-mode only) [F5] | Runtime changes, no deployment needed [F5] |

**Analysis:** Strapi's admin panel is more deeply customizable (React/plugin API) but requires writing React code for non-trivial changes [F5]. Directus's admin customization is limited to CSS theming but allows runtime schema changes without redeployment [F5]. For a platform with 33+ modules, Directus's runtime schema changes reduce development friction significantly.

**Verdict:** Strapi has richer admin features. Directus has better development ergonomics (runtime schema changes). For "less custom coding," Directus's runtime approach wins.

---

## 4. Content Modeling & i18n

| Aspect | Strapi v5 | Directus |
|--------|-----------|----------|
| i18n approach | Locale-separated entries (one row per locale in `_locale` table) [F5] | Junction-table translations (`_translations` per collection) [F5] |
| Bilingual editing | One locale at a time — no side-by-side [F5] | Translations sub-view [F5] |
| Paired fields | Not natively supported (architectural mismatch) [F5] | Can be modeled as regular fields [F5] |
| Complex content | Components + Dynamic Zones for polymorphic content [F5] | Flat field model with interfaces [F5] |
| Content versioning | documentId concept across locales and draft/publish [F1] | Basic status field [F5] |

**Analysis:** Sabbe Satta currently uses paired fields (`title_en`/`title_bn`). Neither platform natively supports this pattern. Strapi's i18n creates separate entries per locale, which would require restructuring the entire data model. Directus's junction-table translations are different but also don't match the paired-field approach. However, Directus can model paired fields as regular columns since it auto-introspects the existing database — no restructuring needed [F3].

**Verdict:** Directus wins because it can work with the existing paired-field schema as-is. Strapi would require a fundamental data model restructuring.

---

## 5. Roles & Permissions

| Feature | Strapi v5 | Directus |
|---------|-----------|----------|
| Default roles | 3 (Author, Editor, Super Admin) [F1] | Public, Authenticated + custom [F2] |
| Custom roles | Unlimited (free) [F1] | Unlimited [F2] |
| Granularity | Per-content-type CRUD, per-plugin, per-setting [F1] | Field-level, item-level filter rules, field validation, field presets, IP allowlists [F2] |
| API tokens | Built-in (free) [F1] | Static tokens per user [F2] |
| Policy model | Role-based (hierarchical) [F1] | Additive policies across roles [F2] |

**Verdict:** Both are capable. Directus offers finer-grained control (field-level, item-level rules, IP allowlists). Strapi is simpler to configure. Both sufficient for Sabbe Satta's needs.

---

## 6. APIs

| Feature | Strapi v5 | Directus |
|---------|-----------|----------|
| REST API | Auto-generated per content-type [F1] | Auto-generated per collection [F2] |
| GraphQL | Install `@strapi/plugin-graphql` (free) [F1] | Built-in [F2] |
| Real-time | Webhooks (free) [F1] | WebSocket + GraphQL WebSocket subscriptions [F2] |
| Response format | Flattened (no more `data.attributes` nesting) [F1] | Standard JSON:API-like format [F2] |
| Filtering/sorting | Query parameters [F1] | Deep filter syntax [F2] |

**Verdict:** Both provide comprehensive APIs. Directus has built-in GraphQL and real-time subscriptions. Strapi requires a plugin install for GraphQL but has webhooks. Comparable.

---

## 7. Media Library & Storage

| Feature | Strapi v5 | Directus |
|---------|-----------|----------|
| Built-in | Yes, with folder organization, image cropping, focal points [F1] | Yes, with file system or external storage [F2] |
| Storage providers | Local, Amazon S3, Cloudinary [F3] | Local, S3, GCS, Azure, Cloudinary, **Supabase** [F2][F3] |
| Max file size | 1 GB default [F1] | Configurable [F2] |
| Supported types | Images, video, audio, files [F1] | All file types [F2] |

**Verdict:** Directus wins with native Supabase Storage support. Strapi would require migrating files to local/S3/Cloudinary.

---

## 8. Plugin Ecosystem & Extensibility

| Aspect | Strapi v5 | Directus |
|--------|-----------|----------|
| Marketplace | Larger, more community plugins [F4] | Smaller, extensions system [F4] |
| Extension types | Plugins (server + admin), Providers, Middleware | API extensions, App extensions, Hooks, Flows [F2] |
| AI/MCP | Not native | Native MCP server + AI Assistant [F2] |
| Automation | CRON jobs, webhooks [F1] | Flows (event-driven, chained operations) [F2] |
| Plugin compatibility | v4/v5 plugins not cross-compatible [F1] | Extensions work across versions [F2] |

**Verdict:** Strapi has a larger plugin ecosystem. Directus has unique advantages (MCP server, AI Assistant, Flows automation). For V3's AI roadmap, Directus's native MCP support is significant.

---

## 9. Documentation & Community

| Metric | Strapi v5 | Directus |
|--------|-----------|----------|
| GitHub stars | 72.7k [F4] | 36.5k [F4] |
| npm weekly downloads | 183,045 [F4] | 16,832 [F4] |
| Total releases | 537 (v5.50.2) [F4] | 370 (v12.1.1) [F4] |
| Commits | 37,553 [F4] | 13,796 [F4] |
| Forks | 9.8k [F4] | 4.8k [F4] |
| Documentation | Comprehensive, AI-powered search [F4] | Comprehensive, AI search [F4] |
| Backing company | Strapi Solutions SAS (French) [F4] | Monospace Inc. [F4] |

**Verdict:** Strapi has a significantly larger community (2x stars, 10x downloads, 1.5x releases). This means more community plugins, more Stack Overflow answers, and more third-party resources. Directus is growing but smaller.

---

## 10. Long-term Maintainability

| Factor | Strapi v5 | Directus |
|--------|-----------|----------|
| Release cadence | Faster (537 releases) [F4] | Slower (370 releases) [F4] |
| License stability | MIT — stable forever [F4] | MSCL — could change; GPL sunset after 4 years [F4] |
| Backing company stability | Strapi Solutions SAS — established [F4] | Monospace Inc. — rebranded from Directus Inc. [F4] |
| Node.js requirements | v22/v24/v26 (LTS only) [F1] | Not specified in findings |
| Database support | PostgreSQL, MySQL, MariaDB, SQLite [F1] | PostgreSQL, MySQL, MariaDB, MS SQL, SQLite, OracleDB, CockroachDB [F2] |

**Verdict:** Strapi has better long-term signals (MIT license, larger community, faster releases). Directus has broader database support and a unique licensing model that could be a risk or a feature depending on perspective.

---

## Comparison Summary

| Dimension | Strapi v5 | Directus | Winner for Sabbe Satta |
|-----------|-----------|----------|----------------------|
| License | MIT (truly free) | MSCL (free core + OIG) | Strapi (purity) |
| Migration from Supabase | Full rebuild required | Zero migration | **Directus** (decisive) |
| Supabase Auth integration | Not supported (free tier) | External JWT validation | **Directus** (decisive) |
| Supabase Storage integration | Not supported | Native driver | **Directus** (decisive) |
| Admin UI/UX | Richer features, deeper customization | Runtime schema changes | Tie (different strengths) |
| Content modeling | Components + Dynamic Zones | Flat fields + interfaces | Strapi (complex content) |
| i18n | Locale-separated entries | Junction-table translations | Directus (works with existing schema) |
| Roles & permissions | Simpler, hierarchical | Finer-grained, additive | Tie (both sufficient) |
| APIs | REST + GraphQL (plugin) | REST + GraphQL (built-in) | Directus (built-in) |
| Media library | Good, no Supabase support | Good, native Supabase support | **Directus** |
| Plugin ecosystem | Larger | Smaller | Strapi |
| AI/MCP | Not native | Native MCP server + AI Assistant | **Directus** (future-proof) |
| Community size | 2x larger | Smaller | Strapi |
| Long-term stability | MIT, established | MSCL, growing | Strapi |
| Custom code needed | High (migration + auth + storage) | Low (existing stack preserved) | **Directus** |

---

## Open Questions

1. **Directus core tier limits**: What specific resource counts (users, roles, collections) trigger the entitlement resolution flow? Need to verify Sabbe Satta's scale stays within core tier.
2. **Directus + Supabase Auth JWT configuration**: What specific JWKS endpoint and algorithm configuration is needed to validate Supabase Auth tokens in Directus?
3. **Directus DB_EXCLUDE_TABLES for Supabase**: Which Supabase system tables (`auth.*`, `storage.*`, `realtime.*`, `_supabase_*`) should be excluded from Directus introspection?
4. **Content migration SQL strategy**: Given 42 migrations of user content, what SQL approach (schema rename, view creation, or direct table import) makes existing Supabase content tables visible to Directus without breaking RLS?
5. **Strapi plugin compatibility**: Are there free Strapi community plugins for e-commerce (payment processing, coupon codes, order management) that could reduce custom commerce code?

---

## Sources

[1] Strapi Pricing (Self-Hosted) — https://strapi.io/pricing-self-hosted (accessed 2026-07-15)
[2] Strapi Content-type Builder — https://docs.strapi.io/cms/features/content-type-builder (accessed 2026-07-15)
[3] Strapi Internationalization — https://docs.strapi.io/cms/features/internationalization (accessed 2026-07-15)
[4] Strapi RBAC — https://docs.strapi.io/cms/features/rbac (accessed 2026-07-15)
[5] Strapi Users & Permissions — https://docs.strapi.io/cms/features/users-permissions (accessed 2026-07-15)
[6] Strapi REST API — https://docs.strapi.io/cms/api/rest (accessed 2026-07-15)
[7] Strapi Media Library — https://docs.strapi.io/cms/features/media-library (accessed 2026-07-15)
[8] Strapi Docker Deployment — https://docs.strapi.io/cms/installation/docker (accessed 2026-07-15)
[9] Strapi Database Configuration — https://docs.strapi.io/cms/configurations/database (accessed 2026-07-15)
[10] Strapi Deployment — https://docs.strapi.io/cms/deployment (accessed 2026-07-15)
[11] Strapi Admin Panel Customization — https://docs.strapi.io/cms/admin-panel-customization (accessed 2026-07-15)
[12] Strapi Marketplace — https://docs.strapi.io/cms/plugins/installing-plugins-via-marketplace (accessed 2026-07-15)
[13] Strapi GitHub — https://github.com/strapi/strapi (accessed 2026-07-15)
[14] Strapi License — https://github.com/strapi/strapi/blob/develop/LICENSE (accessed 2026-07-15)
[15] Directus Homepage — https://directus.com/ (accessed 2026-07-15)
[16] Directus GitHub — https://github.com/directus/directus (accessed 2026-07-15)
[17] Directus Collections — https://docs.directus.io/guides/data-model/collections (accessed 2026-07-15)
[18] Directus Files Configuration — https://docs.directus.io/configuration/files (accessed 2026-07-15)
[19] Directus Auth Tokens — https://docs.directus.io/guides/auth/tokens-cookies (accessed 2026-07-15)
[20] Directus Access Control — https://docs.directus.io/guides/auth/access-control (accessed 2026-07-15)
[21] Directus Real-time — https://docs.directus.io/guides/realtime/subscriptions (accessed 2026-07-15)
[22] Directus Flows — https://docs.directus.io/guides/flows (accessed 2026-07-15)
[23] Directus Licensing — https://directus.com/license (accessed 2026-07-15)
[24] Directus Licensing Overview — https://docs.directus.io/licensing/overview (accessed 2026-07-15)
[25] Directus Docker Deployment — https://docs.directus.io/self-hosting/deploying (accessed 2026-07-15)
[26] Directus Database Configuration — https://docs.directus.io/configuration/database (accessed 2026-07-15)
[27] Directus Translations — https://docs.directus.io/configuration/translations (accessed 2026-07-15)
[28] Directus Theming — https://docs.directus.io/configuration/theming (accessed 2026-07-15)
[29] Directus Features Overview — https://docs.directus.io/getting-started/overview (accessed 2026-07-15)
[30] Strapi Features Overview — https://docs.strapi.io/cms/features (accessed 2026-07-15)
