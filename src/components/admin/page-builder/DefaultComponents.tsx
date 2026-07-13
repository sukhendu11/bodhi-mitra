// ============================================================================
// Page Builder — Default Component Renderers
// ============================================================================

import React, { useState, useCallback, useEffect, type JSX } from "react";
import type { BuilderComponentNode, BackgroundGradient } from "@/lib/page-builder/types";
import type { StyleProps } from "@/lib/page-builder/types";
import { COMPONENT_DEFS } from "@/lib/page-builder/defaults";
import {
  ImageIcon, Video, Type, Heading1, MousePointerClick, Minus,
  ArrowUpDown, Images, GalleryVerticalEnd, FolderKanban,
  ChevronsUpDown, CreditCard, LayoutGrid, FormInput, Code2,
  Square, Rows3, Columns3,
} from "lucide-react";

/* ─── Style to CSS Object ──────────────────────────────────────────── */

export function gradientToCss(gradient: BackgroundGradient): string {
  if (!gradient.stops || gradient.stops.length < 2) return "";
  const stopStr = gradient.stops
    .map((s) => {
      const color = s.color || "transparent";
      return s.position !== undefined && s.position >= 0
        ? `${color} ${s.position}%`
        : color;
    })
    .join(", ");

  if (gradient.type === "radial") {
    const shape = gradient.direction || "ellipse at center";
    return `radial-gradient(${shape}, ${stopStr})`;
  }

  const direction = gradient.direction || "to bottom right";
  return `linear-gradient(${direction}, ${stopStr})`;
}

function styleToCss(styles: StyleProps): React.CSSProperties {
  const css: React.CSSProperties = {};
  const map: Record<string, keyof React.CSSProperties> = {
    fontFamily: "fontFamily", fontSize: "fontSize", fontWeight: "fontWeight",
    lineHeight: "lineHeight", letterSpacing: "letterSpacing",
    textAlign: "textAlign", textDecoration: "textDecoration",
    fontStyle: "fontStyle", textTransform: "textTransform",
    color: "color", backgroundColor: "backgroundColor",
    marginTop: "marginTop", marginRight: "marginRight",
    marginBottom: "marginBottom", marginLeft: "marginLeft",
    paddingTop: "paddingTop", paddingRight: "paddingRight",
    paddingBottom: "paddingBottom", paddingLeft: "paddingLeft",
    width: "width", height: "height", minWidth: "minWidth",
    minHeight: "minHeight", maxWidth: "maxWidth", maxHeight: "maxHeight",
    borderWidth: "borderWidth", borderStyle: "borderStyle",
    borderColor: "borderColor", borderRadius: "borderRadius",
    boxShadow: "boxShadow", position: "position",
    top: "top", right: "right", bottom: "bottom", left: "left",
    zIndex: "zIndex", display: "display", flexDirection: "flexDirection",
    alignItems: "alignItems", justifyContent: "justifyContent",
    flexWrap: "flexWrap", flexGrow: "flexGrow", flexShrink: "flexShrink",
    flexBasis: "flexBasis", gridTemplateColumns: "gridTemplateColumns",
    gridTemplateRows: "gridTemplateRows", gridColumn: "gridColumn",
    gridRow: "gridRow", gap: "gap", opacity: "opacity",
    transform: "transform", transition: "transition",
    backgroundImage: "backgroundImage", backgroundSize: "backgroundSize",
    backgroundPosition: "backgroundPosition", backgroundRepeat: "backgroundRepeat",
  };
  for (const [key, cssKey] of Object.entries(map)) {
    if (key in styles && styles[key as keyof StyleProps] !== undefined) {
      (css as any)[cssKey] = styles[key as keyof StyleProps];
    }
  }
  // Map animation properties to CSS
  if (styles.animationName) {
    css.animationName = styles.animationName.startsWith("pb-") ? styles.animationName : `pb-${styles.animationName}`;
  }
  if (styles.animationDuration) css.animationDuration = styles.animationDuration;
  if (styles.animationTimingFunction) css.animationTimingFunction = styles.animationTimingFunction;
  if (styles.animationDelay) css.animationDelay = styles.animationDelay;
  if (styles.animationIterationCount) css.animationIterationCount = styles.animationIterationCount;
  if (styles.animationFillMode) css.animationFillMode = styles.animationFillMode;
  // Convert structured backgroundGradient to CSS backgroundImage
  if (styles.backgroundGradient) {
    const gradCss = gradientToCss(styles.backgroundGradient);
    if (gradCss) {
      css.backgroundImage = gradCss;
    }
  }
  return css;
}

/* ─── Props ────────────────────────────────────────────────────────── */

interface RendererProps {
  node: BuilderComponentNode;
  /** Whether this is being rendered in the builder (edit mode) */
  isEditing?: boolean;
}

/* ─── Component Renderers ─────────────────────────────────────────── */

