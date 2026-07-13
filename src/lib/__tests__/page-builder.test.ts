// ============================================================================
// Page Builder — Unit Tests
// ============================================================================
//
// Tests for:
//   - utils.ts — tree manipulation functions
//   - defaults.ts — generateId, createDefaultPage, templates, component defs
//   - DefaultComponents.tsx — gradientToCss (pure function, no React needed)
// ============================================================================

import { describe, it, expect } from "vitest";
import type { BuilderComponentNode } from "@/lib/page-builder/types";
import type { BackgroundGradient } from "@/lib/page-builder/types";

/* ─── Dynamic imports (loaded once at top level, matching project pattern) ─── */

const utilsModule = (await import("../page-builder/utils")) as {
  findNodeById: Function;
  findParent: Function;
  getNodePath: Function;
  getNodeAtPath: Function;
  deepClone: Function;
  addChild: Function;
  insertChildAt: Function;
  removeNode: Function;
  updateNode: Function;
  updateNodeStyles: Function;
  updateNodeProps: Function;
  duplicateNode: Function;
  toggleVisibility: Function;
  toggleLock: Function;
  moveNode: Function;
  countNodes: Function;
  flattenTree: Function;
  regenerateIds: Function;
  serializeTree: Function;
  deserializeTree: Function;
};

const defaultsModule = (await import("../page-builder/defaults")) as {
  generateId: Function;
  createDefaultPage: Function;
  SECTION_TEMPLATES: Array<{ name: string; desc: string; tree: BuilderComponentNode }>;
  COMPONENT_DEFS: Record<string, any>;
};

const defaultComponentsModule = (await import("../../components/admin/page-builder/DefaultComponents")) as {
  gradientToCss: (gradient: BackgroundGradient) => string;
};

/* ─── Helper: create a minimal test tree ─────────────────────────── */

function createTestTree(): BuilderComponentNode {
  return {
    id: "root",
    type: "container",
    name: "Root",
    visible: true,
    locked: false,
    children: [
      {
        id: "child-1",
        type: "text",
        name: "Text Block",
        visible: true,
        locked: false,
        children: [],
        styles: { fontSize: "1rem" },
        props: { content: "Hello" },
      },
      {
        id: "child-2",
        type: "container",
        name: "Inner Container",
        visible: true,
        locked: false,
        children: [
          {
            id: "grandchild-1",
            type: "heading",
            name: "Heading",
            visible: true,
            locked: false,
            children: [],
            styles: { fontSize: "2rem" },
            props: { content: "Title", level: 2 },
          },
        ],
        styles: {},
        props: {},
      },
      {
        id: "child-3",
        type: "button",
        name: "Button",
        visible: false,
        locked: true,
        children: [],
        styles: {},
        props: { text: "Click", variant: "primary" },
      },
    ],
    styles: {},
    props: {},
  };
}

/* ════════════════════════════════════════════════════════════════════
   utils.ts — Tree Traversal
   ════════════════════════════════════════════════════════════════════ */

