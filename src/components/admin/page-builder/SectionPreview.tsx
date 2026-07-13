// ============================================================================
// Page Builder — Section Preview (Structured Block Wireframe)
// ============================================================================
// Renders a simplified visual block representation of a section's component
// tree, showing layout structure without rendering the full components.
// Used for marketplace section thumbnails.
// ============================================================================

import React, { useMemo } from "react";
import type { BuilderComponentNode } from "@/lib/page-builder/types";

/* ─── Preview Colors ──────────────────────────────────────────────── */

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  container: { bg: "oklch(0.97 0.01 260)", border: "oklch(0.85 0.05 260)", text: "oklch(0.45 0.06 260)" },
  row:       { bg: "oklch(0.97 0.01 160)", border: "oklch(0.85 0.05 160)", text: "oklch(0.45 0.06 160)" },
  column:    { bg: "oklch(0.97 0.01 200)", border: "oklch(0.85 0.05 200)", text: "oklch(0.45 0.06 200)" },
  heading:   { bg: "oklch(0.97 0.02 60)",  border: "oklch(0.85 0.06 60)",  text: "oklch(0.45 0.06 60)" },
  text:      { bg: "oklch(0.98 0 0)",      border: "oklch(0.88 0 0)",     text: "oklch(0.55 0 0)" },
  image:     { bg: "oklch(0.97 0.01 300)", border: "oklch(0.85 0.05 300)", text: "oklch(0.45 0.06 300)" },
  video:     { bg: "oklch(0.96 0.02 280)", border: "oklch(0.83 0.06 280)", text: "oklch(0.45 0.06 280)" },
  button:    { bg: "oklch(0.95 0.02 220)", border: "oklch(0.82 0.06 220)", text: "oklch(0.4 0.06 220)" },
  icon:      { bg: "oklch(0.97 0.02 40)",  border: "oklch(0.85 0.06 40)",  text: "oklch(0.45 0.06 40)" },
  divider:   { bg: "transparent",          border: "oklch(0.85 0 0)",     text: "oklch(0.65 0 0)" },
  spacer:    { bg: "transparent",          border: "oklch(0.9 0 0)",      text: "oklch(0.7 0 0)" },
  gallery:   { bg: "oklch(0.96 0.01 140)", border: "oklch(0.83 0.05 140)", text: "oklch(0.45 0.06 140)" },
  slider:    { bg: "oklch(0.96 0.01 180)", border: "oklch(0.83 0.05 180)", text: "oklch(0.45 0.06 180)" },
  tabs:      { bg: "oklch(0.97 0.01 240)", border: "oklch(0.85 0.05 240)", text: "oklch(0.45 0.06 240)" },
  accordion: { bg: "oklch(0.97 0.01 120)", border: "oklch(0.85 0.05 120)", text: "oklch(0.45 0.06 120)" },
  card:      { bg: "oklch(0.99 0 0)",      border: "oklch(0.87 0 0)",     text: "oklch(0.5 0 0)" },
  cards:     { bg: "oklch(0.97 0.01 140)", border: "oklch(0.85 0.05 140)", text: "oklch(0.45 0.06 140)" },
  form:      { bg: "oklch(0.97 0.01 340)", border: "oklch(0.85 0.05 340)", text: "oklch(0.45 0.06 340)" },
  html:      { bg: "oklch(0.96 0.02 300)", border: "oklch(0.83 0.06 300)", text: "oklch(0.4 0.06 300)" },
  custom:    { bg: "oklch(0.97 0.01 100)", border: "oklch(0.85 0.05 100)", text: "oklch(0.45 0.06 100)" },
};

/* ─── Icons ────────────────────────────────────────────────────────── */

function TypeIcon({ type }: { type: string }) {
  const iconMap: Record<string, string> = {
    container: "▣", row: "⇉", column: "⇅", heading: "H", text: "¶",
    image: "⊞", video: "▶", button: "▢", icon: "●", divider: "—",
    spacer: "⤢", gallery: "⊠", slider: "►", tabs: "☰", accordion: "≡",
    card: "◇", cards: "⊞", form: "☐", html: "</>", custom: "✧",
  };
  return <span style={{ fontSize: "0.35rem", lineHeight: 1 }}>{iconMap[type] || "?"}</span>;
}

/* ─── Determine layout direction ──────────────────────────────────── */

function isRow(node: BuilderComponentNode): boolean {
  return node.styles.display === "flex" && node.styles.flexDirection !== "column" && node.styles.flexDirection !== "column-reverse";
}

/* ─── Preview Block ────────────────────────────────────────────────── */

interface PreviewBlockProps {
  node: BuilderComponentNode;
  depth: number;
  maxDepth: number;
}

