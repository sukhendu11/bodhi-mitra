// ============================================================================
// Page Builder — Component Palette (draggable component picker)
// ============================================================================

import React, { useCallback } from "react";
import { COMPONENT_DEFS } from "@/lib/page-builder/defaults";
import type { BuilderComponentType } from "@/lib/page-builder/types";
import {
  Square, Rows3, Columns3, Type, Heading1, ImageIcon, Video,
  MousePointerClick, Smile, Minus, ArrowUpDown, Images,
  GalleryVerticalEnd, FolderKanban, ChevronsUpDown, CreditCard,
  LayoutGrid, FormInput, Code2, Puzzle,
} from "lucide-react";

/* ─── Icon Map ─────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Square, Rows3, Columns3, Type, Heading1, ImageIcon, Video,
  MousePointerClick, Smile, Minus, ArrowUpDown, Images,
  GalleryVerticalEnd, FolderKanban, ChevronsUpDown, CreditCard,
  LayoutGrid, FormInput, Code2, Puzzle,
};

/* ─── Component Categories ─────────────────────────────────────────── */

const CATEGORIES: Array<{
  name: string;
  types: BuilderComponentType[];
}> = [
  {
    name: "Layout",
    types: ["container", "row", "column", "spacer", "divider"],
  },
  {
    name: "Content",
    types: ["text", "heading", "image", "video", "icon", "button"],
  },
  {
    name: "Advanced",
    types: ["gallery", "slider", "tabs", "accordion", "card", "cards"],
  },
  {
    name: "Interactive",
    types: ["form", "html", "custom"],
  },
];

/* ─── Props ────────────────────────────────────────────────────────── */

interface ComponentPaletteProps {
  onDragStart?: (type: BuilderComponentType) => void;
  onAddComponent?: (type: BuilderComponentType) => void;
}

/* ─── Component Palette ───────────────────────────────────────────── */

export function ComponentPalette({ onDragStart, onAddComponent }: ComponentPaletteProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent, type: BuilderComponentType) => {
      e.dataTransfer.setData("builder-component", type);
      e.dataTransfer.effectAllowed = "copy";
      onDragStart?.(type);
    },
    [onDragStart],
  );

  return (
    <div className="space-y-4">
      {CATEGORIES.map((category) => (
        <div key={category.name}>
          <h4 className="text-[0.5rem] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">
            {category.name}
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {category.types.map((type) => {
              const def = COMPONENT_DEFS[type];
              const IconComp = ICON_MAP[def.icon] || Square;

              return (
                <button
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  onClick={() => onAddComponent?.(type)}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:border-foreground/30 hover:bg-secondary/20 transition-all text-left group cursor-grab active:cursor-grabbing"
                  title={`Drag to add ${def.label}`}
                >
                  <div className="w-7 h-7 rounded-md bg-secondary/40 flex items-center justify-center shrink-0 group-hover:bg-foreground/10 transition-colors">
                    <IconComp className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[0.5rem] font-medium leading-tight">{def.label}</span>
                    <span className="block text-[0.4rem] text-muted-foreground/50 leading-tight truncate">
                      {def.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
