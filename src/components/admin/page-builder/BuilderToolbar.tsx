// ============================================================================
// Page Builder — Builder Toolbar
// ============================================================================

import React from "react";
import {
  Undo2, Redo2, Save, Monitor, Tablet, Smartphone, Eye,
  EyeOff, LayoutTemplate, Check, Globe,
} from "lucide-react";

/* ─── Props ────────────────────────────────────────────────────────── */

interface BuilderToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  device: "desktop" | "tablet" | "mobile";
  onChangeDevice: (device: "desktop" | "tablet" | "mobile") => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onShowTemplates: () => void;
  onShowLibrary: () => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
}

/* ─── Toolbar Button ───────────────────────────────────────────────── */

function ToolBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Builder Toolbar ──────────────────────────────────────────────── */

export function BuilderToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  device,
  onChangeDevice,
  isPreview,
  onTogglePreview,
  onSave,
  onShowTemplates,
  onShowLibrary,
  isSaving,
  lastSavedAt,
}: BuilderToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-background">
      {/* Left: Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <ToolBtn onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 className={`h-3.5 w-3.5 ${!canUndo ? "opacity-30" : ""}`} />
        </ToolBtn>
        <ToolBtn onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className={`h-3.5 w-3.5 ${!canRedo ? "opacity-30" : ""}`} />
        </ToolBtn>
        <div className="w-px h-4 bg-border/40 mx-1.5" />
      </div>

      {/* Center: Save status + device switcher */}
      <div className="flex items-center gap-2">
        {/* Save status */}
        <div className="flex items-center gap-1.5 text-[0.45rem] text-muted-foreground">
          {isSaving ? (
            <span className="italic">Saving…</span>
          ) : lastSavedAt ? (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : (
            <span className="text-muted-foreground/50">Unsaved</span>
          )}
        </div>

        <div className="w-px h-4 bg-border/40 mx-1" />

        {/* Device switcher */}
        <div className="flex items-center border border-border/40 rounded-lg overflow-hidden">
          <button
            onClick={() => onChangeDevice("desktop")}
            className={`p-1.5 transition-colors ${
              device === "desktop"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeDevice("tablet")}
            className={`p-1.5 transition-colors ${
              device === "tablet"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title="Tablet"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeDevice("mobile")}
            className={`p-1.5 transition-colors ${
              device === "mobile"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Templates + Preview + Save */}
      <div className="flex items-center gap-0.5">
        <ToolBtn onClick={onShowLibrary} title="Section Library">
          <Globe className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={onShowTemplates} title="Templates">
          <LayoutTemplate className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={onTogglePreview} active={isPreview} title={isPreview ? "Exit preview" : "Preview"}>
          {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </ToolBtn>
        <div className="w-px h-4 bg-border/40 mx-1" />
        <ToolBtn onClick={onSave} title="Save (Ctrl+S)">
          <Save className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
    </div>
  );
}
