// ============================================================================
// Page Builder — Type Definitions
// ============================================================================

/* ─── Component Types ──────────────────────────────────────────────── */

export type BuilderComponentType =
  | "container"
  | "row"
  | "column"
  | "text"
  | "heading"
  | "image"
  | "video"
  | "button"
  | "icon"
  | "divider"
  | "spacer"
  | "gallery"
  | "slider"
  | "tabs"
  | "accordion"
  | "card"
  | "cards"
  | "form"
  | "html"
  | "custom";

/* ─── Style Properties ────────────────────────────────────────────── */

export interface StyleProps {
  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textDecoration?: string;
  fontStyle?: string;
  textTransform?: string;

  // Colors
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;

  // Spacing
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  gap?: string;

  // Sizing
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;

  // Borders
  borderWidth?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderColor?: string;
  borderRadius?: string;
  borderLeft?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;

  // Shadows
  boxShadow?: string;

  // Position
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;

  // Flex
  display?: string;
  flex?: string;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  gridGap?: string;

  // Background gradient
  backgroundGradient?: BackgroundGradient;

  // Animation
  animationName?: string;
  animationDuration?: string;
  animationTimingFunction?: string;
  animationDelay?: string;
  animationIterationCount?: string;
  animationFillMode?: string;

  // Hover effects
  hoverTransform?: string;
  hoverBoxShadow?: string;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  hoverScale?: string;
  hoverBorderColor?: string;

  // Effects
  opacity?: number;
  transform?: string;
  transition?: string;
  animation?: string;
  aspectRatio?: string;
  cursor?: string;
  overflow?: string;
  padding?: string;
  margin?: string;
  border?: string;
  objectFit?: string;

  // Responsive overrides
  sm?: Partial<StyleProps>;
  md?: Partial<StyleProps>;
  lg?: Partial<StyleProps>;
  xl?: Partial<StyleProps>;
}

/* ─── Component Node ──────────────────────────────────────────────── */

export interface BuilderComponentNode {
  /** Unique ID for this component instance */
  id: string;
  /** Component type */
  type: BuilderComponentType;
  /** Display name shown in layer panel */
  name: string;
  /** Whether component is visible on the page */
  visible: boolean;
  /** Whether component is locked (can't be edited/moved) */
  locked: boolean;
  /** Child components (for containers, rows, columns, etc.) */
  children: BuilderComponentNode[];
  /** Style properties applied to this component */
  styles: StyleProps;
  /** Style properties applied to this component at different breakpoints */
  responsiveStyles?: {
    sm?: Partial<StyleProps>;
    md?: Partial<StyleProps>;
    lg?: Partial<StyleProps>;
    xl?: Partial<StyleProps>;
  };
  /** Class names to append */
  className?: string;
  /** Component-specific properties */
  props: Record<string, unknown>;
}

/* ─── Page Builder State ──────────────────────────────────────────── */

export interface PageBuilderState {
  /** The component tree (root is always a container) */
  tree: BuilderComponentNode;
  /** Currently selected component ID */
  selectedId: string | null;
  /** Currently hovered component ID */
  hoveredId: string | null;
  /** Responsive preview device */
  device: "desktop" | "tablet" | "mobile";
  /** Whether in preview mode */
  isPreview: boolean;
  /** History for undo/redo */
  history: BuilderComponentNode[];
  /** Current history index */
  historyIndex: number;
}

/* ─── Component Definition ────────────────────────────────────────── */

export interface BuilderComponentDef {
  type: BuilderComponentType;
  label: string;
  description: string;
  icon: string;
  /** Whether this component can have children */
  container: boolean;
  /** Default props for this component type */
  defaultProps: Record<string, unknown>;
  /** Default styles for this component type */
  defaultStyles: StyleProps;
  /** Default children (for container types) */
  defaultChildren?: BuilderComponentNode[];
}

/* ─── Templates ──────────────────────────────────────────────────── */

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: "landing" | "content" | "about" | "contact" | "custom";
  thumbnail?: string;
  tree: BuilderComponentNode;
}

/* ─── Background Gradient ──────────────────────────────────────────── */

export interface BackgroundGradientStop {
  color: string;
  position?: number; // 0-100 percentage
}

export interface BackgroundGradient {
  /** Gradient type */
  type: "linear" | "radial";
  /** Direction/angle for linear (e.g. "to right", "45deg"), shape for radial */
  direction?: string;
  /** Color stops */
  stops: BackgroundGradientStop[];
}

/* ─── Component Props Maps ──────────────────────────────────────────── */

export interface TextProps {
  content: string;
  html: boolean;
  lang?: "en" | "bn";
}

export interface HeadingProps {
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  lang?: "en" | "bn";
}

export interface ImageProps {
  src: string;
  alt: string;
  caption: string;
  objectFit: "cover" | "contain" | "fill" | "none";
  linkUrl?: string;
}

export interface ButtonProps {
  text: string;
  url: string;
  variant: "primary" | "secondary" | "outline" | "ghost" | "link";
  size: "sm" | "md" | "lg";
  fullWidth: boolean;
  newTab: boolean;
  lang?: "en" | "bn";
}

export interface VideoProps {
  url: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  caption: string;
}

export interface DividerProps {
  style: "solid" | "dashed" | "dotted";
  thickness: string;
  color: string;
  width: string;
}

export interface GalleryProps {
  images: Array<{ src: string; alt: string; caption: string }>;
  columns: 2 | 3 | 4;
  gap: string;
  aspectRatio: string;
}

export interface SliderProps {
  slides: Array<{ src: string; alt: string; caption: string; linkUrl?: string }>;
  autoplay: boolean;
  interval: number;
  showArrows: boolean;
  showDots: boolean;
}

export interface TabsProps {
  tabs: Array<{ label: string; content: string }>;
  orientation: "horizontal" | "vertical";
}

export interface AccordionProps {
  items: Array<{ title: string; content: string; open: boolean }>;
  allowMultiple: boolean;
}

export interface CardProps {
  image: string;
  title: string;
  description: string;
  linkUrl: string;
  variant: "default" | "bordered" | "elevated";
}

export interface FormProps {
  fields: Array<{
    type: "text" | "email" | "textarea" | "select" | "checkbox";
    label: string;
    placeholder: string;
    required: boolean;
    options?: string[];
  }>;
  submitLabel: string;
  submitUrl: string;
}
