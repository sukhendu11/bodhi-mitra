# ⚙️ CODING FLOW

## PURPOSE
Defines HOW to write safe, scalable, and consistent code for the Bodhi Mitra project.

---

## CORE RULE
UI must NEVER break existing system. Always verify before deploying changes.

USE THIRD-PARTY OPEN-SOURCE LIBRARIES WHEN APPROPRIATE

When a feature requires standard functionality, prefer using popular, free, and well-maintained open-source libraries instead of building from scratch.

Priority rule:
- Use proven libraries for common problems (UI components, drag-drop, forms, tables, editors, caching, etc.)
- Avoid reinventing existing solutions unless there is a strong architectural reason

Library requirement:
- Must be widely used in production
- Must be actively maintained
- Must be secure and trusted in the community

Core CMS logic (posts, pages, books, menus, roles, settings, permissions) must remain fully custom and must NOT be replaced by third-party systems.

Libraries are allowed ONLY for:
- UI/UX acceleration
- Developer productivity
- Non-core infrastructure helpers


DO NOT USE THIRD-PARTY LIBRARIES FOR CORE CMS LOGIC

Avoid using external libraries when the feature involves core CMS system behavior or business rules.

Never use third-party solutions for:
- Authentication logic flow (Supabase Auth must control this)
- Role-based access control (RBAC)
- Posts, pages, books, or menu data structure logic
- Navigation system or routing logic
- Theme system or layout engine
- Permission enforcement or security rules

Reason:
These areas define the core architecture of the CMS and must remain fully owned and controlled by the system to ensure stability, security, and predictability.

If a library touches core CMS logic, it must be rejected or replaced with a custom implementation.

## ARCHITECTURE PATTERN

```
UI Components
    |  (useQuery / useMutation / useServerFn)
Hooks (custom React hooks for state + side effects)
    |
Services (lib/ -- business logic, Supabase queries, server functions)
    |
API (Supabase client, server functions with middleware chain)
    |
DB (Supabase PostgreSQL with RLS)
```

### Rules:
- **No business logic in UI components** -- extract to lib/ or hooks/
- **Components render data** -- they should not fetch or transform it directly
- **Hooks manage state** -- useAuth, useSiteSettings, useIsMobile
- **Services own queries** -- all supabase.from().select() calls go in lib/

---

## FILE ORGANIZATION

```
src/
+-- routes/          # One file per route. Keep under 200 lines. Delegate to components.
+-- components/      # Reusable UI components. No route-specific logic.
|   +-- ui/          # shadcn/ui primitives -- do not edit directly.
+-- hooks/           # Custom React hooks (useAuth, useIsMobile, etc.)
+-- lib/             # Business logic, utilities, server functions
+-- integrations/    # Third-party integrations (supabase)
+-- assets/          # Static images, fonts
```

### Conventions:
- **Route files**: thin wrapper -- loader/head + component that delegates to components
- **Component files**: one component per file, PascalCase filename
- **Hook files**: use prefix, camelCase filename
- **Lib files**: descriptive noun (posts.ts, comments.ts, siteSettings.tsx)
- **Server functions**: end with .functions.ts in lib/

---

## NAMING CONVENTIONS

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | PostCard.tsx, CategoryPage.tsx |
| Hooks | use + camelCase | useAuth.ts, useIsMobile.tsx |
| Functions | camelCase | fetchPosts(), pickLocalized() |
| Types/Interfaces | PascalCase | PostInput, SiteConfig |
| Files (code) | camelCase or PascalCase match export | posts.ts, PostCard.tsx |
| Files (config) | dot-separated lowercase | vite.config.ts, wrangler.jsonc |
| Database columns | snake_case | user_id, created_at |
| Env variables | UPPER_SNAKE_CASE | VITE_SUPABASE_URL |

---

## STATE MANAGEMENT PATTERNS

### Choose the right tool:

| Type | Tool | Example |
|------|------|---------|
| Remote/Server state | TanStack React Query | useQuery({ queryKey: ["posts"], queryFn: fetchPosts }) |
| Auth state | Custom hook + Supabase | useAuthSession() |
| UI state | useState | form inputs, toggles, tabs, modals |
| Shared derived state | useMemo | sorted lists, computed values |
| Global config | React Context | LanguageProvider, SiteSettingsProvider |

