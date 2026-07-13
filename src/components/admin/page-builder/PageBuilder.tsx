// ============================================================================
// Page Builder — Main Orchestrator Component
// ============================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { BuilderComponentNode, BuilderComponentType } from "@/lib/page-builder/types";
import type { StyleProps } from "@/lib/page-builder/types";
import {
  createDefaultPage,
  SECTION_TEMPLATES,
  COMPONENT_DEFS,
  generateId,
} from "@/lib/page-builder/defaults";
import {
  deepClone,
  addChild,
  removeNode,
  updateNodeStyles,
  updateNodeProps,
  duplicateNode,
  toggleVisibility,
  toggleLock,
  moveNode,
  serializeTree,
  deserializeTree,
  findNodeById,
  findParent,
  regenerateIds,
} from "@/lib/page-builder/utils";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderSidebar } from "./BuilderSidebar";
import { BuilderToolbar } from "./BuilderToolbar";
import { ResponsivePreview } from "./ResponsivePreview";
import { X, Undo2, Plus, Globe, Play } from "lucide-react";
import { toast } from "sonner";
import { SectionLibrary } from "./SectionLibrary";
import { insertChildAt } from "@/lib/page-builder/utils";

/* ─── Props ────────────────────────────────────────────────────────── */

interface PageBuilderProps {
  /** Initial serialized tree (for editing existing pages) */
  initialTree?: string;
  /** Called when the tree changes (for auto-save integration) */
  onChange?: (serialized: string) => void;
  /** Called when user clicks save */
  onSave?: (serialized: string) => void;
  /** Whether save is pending */
  isSaving?: boolean;
  /** Last saved timestamp */
  lastSavedAt?: Date | null;
}

/* ─── Undo/Redo History Hook ───────────────────────────────────────── */

