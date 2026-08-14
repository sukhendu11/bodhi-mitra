/**
 * P2 admin — resource registry tests (AD-029).
 *
 * The schema-driven registry (`src/lib/admin/resources.ts`) powers every
 * list and form in the Refine admin. These tests pin the registry contract:
 * valid field/column shapes, bilingual labels, required markers, read-only
 * semantics, and the column format helpers the list renders.
 */
import { describe, it, expect } from "vitest";
import {
  ADMIN_RESOURCE_DEFS,
  getResourceDef,
  type ResourceField,
  type ResourceColumn,
} from "@/lib/admin/resources";
import { ADMIN_RESOURCES } from "@/lib/admin/data-provider";

const VALID_TYPES = new Set(["text", "textarea", "number", "boolean", "select", "tags", "url"]);

describe("admin resource registry", () => {
  it("covers every registered admin resource", () => {
    const names = ADMIN_RESOURCE_DEFS.map((d) => d.name);
    for (const resource of ADMIN_RESOURCES) {
      expect(names).toContain(resource);
    }
  });

  it("has unique resource names with bilingual labels and an icon", () => {
    const seen = new Set<string>();
    for (const def of ADMIN_RESOURCE_DEFS) {
      expect(seen.has(def.name)).toBe(false);
      seen.add(def.name);
      expect(def.labelEn.trim().length).toBeGreaterThan(0);
      expect(def.labelBn.trim().length).toBeGreaterThan(0);
      // lucide icons are forwardRef components — "function" in classic
      // components, "object" (with .render) for memo/forwardRef in React 19.
      expect(typeof def.icon).toMatch(/^(function|object)$/);
      expect(Array.isArray(def.columns)).toBe(true);
      expect(Array.isArray(def.fields)).toBe(true);
    }
  });

  it("every column has a key, bilingual labels, and a format-free fallback", () => {
    for (const def of ADMIN_RESOURCE_DEFS) {
      for (const col of def.columns as ResourceColumn[]) {
        expect(col.key.length).toBeGreaterThan(0);
        expect(col.labelEn.length).toBeGreaterThan(0);
        expect(col.labelBn.length).toBeGreaterThan(0);
        if (col.format) {
          // Formats must return a renderable value for a null row.
          const out = col.format({} as Record<string, unknown>);
          expect(["string", "number", "boolean"]).toContain(typeof out);
        }
      }
    }
  });

  it("every field has a key, bilingual labels, and a valid type", () => {
    for (const def of ADMIN_RESOURCE_DEFS) {
      for (const field of def.fields as ResourceField[]) {
        expect(field.key.length).toBeGreaterThan(0);
        expect(field.labelEn.length).toBeGreaterThan(0);
        expect(field.labelBn.length).toBeGreaterThan(0);
        expect(VALID_TYPES.has(field.type)).toBe(true);
      }
    }
  });

  it("select fields always ship options", () => {
    for (const def of ADMIN_RESOURCE_DEFS) {
      for (const field of def.fields as ResourceField[]) {
        if (field.type === "select") {
          expect(Array.isArray(field.options)).toBe(true);
          expect((field.options ?? []).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("books/posts/videos require a title field", () => {
    for (const name of ["books", "posts", "videos"] as const) {
      const def = getResourceDef(name);
      const title = (def?.fields as ResourceField[]).find((f) => f.key === "title_en");
      expect(title?.required).toBe(true);
    }
  });

  it("getResourceDef returns the matching def and undefined for unknown names", () => {
    expect(getResourceDef("books")?.name).toBe("books");
    expect(getResourceDef("posts")?.name).toBe("posts");
    expect(getResourceDef("does-not-exist")).toBeUndefined();
  });

  it("immutable identity fields are marked read-only", () => {
    const orders = getResourceDef("orders");
    const idField = (orders?.fields as ResourceField[]).find((f) => f.key === "id");
    expect(idField?.readOnly).toBe(true);

    const profiles = getResourceDef("profiles");
    const userIdField = (profiles?.fields as ResourceField[]).find((f) => f.key === "user_id");
    expect(userIdField?.readOnly).toBe(true);

    const tags = getResourceDef("tags");
    const slugField = (tags?.fields as ResourceField[]).find((f) => f.key === "slug");
    expect(slugField?.readOnly).toBe(true);
  });

  it("site_settings is a single-row resource (no create/delete in the UI)", () => {
    const def = getResourceDef("site_settings");
    expect(def?.singleRow).toBe(true);
    expect(def?.name).toBe("site_settings");
  });

  it("site_settings fields use dotted keys for nested config", () => {
    const def = getResourceDef("site_settings");
    const fields = def?.fields as ResourceField[];
    for (const f of fields ?? []) {
      expect(f.key).toMatch(/\./);
    }
  });

  it("notifications fields carry a select type with valid options", () => {
    const def = getResourceDef("notifications");
    const typeField = (def?.fields as ResourceField[]).find((f) => f.key === "type");
    expect(typeField?.type).toBe("select");
    expect(typeField?.options).toContain("new_purchase");
    expect(typeField?.options).toContain("welcome");
  });
});