describe("findNodeById", () => {
  const { findNodeById } = utilsModule;

  it("finds root node by ID", () => {
    const tree = createTestTree();
    const found = findNodeById(tree, "root") as BuilderComponentNode;
    expect(found).not.toBeNull();
    expect(found.id).toBe("root");
    expect(found.name).toBe("Root");
  });

  it("finds child node by ID", () => {
    const tree = createTestTree();
    const found = findNodeById(tree, "child-1") as BuilderComponentNode;
    expect(found).not.toBeNull();
    expect(found.id).toBe("child-1");
    expect(found.name).toBe("Text Block");
  });

  it("finds deeply nested node by ID", () => {
    const tree = createTestTree();
    const found = findNodeById(tree, "grandchild-1") as BuilderComponentNode;
    expect(found).not.toBeNull();
    expect(found.id).toBe("grandchild-1");
    expect(found.name).toBe("Heading");
  });

  it("returns null for nonexistent ID", () => {
    const tree = createTestTree();
    const found = findNodeById(tree, "nonexistent");
    expect(found).toBeNull();
  });

  it("returns null for empty tree", () => {
    const empty: BuilderComponentNode = {
      id: "empty", type: "container", name: "Empty",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    expect(findNodeById(empty, "nonexistent")).toBeNull();
  });
});

describe("findParent", () => {
  const { findParent } = utilsModule;

  it("finds parent of a direct child", () => {
    const tree = createTestTree();
    const parent = findParent(tree, "child-1") as BuilderComponentNode;
    expect(parent).not.toBeNull();
    expect(parent.id).toBe("root");
  });

  it("finds parent of a deeply nested node", () => {
    const tree = createTestTree();
    const parent = findParent(tree, "grandchild-1") as BuilderComponentNode;
    expect(parent).not.toBeNull();
    expect(parent.id).toBe("child-2");
  });

  it("returns null for root node (no parent)", () => {
    const tree = createTestTree();
    const parent = findParent(tree, "root");
    expect(parent).toBeNull();
  });

  it("returns null for nonexistent ID", () => {
    const tree = createTestTree();
    expect(findParent(tree, "missing")).toBeNull();
  });
});

describe("getNodePath", () => {
  const { getNodePath } = utilsModule;

  it("returns empty array for root", () => {
    const tree = createTestTree();
    expect(getNodePath(tree, "root")).toEqual([]);
  });

  it("returns path of indices for child", () => {
    const tree = createTestTree();
    expect(getNodePath(tree, "child-1")).toEqual([0]);
    expect(getNodePath(tree, "child-2")).toEqual([1]);
  });

  it("returns path for deeply nested node", () => {
    const tree = createTestTree();
    expect(getNodePath(tree, "grandchild-1")).toEqual([1, 0]);
  });

  it("returns null for nonexistent ID", () => {
    const tree = createTestTree();
    expect(getNodePath(tree, "missing")).toBeNull();
  });
});

describe("getNodeAtPath", () => {
  const { getNodeAtPath } = utilsModule;

  it("returns root for empty path", () => {
    const tree = createTestTree();
    const node = getNodeAtPath(tree, []) as BuilderComponentNode;
    expect(node).not.toBeNull();
    expect(node.id).toBe("root");
  });

  it("returns child at given path", () => {
    const tree = createTestTree();
    expect((getNodeAtPath(tree, [0]) as BuilderComponentNode).id).toBe("child-1");
    expect((getNodeAtPath(tree, [2]) as BuilderComponentNode).id).toBe("child-3");
  });

  it("returns deeply nested node", () => {
    const tree = createTestTree();
    expect((getNodeAtPath(tree, [1, 0]) as BuilderComponentNode).id).toBe("grandchild-1");
  });

  it("returns null for out-of-bounds index", () => {
    const tree = createTestTree();
    expect(getNodeAtPath(tree, [99])).toBeNull();
    expect(getNodeAtPath(tree, [1, 99])).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════
   utils.ts — Tree Manipulation
   ════════════════════════════════════════════════════════════════════ */

describe("addChild", () => {
  const { addChild } = utilsModule;

  it("adds a child to the specified parent", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "new-child",
      type: "text", name: "New Text",
      visible: true, locked: false, children: [], styles: {}, props: { content: "New" },
    };
    const result = addChild(tree, "child-2", newNode) as BuilderComponentNode;
    expect(tree.children[1].children).toHaveLength(1);
    expect(result.children[1].children).toHaveLength(2);
    expect(result.children[1].children[1].id).toBe("new-child");
  });

  it("adds child to root", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "new-root-child", type: "text", name: "Root Child",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    const result = addChild(tree, "root", newNode) as BuilderComponentNode;
    expect(result.children).toHaveLength(4);
    expect(result.children[3].id).toBe("new-root-child");
  });

  it("does nothing when parent not found", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "orphan", type: "text", name: "Orphan",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    const result = addChild(tree, "missing-parent", newNode) as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });

  it("returns a new tree (immutable)", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "immutable-test", type: "text", name: "Immutable",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    const result = addChild(tree, "root", newNode);
    expect(result).not.toBe(tree);
  });
});

