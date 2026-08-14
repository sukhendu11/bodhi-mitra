/**
 * P2 admin — mock dataProvider seam tests (AD-029).
 *
 * The Refine dataProvider is mock-first; these tests verify the CRUD
 * contract the generic list/form rely on: getList (pagination), getOne,
 * create, update, deleteOne, and that read-only resources refuse writes in
 * mock mode.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  mockDataProvider,
  mockResourceWritable,
  ADMIN_RESOURCES,
} from "@/lib/admin/data-provider";
import { mockClearCms } from "@/lib/mock-cms";
import { setMockModeOverride } from "@/lib/data-source";

describe("admin dataProvider (mock seam)", () => {
  beforeEach(() => {
    mockClearCms();
    setMockModeOverride(true);
  });

  it("getList returns rows with pagination + total", async () => {
    const res = await mockDataProvider.getList({
      resource: "books",
      pagination: { current: 1, pageSize: 2 },
    } as never);
    expect(res.total).toBeGreaterThan(0);
    expect(res.data.length).toBeLessThanOrEqual(2);
    expect(res.data[0]).toHaveProperty("id");
    expect(res.data[0]).toHaveProperty("title_en");
  });

  it("getOne returns a single row by id", async () => {
    const list = await mockDataProvider.getList({ resource: "books" } as never);
    const first = list.data[0] as { id: string };
    const one = await mockDataProvider.getOne({ resource: "books", id: first.id } as never);
    expect((one.data as { id: string }).id).toBe(first.id);
  });

  it("create + getList reflect the new book", async () => {
    const created = await mockDataProvider.create({
      resource: "books",
      variables: {
        title_en: "Refine Test Book",
        price: 250,
        is_free: false,
        status: "published",
      },
    } as never);
    expect((created.data as { title_en: string }).title_en).toBe("Refine Test Book");

    const list = await mockDataProvider.getList({ resource: "books" } as never);
    expect(list.data.some((b) => b.title_en === "Refine Test Book")).toBe(true);
  });

  it("update merges fields onto the existing row", async () => {
    const list = await mockDataProvider.getList({ resource: "books" } as never);
    const first = list.data[0] as { id: string; title_en: string };
    const updated = await mockDataProvider.update({
      resource: "books",
      id: first.id,
      variables: { price: 999 },
    } as never);
    expect((updated.data as { id: string }).id).toBe(first.id);
    expect((updated.data as { price: number }).price).toBe(999);
  });

  it("deleteOne removes the row", async () => {
    const list = await mockDataProvider.getList({ resource: "books" } as never);
    const first = list.data[0] as { id: string };
    await mockDataProvider.deleteOne({ resource: "books", id: first.id } as never);
    const after = await mockDataProvider.getList({ resource: "books" } as never);
    expect(after.data.some((b) => b.id === first.id)).toBe(false);
  });

  it("read-only resources refuse writes in mock mode", async () => {
    for (const resource of ADMIN_RESOURCES) {
      if (resource === "books") continue;
      if (!mockResourceWritable(resource)) {
        await expect(
          mockDataProvider.create({ resource, variables: {} } as never),
        ).rejects.toThrow(/not available/i);
      }
    }
  });

  it("every registered resource has a getList implementation", async () => {
    for (const resource of ADMIN_RESOURCES) {
      const res = await mockDataProvider.getList({ resource } as never);
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("site_settings is a single flattened row with dotted keys", async () => {
    const res = await mockDataProvider.getList({ resource: "site_settings" } as never);
    expect(res.total).toBe(1);
    const row = res.data[0] as Record<string, unknown>;
    expect(row.id).toBe("site");
    expect(row["branding.site_name_en"]).toBe("Sabbe Satta");
    expect(row["theme.accent_color"]).toBe("#d35400");
  });

  it("site_settings update persists a nested patch via the mock store", async () => {
    const updated = await mockDataProvider.update({
      resource: "site_settings",
      id: "site",
      variables: {
        "branding.site_name_en": "Sabbe Satta Test",
        "theme.font_size_base": 18,
        "maintenance.enabled": true,
      },
    } as never);
    const row = updated.data as Record<string, unknown>;
    expect(row["branding.site_name_en"]).toBe("Sabbe Satta Test");
    expect(row["theme.font_size_base"]).toBe(18);
    expect(row["maintenance.enabled"]).toBe(true);
    // Untouched sections keep their defaults.
    expect(row["branding.tagline_en"]).toBe(
      "Where ancient wisdom meets modern psychology.",
    );
  });

  it("tags getList returns derived rows with slug/name", async () => {
    const res = await mockDataProvider.getList({ resource: "tags" } as never);
    expect(res.data.length).toBeGreaterThan(0);
    const row = res.data[0] as Record<string, unknown>;
    expect(row.slug).toBeTruthy();
    expect(row.name_en).toBeTruthy();
  });

  it("notifications getList returns admin-scope rows", async () => {
    const res = await mockDataProvider.getList({ resource: "notifications" } as never);
    expect(res.data.length).toBeGreaterThan(0);
    const row = res.data[0] as Record<string, unknown>;
    expect(row.message).toBeTruthy();
    expect(row.type).toBeTruthy();
  });
});
