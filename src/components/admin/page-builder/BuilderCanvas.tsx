// ============================================================================
// Page Builder — Visual Editing Canvas
// ============================================================================

import React, { useCallback, useRef, useEffect, useState } from "react";
import type { BuilderComponentNode } from "@/lib/page-builder/types";
import { ComponentRenderer } from "./DefaultComponents";
import { findNodeById } from "@/lib/page-builder/utils";
import { GripVertical, Eye, EyeOff, Lock, LockOpen, Trash2, Copy } from "lucide-react";

/* ─── Props ────────────────────────────────────────────────────────── */

interface BuilderCanvasProps {
  tree: BuilderComponentNode;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDropInCanvas?: (type: string) => void;
  onReorder: (parentId: string, fromIndex: number, toIndex: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onCopy: (id: string) => void;
  hasClipboard: boolean;
  isPreview: boolean;
}

/* ─── Builder Canvas ──────────────────────────────────────────────── */

export function BuilderCanvas({
  tree,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onDropInCanvas,
  onReorder,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onToggleLock,
  onCopy,
  hasClipboard,
  isPreview,
}: BuilderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragNodeRef = useRef<{ id: string; parentId: string; index: number } | null>(null);

  /* ── Drop zone indicator ──────────────────────────────────────────── */

  const [dropIndicator, setDropIndicator] = useState<{ parentId: string; index: number } | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.types[0];
      if (type !== "builder-component") return;

      // Find the closest droppable element
      const target = (e.target as HTMLElement).closest("[data-builder-id]");
      if (!target) return;

      const parentId = target.getAttribute("data-builder-id") || tree.id;
      const parent = findNodeById(tree, parentId);
      if (!parent) return;

      const rect = target.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const index = y > rect.height / 2 ? parent.children.length : 0;

      setDropIndicator({ parentId, index });
    },
    [tree],
  );

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropIndicator(null);
      const type = e.dataTransfer.getData("builder-component");
      if (type && onDropInCanvas) {
        onDropInCanvas(type);
      }
      if (dragNodeRef.current) {
        onReorder(
          dragNodeRef.current.parentId,
          dragNodeRef.current.index,
          dropIndicator?.index || 0,
        );
        dragNodeRef.current = null;
      }
    },
    [dropIndicator, onReorder, onDropInCanvas],
  );

  /* ── Click outside to deselect ────────────────────────────────────── */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
        onSelect(null);
      }
    };
    if (!isPreview) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isPreview, onSelect]);

  if (isPreview) {
    return (
      <div className="min-h-[400px]">
        {tree.children.length === 0 ? (
          <EmptyCanvas />
        ) : (
          tree.children.map((child) => (
            <ComponentRenderer key={child.id} node={child} isEditing={false} />
          ))
        )}
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="min-h-[400px] bg-white dark:bg-zinc-900 rounded-lg border border-border/40"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tree.children.length === 0 ? (
        <EmptyCanvas hasClipboard={hasClipboard} />
      ) : (
        <div className="p-4 space-y-2">
          {hasClipboard && (
            <div className="px-2 py-1 text-[0.45rem] text-muted-foreground/50 bg-primary/5 border border-dashed border-primary/30 rounded-md text-center italic">
              Clipboard ready — select a container and press Ctrl+V to paste
            </div>
          )}
          {tree.children.map((child, index) => (
            <CanvasNode
              key={child.id}
              node={child}
              depth={1}
              isSelected={child.id === selectedId}
              isHovered={child.id === hoveredId}
              selectedId={selectedId}
              onSelect={onSelect}
              onHover={onHover}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onCopy={onCopy}
              dragNodeRef={dragNodeRef}
              parentId={tree.id}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────────── */

function EmptyCanvas({ hasClipboard }: { hasClipboard?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="text-sm font-medium">Start building your page</p>
      <p className="text-xs mt-1 opacity-60">
        {hasClipboard ? "Select a container and press Ctrl+V to paste" : "Drag components from the palette on the right"}
      </p>
    </div>
  );
}

/* ─── Canvas Node ──────────────────────────────────────────────────── */

interface CanvasNodeProps {
  node: BuilderComponentNode;
  depth: number;
  isSelected: boolean;
  isHovered: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onCopy: (id: string) => void;
  dragNodeRef: React.MutableRefObject<{ id: string; parentId: string; index: number } | null>;
  parentId: string;
  index: number;
}

function CanvasNode({
  node,
  depth,
  isSelected,
  isHovered,
  selectedId,
  onSelect,
  onHover,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onToggleLock,
  onCopy,
  dragNodeRef,
  parentId,
  index,
}: CanvasNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", node.id);
      e.dataTransfer.effectAllowed = "move";
      dragNodeRef.current = { id: node.id, parentId, index };
    },
    [node.id, parentId, index, dragNodeRef],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    [node.id, onSelect],
  );

  return (
    <div
      ref={nodeRef}
      data-builder-id={node.id}
      draggable={!node.locked}
      onDragStart={handleDragStart}
      onClick={handleClick}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        relative group rounded-lg border-2 transition-all cursor-pointer
        ${isSelected
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : isHovered
            ? "border-primary/20 bg-secondary/20"
            : "border-transparent hover:border-border/40"
        }
        ${node.locked ? "opacity-60" : ""}
      `}
      style={{ marginLeft: `${(depth - 1) * 12}px` }}
    >
      {/* Hover toolbar */}
      {isHovered && (
        <div className="absolute -top-7 right-0 flex items-center gap-0.5 z-20 bg-foreground text-background rounded-md px-1 py-0.5 shadow-md text-[0.5rem]">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(node.id); }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title={node.visible ? "Hide" : "Show"}
          >
            {node.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLock(node.id); }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title={node.locked ? "Unlock" : "Lock"}
          >
            {node.locked ? <LockOpen className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(node.id); }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title="Copy (Ctrl+C)"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-2.5 w-2.5" opacity="0.5" />
          </button>
          {!node.locked && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
              className="p-0.5 rounded hover:bg-destructive/80 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Component label bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-secondary/10">
        <span className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70">
          <GripVertical className="h-3 w-3" />
        </span>
        <span className="text-[0.5rem] font-medium text-muted-foreground/70 uppercase tracking-wider">
          {node.type}
        </span>
        <span className="text-[0.45rem] text-muted-foreground/40 truncate max-w-[120px]">
          {node.name}
        </span>
        {!node.visible && (
          <span className="text-[0.4rem] text-muted-foreground/40 italic ml-auto">hidden</span>
        )}
      </div>

      {/* Component content */}
      <div className="px-3 py-2">
        {node.children.length > 0 ? (
          <div className="space-y-1">
            {node.children.map((child, ci) => (
              <CanvasNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isSelected={child.id === selectedId}
                isHovered={false}
                selectedId={selectedId}
                onSelect={(id) => onSelect(id || child.id)}
                onHover={() => {}}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onCopy={onCopy}
                dragNodeRef={dragNodeRef}
                parentId={node.id}
                index={ci}
              />
            ))}
          </div>
        ) : (
          <div className="pointer-events-none">
            <ComponentRenderer node={node} isEditing />
          </div>
        )}
      </div>
    </div>
  );
}