describe("insertChildAt", () => {
  const { insertChildAt } = utilsModule;

  it("inserts child at specific index", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "inserted", type: "text", name: "Inserted",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    const result = insertChildAt(tree, "root", newNode, 1) as BuilderComponentNode;
    expect(result.children).toHaveLength(4);
    expect(result.children[1].id).toBe("inserted");
    expect(result.children[0].id).toBe("child-1");
    expect(result.children[2].id).toBe("child-2");
  });

  it("inserts at end when index equals children length", () => {
    const tree = createTestTree();
    const newNode: BuilderComponentNode = {
      id: "end", type: "text", name: "End",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    const result = insertChildAt(tree, "root", newNode, 3) as BuilderComponentNode;
    expect(result.children[3].id).toBe("end");
  });
});

describe("removeNode", () => {
  const { removeNode } = utilsModule;

  it("removes a child node by ID", () => {
    const tree = createTestTree();
    const result = removeNode(tree, "child-1") as BuilderComponentNode;
    expect(result.children).toHaveLength(2);
    expect(result.children.find((c: BuilderComponentNode) => c.id === "child-1")).toBeUndefined();
  });

  it("removes a deeply nested node", () => {
    const tree = createTestTree();
    const result = removeNode(tree, "grandchild-1") as BuilderComponentNode;
    expect(result.children[1].children).toHaveLength(0);
  });

  it("returns same tree when root ID is passed (can't remove root)", () => {
    const tree = createTestTree();
    const result = removeNode(tree, "root") as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });

  it("returns same tree for nonexistent ID", () => {
    const tree = createTestTree();
    const result = removeNode(tree, "missing") as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });
});

describe("updateNode", () => {
  const { updateNode } = utilsModule;

  it("updates node properties", () => {
    const tree = createTestTree();
    const result = updateNode(tree, "child-1", { name: "Updated Name", visible: false }) as BuilderComponentNode;
    expect(result.children[0].name).toBe("Updated Name");
    expect(result.children[0].visible).toBe(false);
  });

  it("preserves unchanged properties", () => {
    const tree = createTestTree();
    const result = updateNode(tree, "child-1", { name: "Renamed" }) as BuilderComponentNode;
    expect(result.children[0].type).toBe("text");
    expect(result.children[0].visible).toBe(true);
  });

  it("does nothing for nonexistent ID", () => {
    const tree = createTestTree();
    const result = updateNode(tree, "missing", { name: "Nope" }) as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });
});

describe("updateNodeStyles", () => {
  const { updateNodeStyles } = utilsModule;

  it("merges new styles with existing styles", () => {
    const tree = createTestTree();
    const result = updateNodeStyles(tree, "child-1", { color: "red", fontWeight: "700" }) as BuilderComponentNode;
    expect(result.children[0].styles.fontSize).toBe("1rem");
    expect(result.children[0].styles.color).toBe("red");
    expect(result.children[0].styles.fontWeight).toBe("700");
  });

  it("overwrites existing style properties", () => {
    const tree = createTestTree();
    const result = updateNodeStyles(tree, "child-1", { fontSize: "2rem" }) as BuilderComponentNode;
    expect(result.children[0].styles.fontSize).toBe("2rem");
  });
});

describe("updateNodeProps", () => {
  const { updateNodeProps } = utilsModule;

  it("merges new props with existing props", () => {
    const tree = createTestTree();
    const result = updateNodeProps(tree, "child-1", { newProp: "value" }) as BuilderComponentNode;
    expect(result.children[0].props.content).toBe("Hello");
    expect(result.children[0].props.newProp).toBe("value");
  });
});

