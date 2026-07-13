// ============================================================================
// Page Builder — Responsive Preview Frames
// ============================================================================

import React from "react";
import type { BuilderComponentNode } from "@/lib/page-builder/types";
import { ComponentRenderer } from "./DefaultComponents";

/* ─── Props ────────────────────────────────────────────────────────── */

interface ResponsivePreviewProps {
  tree: BuilderComponentNode;
  device: "desktop" | "tablet" | "mobile";
}

/* ─── Device Config ────────────────────────────────────────────────── */

const DEVICE_CONFIG = {
  desktop: {
    width: "100%",
    maxWidth: "1440px",
    label: "Desktop",
    icon: "🖥",
  },
  tablet: {
    width: "768px",
    maxWidth: "768px",
    label: "Tablet",
    icon: "📱",
  },
  mobile: {
    width: "375px",
    maxWidth: "375px",
    label: "Mobile",
    icon: "📱",
  },
};

/* ─── Responsive Preview ───────────────────────────────────────────── */

export function ResponsivePreview({ tree, device }: ResponsivePreviewProps) {
  const config = DEVICE_CONFIG[device];

  return (
    <div className="flex flex-col items-center py-6">
      {/* Device chrome */}
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border border-border/40 shadow-lg overflow-hidden transition-all duration-300"
        style={{ width: config.width, maxWidth: config.maxWidth }}
      >
        {/* Device top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-secondary/10">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.4rem] font-mono text-muted-foreground/50 uppercase tracking-wider">
              {config.label}
            </span>
          </div>
          <div className="w-14" /> {/* Spacer for balance */}
        </div>

        {/* Content area */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: device === "mobile" ? "667px" : "calc(100vh - 200px)" }}
        >
          {tree.children.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">No content yet</p>
            </div>
          ) : (
            tree.children.map((child) => (
              <ComponentRenderer key={child.id} node={child} isEditing={false} />
            ))
          )}
        </div>
      </div>

      {/* Device info */}
      <div className="flex items-center gap-2 mt-3 text-[0.45rem] text-muted-foreground/50">
        <span>{config.icon}</span>
        <span>{config.label}</span>
        <span>·</span>
        <span>{config.width}</span>
      </div>
    </div>
  );
}
