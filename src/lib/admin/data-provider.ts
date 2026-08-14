/**
 * Refine dataProvider seam — P2 custom admin (AD-029).
 *
 * One Refine DataProvider for the whole admin. Mock mode reads/writes the
 * existing per-domain mock stores (so the admin is fully exercisable offline,
 * per the Mock Data Removal Strategy); real mode delegates to the
 * `@refinedev/supabase` provider against the unified Supabase schema.
 *
 * Dispatch is `VITE_DATA_SOURCE`-gated via `isMockMode()` — identical to
 * every other service in the app. Swap is config, not a rewrite.
 */
import type { DataProvider } from "@refinedev/core";
import { dataProvider as supabaseDataProvider } from "@refinedev/supabase";
import { isMockMode } from "@/lib/data-source";
import { supabase } from "@/integrations/supabase/client";
import {
  mockDeleteBook,
  mockDeletePost,
  mockDeleteVideo,
  mockNewBook,
  mockNewPost,
  mockNewVideo,
  mockUpsertBook,
  mockUpsertPost,
  mockUpsertVideo,
} from "@/lib/mock-cms";
import {
  mockFetchAllBooks,
  mockFetchAllPosts,
  mockFetchAllVideos,
  mockFetchCategories,
  mockFetchPages,
  mockFetchPublicNavItems,
} from "@/lib/mock-data";
import { mockGetAllOrders } from "@/lib/mock-commerce";
import { mockFetchAllProfiles } from "@/lib/mock-session";
import { mockFetchTags } from "@/lib/mock-data";
import { mockGetAllNotifications } from "@/lib/mock-notifications";
import { mockGetSettings, mockUpdateSettings } from "@/lib/mock-settings";
import { mergeConfig, type SiteConfig } from "@/lib/siteSettings";
import type { Book } from "@/lib/books";
import type { Post } from "@/lib/posts";
import type { Video } from "@/lib/videos";

/** Resource names the admin exposes (real mode = Supabase table names). */
export const ADMIN_RESOURCES = [
  "books",
  "posts",
  "videos",
  "pages",
  "categories",
  "navigation_items",
  "orders",
  "profiles",
  "site_settings",
  "tags",
  "notifications",
] as const;

export type AdminResource = (typeof ADMIN_RESOURCES)[number];

type Row = Record<string, unknown> & { id: string | number };

/** Read-only in mock mode (no mock CRUD store yet) — real mode still CRUDs. */
const MOCK_READ_ONLY: ReadonlySet<AdminResource> = new Set([
  "pages",
  "categories",
  "navigation_items",
  "orders",
  "profiles",
  "tags",
  "notifications",
]);

/* ─── site_settings helpers ───────────────────────────────────
 * The mock store is a deep-partial patch (mock-settings.ts); the admin
 * edits the *merged* config (SiteConfig) via the generic form. Flatten the
 * merged config into dotted keys so the flat generic form works, and
 * unflatten the form values back into a nested patch on save.
 */

function flattenConfig(
  obj: Record<string, unknown>,
  prefix = "",
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenConfig(value as Record<string, unknown>, fullKey, out);
    } else {
      out[fullKey] = value;
    }
  }
  return out;
}

function unflattenPatch(values: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const parts = key.split(".");
    let cursor = patch;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      cursor[part] ??= {};
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return patch;
}

function mergedSettingsRow(): Row {
  const merged = mergeConfig(mockGetSettings() ?? {});
  return { id: "site", ...flattenConfig(merged as unknown as Record<string, unknown>) };
}

async function mockList(resource: AdminResource): Promise<Row[]> {
  switch (resource) {
    case "books":
      return mockFetchAllBooks() as unknown as Row[];
    case "posts":
      return mockFetchAllPosts() as unknown as Row[];
    case "videos":
      return mockFetchAllVideos() as unknown as Row[];
    case "pages":
      return mockFetchPages() as unknown as Row[];
    case "categories":
      return mockFetchCategories() as unknown as Row[];
    case "navigation_items":
      return mockFetchPublicNavItems() as unknown as Row[];
    case "orders":
      return (await mockGetAllOrders()) as unknown as Row[];
    case "profiles":
      return mockFetchAllProfiles() as unknown as Row[];
    case "site_settings":
      return [mergedSettingsRow()];
    case "tags":
      return mockFetchTags() as unknown as Row[];
    case "notifications":
      return (await mockGetAllNotifications()) as unknown as Row[];
  }
}