function PreviewBlock({ node, depth, maxDepth }: PreviewBlockProps): React.ReactNode {
  if (!node.visible || depth > maxDepth) return null;

  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.container;
  const hasChildren = node.children.length > 0;
  const isFlexRow = isRow(node);
  const isCards = node.type === "cards";

  // Leaf component previews
  if (!hasChildren || node.type === "button" || node.type === "icon" || node.type === "divider" || node.type === "spacer") {
    return <LeafPreview node={node} colors={colors} depth={depth} />;
  }

  const childPreview = (
    <div
      style={{
        display: "flex",
        flexDirection: isCards ? "row" : (isFlexRow ? "row" : "column"),
        flexWrap: "wrap",
        gap: "1px",
        padding: depth > 0 ? "1px" : "0",
        flex: 1,
        minHeight: depth > 1 ? "auto" : "100%",
      }}
    >
      {node.children.map((child) => (
        <PreviewBlock key={child.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
      ))}
    </div>
  );

  // For the root (depth 0), don't wrap in a box
  if (depth === 0) {
    return childPreview;
  }

  return (
    <ContainerPreview
      node={node}
      colors={colors}
      depth={depth}
      isCards={isCards}
      isFlexRow={isFlexRow}
    >
      {childPreview}
    </ContainerPreview>
  );
}

/* ─── Leaf Preview ─────────────────────────────────────────────────── */

function LeafPreview({
  node,
  colors,
  depth,
}: {
  node: BuilderComponentNode;
  colors: { bg: string; border: string; text: string };
  depth: number;
}) {
  const minHeight = node.type === "spacer" ? "0.2rem" :
    node.type === "divider" ? "0.15rem" :
    node.type === "image" ? "1.2rem" :
    node.type === "video" ? "1rem" :
    node.type === "heading" ? "0.7rem" :
    node.type === "button" ? "0.5rem" :
    node.type === "gallery" || node.type === "slider" ? "1rem" :
    node.type === "form" ? "1.2rem" :
    "0.4rem";

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `0.5px solid ${colors.border}`,
        borderRadius: "0.15rem",
        padding: node.type === "spacer" ? "0.05rem" : "0.1rem 0.15rem",
        margin: "0.5px",
        display: "flex",
        alignItems: "center",
        gap: "0.1rem",
        minHeight,
        flex: node.type === "spacer" ? "0 0 auto" : undefined,
        color: colors.text,
        overflow: "hidden",
      }}
      title={node.name}
    >
      <TypeIcon type={node.type} />
      {depth <= 2 && (
        <span
          style={{
            fontSize: "0.3rem",
            lineHeight: 1.1,
            opacity: 0.7,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "4rem",
          }}
        >
          {node.type === "text" ? truncateText(String(node.props.content || ""), 20) :
           node.type === "heading" ? truncateText(String(node.props.content || ""), 15) :
           node.type === "button" ? String(node.props.text || node.name) :
           node.name}
        </span>
      )}
    </div>
  );
}

/* ─── Container Preview ────────────────────────────────────────────── */

function ContainerPreview({
  node,
  colors,
  depth,
  isCards,
  isFlexRow,
  children,
}: {
  node: BuilderComponentNode;
  colors: { bg: string; border: string; text: string };
  depth: number;
  isCards: boolean;
  isFlexRow: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: depth === 1 ? "transparent" : colors.bg,
        border: `0.5px solid ${depth === 1 ? "transparent" : colors.border}`,
        borderRadius: "0.15rem",
        padding: "1px",
        margin: "0.5px",
        display: "flex",
        flexDirection: "column",
        flex: isCards ? "1" : (isFlexRow ? "1 0 auto" : undefined),
        minWidth: isFlexRow ? "1rem" : undefined,
        minHeight: depth === 1 ? "2rem" : "auto",
        overflow: "hidden",
        position: "relative",
      }}
      title={node.name}
    >
      {/* Type label (only show for significant containers) */}
      {(node.type === "container" || node.type === "cards" || depth <= 1) && depth >= 1 && (
        <span
          style={{
            fontSize: "0.25rem",
            lineHeight: 1,
            color: colors.text,
            opacity: 0.4,
            padding: "0.05rem 0.1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 1,
          }}
        >
          {node.type}
        </span>
      )}
      {children}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/* ─── Gradient CSS detection ──────────────────────────────────────── */

function detectGradientColor(tree: BuilderComponentNode): string | null {
  const walk = (n: BuilderComponentNode): string | null => {
    if (n.styles.backgroundGradient?.stops?.length) {
      return n.styles.backgroundGradient.stops[0].color;
    }
    for (const child of n.children) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(tree);
}

/* ─── Main Component ──────────────────────────────────────────────── */

interface SectionPreviewProps {
  /** Deserialized component tree to preview */
  tree: BuilderComponentNode;
  /** Maximum nesting depth to render (default 3) */
  maxDepth?: number;
  /** Additional CSS class name */
  className?: string;
}

export function SectionPreview({ tree, maxDepth = 3, className }: SectionPreviewProps) {
  const gradientColor = useMemo(() => detectGradientColor(tree), [tree]);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        backgroundColor: gradientColor ? undefined : "oklch(0.98 0 0)",
        backgroundImage: gradientColor
          ? `linear-gradient(135deg, ${gradientColor}22 0%, ${gradientColor}11 100%)`
          : undefined,
        borderRadius: "0.375rem",
        overflow: "hidden",
        border: "1px solid oklch(0.87 0 0)",
        padding: "2px",
      }}
    >
      <PreviewBlock node={tree} depth={0} maxDepth={maxDepth} />
    </div>
  );
}
