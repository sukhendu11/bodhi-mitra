// ============================================================================
// Page Builder — Builder Sidebar (Palette + Layers + Settings)
// ============================================================================

import React, { useState } from "react";
import type { BuilderComponentNode, BuilderComponentType } from "@/lib/page-builder/types";
import { ComponentPalette } from "./ComponentPalette";
import { StylePanel } from "./StylePanel";
import { flattenTree } from "@/lib/page-builder/utils";
import {
  Layers, Palette, Settings, Eye, EyeOff, Lock, LockOpen,
  Trash2, Copy, Clipboard as ClipboardIcon, GripVertical, Globe,
} from "lucide-react";

/* ─── Props ────────────────────────────────────────────────────────── */

interface BuilderSidebarProps {
  tree: BuilderComponentNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddComponent: (type: BuilderComponentType) => void;
  onUpdateStyles: (id: string, styles: any) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (parentId: string, fromIndex: number, toIndex: number) => void;
  onCopy: (id: string) => void;
  onOpenLibrary: () => void;
  clipboard: string | null;
  onClearClipboard: () => void;
}

/* ─── Tabs ─────────────────────────────────────────────────────────── */

type SidebarTab = "palette" | "layers" | "settings" | "library";

/* ─── Builder Sidebar ──────────────────────────────────────────────── */

export function BuilderSidebar({
  tree,
  selectedId,
  onSelect,
  onAddComponent,
  onUpdateStyles,
  onUpdateProps,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onToggleLock,
  onReorder,
  onCopy,
  onOpenLibrary,
  clipboard,
  onClearClipboard,
}: BuilderSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("palette");

  const flatList = flattenTree(tree);
  const selectedNode = selectedId
    ? flatList.find((f) => f.node.id === selectedId)?.node || null
    : null;

  return (
    <div className="w-72 border-l border-border/40 bg-background flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border/40 shrink-0">
        <TabButton
          active={activeTab === "palette"}
          onClick={() => setActiveTab("palette")}
          icon={<Palette className="h-3.5 w-3.5" />}
          label="Components"
        />
        <TabButton
          active={activeTab === "layers"}
          onClick={() => setActiveTab("layers")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Layers"
        />
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<Settings className="h-3.5 w-3.5" />}
          label="Settings"
        />
        <TabButton
          active={activeTab === "library"}
          onClick={() => setActiveTab("library")}
          icon={<Globe className="h-3.5 w-3.5" />}
          label="Library"
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "palette" && (
          <ComponentPalette onAddComponent={onAddComponent} />
        )}

        {activeTab === "layers" && (
          <div className="space-y-0.5">
            {/* Clipboard indicator */}
            {clipboard && (
              <div className="flex items-center gap-1 px-2 py-1 mb-1 bg-primary/5 border border-dashed border-primary/30 rounded-md text-[0.45rem] text-muted-foreground/70">
                <span className="flex-1 truncate">Clipboard has content</span>
                <button
                  onClick={onClearClipboard}
                  className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground/50 hover:text-foreground"
                  title="Clear clipboard"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
            {flatList
              .filter((f) => f.node.id !== tree.id) // hide root from layers
              .map(({ node, depth }) => (
                <LayerItem
                  key={node.id}
                  node={node}
                  depth={depth}
                  isSelected={node.id === selectedId}
                  onSelect={onSelect}
                  onCopy={onCopy}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                  onToggleVisibility={onToggleVisibility}
                  onToggleLock={onToggleLock}
                />
              ))}
          </div>
        )}

        {activeTab === "settings" && selectedNode ? (
          <div className="space-y-4">
            {/* Component info */}
            <div className="pb-3 border-b border-border/40">
              <h4 className="text-xs font-semibold">{selectedNode.name}</h4>
              <p className="text-[0.5rem] text-muted-foreground mt-0.5">
                Type: {selectedNode.type} · ID: {selectedNode.id.slice(-8)}
              </p>
            </div>

            {/* Style panel */}
            <StylePanel node={selectedNode} onUpdateStyles={onUpdateStyles} />
          </div>
        ) : activeTab === "settings" && !selectedNode ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Settings className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">Select a component to edit</p>
          </div>
        ) : null}

        {activeTab === "library" && (
          <div className="space-y-3">
            <p className="text-[0.5rem] text-muted-foreground/60">
              Save components to reuse across pages. Global components sync changes everywhere.
            </p>
            <button
              onClick={onOpenLibrary}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 hover:border-foreground/30 hover:bg-secondary/20 transition-all text-left"
            >
              <Globe className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-xs font-medium">Open Section Library</span>
            </button>
            <p className="text-[0.4rem] text-muted-foreground/40 text-center pt-2">
              Saved sections are stored locally in this browser
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab Button ───────────────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[0.5rem] font-medium transition-colors border-b-2 ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Layer Item ───────────────────────────────────────────────────── */

function LayerItem({
  node,
  depth,
  isSelected,
  onSelect,
  onCopy,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onToggleLock,
}: {
  node: BuilderComponentNode;
  depth: number;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onCopy?: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  // Drag reorder within layers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("layer-id", node.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(node.id)}
      className={`
        group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[0.5rem]
        ${isSelected
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
        }
        ${!node.visible ? "opacity-50" : ""}
        ${node.locked ? "cursor-not-allowed" : ""}
      `}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <span className="cursor-grab active:cursor-grabbing text-muted-foreground/30">
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="text-[0.45rem] font-mono text-muted-foreground/50 uppercase min-w-[40px]">
        {node.type}
      </span>
      <span className="truncate flex-1">{node.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(node.id); }}
          className="p-0.5 rounded hover:bg-secondary/60"
          title={node.visible ? "Hide" : "Show"}
        >
          {node.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(node.id); }}
          className="p-0.5 rounded hover:bg-secondary/60"
          title={node.locked ? "Unlock" : "Lock"}
        >
          {node.locked ? <LockOpen className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
        </button>
        {onCopy && (
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(node.id); }}
            className="p-0.5 rounded hover:bg-secondary/60"
            title="Copy (Ctrl+C)"
          >
            <ClipboardIcon className="h-2.5 w-2.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }}
          className="p-0.5 rounded hover:bg-secondary/60"
          title="Duplicate"
        >
          <Copy className="h-2.5 w-2.5" />
        </button>
        {!node.locked && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
            className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