function mockCreateRow(resource: AdminResource, values: Record<string, unknown>): Row {
  switch (resource) {
    case "books":
      return mockUpsertBook(
        mockNewBook(values as unknown as Partial<Book> & { title_en: string }),
      ) as unknown as Row;
    case "posts":
      return mockUpsertPost(
        mockNewPost(values as unknown as Partial<Post> & { title_en: string }),
      ) as unknown as Row;
    case "videos":
      return mockUpsertVideo(
        mockNewVideo(values as unknown as Partial<Video> & { title: string }),
      ) as unknown as Row;
    default:
      throw new Error(`Create not available for ${resource} in mock mode`);
  }
}

function mockUpdateRow(resource: AdminResource, id: string | number, values: Record<string, unknown>): Row {
  switch (resource) {
    case "books": {
      const base = mockFetchAllBooks().find((b) => b.id === id) as Book | undefined;
      return mockUpsertBook({ ...(base ?? ({} as Book)), ...values, id: String(id) }) as unknown as Row;
    }
    case "posts": {
      const base = mockFetchAllPosts().find((p) => p.id === id) as Post | undefined;
      return mockUpsertPost({ ...(base ?? ({} as Post)), ...values, id: String(id) }) as unknown as Row;
    }
    case "videos": {
      const base = mockFetchAllVideos().find((v) => v.id === id) as Video | undefined;
      return mockUpsertVideo({ ...(base ?? ({} as Video)), ...values, id: String(id) }) as unknown as Row;
    }
    case "site_settings": {
      // Single-row resource: unflatten the dotted form keys into a nested
      // patch and merge into the mock settings store.
      const patch = unflattenPatch(values);
      mockUpdateSettings(patch as never);
      return mergedSettingsRow();
    }
    default:
      throw new Error(`Update not available for ${resource} in mock mode`);
  }
}

function mockDeleteRow(resource: AdminResource, id: string | number): void {
  switch (resource) {
    case "books":
      mockDeleteBook(String(id));
      return;
    case "posts":
      mockDeletePost(String(id));
      return;
    case "videos":
      mockDeleteVideo(String(id));
      return;
    default:
      throw new Error(`Delete not available for ${resource} in mock mode`);
  }
}

/** True when a resource has mock-mode CRUD (write) support. */
export function mockResourceWritable(resource: AdminResource): boolean {
  return !MOCK_READ_ONLY.has(resource);
}

let _supabaseProvider: DataProvider | null = null;
function getSupabaseProvider(): DataProvider {
  if (!_supabaseProvider) _supabaseProvider = supabaseDataProvider(supabase);
  return _supabaseProvider;
}

export function getAdminDataProvider(): DataProvider {
  if (isMockMode()) return mockDataProvider;
  return getSupabaseProvider();
}

/**
 * Mock dataProvider — small, deterministic, offline. Implements only the
 * methods the generic list/form use. Writes available for books/posts/videos
 * (mock-cms); other resources are read-only in mock mode (UI hides actions).
 */
/**
 * Mock dataProvider — small, deterministic, offline. Implements only the
 * methods the generic list/form use. Writes available for books/posts/videos
 * (mock-cms); other resources are read-only in mock mode (UI hides actions).
 */
// The DataProvider methods are generic; the mock adapter works on concrete
// rows, so we keep the literal untyped and cast at the seam below.
export const mockDataProvider = {
  getApiUrl: () => "mock://admin",

  async getList({
    resource,
    pagination,
  }: {
    resource: string;
    pagination?: { current?: number; currentPage?: number; pageSize?: number };
  }) {
    const all = await mockList(resource as AdminResource);
    // Refine v5 sends `currentPage` (v4 sent `current`) — accept both so the
    // mock adapter matches whatever the real provider receives.
    const page = pagination?.currentPage ?? pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return {
      data: all.slice(start, start + pageSize),
      total: all.length,
    };
  },

  async getOne({ resource, id }: { resource: string; id: string | number }) {
    const all = await mockList(resource as AdminResource);
    const found = all.find((r) => String(r.id) === String(id));
    if (!found) throw new Error(`Not found: ${String(resource)}/${String(id)}`);
    return { data: found };
  },

  async create({ resource, variables }: { resource: string; variables: unknown }) {
    return { data: mockCreateRow(resource as AdminResource, variables as Record<string, unknown>) };
  },

  async update({ resource, id, variables }: { resource: string; id: string | number; variables: unknown }) {
    return { data: mockUpdateRow(resource as AdminResource, id, variables as Record<string, unknown>) };
  },

  async deleteOne({ resource, id }: { resource: string; id: string | number }) {
    mockDeleteRow(resource as AdminResource, id);
    return { data: { id } as Row };
  },
} as DataProvider;