function ContainerRenderer({ node, isEditing }: RendererProps) {
  const maxW = (node.props.maxWidth as string) || "1200px";
  const centered = node.props.centered !== false;
  return (
    <div
      style={{
        ...styleToCss(node.styles),
        maxWidth: maxW,
        marginLeft: centered ? "auto" : undefined,
        marginRight: centered ? "auto" : undefined,
      }}
    >
      {node.children.map((child) => (
        <ComponentRenderer key={child.id} node={child} isEditing={isEditing} />
      ))}
    </div>
  );
}

function RowRenderer({ node, isEditing }: RendererProps) {
  return (
    <div style={styleToCss(node.styles)}>
      {node.children.map((child) => (
        <ComponentRenderer key={child.id} node={child} isEditing={isEditing} />
      ))}
    </div>
  );
}

function ColumnRenderer({ node, isEditing }: RendererProps) {
  const flexVal = (node.props.width as string) || "1fr";
  return (
    <div style={{ ...styleToCss(node.styles), flex: flexVal === "1fr" ? "1 1 0%" : flexVal }}>
      {node.children.map((child) => (
        <ComponentRenderer key={child.id} node={child} isEditing={isEditing} />
      ))}
    </div>
  );
}

function TextRenderer({ node }: RendererProps) {
  const content = (node.props.content as string) || "";
  const isHtml = node.props.html === true;
  if (isHtml) {
    return <div style={styleToCss(node.styles)} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <p style={styleToCss(node.styles)}>{content}</p>;
}

function HeadingRenderer({ node }: RendererProps) {
  const content = (node.props.content as string) || "";
  const level = (node.props.level as number) || 2;
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <div style={styleToCss(node.styles)}>{React.createElement(Tag, null, content)}</div>;
}

function ImageRenderer({ node }: RendererProps) {
  const src = (node.props.src as string) || "";
  const alt = (node.props.alt as string) || "";
  const caption = (node.props.caption as string) || "";
  const objectFit = (node.props.objectFit as string) || "cover";
  if (!src) {
    return (
      <div
        style={{
          ...styleToCss(node.styles),
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "oklch(0.92 0 0)", minHeight: "200px",
          borderRadius: "0.5rem",
        }}
      >
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Image placeholder</p>
        </div>
      </div>
    );
  }
  return (
    <figure style={styleToCss(node.styles)}>
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: objectFit as any, display: "block" }} loading="lazy" />
      {caption && <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">{caption}</figcaption>}
    </figure>
  );
}