describe("duplicateNode", () => {
  const { duplicateNode } = utilsModule;

  it("duplicates a node and inserts after original", () => {
    const tree = createTestTree();
    const result = duplicateNode(tree, "child-1") as BuilderComponentNode;
    expect(result.children).toHaveLength(4);
    const copy = result.children[1];
    expect(copy.id).not.toBe("child-1");
    expect(copy.name).toContain("Copy");
    expect(copy.type).toBe("text");
    expect(copy.styles.fontSize).toBe("1rem");
  });

  it("returns same tree for root duplication (no parent)", () => {
    const tree = createTestTree();
    const result = duplicateNode(tree, "root") as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });
});

describe("toggleVisibility", () => {
  const { toggleVisibility } = utilsModule;

  it("toggles visible to false", () => {
    const tree = createTestTree();
    const result = toggleVisibility(tree, "child-1") as BuilderComponentNode;
    expect(result.children[0].visible).toBe(false);
  });

  it("toggles visible to true", () => {
    const tree = createTestTree();
    const result = toggleVisibility(tree, "child-3") as BuilderComponentNode;
    expect(result.children[2].visible).toBe(true);
  });

  it("does nothing for nonexistent ID", () => {
    const tree = createTestTree();
    const result = toggleVisibility(tree, "missing") as BuilderComponentNode;
    expect(result.children[2].visible).toBe(false);
  });
});

describe("toggleLock", () => {
  const { toggleLock } = utilsModule;

  it("toggles lock from true to false", () => {
    const tree = createTestTree();
    const result = toggleLock(tree, "child-3") as BuilderComponentNode;
    expect(result.children[2].locked).toBe(false);
  });

  it("toggles lock from false to true", () => {
    const tree = createTestTree();
    const result = toggleLock(tree, "child-1") as BuilderComponentNode;
    expect(result.children[0].locked).toBe(true);
  });
});

describe("moveNode", () => {
  const { moveNode } = utilsModule;

  it("moves a child to a different position within the same parent", () => {
    const tree = createTestTree();
    const result = moveNode(tree, "root", 2, 0) as BuilderComponentNode;
    expect(result.children[0].id).toBe("child-3");
    expect(result.children[1].id).toBe("child-1");
    expect(result.children[2].id).toBe("child-2");
  });

  it("returns same tree when parent not found", () => {
    const tree = createTestTree();
    const result = moveNode(tree, "missing-parent", 0, 1) as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
  });
});

describe("countNodes", () => {
  const { countNodes } = utilsModule;

  it("counts all nodes in the tree", () => {
    const tree = createTestTree();
    expect(countNodes(tree)).toBe(5);
  });

  it("returns 1 for a leaf node", () => {
    const leaf: BuilderComponentNode = {
      id: "leaf", type: "text", name: "Leaf",
      visible: true, locked: false, children: [], styles: {}, props: {},
    };
    expect(countNodes(leaf)).toBe(1);
  });
});

describe("flattenTree", () => {
  const { flattenTree } = utilsModule;

  it("flattens tree with correct depth values", () => {
    const tree = createTestTree();
    const flat = flattenTree(tree) as Array<{ node: BuilderComponentNode; depth: number }>;
    expect(flat).toHaveLength(5);
    expect(flat[0].depth).toBe(0);
    expect(flat[0].node.id).toBe("root");
    expect(flat[1].depth).toBe(1);
    expect(flat[2].depth).toBe(1);
    expect(flat[3].depth).toBe(2);
    expect(flat[3].node.id).toBe("grandchild-1");
    expect(flat[4].depth).toBe(1);
    expect(flat[4].node.id).toBe("child-3");
  });
});

describe("regenerateIds", () => {
  const { regenerateIds } = utilsModule;

  it("generates new IDs for all nodes", () => {
    const tree = createTestTree();
    const result = regenerateIds(tree) as BuilderComponentNode;
    expect(result.id).not.toBe("root");
    expect(result.children[0].id).not.toBe("child-1");
    expect(result.children[1].children[0].id).not.toBe("grandchild-1");
  });

  it("preserves tree structure and properties", () => {
    const tree = createTestTree();
    const result = regenerateIds(tree) as BuilderComponentNode;
    expect(result.children).toHaveLength(3);
    expect(result.children[1].children).toHaveLength(1);
    expect(result.children[0].name).toBe("Text Block");
    expect(result.children[0].styles.fontSize).toBe("1rem");
    expect(result.children[0].props.content).toBe("Hello");
  });

  it("returns a new object (no mutation)", () => {
    const tree = createTestTree();
    const result = regenerateIds(tree);
    expect(result).not.toBe(tree);
  });
});

