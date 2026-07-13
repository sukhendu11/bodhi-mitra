// ============================================================================
// Page Builder — Utility Functions
// ============================================================================

import type { BuilderComponentNode, StyleProps } from "./types";
import { generateId } from "./defaults";

/* ─── Tree Traversal ───────────────────────────────────────────────── */

/** Find a node by ID in the component tree (BFS). */
export function findNodeById(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/** Find the parent of a node by ID. */
export function findParent(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode | null {
  for (const child of tree.children) {
    if (child.id === id) return tree;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

/** Get the path of indices from root to a node. */
export function getNodePath(
  tree: BuilderComponentNode,
  id: string,
): number[] | null {
  if (tree.id === id) return [];
  for (let i = 0; i < tree.children.length; i++) {
    const path = getNodePath(tree.children[i], id);
    if (path !== null) return [i, ...path];
  }
  return null;
}

/** Get a node at a specific path of indices. */
export function getNodeAtPath(
  tree: BuilderComponentNode,
  path: number[],
): BuilderComponentNode | null {
  let current = tree;
  for (const index of path) {
    if (index < 0 || index >= current.children.length) return null;
    current = current.children[index];
  }
  return current;
}

/** Deep clone a node (avoids mutation bugs with history). */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ─── Tree Manipulation ────────────────────────────────────────────── */

/** Add a child node to a parent by parent ID. Returns a new tree (immutable). */
export function addChild(
  tree: BuilderComponentNode,
  parentId: string,
  child: BuilderComponentNode,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const parent = findNodeById(clone, parentId);
  if (parent) {
    parent.children.push(child);
  }
  return clone;
}

/** Insert a child at a specific index within a parent. */
export function insertChildAt(
  tree: BuilderComponentNode,
  parentId: string,
  child: BuilderComponentNode,
  index: number,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const parent = findNodeById(clone, parentId);
  if (parent) {
    parent.children.splice(index, 0, child);
  }
  return clone;
}

/** Remove a node by ID. Returns a new tree. */
export function removeNode(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const parent = findParent(clone, id);
  if (parent) {
    parent.children = parent.children.filter((c) => c.id !== id);
  }
  return clone;
}

/** Update a node's properties by ID. Returns a new tree. */
export function updateNode(
  tree: BuilderComponentNode,
  id: string,
  updates: Partial<BuilderComponentNode>,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const node = findNodeById(clone, id);
  if (node) {
    Object.assign(node, updates);
  }
  return clone;
}

/** Update a node's style properties by ID. */
export function updateNodeStyles(
  tree: BuilderComponentNode,
  id: string,
  styles: Partial<StyleProps>,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const node = findNodeById(clone, id);
  if (node) {
    node.styles = { ...node.styles, ...styles };
  }
  return clone;
}

/** Update a node's component props by ID. */
export function updateNodeProps(
  tree: BuilderComponentNode,
  id: string,
  props: Record<string, unknown>,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const node = findNodeById(clone, id);
  if (node) {
    node.props = { ...node.props, ...props };
  }
  return clone;
}

/** Duplicate a node by ID. The copy is inserted after the original. */
export function duplicateNode(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const parent = findParent(clone, id);
  if (!parent) return clone;
  const idx = parent.children.findIndex((c) => c.id === id);
  if (idx === -1) return clone;
  const original = parent.children[idx];
  const copy = deepClone(original);
  copy.id = generateId();
  copy.name = `${original.name} (Copy)`;
  parent.children.splice(idx + 1, 0, copy);
  return clone;
}

/** Toggle visibility of a node. */
export function toggleVisibility(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const node = findNodeById(clone, id);
  if (node) {
    node.visible = !node.visible;
  }
  return clone;
}

/** Toggle lock state of a node. */
export function toggleLock(
  tree: BuilderComponentNode,
  id: string,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const node = findNodeById(clone, id);
  if (node) {
    node.locked = !node.locked;
  }
  return clone;
}

/** Move a node within its parent (reorder children). */
export function moveNode(
  tree: BuilderComponentNode,
  parentId: string,
  fromIndex: number,
  toIndex: number,
): BuilderComponentNode {
  const clone = deepClone(tree);
  const parent = findNodeById(clone, parentId);
  if (!parent) return clone;
  const [moved] = parent.children.splice(fromIndex, 1);
  parent.children.splice(toIndex, 0, moved);
  return clone;
}

/** Count all nodes in the tree. */
export function countNodes(tree: BuilderComponentNode): number {
  let count = 1;
  for (const child of tree.children) {
    count += countNodes(child);
  }
  return count;
}

/** Flatten tree to a list (for layer panel). */
export function flattenTree(
  tree: BuilderComponentNode,
  depth: number = 0,
): Array<{ node: BuilderComponentNode; depth: number }> {
  const result: Array<{ node: BuilderComponentNode; depth: number }> = [{ node: tree, depth }];
  for (const child of tree.children) {
    result.push(...flattenTree(child, depth + 1));
  }
  return result;
}

/** Recursively regenerate all IDs in a node tree (for paste operations). */
export function regenerateIds(node: BuilderComponentNode): BuilderComponentNode {
  const clone = deepClone(node);
  clone.id = generateId();
  clone.children = clone.children.map((child) => regenerateIds(child));
  return clone;
}

/** Convert tree to JSON-safe object (strips functions, circular refs). */
export function serializeTree(tree: BuilderComponentNode): string {
  return JSON.stringify(tree);
}

/** Parse tree from a serialized JSON string. */
export function deserializeTree(json: string): BuilderComponentNode {
  return JSON.parse(json);
}

/* ─── Dynamic CSS Generation ────────────────────────────────────── */

/** CSS property map for converting StyleProps keys to CSS property names. */
const CSS_MAP: Record<string, string> = {
  fontFamily: "font-family", fontSize: "font-size", fontWeight: "font-weight",
  lineHeight: "line-height", letterSpacing: "letter-spacing",
  textAlign: "text-align", textDecoration: "text-decoration",
  fontStyle: "font-style", textTransform: "text-transform",
  color: "color", backgroundColor: "background-color",
  marginTop: "margin-top", marginRight: "margin-right",
  marginBottom: "margin-bottom", marginLeft: "margin-left",
  paddingTop: "padding-top", paddingRight: "padding-right",
  paddingBottom: "padding-bottom", paddingLeft: "padding-left",
  width: "width", height: "height", minWidth: "min-width",
  minHeight: "min-height", maxWidth: "max-width", maxHeight: "max-height",
  borderWidth: "border-width", borderStyle: "border-style",
  borderColor: "border-color", borderRadius: "border-radius",
  boxShadow: "box-shadow", position: "position",
  top: "top", right: "right", bottom: "bottom", left: "left",
  zIndex: "z-index", display: "display", flexDirection: "flex-direction",
  alignItems: "align-items", justifyContent: "justify-content",
  flexWrap: "flex-wrap", flexGrow: "flex-grow", flexShrink: "flex-shrink",
  flexBasis: "flex-basis", gridTemplateColumns: "grid-template-columns",
  gridTemplateRows: "grid-template-rows", gridColumn: "grid-column",
  gridRow: "grid-row", gap: "gap", opacity: "opacity",
  transform: "transform", transition: "transition",
  backgroundImage: "background-image", backgroundSize: "background-size",
  backgroundPosition: "background-position", backgroundRepeat: "background-repeat",
};

const BREAKPOINTS = [
  { key: "sm" as const, query: "(min-width: 640px)" },
  { key: "md" as const, query: "(min-width: 768px)" },
  { key: "lg" as const, query: "(min-width: 1024px)" },
  { key: "xl" as const, query: "(min-width: 1280px)" },
];

/** Convert a partial StyleProps to a CSS declaration string. */
function partialToCss(partial: Partial<StyleProps>): string {
  const decls: string[] = [];
  for (const [key, cssProp] of Object.entries(CSS_MAP)) {
    const val = partial[key as keyof StyleProps];
    if (val !== undefined && val !== null && val !== "") {
      decls.push(`${cssProp}: ${val};`);
    }
  }
  // Handle backgroundGradient
  if (partial.backgroundGradient) {
    const stops = partial.backgroundGradient.stops;
    if (stops && stops.length >= 2) {
      const stopStr = stops
        .map((s) => (s.position !== undefined ? `${s.color} ${s.position}%` : s.color))
        .join(", ");
      const dir = partial.backgroundGradient.direction || "to bottom right";
      const fn = partial.backgroundGradient.type === "radial" ? "radial-gradient" : "linear-gradient";
      const shape = partial.backgroundGradient.type === "radial" ? `${dir}, ` : "";
      decls.push(`background-image: ${fn}(${shape}${stopStr});`);
    }
  }
  return decls.join(" ");
}

/** Generate hover CSS rules for the tree (targets data-pb-id). */
export function generateHoverCss(tree: BuilderComponentNode): string {
  const rules: string[] = [];
  const walk = (n: BuilderComponentNode) => {
    const hs = n.styles;
    const hoverProps: string[] = [];
    if (hs.hoverTransform) hoverProps.push(`transform: ${hs.hoverTransform};`);
    if (hs.hoverBoxShadow) hoverProps.push(`box-shadow: ${hs.hoverBoxShadow};`);
    if (hs.hoverBackgroundColor) hoverProps.push(`background-color: ${hs.hoverBackgroundColor};`);
    if (hs.hoverColor) hoverProps.push(`color: ${hs.hoverColor};`);
    if (hs.hoverBorderColor) hoverProps.push(`border-color: ${hs.hoverBorderColor};`);
    if (hoverProps.length > 0) {
      rules.push(`[data-pb-id="${n.id}"]:hover { ${hoverProps.join(" ")} }`);
    }
    n.children.forEach(walk);
  };
  walk(tree);
  return rules.join("\n");
}

/** Generate responsive CSS media queries for the tree (targets data-pb-id). */
export function generateResponsiveCss(tree: BuilderComponentNode): string {
  const byBreakpoint: Record<string, string[]> = { sm: [], md: [], lg: [], xl: [] };

  const walk = (n: BuilderComponentNode) => {
    for (const bp of BREAKPOINTS) {
      const override = n.styles[bp.key];
      if (override) {
        const css = partialToCss(override);
        if (css) {
          byBreakpoint[bp.key].push(`[data-pb-id="${n.id}"] { ${css} }`);
        }
      }
    }
    n.children.forEach(walk);
  };
  walk(tree);

  const rules: string[] = [];
  for (const bp of BREAKPOINTS) {
    if (byBreakpoint[bp.key].length > 0) {
      rules.push(`@media ${bp.query} { ${byBreakpoint[bp.key].join("\n")} }`);
    }
  }
  return rules.join("\n");
}
