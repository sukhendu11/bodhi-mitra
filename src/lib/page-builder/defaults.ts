// ============================================================================
// Page Builder — Default Components & Templates
// ============================================================================

import type {
  BuilderComponentDef,
  BuilderComponentNode,
  BuilderComponentType,
} from "./types";

/* ─── Helper ──────────────────────────────────────────────────────── */

let idCounter = 0;
export function generateId(): string {
  idCounter += 1;
  return `pb-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─── Component Definitions ───────────────────────────────────────── */

export const COMPONENT_DEFS: Record<BuilderComponentType, BuilderComponentDef> = {
  container: {
    type: "container",
    label: "Container",
    description: "A wrapper for grouping components",
    icon: "Square",
    container: true,
    defaultProps: { maxWidth: "1200px", centered: true },
    defaultStyles: {
      width: "100%",
      marginLeft: "auto",
      marginRight: "auto",
      paddingLeft: "1rem",
      paddingRight: "1rem",
    },
    defaultChildren: [],
  },
  row: {
    type: "row",
    label: "Row",
    description: "A horizontal flex row for columns",
    icon: "Rows3",
    container: true,
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: "1rem",
      width: "100%",
    },
    defaultChildren: [],
  },
  column: {
    type: "column",
    label: "Column",
    description: "A vertical column within a row",
    icon: "Columns3",
    container: true,
    defaultProps: { width: "1fr" },
    defaultStyles: {
      flex: "1 1 0%",
      minWidth: "0",
    },
    defaultChildren: [],
  },
  text: {
    type: "text",
    label: "Text",
    description: "A paragraph of text with rich formatting",
    icon: "Type",
    container: false,
    defaultProps: {
      content: "Write your content here…",
      html: false,
    },
    defaultStyles: {
      fontSize: "1rem",
      lineHeight: "1.75",
      color: "inherit",
    },
  },
  heading: {
    type: "heading",
    label: "Heading",
    description: "A section heading",
    icon: "Heading1",
    container: false,
    defaultProps: { content: "Heading", level: 2 },
    defaultStyles: {
      fontSize: "1.5rem",
      fontWeight: "700",
      lineHeight: "1.3",
      marginBottom: "0.5rem",
    },
  },
  image: {
    type: "image",
    label: "Image",
    description: "An image with alt text and optional caption",
    icon: "ImageIcon",
    container: false,
    defaultProps: { src: "", alt: "", caption: "", objectFit: "cover" },
    defaultStyles: {
      width: "100%",
      borderRadius: "0.5rem",
    },
  },
  video: {
    type: "video",
    label: "Video",
    description: "Embedded video (YouTube/Vimeo)",
    icon: "Video",
    container: false,
    defaultProps: { url: "", autoplay: false, loop: false, muted: false, controls: true, caption: "" },
    defaultStyles: {
      width: "100%",
      borderRadius: "0.5rem",
      aspectRatio: "16 / 9",
    },
  },
  button: {
    type: "button",
    label: "Button",
    description: "A clickable button with link",
    icon: "MousePointerClick",
    container: false,
    defaultProps: { text: "Click here", url: "", variant: "primary", size: "md", fullWidth: false, newTab: false },
    defaultStyles: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "500",
      borderRadius: "0.5rem",
      cursor: "pointer",
    },
  },
  icon: {
    type: "icon",
    label: "Icon",
    description: "An icon from the library",
    icon: "Smile",
    container: false,
    defaultProps: { name: "Heart", size: "24", color: "currentColor" },
    defaultStyles: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  divider: {
    type: "divider",
    label: "Divider",
    description: "A horizontal divider line",
    icon: "Minus",
    container: false,
    defaultProps: { style: "solid", thickness: "1px", color: "currentColor", width: "100%" },
    defaultStyles: {
      marginTop: "1rem",
      marginBottom: "1rem",
    },
  },
  spacer: {
    type: "spacer",
    label: "Spacer",
    description: "An empty space for layout",
    icon: "ArrowUpDown",
    container: false,
    defaultProps: { height: "2rem" },
    defaultStyles: { height: "2rem" },
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "A grid of images",
    icon: "Images",
    container: false,
    defaultProps: { images: [], columns: 3, gap: "1rem", aspectRatio: "4/3" },
    defaultStyles: { width: "100%" },
  },
  slider: {
    type: "slider",
    label: "Slider",
    description: "An image carousel/slideshow",
    icon: "GalleryVerticalEnd",
    container: false,
    defaultProps: { slides: [], autoplay: true, interval: 5000, showArrows: true, showDots: true },
    defaultStyles: { width: "100%", borderRadius: "0.5rem", overflow: "hidden" },
  },
  tabs: {
    type: "tabs",
    label: "Tabs",
    description: "Tabbed content sections",
    icon: "FolderKanban",
    container: false,
    defaultProps: { tabs: [{ label: "Tab 1", content: "Content for tab 1" }], orientation: "horizontal" },
    defaultStyles: { width: "100%" },
  },
  accordion: {
    type: "accordion",
    label: "Accordion",
    description: "Expandable accordion sections",
    icon: "ChevronsUpDown",
    container: false,
    defaultProps: { items: [{ title: "Section 1", content: "Content here…", open: false }], allowMultiple: false },
    defaultStyles: { width: "100%" },
  },
  card: {
    type: "card",
    label: "Card",
    description: "A single card with image, title, description",
    icon: "CreditCard",
    container: false,
    defaultProps: { image: "", title: "Card Title", description: "Card description", linkUrl: "", variant: "default" },
    defaultStyles: {
      borderRadius: "0.75rem",
      overflow: "hidden",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "oklch(0.87 0 0)",
    },
  },
  cards: {
    type: "cards",
    label: "Cards Grid",
    description: "A grid of cards",
    icon: "LayoutGrid",
    container: true,
    defaultProps: { columns: 3 },
    defaultStyles: {
      display: "grid",
      gap: "1.5rem",
    },
    defaultChildren: [],
  },
  form: {
    type: "form",
    label: "Form",
    description: "A contact/subscription form",
    icon: "FormInput",
    container: false,
    defaultProps: {
      fields: [
        { type: "text", label: "Name", placeholder: "Your name", required: true },
        { type: "email", label: "Email", placeholder: "your@email.com", required: true },
        { type: "textarea", label: "Message", placeholder: "Your message", required: false },
      ],
      submitLabel: "Submit",
      submitUrl: "",
    },
    defaultStyles: { width: "100%" },
  },
  html: {
    type: "html",
    label: "HTML",
    description: "Custom HTML code block",
    icon: "Code2",
    container: false,
    defaultProps: { content: "<p>Custom HTML here</p>" },
    defaultStyles: { width: "100%" },
  },
  custom: {
    type: "custom",
    label: "Custom Component",
    description: "A reusable custom component",
    icon: " Puzzle",
    container: false,
    defaultProps: { componentName: "", props: {} },
    defaultStyles: {},
  },
};

/* ─── Default Root Tree ─────────────────────────────────────────── */

export function createDefaultPage(): BuilderComponentNode {
  return {
    id: generateId(),
    type: "container",
    name: "Page Root",
    visible: true,
    locked: false,
    children: [],
    styles: {
      width: "100%",
      maxWidth: "1200px",
      marginLeft: "auto",
      marginRight: "auto",
      paddingLeft: "1rem",
      paddingRight: "1rem",
    },
    props: {},
  };
}

/* ─── Section Templates ────────────────────────────────────────────── */

export const SECTION_TEMPLATES: Array<{ name: string; desc: string; tree: BuilderComponentNode }> = [
  {
    name: "Hero Section",
    desc: "Full-width hero with heading, subtext, and CTA",
    tree: {
      id: generateId(),
      type: "container",
      name: "Hero Section",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "heading",
          name: "Hero Heading",
          visible: true, locked: false, children: [],
          styles: { fontSize: "3rem", textAlign: "center", fontWeight: "700" },
          props: { content: "Welcome to Bodhi Mitra", level: 1 },
        },
        {
          id: generateId(),
          type: "text",
          name: "Hero Subtext",
          visible: true, locked: false, children: [],
          styles: { fontSize: "1.25rem", textAlign: "center", color: "oklch(0.55 0 0)", marginTop: "1rem" },
          props: { content: "Where ancient wisdom meets modern psychology.", html: false },
        },
        {
          id: generateId(),
          type: "button",
          name: "Hero CTA",
          visible: true, locked: false, children: [],
          styles: { marginTop: "2rem" },
          props: { text: "Explore Books", url: "/books", variant: "primary", size: "lg", fullWidth: false, newTab: false },
        },
      ],
      styles: {
        paddingTop: "5rem", paddingBottom: "5rem", paddingLeft: "1rem", paddingRight: "1rem",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      },
      props: {},
    },
  },
  {
    name: "Two-Column Text",
    desc: "Side-by-side text columns",
    tree: {
      id: generateId(),
      type: "container",
      name: "Two-Column Section",
      visible: true, locked: false,
      children: [
        {
          id: generateId(),
          type: "row", name: "Content Row",
          visible: true, locked: false, children: [
            {
              id: generateId(),
              type: "column", name: "Left Column",
              visible: true, locked: false, children: [
                {
                  id: generateId(),
                  type: "text", name: "Left Text",
                  visible: true, locked: false, children: [],
                  styles: {}, props: { content: "Left column content. Add your text here.", html: false },
                },
              ],
              styles: {}, props: {},
            },
            {
              id: generateId(),
              type: "column", name: "Right Column",
              visible: true, locked: false, children: [
                {
                  id: generateId(),
                  type: "text", name: "Right Text",
                  visible: true, locked: false, children: [],
                  styles: {}, props: { content: "Right column content. Add your text here.", html: false },
                },
              ],
              styles: {}, props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2rem" },
          props: {},
        },
      ],
      styles: { paddingTop: "3rem", paddingBottom: "3rem" },
      props: {},
    },
  },
  {
    name: "Image & Text",
    desc: "Side-by-side image and text",
    tree: {
      id: generateId(),
      type: "container",
      name: "Image & Text Section",
      visible: true, locked: false,
      children: [
        {
          id: generateId(),
          type: "row",
          name: "Content Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "column", name: "Image Column",
              visible: true, locked: false, children: [
                {
                  id: generateId(),
                  type: "image", name: "Feature Image",
                  visible: true, locked: false, children: [],
                  styles: { borderRadius: "0.75rem" },
                  props: { src: "", alt: "Feature image", caption: "", objectFit: "cover" },
                },
              ],
              styles: { flex: "1 1 50%" }, props: {},
            },
            {
              id: generateId(),
              type: "column", name: "Text Column",
              visible: true, locked: false, children: [
                {
                  id: generateId(),
                  type: "heading", name: "Section Title",
                  visible: true, locked: false, children: [],
                  styles: {}, props: { content: "Our Mission", level: 2 },
                },
                {
                  id: generateId(),
                  type: "text", name: "Description",
                  visible: true, locked: false, children: [],
                  styles: { marginTop: "0.5rem" },
                  props: { content: "Description text goes here.", html: false },
                },
              ],
              styles: { flex: "1 1 50%", display: "flex", flexDirection: "column", justifyContent: "center" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2rem", alignItems: "center" },
          props: {},
        },
      ],
      styles: { paddingTop: "3rem", paddingBottom: "3rem" },
      props: {},
    },
  },
  {
    name: "CTA Banner",
    desc: "Call-to-action section with button",
    tree: {
      id: generateId(),
      type: "container",
      name: "CTA Section",
      visible: true, locked: false,
      children: [
        {
          id: generateId(),
          type: "container",
          name: "CTA Inner",
          visible: true, locked: false, children: [
            {
              id: generateId(),
              type: "heading", name: "CTA Heading",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center" },
              props: { content: "Ready to Begin?", level: 2 },
            },
            {
              id: generateId(),
              type: "text", name: "CTA Text",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center", marginTop: "0.5rem" },
              props: { content: "Join our community of mindful readers.", html: false },
            },
            {
              id: generateId(),
              type: "button", name: "CTA Button",
              visible: true, locked: false, children: [],
              styles: { marginTop: "1.5rem" },
              props: { text: "Get Started", url: "/books", variant: "primary", size: "lg", fullWidth: false, newTab: false },
            },
          ],
          styles: {
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "3rem", borderRadius: "1rem",
            backgroundColor: "oklch(0.93 0.01 60)",
          },
          props: {},
        },
      ],
      styles: { paddingTop: "3rem", paddingBottom: "3rem" },
      props: {},
    },
  },
  {
    name: "Feature Cards",
    desc: "Three-column card grid",
    tree: {
      id: generateId(),
      type: "container",
      name: "Features Section",
      visible: true, locked: false,
      children: [
        {
          id: generateId(),
          type: "heading", name: "Features Title",
          visible: true, locked: false, children: [],
          styles: { textAlign: "center", marginBottom: "2rem" },
          props: { content: "Our Features", level: 2 },
        },
        {
          id: generateId(),
          type: "cards", name: "Card Grid",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "card", name: "Card 1",
              visible: true, locked: false, children: [],
              styles: {}, props: { image: "", title: "Wisdom", description: "Ancient teachings for modern life.", linkUrl: "", variant: "default" },
            },
            {
              id: generateId(),
              type: "card", name: "Card 2",
              visible: true, locked: false, children: [],
              styles: {}, props: { image: "", title: "Community", description: "Connect with like-minded readers.", linkUrl: "", variant: "default" },
            },
            {
              id: generateId(),
              type: "card", name: "Card 3",
              visible: true, locked: false, children: [],
              styles: {}, props: { image: "", title: "Growth", description: "Transform your understanding.", linkUrl: "", variant: "default" },
            },
          ],
          styles: { display: "grid", gap: "1.5rem" },
          props: { columns: 3 },
        },
      ],
      styles: { paddingTop: "3rem", paddingBottom: "3rem" },
      props: {},
    },
  },
];