describe("deepClone", () => {
  const { deepClone } = utilsModule;

  it("creates an independent copy", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original) as typeof original;
    expect(cloned).toEqual(original);
    cloned.b.c = 99;
    expect(original.b.c).toBe(2);
  });

  it("handles arrays", () => {
    const arr: [number, number[]] = [1, [2, 3]];
    const cloned = deepClone(arr) as [number, number[]];
    cloned[1][0] = 99;
    expect(arr[1][0]).toBe(2);
  });
});

describe("serializeTree / deserializeTree", () => {
  const { serializeTree, deserializeTree } = utilsModule;

  it("roundtrips a full tree through JSON", () => {
    const tree = createTestTree();
    const json = serializeTree(tree) as string;
    const parsed = deserializeTree(json) as BuilderComponentNode;
    expect(parsed).toEqual(tree);
    expect(parsed.id).toBe("root");
    expect(parsed.children[1].children[0].name).toBe("Heading");
  });

  it("can be stored and restored from a string", () => {
    const tree = createTestTree();
    const stored = serializeTree(tree);
    expect(typeof stored).toBe("string");
    const restored = deserializeTree(stored) as BuilderComponentNode;
    expect(restored.id).toBe("root");
  });
});

/* ════════════════════════════════════════════════════════════════════
   defaults.ts — generateId
   ════════════════════════════════════════════════════════════════════ */