function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef(0);

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(next);
      indexRef.current = historyRef.current.length - 1;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current--;
    setState(historyRef.current[indexRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current++;
    setState(historyRef.current[indexRef.current]);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return [state, set, undo, redo, canUndo, canRedo] as const;
}

/* ─── Page Builder ──────────────────────────────────────────────────── */

export function PageBuilder({
  initialTree,
  onChange,
  onSave,
  isSaving,
  lastSavedAt,
}: PageBuilderProps) {
  const [tree, setTree, undo, redo, canUndo, canRedo] = useUndoRedo<BuilderComponentNode>(
    initialTree ? deserializeTree(initialTree) : createDefaultPage(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isPreview, setIsPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [clipboard, setClipboard] = useState<string | null>(null);

  // Track previous tree for onChange callbacks
  const prevTreeRef = useRef(tree);
  useEffect(() => {
    if (tree !== prevTreeRef.current) {
      prevTreeRef.current = tree;
      onChange?.(serializeTree(tree));
    }
  }, [tree, onChange]);

  /* ── Clipboard handlers ──────────────────────────────────────────── */

  const handleCopy = useCallback(() => {
    if (!selectedId) return;
    const node = findNodeById(tree, selectedId);
    if (!node) return;
    const serialized = serializeTree(node);
    setClipboard(serialized);
    try {
      navigator.clipboard?.writeText(serialized);
    } catch { /* ignore */ }
    toast.success("Copied to clipboard");
  }, [tree, selectedId]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    try {
      const source = deserializeTree(clipboard);
      // Generate new IDs for the pasted copy
      const pasteCopy = regenerateIds(source);
      pasteCopy.name = `${source.name} (Pasted)`;

      // Paste as child of selected node (if container) or after selected node
      if (selectedId && selectedId !== tree.id) {
        const target = findNodeById(tree, selectedId);
        if (target && (target.children !== undefined)) {
          setTree(addChild(tree, selectedId, pasteCopy));
        } else {
          // Paste after the selected node
          const parent = findParent(tree, selectedId);
          if (parent) {
            const idx = parent.children.findIndex((c: BuilderComponentNode) => c.id === selectedId);
            const newTree = addChild(tree, parent.id, pasteCopy);
            const moveFrom = newTree ? regenerateIds(newTree).children.length - 1 : 0;
            const moved = moveNode(newTree, parent.id, moveFrom, idx + 1);
            setTree(moved);
          }
        }
      } else {
        // Paste into root
        setTree(addChild(tree, tree.id, pasteCopy));
      }
      setSelectedId(pasteCopy.id);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Failed to paste component");
    }
  }, [clipboard, tree, selectedId, setTree]);

  const handleCopyToClipboard = useCallback((id: string) => {
    const node = findNodeById(tree, id);
    if (!node) return;
    const serialized = serializeTree(node);
    setClipboard(serialized);
    try {
      navigator.clipboard?.writeText(serialized);
    } catch { /* ignore */ }
    toast.success("Copied");
  }, [tree]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        return;
      }

      if (isCtrl && e.key === "s") {
        e.preventDefault();
        onSave?.(serializeTree(tree));
        return;
      }

      if (isCtrl && e.key === "c") {
        if (!selectedId) return;
        e.preventDefault();
        handleCopy();
        return;
      }

      if (isCtrl && e.key === "v") {
        if (!clipboard) return;
        e.preventDefault();
        handlePaste();
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && selectedId !== tree.id) {
          e.preventDefault();
          setTree(removeNode(tree, selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, onSave, tree, selectedId, setTree, clipboard, handleCopy, handlePaste]);

  /* ── Add component ───────────────────────────────────────────────── */

  const handleAddComponent = useCallback(
    (type: BuilderComponentType) => {
      const def = COMPONENT_DEFS[type];
      const newNode: BuilderComponentNode = {
        id: generateId(),
        type,
        name: def.label,
        visible: true,
        locked: false,
        children: def.defaultChildren ? deepClone(def.defaultChildren) : [],
        styles: { ...def.defaultStyles },
        props: { ...def.defaultProps },
      };

      // Add to the first container that can accept children, or root
      const targetId = tree.id;
      setTree(addChild(tree, targetId, newNode));
      setSelectedId(newNode.id);
    },
    [tree, setTree],
  );

  /* ── Update operations ───────────────────────────────────────────── */

  const handleUpdateStyles = useCallback(
    (id: string, styles: Partial<StyleProps>) => {
      setTree(updateNodeStyles(tree, id, styles));
    },
    [tree, setTree],
  );

  const handleUpdateProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      setTree(updateNodeProps(tree, id, props));
    },
    [tree, setTree],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const newTree = duplicateNode(tree, id);
      setTree(newTree);
    },
    [tree, setTree],
  );

  const handleRemove = useCallback(
    (id: string) => {
      if (id === tree.id) return; // Can't remove root
      setTree(removeNode(tree, id));
      if (selectedId === id) setSelectedId(null);
    },
    [tree, selectedId, setTree],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      setTree(toggleVisibility(tree, id));
    },
    [tree, setTree],
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      setTree(toggleLock(tree, id));
    },
    [tree, setTree],
  );

  const handleReorder = useCallback(
    (parentId: string, fromIndex: number, toIndex: number) => {
      setTree(moveNode(tree, parentId, fromIndex, toIndex));
    },
    [tree, setTree],
  );

  const handleSave = useCallback(() => {
    onSave?.(serializeTree(tree));
  }, [tree, onSave]);

  /* ── Section library ────────────────────────────────────────────── */

  const handleInsertSection = useCallback(
    (sectionTree: BuilderComponentNode) => {
      // Insert into selected container, or after selected node, or into root
      if (selectedId && selectedId !== tree.id) {
        const target = findNodeById(tree, selectedId);
        if (target && target.children !== undefined) {
          // Add as child of selected container
          setTree(addChild(tree, selectedId, sectionTree));
        } else {
          // Insert after selected node
          const parent = findParent(tree, selectedId);
          if (parent) {
            const idx = parent.children.findIndex((c: BuilderComponentNode) => c.id === selectedId);
            setTree(insertChildAt(tree, parent.id, sectionTree, idx + 1));
          }
        }
      } else {
        setTree(addChild(tree, tree.id, sectionTree));
      }
      setSelectedId(sectionTree.id);
      setShowLibrary(false);
      toast.success("Section inserted");
    },
    [tree, selectedId, setTree],
  );

  /* ── Get selected node for library saving ──────────────────────── */

  const selectedNode = selectedId ? findNodeById(tree, selectedId) : null;

  /* ── Templates ──────────────────────────────────────────────────── */

  const applyTemplate = useCallback(
    (templateTree: BuilderComponentNode) => {
      const newTree = deepClone(templateTree);
      newTree.id = tree.id;
      newTree.children = deepClone(templateTree.children);
      setTree(newTree);
      setShowTemplates(false);
    },
    [tree.id, setTree],
  );

  /* ── Generate hover CSS from tree ────────────────────────────── */

  const hoverCss = useMemo(() => {
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
        rules.push(`[data-pb-id="${n.id}"]:hover > .builder-component-inner { ${hoverProps.join(" ")} }`);
      }
      n.children.forEach(walk);
    };
    walk(tree);
    return rules.join("\n");
  }, [tree]);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <>
      {/* Inject predefined animation keyframes */}
      <style>{`
        /* Hover effects */
        ${hoverCss}

        @keyframes pb-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pb-slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pb-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pb-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pb-scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes pb-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes pb-float { 0%, 100% { transform: translateY(0); box-shadow: 0 4px 12px oklch(0 0 0 / 0.1); } 50% { transform: translateY(-6px); box-shadow: 0 8px 24px oklch(0 0 0 / 0.15); } }
        @keyframes pb-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
      `}</style>

      <div className="flex flex-col h-full bg-background rounded-xl border border-border/60 overflow-hidden">
      {/* Toolbar */}
      <BuilderToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        device={device}
        onChangeDevice={setDevice}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(!isPreview)}              onSave={handleSave}
              onShowTemplates={() => setShowTemplates(true)}
              onShowLibrary={() => setShowLibrary(true)}
              isSaving={isSaving}
              lastSavedAt={lastSavedAt}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className={`flex-1 overflow-y-auto ${isPreview ? "bg-secondary/20" : "bg-secondary/10"}`}>
          {isPreview ? (
            <ResponsivePreview tree={tree} device={device} />
          ) : device === "desktop" ? (
            <BuilderCanvas
              tree={tree}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
              onDropInCanvas={handleAddComponent as (type: string) => void}
              onReorder={handleReorder}
              onDuplicate={handleDuplicate}
              onRemove={handleRemove}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onCopy={handleCopyToClipboard}
              hasClipboard={!!clipboard}
              isPreview={isPreview}
            />
          ) : (
            <ResponsivePreview tree={tree} device={device} />
          )}
        </div>

        {/* Sidebar */}
        {!isPreview && (
          <BuilderSidebar
            tree={tree}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddComponent={handleAddComponent}
            onUpdateStyles={handleUpdateStyles}
            onUpdateProps={handleUpdateProps}
            onDuplicate={handleDuplicate}
            onRemove={handleRemove}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onReorder={handleReorder}
            onCopy={handleCopyToClipboard}
            onOpenLibrary={() => setShowLibrary(true)}
            clipboard={clipboard}
            onClearClipboard={() => setClipboard(null)}
          />
        )}
      </div>

      {/* Section Library modal */}
      <SectionLibrary
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onInsertSection={handleInsertSection}
        selectedTree={selectedNode}
      />

      {/* Template picker modal */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold">Page Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Blank page */}
            <div className="mb-5">
              <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 font-semibold mb-2">
                Start Fresh
              </p>
              <button
                onClick={() => {
                  setTree(createDefaultPage());
                  setShowTemplates(false);
                }}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border/40 hover:border-foreground/30 hover:bg-secondary/20 transition-all w-full text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <div>
                  <span className="text-xs font-medium block">Blank Page</span>
                  <span className="text-[0.5rem] text-muted-foreground/70">
                    Start from an empty canvas
                  </span>
                </div>
              </button>
            </div>

            {/* Section templates */}
            <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 font-semibold mb-2">
              Section Templates
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SECTION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => applyTemplate(tmpl.tree)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border/40 hover:border-foreground/30 hover:bg-secondary/20 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0 group-hover:bg-foreground/10 transition-colors">
                    <Undo2 className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium block">{tmpl.name}</span>
                    <span className="text-[0.5rem] text-muted-foreground/70 block mt-0.5">
                      {tmpl.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
