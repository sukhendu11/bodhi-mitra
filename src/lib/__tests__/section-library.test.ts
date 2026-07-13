// ============================================================================
// Page Builder — Section Library Tests
// ============================================================================
//
// Tests for section-library.ts — localStorage-backed CRUD for saved sections
// and global components. All tests use vi.stubGlobal to mock localStorage.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BuilderComponentNode } from "@/lib/page-builder/types";

/* ─── Mock localStorage ──────────────────────────────────────────── */

interface MockStore {
  [key: string]: string;
}

function createMockStorage() {
  const store: MockStore = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

let mockStorage: ReturnType<typeof createMockStorage>;

beforeEach(() => {
  mockStorage = createMockStorage();
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Dynamic imports loaded once at top level after mock setup (matches project pattern)
const lib = (await import("../page-builder/section-library")) as {
  saveSection: Function;
  getSavedSections: Function;
  getGlobalComponents: Function;
  getReusableSections: Function;
  deleteSection: Function;
  updateSectionTree: Function;
  updateSectionMeta: Function;
  importSection: Function;
  getSectionTree: Function;
  isGlobalComponent: Function;
  createGlobalReference: Function;
};

/* ─── Helpers ────────────────────────────────────────────────────── */

function createSampleTree(name = "Sample Section"): BuilderComponentNode {
  return {
    id: "test-tree-id",
    type: "container",
    name,
    visible: true,
    locked: false,
    children: [
      {
        id: "child-heading",
        type: "heading",
        name: "Heading",
        visible: true,
        locked: false,
        children: [],
        styles: { fontSize: "2rem" },
        props: { content: "Welcome", level: 2 },
      },
      {
        id: "child-text",
        type: "text",
        name: "Text",
        visible: true,
        locked: false,
        children: [],
        styles: {},
        props: { content: "Sample text here.", html: false },
      },
    ],
    styles: { padding: "2rem" },
    props: {},
  };
}

/* ════════════════════════════════════════════════════════════════════
   Core CRUD
   ════════════════════════════════════════════════════════════════════ */

describe("saveSection", () => {
  const { saveSection } = lib;

  it("saves a section with name and tree", () => {
    const saved = lib.saveSection({
      name: "Test Section",
      tree: createSampleTree(),
    }) as any;
    expect(saved.name).toBe("Test Section");
    expect(saved.type).toBe("container");
    expect(saved.isGlobal).toBe(false);
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBeTruthy();
    expect(saved.description).toBe("");
    expect(mockStorage.setItem).toHaveBeenCalled();
  });

  it("saves with description and global flag", () => {
    const saved = lib.saveSection({
      name: "Global Hero",
      description: "A reusable hero section",
      tree: createSampleTree(),
      isGlobal: true,
    }) as any;
    expect(saved.name).toBe("Global Hero");
    expect(saved.description).toBe("A reusable hero section");
    expect(saved.isGlobal).toBe(true);
  });

  it("saves with custom thumbnail", () => {
    const saved = lib.saveSection({
      name: "With Thumb",
      tree: createSampleTree(),
      thumbnail: "data:image/png;base64,abc123",
    }) as any;
    expect(saved.thumbnail).toBe("data:image/png;base64,abc123");
  });

  it("serializes the tree to JSON string", () => {
    const saved = lib.saveSection({
      name: "JSON Test",
      tree: createSampleTree(),
    }) as any;
    const parsed = JSON.parse(saved.tree);
    expect(parsed.id).toBe("test-tree-id");
    expect(parsed.children).toHaveLength(2);
  });

  it("generates a unique ID for each save", () => {
    const s1 = lib.saveSection({ name: "One", tree: createSampleTree() }) as any;
    const s2 = lib.saveSection({ name: "Two", tree: createSampleTree() }) as any;
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("getSavedSections", () => {
  const { saveSection, getSavedSections } = lib;

  it("returns empty array when no sections saved", () => {
    expect(getSavedSections()).toEqual([]);
  });

  it("returns all saved sections", () => {
    saveSection({ name: "First", tree: createSampleTree() });
    saveSection({ name: "Second", tree: createSampleTree("Other") });
    const all = getSavedSections();
    expect(all).toHaveLength(2);
  });

  it("filters by type when provided", () => {
    saveSection({ name: "Container", tree: createSampleTree() });
    const headingTree = createSampleTree("Heading Only");
    headingTree.type = "heading" as any;
    saveSection({ name: "Heading", tree: headingTree });
    const containers = getSavedSections("container");
    expect(containers).toHaveLength(1);
    expect(containers[0].name).toBe("Container");
  });
});

describe("getGlobalComponents / getReusableSections", () => {
  const { saveSection, getGlobalComponents, getReusableSections } = lib;

  it("getGlobalComponents returns only global sections", () => {
    saveSection({ name: "Regular", tree: createSampleTree() });
    saveSection({ name: "Global", tree: createSampleTree(), isGlobal: true });
    saveSection({ name: "Another", tree: createSampleTree("Other"), isGlobal: true });
    const globals = getGlobalComponents();
    expect(globals).toHaveLength(2);
    expect(globals.every((g: any) => g.isGlobal)).toBe(true);
  });

  it("getReusableSections returns only non-global sections", () => {
    saveSection({ name: "Regular", tree: createSampleTree() });
    saveSection({ name: "Global", tree: createSampleTree(), isGlobal: true });
    const reusable = getReusableSections();
    expect(reusable).toHaveLength(1);
    expect(reusable[0].name).toBe("Regular");
  });
});

describe("deleteSection", () => {
  const { saveSection, deleteSection, getSavedSections } = lib;

  it("removes a section by ID", () => {
    const saved = saveSection({ name: "To Delete", tree: createSampleTree() }) as any;
    saveSection({ name: "Keep", tree: createSampleTree() });
    expect(getSavedSections()).toHaveLength(2);
    deleteSection(saved.id);
    expect(getSavedSections()).toHaveLength(1);
    expect(getSavedSections()[0].name).toBe("Keep");
  });

  it("does nothing for nonexistent ID", () => {
    saveSection({ name: "Only One", tree: createSampleTree() });
    deleteSection("nonexistent-id");
    expect(getSavedSections()).toHaveLength(1);
  });
});

describe("updateSectionTree", () => {
  const { saveSection, updateSectionTree, getSectionTree } = lib;

  it("updates the tree of an existing section", () => {
    const saved = saveSection({ name: "Update Me", tree: createSampleTree() }) as any;
    const newTree = createSampleTree("Updated");
    newTree.id = "new-id-123";
    const updated = updateSectionTree(saved.id, newTree);
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Update Me");
    const fetched = getSectionTree(saved.id) as any;
    expect(fetched!.id).toBe("new-id-123");
    expect(fetched!.name).toBe("Updated");
  });

  it("returns null for nonexistent section", () => {
    const result = updateSectionTree("missing", createSampleTree());
    expect(result).toBeNull();
  });
});

describe("updateSectionMeta", () => {
  const { saveSection, updateSectionMeta, getSavedSections } = lib;

  it("updates name and description", () => {
    const saved = saveSection({ name: "Old Name", description: "Old desc", tree: createSampleTree() }) as any;
    const updated = updateSectionMeta(saved.id, { name: "New Name", description: "New desc" });
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("New desc");
  });

  it("returns null for nonexistent section", () => {
    const result = updateSectionMeta("missing", { name: "Nope" });
    expect(result).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Import / Export
   ════════════════════════════════════════════════════════════════════ */

describe("importSection", () => {
  const { saveSection, importSection } = lib;

  it("imports a section with fresh IDs", () => {
    const saved = saveSection({ name: "Import Me", tree: createSampleTree() }) as any;
    const imported = importSection(saved.id) as any;
    expect(imported).not.toBeNull();
    expect(imported!.name).toContain("Imported");
    expect(imported!.children).toHaveLength(2);
    expect(imported!.id).not.toBe("test-tree-id");
    expect(imported!.children[0].id).not.toBe("child-heading");
    expect(imported!.children[1].id).not.toBe("child-text");
  });

  it("returns null for nonexistent section", () => {
    expect(importSection("missing")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    (localStorage as any).setItem(
      "bodhi-page-sections-v1",
      JSON.stringify([{ id: "bad", tree: "{invalid json}", name: "Bad", type: "container", isGlobal: false, createdAt: "", updatedAt: "", description: "" }]),
    );
    const result = importSection("bad");
    expect(result).toBeNull();
  });
});

describe("getSectionTree", () => {
  const { saveSection, getSectionTree } = lib;

  it("retrieves deserialized tree by ID", () => {
    const saved = saveSection({ name: "Get Me", tree: createSampleTree() }) as any;
    const tree = getSectionTree(saved.id) as any;
    expect(tree).not.toBeNull();
    expect(tree!.type).toBe("container");
    expect(tree!.children).toHaveLength(2);
    expect(tree!.name).toBe("Sample Section");
  });

  it("returns null for nonexistent section", () => {
    expect(getSectionTree("missing")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════════ */

describe("isGlobalComponent", () => {
  const { isGlobalComponent } = lib;

  it("returns true when node has __globalSectionId prop", () => {
    const node: BuilderComponentNode = {
      id: "global-ref",
      type: "custom", name: "Global Ref",
      visible: true, locked: true, children: [], styles: {},
      props: { __globalSectionId: "section-abc" },
    };
    expect(isGlobalComponent(node)).toBe(true);
  });

  it("returns false when node lacks __globalSectionId", () => {
    const node: BuilderComponentNode = {
      id: "regular",
      type: "text", name: "Regular",
      visible: true, locked: false, children: [], styles: {},
      props: { content: "Hello" },
    };
    expect(isGlobalComponent(node)).toBe(false);
  });

  it("returns false when props is empty", () => {
    const node: BuilderComponentNode = {
      id: "empty-props",
      type: "container", name: "Empty",
      visible: true, locked: false, children: [], styles: {},
      props: {},
    };
    expect(isGlobalComponent(node)).toBe(false);
  });
});

describe("createGlobalReference", () => {
  const { createGlobalReference } = lib;

  it("creates a locked custom node with global section ID", () => {
    const ref = createGlobalReference("section-xyz") as any;
    expect(ref.type).toBe("custom");
    expect(ref.name).toBe("Global Component");
    expect(ref.visible).toBe(true);
    expect(ref.locked).toBe(true);
    expect(ref.children).toEqual([]);
    expect(ref.props.__globalSectionId).toBe("section-xyz");
  });

  it("generates a unique ID each time", () => {
    const ref1 = createGlobalReference("sec-1") as any;
    const ref2 = createGlobalReference("sec-2") as any;
    expect(ref1.id).not.toBe(ref2.id);
  });
});

/* ════════════════════════════════════════════════════════════════════
   Edge Cases
   ════════════════════════════════════════════════════════════════════ */

describe("section-library edge cases", () => {
  const { saveSection, getSavedSections, deleteSection } = lib;

  it("handles corrupted localStorage gracefully", () => {
    (localStorage as any).setItem("bodhi-page-sections-v1", "not valid json");
    expect(getSavedSections()).toEqual([]);
  });

  it("handles non-array localStorage gracefully", () => {
    (localStorage as any).setItem("bodhi-page-sections-v1", JSON.stringify("string"));
    expect(getSavedSections()).toEqual([]);
  });

  it("handles empty object snapshot gracefully", () => {
    (localStorage as any).setItem("bodhi-page-sections-v1", JSON.stringify({}));
    expect(getSavedSections()).toEqual([]);
  });

  it("handles null item gracefully", () => {
    expect(getSavedSections()).toEqual([]);
  });

  it("persists across separate get/delete calls", () => {
    const saved = saveSection({ name: "Persist", tree: createSampleTree() }) as any;
    expect(getSavedSections()).toHaveLength(1);
    deleteSection(saved.id);
    expect(getSavedSections()).toHaveLength(0);
  });
});
