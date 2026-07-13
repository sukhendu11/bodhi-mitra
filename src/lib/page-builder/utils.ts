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