describe("generateId", () => {
  const { generateId } = defaultsModule;

  it("generates unique IDs on each call", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("starts with 'pb-' prefix", () => {
    const id = generateId() as string;
    expect(id.startsWith("pb-")).toBe(true);
  });

  it("generates IDs with timestamp and random parts", () => {
    const id = generateId() as string;
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});

describe("createDefaultPage", () => {
  const { createDefaultPage } = defaultsModule;

  it("creates a root container node", () => {
    const page = createDefaultPage() as BuilderComponentNode;
    expect(page.type).toBe("container");
    expect(page.name).toBe("Page Root");
    expect(page.visible).toBe(true);
    expect(page.locked).toBe(false);
  });

  it("creates a tree with no children", () => {
    const page = createDefaultPage() as BuilderComponentNode;
    expect(page.children).toEqual([]);
  });

  it("has sensible default styles", () => {
    const page = createDefaultPage() as BuilderComponentNode;
    expect(page.styles.width).toBe("100%");
    expect(page.styles.maxWidth).toBe("1200px");
  });

  it("generates a unique ID each time", () => {
    const page1 = createDefaultPage() as BuilderComponentNode;
    const page2 = createDefaultPage() as BuilderComponentNode;
    expect(page1.id).not.toBe(page2.id);
  });
});

describe("SECTION_TEMPLATES", () => {
  const { SECTION_TEMPLATES } = defaultsModule;

  it("has 5 section templates", () => {
    expect(SECTION_TEMPLATES).toHaveLength(5);
  });

  it("contains expected template names", () => {
    const names = (SECTION_TEMPLATES as Array<{ name: string; desc: string; tree: BuilderComponentNode }>).map((t) => t.name);
    expect(names).toContain("Hero Section");
    expect(names).toContain("Two-Column Text");
    expect(names).toContain("Image & Text");
    expect(names).toContain("CTA Banner");
    expect(names).toContain("Feature Cards");
  });

  it("each template has a tree with valid structure", () => {
    for (const tmpl of SECTION_TEMPLATES as Array<{ name: string; desc: string; tree: BuilderComponentNode }>) {
      expect(tmpl.tree.type).toBe("container");
      expect(tmpl.tree.children.length).toBeGreaterThan(0);
      expect(tmpl.tree.id).toBeTruthy();
      expect(tmpl.desc).toBeTruthy();
    }
  });
});

describe("COMPONENT_DEFS", () => {
  const { COMPONENT_DEFS } = defaultsModule;

  it("has definitions for all 20 component types", () => {
    const types = Object.keys(COMPONENT_DEFS as Record<string, any>);
    expect(types).toHaveLength(20);
  });

  it("each definition has required fields", () => {
    for (const [type, def] of Object.entries(COMPONENT_DEFS as Record<string, any>)) {
      expect(def.type).toBe(type);
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(typeof def.container).toBe("boolean");
      expect(def.defaultProps).toBeDefined();
      expect(def.defaultStyles).toBeDefined();
    }
  });

  it("container types have defaultChildren array", () => {
    for (const [type, def] of Object.entries(COMPONENT_DEFS as Record<string, any>)) {
      if (def.container) {
        expect(Array.isArray(def.defaultChildren)).toBe(true);
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   DefaultComponents.tsx — gradientToCss
   ════════════════════════════════════════════════════════════════════ */

describe("gradientToCss", () => {
  const { gradientToCss } = defaultComponentsModule;

  it("generates linear gradient string", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      direction: "to right",
      stops: [
        { color: "#ff0000", position: 0 },
        { color: "#0000ff", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("linear-gradient(to right, #ff0000 0%, #0000ff 100%)");
  });

  it("generates radial gradient string", () => {
    const gradient: BackgroundGradient = {
      type: "radial",
      direction: "circle at center",
      stops: [
        { color: "#6366f1", position: 0 },
        { color: "#a855f7", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("radial-gradient(circle at center, #6366f1 0%, #a855f7 100%)");
  });

  it("uses default direction for linear when not specified", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [
        { color: "red" },
        { color: "blue" },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("linear-gradient(to bottom right, red, blue)");
  });

  it("uses default shape for radial when not specified", () => {
    const gradient: BackgroundGradient = {
      type: "radial",
      stops: [
        { color: "red" },
        { color: "blue" },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("radial-gradient(ellipse at center, red, blue)");
  });

  it("includes color stop positions when provided", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      direction: "to bottom",
      stops: [
        { color: "black", position: 0 },
        { color: "gray", position: 50 },
        { color: "white", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("linear-gradient(to bottom, black 0%, gray 50%, white 100%)");
  });

  it("handles stops without positions", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [
        { color: "#e66465" },
        { color: "#9198e5" },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toContain("#e66465");
    expect(result).toContain("#9198e5");
    expect(result).not.toContain("%");
  });

  it("uses transparent for missing color", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [
        { color: "", position: 0 },
        { color: "blue", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toContain("transparent");
    expect(result).toContain("blue");
  });

  it("uses transparent for undefined color", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [
        { position: 0 } as any,
        { color: "blue", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toContain("transparent");
  });

  it("returns empty string for single stop", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [{ color: "red", position: 0 }],
    };
    expect(gradientToCss(gradient)).toBe("");
  });

  it("returns empty string for empty stops array", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [],
    };
    expect(gradientToCss(gradient)).toBe("");
  });

  it("returns empty string when stops is undefined", () => {
    const gradient = {
      type: "linear" as const,
      stops: undefined,
    } as any;
    expect(gradientToCss(gradient)).toBe("");
  });

  it("handles three-color gradient", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      direction: "45deg",
      stops: [
        { color: "red", position: 0 },
        { color: "yellow", position: 50 },
        { color: "green", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toBe("linear-gradient(45deg, red 0%, yellow 50%, green 100%)");
  });

  it("handles rgba color values", () => {
    const gradient: BackgroundGradient = {
      type: "linear",
      stops: [
        { color: "rgba(255, 0, 0, 0.5)", position: 0 },
        { color: "rgba(0, 0, 255, 0.8)", position: 100 },
      ],
    };
    const result = gradientToCss(gradient);
    expect(result).toContain("rgba(255, 0, 0, 0.5)");
    expect(result).toContain("rgba(0, 0, 255, 0.8)");
  });
});