### React Query patterns:
- Always use descriptive queryKey arrays: ["posts", category], ["comments", postId]
- Set staleTime for data that changes infrequently: site settings = 60s, admin status = 60s
- After mutations, call queryClient.invalidateQueries({ queryKey: [...] })
- Use useMutation for writes; handle onSuccess, onError

---

## BILINGUAL DEVELOPMENT PATTERNS

### Content fields:
```
title_en / title_bn     -> always both, never just one
content_en / content_bn
excerpt_en / excerpt_bn
```

### Selecting the right language:
```typescript
// For system labels (nav, buttons):
const { t } = useLang();
t("sign_in") // returns string in active language

// For content fields from DB:
const title = pickLocalized(post.title_en, post.title_bn, lang, "Untitled")
```

### Translation dict (i18n.tsx):
- System UI labels go in the dict object
- Content goes in SiteConfig (site settings) or the posts table
- System labels that should NOT be translated (e.g., "Admin") use same string for both EN and BN

---

## ERROR HANDLING PATTERNS

### In components:
```typescript
const { data, isLoading, error } = useQuery({ ... })
if (isLoading) return <Skeleton />
if (error) return <p>{t("load_error")}</p>
if (!data) return <EmptyState />
return <DataView data={data} />
```

### In server functions:
```typescript
// Middleware handles auth validation
// Handler wraps in try/catch for DB errors
```

### SSR errors:
- server.ts catches h3-swallowed errors and returns branded HTML
- Error middleware in start.ts catches unhandled server function errors
- Root route has errorComponent for client-side error recovery

---

## COMMON CODE PATTERNS

### Query + Mutation pair:
```typescript
const queryClient = useQueryClient()
const { data } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts })
const mutation = useMutation({
  mutationFn: createPost,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] })
    toast.success("Post created")
  },
  onError: (e: Error) => toast.error(e.message),
})
```

### Protected server function:
```typescript
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context
    // ... authenticated logic
  })
```

### Bilingual field update (settings):
```typescript
const update = <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) =>
  setCfg((c) => ({ ...c, [group]: { ...c[group], ...patch } as SiteConfig[K] }))
```

---

## EXTENDING vs REWRITING

### Prefer:
- Adding optional props to existing components
- Extending existing interfaces with new (optional) fields
- Adding new fields to SiteConfig (they auto-merge via mergeConfig)
- Adding new routes as separate files

### Avoid:
- Rewriting components that work
- Removing props/interfaces that are used elsewhere
- Changing the shape of SiteConfig without updating mergeConfig
- Deleting legacy fields before migration is complete

---

## UI SAFETY

- Do not break existing layout or styling
- Do not change component structure unless required
- Preserve responsiveness -- always test at mobile widths
- Avoid duplicating existing components; use composition instead
- Maintain the warm, minimal aesthetic
- Keep the bilingual parity intact -- never add a text field without both EN and BN variants

---

## THINK BEFORE CODING

Ask yourself:

- **Will this break existing UI?** -- Check all usage sites first
- **Can I reuse something?** -- Look for existing components, hooks, or utilities
- **Is the change minimal?** -- Small, focused changes are easier to review and less likely to break things
- **Does this maintain bilingual parity?** -- Both languages must be supported
- **Does this need a migration?** -- New DB columns need SQL migrations in supabase/migrations/

If uncertain -> stop and re-evaluate.

---

## ASK FOR HELP WHEN STUCK

Some tasks require manual user intervention — e.g., providing API keys, access tokens, or credentials that the AI agent cannot generate or access. When this happens:

- **Ask the user** explicitly using the `ask_user` tool — describe exactly what is needed and where to get it (include a URL if applicable)
- **Do not guess or fabricate** secrets, tokens, or credentials
- **Document the requirement** in this file or PROJECT_STATE.md so future sessions know the context
- Once the user provides what's needed, **proceed immediately** and complete the task without requiring further manual steps