function VideoRenderer({ node }: RendererProps) {
  const url = (node.props.url as string) || "";
  const caption = (node.props.caption as string) || "";
  const autoplay = node.props.autoplay === true;

  const getYoutubeId = (u: string) => {
    const match = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  };

  const ytId = getYoutubeId(url);

  if (!url) {
    return (
      <div style={{ ...styleToCss(node.styles), display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "oklch(0.92 0 0)" }}>
        <div className="text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Video placeholder</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={styleToCss(node.styles)}>
        {ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}${autoplay ? "?autoplay=1" : ""}`}
            title={caption || "Embedded video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            style={{ border: "none", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Video unavailable</p>
          </div>
        )}
      </div>
      {caption && <p className="text-center text-sm text-muted-foreground mt-2">{caption}</p>}
    </div>
  );
}

function ButtonRenderer({ node }: RendererProps) {
  const text = (node.props.text as string) || "Button";
  const url = (node.props.url as string) || "#";
  const variant = (node.props.variant as string) || "primary";
  const size = (node.props.size as string) || "md";
  const fullWidth = node.props.fullWidth === true;
  const newTab = node.props.newTab === true;

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: "oklch(0.2 0 0)", color: "white" },
    secondary: { backgroundColor: "oklch(0.9 0 0)", color: "oklch(0.2 0 0)" },
    outline: { border: "1px solid oklch(0.8 0 0)", color: "oklch(0.2 0 0)", backgroundColor: "transparent" },
    ghost: { color: "oklch(0.2 0 0)", backgroundColor: "transparent" },
    link: { color: "oklch(0.4 0.06 260)", textDecoration: "underline", backgroundColor: "transparent" },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: "0.375rem 0.75rem", fontSize: "0.75rem" },
    md: { padding: "0.5rem 1rem", fontSize: "0.875rem" },
    lg: { padding: "0.75rem 1.5rem", fontSize: "1rem" },
  };

  return (
    <a
      href={url}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      style={{
        ...styleToCss(node.styles),
        ...variantStyles[variant] || variantStyles.primary,
        ...sizeStyles[size] || sizeStyles.md,
        width: fullWidth ? "100%" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        borderRadius: "0.5rem",
        fontWeight: 500,
        transition: "opacity 0.2s",
        cursor: "pointer",
      }}
    >
      {text}
    </a>
  );
}

function IconRenderer({ node }: RendererProps) {
  const name = (node.props.name as string) || "Heart";
  const size = (node.props.size as string) || "24";
  const color = (node.props.color as string) || "currentColor";
  return (
    <span style={{ ...styleToCss(node.styles), color, fontSize: `${size}px`, lineHeight: 1 }}>
      [{name}]
    </span>
  );
}

function DividerRenderer({ node }: RendererProps) {
  const thickness = (node.props.thickness as string) || "1px";
  const color = (node.props.color as string) || "currentColor";
  const width = (node.props.width as string) || "100%";
  const style = (node.props.style as string) || "solid";
  return (
    <hr
      style={{
        ...styleToCss(node.styles),
        border: "none",
        borderTop: `${thickness} ${style} ${color}`,
        width,
        margin: "1rem auto",
      }}
    />
  );
}

function SpacerRenderer({ node }: RendererProps) {
  return <div style={{ ...styleToCss(node.styles), pointerEvents: "none" as any }} />;
}

function GalleryRenderer({ node }: RendererProps) {
  const images = (node.props.images as Array<{ src: string; alt: string; caption: string }>) || [];
  const columns = (node.props.columns as number) || 3;
  const aspectRatio = (node.props.aspectRatio as string) || "4/3";

  if (images.length === 0) {
    return (
      <div style={{ ...styleToCss(node.styles), display: "flex", alignItems: "center", justifyContent: "center", minHeight: "150px", backgroundColor: "oklch(0.92 0 0)", borderRadius: "0.5rem" }}>
        <div className="text-center text-muted-foreground">
          <Images className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Gallery placeholder</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styleToCss(node.styles),
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: (node.props.gap as string) || "1rem",
    }}>
      {images.map((img, i) => (
        <div key={i} style={{ aspectRatio, overflow: "hidden", borderRadius: "0.5rem" }}>
          <img src={img.src} alt={img.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
          {img.caption && <p className="text-xs text-center text-muted-foreground mt-1">{img.caption}</p>}
        </div>
      ))}
    </div>
  );
}

function SliderRenderer({ node }: RendererProps) {
  const slides = (node.props.slides as Array<{ src: string; alt: string }>) || [];
  const autoplay = node.props.autoplay === true;
  const interval = (node.props.interval as number) || 5000;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % Math.max(slides.length, 1)), [slides.length]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % Math.max(slides.length, 1)), [slides.length]);

  // Autoplay interval
  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [autoplay, interval, slides.length, next]);

  if (slides.length === 0) {
    return (
      <div style={{ ...styleToCss(node.styles), display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", backgroundColor: "oklch(0.92 0 0)" }}>
        <div className="text-center text-muted-foreground">
          <GalleryVerticalEnd className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Slider placeholder</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styleToCss(node.styles), position: "relative" }}>
      <img src={slides[current]?.src} alt={slides[current]?.alt || ""} style={{ width: "100%", display: "block" }} />
      {node.props.showArrows !== false && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors" style={{ border: "none", cursor: "pointer" }}>←</button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors" style={{ border: "none", cursor: "pointer" }}>→</button>
        </>
      )}
      {node.props.showDots !== false && (
        <div className="flex justify-center gap-1.5 mt-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: "8px", height: "8px", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: i === current ? "oklch(0.3 0 0)" : "oklch(0.8 0 0)", padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabsRenderer({ node }: RendererProps) {
  const tabs = (node.props.tabs as Array<{ label: string; content: string }>) || [];
  const orientation = (node.props.orientation as string) || "horizontal";
  const [activeTab, setActiveTab] = useState(0);

  if (tabs.length === 0) {
    return <div className="text-xs text-muted-foreground p-4">No tabs defined</div>;
  }

  return (
    <div style={styleToCss(node.styles)}>
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid oklch(0.87 0 0)", flexDirection: orientation === "vertical" ? "column" : "row" }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: i === activeTab ? 600 : 400,
              borderBottom: i === activeTab ? "2px solid oklch(0.2 0 0)" : "2px solid transparent",
              color: i === activeTab ? "oklch(0.2 0 0)" : "oklch(0.5 0 0)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        <p className="text-sm">{tabs[activeTab]?.content || ""}</p>
      </div>
    </div>
  );
}

function AccordionRenderer({ node }: RendererProps) {
  const items = (node.props.items as Array<{ title: string; content: string; open: boolean }>) || [];
  const allowMultiple = node.props.allowMultiple === true;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set(items.filter((i) => i.open).map((_, i) => i)));

  const toggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiple) next.clear();
        next.add(index);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground p-4">No accordion items</div>;
  }

  return (
    <div style={styleToCss(node.styles)}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: "1px solid oklch(0.87 0 0)" }}>
          <button
            onClick={() => toggle(i)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "0.75rem 1rem", border: "none",
              background: "none", cursor: "pointer", fontSize: "0.875rem",
              fontWeight: 500, textAlign: "left",
            }}
          >
            {item.title}
            <span style={{ transform: openItems.has(i) ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          {openItems.has(i) && (
            <div className="p-4 pt-0">
              <p className="text-sm text-muted-foreground">{item.content}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CardRenderer({ node }: RendererProps) {
  const image = (node.props.image as string) || "";
  const title = (node.props.title as string) || "";
  const description = (node.props.description as string) || "";
  const linkUrl = (node.props.linkUrl as string) || "";
  const variant = (node.props.variant as string) || "default";

  const variantBorderStyles: Record<string, React.CSSProperties> = {
    default: { border: "1px solid oklch(0.87 0 0)" },
    bordered: { border: "2px solid oklch(0.8 0 0)" },
    elevated: { boxShadow: "0 4px 12px oklch(0 0 0 / 0.1)", border: "none" },
  };

  const Wrapper = linkUrl ? "a" : "div";

  return (
    <Wrapper
      href={linkUrl || undefined}
      style={{
        ...styleToCss(node.styles),
        ...variantBorderStyles[variant] || variantBorderStyles.default,
        display: "block", textDecoration: "none", color: "inherit",
      }}
    >
      {image && (
        <img src={image} alt={title} style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }} />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </Wrapper>
  );
}

function CardsRenderer({ node, isEditing }: RendererProps) {
  const columns = (node.props.columns as number) || 3;
  return (
    <div style={{ ...styleToCss(node.styles), gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {node.children.map((child) => (
        <ComponentRenderer key={child.id} node={child} isEditing={isEditing} />
      ))}
    </div>
  );
}

function FormRenderer({ node }: RendererProps) {
  const fields = (node.props.fields as Array<{ type: string; label: string; placeholder: string; required: boolean }>) || [];
  const submitLabel = (node.props.submitLabel as string) || "Submit";

  return (
    <div style={styleToCss(node.styles)}>
      <form style={{ display: "flex", flexDirection: "column", gap: "1rem" }} onSubmit={(e) => e.preventDefault()}>
        {fields.map((field, i) => (
          <div key={i}>
            <label className="block text-xs font-medium mb-1">{field.label}{field.required ? " *" : ""}</label>
            {field.type === "textarea" ? (
              <textarea
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
                rows={3}
              />
            ) : field.type === "select" ? (
              <select className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none">
                <option value="">{field.placeholder}</option>
              </select>
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-border/60" />
                <span className="text-sm">{field.label}</span>
              </label>
            ) : (
              <input
                type={field.type === "email" ? "email" : "text"}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem", backgroundColor: "oklch(0.2 0 0)", color: "white",
            border: "none", borderRadius: "0.5rem", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem",
          }}
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}

function HtmlRenderer({ node }: RendererProps) {
  const content = (node.props.content as string) || "";
  return <div style={styleToCss(node.styles)} dangerouslySetInnerHTML={{ __html: content }} />;
}

function CustomRenderer({ node }: RendererProps) {
  return (
    <div style={{ ...styleToCss(node.styles), border: "1px dashed oklch(0.8 0 0)", padding: "1rem", borderRadius: "0.5rem" }}>
      <p className="text-xs text-muted-foreground italic">
        Custom Component: {(node.props.componentName as string) || "Unknown"}
      </p>
    </div>
  );
}

/* ─── Main Renderer ────────────────────────────────────────────────── */

export function ComponentRenderer({ node, isEditing }: RendererProps) {
  if (!node.visible) return null;

  const renderers: Record<string, React.ComponentType<RendererProps>> = {
    container: ContainerRenderer,
    row: RowRenderer,
    column: ColumnRenderer,
    text: TextRenderer,
    heading: HeadingRenderer,
    image: ImageRenderer,
    video: VideoRenderer,
    button: ButtonRenderer,
    icon: IconRenderer,
    divider: DividerRenderer,
    spacer: SpacerRenderer,
    gallery: GalleryRenderer,
    slider: SliderRenderer,
    tabs: TabsRenderer,
    accordion: AccordionRenderer,
    card: CardRenderer,
    cards: CardsRenderer,
    form: FormRenderer,
    html: HtmlRenderer,
    custom: CustomRenderer,
  };

  const Renderer = renderers[node.type];
  if (!Renderer) return null;

  return (
    <div className={isEditing ? "builder-component" : undefined}>
      <Renderer node={node} isEditing={isEditing} />
    </div>
  );
}

/* ─── Preview Component (standalone page renderer) ─────────────────── */

export function BuilderPreview({
  tree,
  className,
}: {
  tree: BuilderComponentNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {tree.children.map((child) => (
        <ComponentRenderer key={child.id} node={child} />
      ))}
    </div>
  );
}
