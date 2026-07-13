// ============================================================================
// Page Builder — Marketplace Sections (Predefined, Bundled Sections)
// ============================================================================
//
// These sections are bundled with the app and available in the Section Library's
// Marketplace tab. Users can browse by category, preview, and import them into
// their saved sections or directly into pages.
// ============================================================================

import { generateId } from "./defaults";
import { serializeTree } from "./utils";
import type { BuilderComponentNode } from "./types";

/* ─── Types ────────────────────────────────────────────────────────── */

export interface MarketplaceSection {
  id: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  /** Serialized component tree (JSON string) for the section */
  tree: string;
  /** Estimated component count inside the section */
  componentCount: number;
}

export type MarketplaceCategory =
  | "hero"
  | "features"
  | "content"
  | "cta"
  | "testimonials"
  | "footer"
  | "contact";

export interface MarketplaceCategoryInfo {
  id: MarketplaceCategory;
  label: string;
  icon: string;
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryInfo[] = [
  { id: "hero", label: "Hero", icon: "✦" },
  { id: "features", label: "Features", icon: "⊞" },
  { id: "content", label: "Content", icon: "☰" },
  { id: "cta", label: "Call to Action", icon: "⚡" },
  { id: "testimonials", label: "Testimonials", icon: "💬" },
  { id: "contact", label: "Contact", icon: "✉" },
  { id: "footer", label: "Footer", icon: "⌄" },
];

/* ─── Helper ───────────────────────────────────────────────────────── */

function section(
  name: string,
  description: string,
  category: MarketplaceCategory,
  tree: BuilderComponentNode,
): MarketplaceSection {
  return {
    id: generateId(),
    name,
    description,
    category,
    tree: serializeTree(tree),
    componentCount: countComponents(tree),
  };
}

function countComponents(node: BuilderComponentNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countComponents(child);
  }
  return count;
}

/* ─── Marketplace Sections ─────────────────────────────────────────── */

export const MARKETPLACE_SECTIONS: MarketplaceSection[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // HERO
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Gradient Hero",
    "Full-width hero with gradient background, heading, subtitle, and dual CTAs",
    "hero",
    {
      id: generateId(),
      type: "container",
      name: "Gradient Hero",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "container",
          name: "Hero Inner",
          visible: true,
          locked: false,
          children: [
            {
              id: generateId(),
              type: "heading",
              name: "Hero Heading",
              visible: true, locked: false, children: [],
              styles: { fontSize: "3rem", textAlign: "center", fontWeight: "800", color: "white", lineHeight: "1.2" },
              props: { content: "Transform Your Mind\nThrough Ancient Wisdom", level: 1 },
            },
            {
              id: generateId(),
              type: "text",
              name: "Hero Subtext",
              visible: true, locked: false, children: [],
              styles: { fontSize: "1.125rem", textAlign: "center", color: "oklch(0.85 0 0)", marginTop: "1rem", maxWidth: "600px" },
              props: { content: "Discover timeless teachings for a modern life. Explore our curated collection of Buddhist psychology books and resources.", html: false },
            },
            {
              id: generateId(),
              type: "row",
              name: "CTA Row",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "button",
                  name: "Primary CTA",
                  visible: true, locked: false, children: [],
                  styles: {},
                  props: { text: "Browse Books", url: "/books", variant: "primary", size: "lg", fullWidth: false, newTab: false },
                },
                {
                  id: generateId(),
                  type: "button",
                  name: "Secondary CTA",
                  visible: true, locked: false, children: [],
                  styles: {},
                  props: { text: "Learn More", url: "/about", variant: "outline", size: "lg", fullWidth: false, newTab: false },
                },
              ],
              styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "1rem", justifyContent: "center", marginTop: "2rem" },
              props: {},
            },
          ],
          styles: {
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "6rem 2rem",
            backgroundGradient: {
              type: "linear",
              direction: "135deg",
              stops: [
                { color: "#1e1b4b", position: 0 },
                { color: "#312e81", position: 50 },
                { color: "#3b0764", position: 100 },
              ],
            },
          },
          props: { maxWidth: "100%", centered: false },
        },
      ],
      styles: { width: "100%" },
      props: {},
    },
  ),

  section(
    "Split Hero",
    "Side-by-side hero with text on left and image placeholder on right",
    "hero",
    {
      id: generateId(),
      type: "container",
      name: "Split Hero",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "row",
          name: "Hero Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "column",
              name: "Text Column",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "heading",
                  name: "Title",
                  visible: true, locked: false, children: [],
                  styles: { fontSize: "2.5rem", fontWeight: "800", lineHeight: "1.15" },
                  props: { content: "Mindful Reading,\nDeep Understanding", level: 1 },
                },
                {
                  id: generateId(),
                  type: "text",
                  name: "Description",
                  visible: true, locked: false, children: [],
                  styles: { fontSize: "1.125rem", color: "oklch(0.55 0 0)", marginTop: "1rem", lineHeight: "1.75" },
                  props: { content: "Our platform brings together the best of Buddhist literature and modern psychology, making ancient wisdom accessible to everyone.", html: false },
                },
                {
                  id: generateId(),
                  type: "button",
                  name: "CTA",
                  visible: true, locked: false, children: [],
                  styles: { marginTop: "1.5rem" },
                  props: { text: "Start Reading", url: "/books", variant: "primary", size: "md", fullWidth: false, newTab: false },
                },
              ],
              styles: { flex: "1 1 50%", display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "2rem" },
              props: {},
            },
            {
              id: generateId(),
              type: "column",
              name: "Image Column",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "image",
                  name: "Hero Image",
                  visible: true, locked: false, children: [],
                  styles: { borderRadius: "1rem", width: "100%", minHeight: "400px" },
                  props: { src: "", alt: "Hero visual", caption: "", objectFit: "cover" },
                },
              ],
              styles: { flex: "1 1 50%" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2rem", alignItems: "center" },
          props: {},
        },
      ],
      styles: { padding: "4rem 2rem", maxWidth: "1200px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURES
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "4-Column Features",
    "Four feature cards with icons, headings, and descriptions in a grid",
    "features",
    {
      id: generateId(),
      type: "container",
      name: "Features Section",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "heading",
          name: "Section Title",
          visible: true, locked: false, children: [],
          styles: { textAlign: "center", marginBottom: "0.5rem" },
          props: { content: "Why Bodhi Mitra?", level: 2 },
        },
        {
          id: generateId(),
          type: "text",
          name: "Section Subtitle",
          visible: true, locked: false, children: [],
          styles: { textAlign: "center", color: "oklch(0.55 0 0)", marginBottom: "3rem" },
          props: { content: "Everything you need to deepen your practice and understanding.", html: false },
        },
        {
          id: generateId(),
          type: "cards",
          name: "Feature Grid",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "card",
              name: "Feature 1",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center", padding: "1.5rem" },
              props: { image: "", title: "📚 Curated Library", description: "Hand-picked books from renowned teachers and scholars.", linkUrl: "", variant: "bordered" },
            },
            {
              id: generateId(),
              type: "card",
              name: "Feature 2",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center", padding: "1.5rem" },
              props: { image: "", title: "🧘 Guided Practice", description: "Meditation guides and exercises to complement your reading.", linkUrl: "", variant: "bordered" },
            },
            {
              id: generateId(),
              type: "card",
              name: "Feature 3",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center", padding: "1.5rem" },
              props: { image: "", title: "🌍 Community", description: "Connect with fellow practitioners in our discussion forums.", linkUrl: "", variant: "bordered" },
            },
            {
              id: generateId(),
              type: "card",
              name: "Feature 4",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center", padding: "1.5rem" },
              props: { image: "", title: "📖 Progress Tracking", description: "Track your reading progress and earn achievements.", linkUrl: "", variant: "bordered" },
            },
          ],
          styles: { gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" },
          props: { columns: 4 },
        },
      ],
      styles: { padding: "5rem 2rem", maxWidth: "1200px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  section(
    "Icon Feature Strip",
    "Horizontal strip of icon-feature items with small cards",
    "features",
    {
      id: generateId(),
      type: "container",
      name: "Feature Strip",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "row",
          name: "Strip Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "container",
              name: "Feature 1",
              visible: true, locked: false, children: [
                { id: generateId(), type: "text", name: "Icon 1", visible: true, locked: false, children: [], styles: { fontSize: "2rem", textAlign: "center" }, props: { content: "📖", html: false } },
                { id: generateId(), type: "text", name: "Label 1", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", fontWeight: "600", textAlign: "center", marginTop: "0.5rem" }, props: { content: "Curated Library", html: false } },
              ],
              styles: { display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" },
              props: {},
            },
            {
              id: generateId(),
              type: "container",
              name: "Feature 2",
              visible: true, locked: false, children: [
                { id: generateId(), type: "text", name: "Icon 2", visible: true, locked: false, children: [], styles: { fontSize: "2rem", textAlign: "center" }, props: { content: "🧘", html: false } },
                { id: generateId(), type: "text", name: "Label 2", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", fontWeight: "600", textAlign: "center", marginTop: "0.5rem" }, props: { content: "Guided Practice", html: false } },
              ],
              styles: { display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" },
              props: {},
            },
            {
              id: generateId(),
              type: "container",
              name: "Feature 3",
              visible: true, locked: false, children: [
                { id: generateId(), type: "text", name: "Icon 3", visible: true, locked: false, children: [], styles: { fontSize: "2rem", textAlign: "center" }, props: { content: "🌍", html: false } },
                { id: generateId(), type: "text", name: "Label 3", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", fontWeight: "600", textAlign: "center", marginTop: "0.5rem" }, props: { content: "Community", html: false } },
              ],
              styles: { display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" },
              props: {},
            },
            {
              id: generateId(),
              type: "container",
              name: "Feature 4",
              visible: true, locked: false, children: [
                { id: generateId(), type: "text", name: "Icon 4", visible: true, locked: false, children: [], styles: { fontSize: "2rem", textAlign: "center" }, props: { content: "📊", html: false } },
                { id: generateId(), type: "text", name: "Label 4", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", fontWeight: "600", textAlign: "center", marginTop: "0.5rem" }, props: { content: "Progress Tracking", html: false } },
              ],
              styles: { display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: "0" },
          props: {},
        },
      ],
      styles: { padding: "3rem 2rem", maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Content with Quote",
    "Two-column layout with text and a highlighted pull-quote",
    "content",
    {
      id: generateId(),
      type: "container",
      name: "Content Section",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "row",
          name: "Content Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "column",
              name: "Main Content",
              visible: true, locked: false,
              children: [
                { id: generateId(), type: "heading", name: "Article Heading", visible: true, locked: false, children: [], styles: { fontSize: "1.75rem", fontWeight: "700" }, props: { content: "The Path of Understanding", level: 2 } },
                { id: generateId(), type: "text", name: "Body Text 1", visible: true, locked: false, children: [], styles: { fontSize: "1rem", lineHeight: "1.8", color: "oklch(0.45 0 0)", marginTop: "1rem" }, props: { content: "Buddhist psychology offers a unique perspective on the nature of mind and reality. By understanding the fundamental principles of how our minds create suffering and joy, we can begin to transform our experience of life itself.", html: false } },
                { id: generateId(), type: "text", name: "Body Text 2", visible: true, locked: false, children: [], styles: { fontSize: "1rem", lineHeight: "1.8", color: "oklch(0.45 0 0)", marginTop: "0.75rem" }, props: { content: "The Buddha's teachings on mindfulness, compassion, and wisdom are not merely philosophical concepts — they are practical tools for living a more fulfilling and meaningful life.", html: false } },
              ],
              styles: { flex: "2 1 60%" },
              props: {},
            },
            {
              id: generateId(),
              type: "column",
              name: "Quote Column",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "container",
                  name: "Quote Block",
                  visible: true, locked: false, children: [
                    { id: generateId(), type: "text", name: "Quote Mark", visible: true, locked: false, children: [], styles: { fontSize: "3rem", lineHeight: "1", color: "oklch(0.7 0.05 60)" }, props: { content: "\"", html: false } },
                    { id: generateId(), type: "text", name: "Quote Text", visible: true, locked: false, children: [], styles: { fontSize: "1.125rem", lineHeight: "1.7", fontStyle: "italic", color: "oklch(0.4 0 0)" }, props: { content: "The mind is everything. What you think you become.", html: false } },
                    { id: generateId(), type: "text", name: "Quote Attribution", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", fontWeight: "600", marginTop: "1rem", color: "oklch(0.5 0 0)" }, props: { content: "— The Buddha", html: false } },
                  ],
                  styles: { padding: "2rem", borderLeft: "3px solid oklch(0.7 0.05 60)", backgroundColor: "oklch(0.97 0.005 60)", borderRadius: "0 0.75rem 0.75rem 0" },
                  props: {},
                },
              ],
              styles: { flex: "1 1 35%", display: "flex", flexDirection: "column", justifyContent: "center" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "3rem", alignItems: "flex-start" },
          props: {},
        },
      ],
      styles: { padding: "4rem 2rem", maxWidth: "1100px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // CTA
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Newsletter CTA",
    "Email signup form with heading, text, and input field + button",
    "cta",
    {
      id: generateId(),
      type: "container",
      name: "Newsletter Section",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "container",
          name: "Newsletter Inner",
          visible: true, locked: false,
          children: [
            { id: generateId(), type: "heading", name: "Newsletter Heading", visible: true, locked: false, children: [], styles: { textAlign: "center", color: "white" }, props: { content: "Stay Inspired", level: 2 } },
            { id: generateId(), type: "text", name: "Newsletter Text", visible: true, locked: false, children: [], styles: { textAlign: "center", color: "oklch(0.8 0 0)", marginTop: "0.5rem", maxWidth: "500px" }, props: { content: "Receive weekly insights, reading recommendations, and meditation tips directly in your inbox.", html: false } },
            {
              id: generateId(),
              type: "form",
              name: "Signup Form",
              visible: true, locked: false, children: [],
              styles: { marginTop: "1.5rem", maxWidth: "400px" },
              props: {
                fields: [
                  { type: "email", label: "Email", placeholder: "your@email.com", required: true },
                ],
                submitLabel: "Subscribe",
                submitUrl: "",
              },
            },
          ],
          styles: {
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "4rem 2rem", borderRadius: "1rem",
            backgroundGradient: {
              type: "linear",
              direction: "to right",
              stops: [
                { color: "#1e1b4b", position: 0 },
                { color: "#3b0764", position: 100 },
              ],
            },
          },
          props: {},
        },
      ],
      styles: { padding: "3rem 2rem" },
      props: {},
    },
  ),

  section(
    "Simple CTA Banner",
    "Clean banner with heading, description, and primary button",
    "cta",
    {
      id: generateId(),
      type: "container",
      name: "CTA Banner",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "container",
          name: "CTA Inner",
          visible: true, locked: false, children: [
            { id: generateId(), type: "heading", name: "CTA Heading", visible: true, locked: false, children: [], styles: { textAlign: "center", fontSize: "2rem" }, props: { content: "Ready to Begin Your Journey?", level: 2 } },
            { id: generateId(), type: "text", name: "CTA Subtext", visible: true, locked: false, children: [], styles: { textAlign: "center", color: "oklch(0.55 0 0)", marginTop: "0.5rem" }, props: { content: "Join thousands of readers exploring the intersection of Buddhist wisdom and modern psychology.", html: false } },
            { id: generateId(), type: "button", name: "CTA Button", visible: true, locked: false, children: [], styles: { marginTop: "1.5rem" }, props: { text: "Get Started Free", url: "/books", variant: "primary", size: "lg", fullWidth: false, newTab: false } },
          ],
          styles: { display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem", border: "2px dashed oklch(0.85 0 0)", borderRadius: "1.5rem" },
          props: {},
        },
      ],
      styles: { padding: "3rem 2rem", maxWidth: "800px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // TESTIMONIALS
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Testimonial Cards",
    "Three-column testimonial grid with quote cards and author info",
    "testimonials",
    {
      id: generateId(),
      type: "container",
      name: "Testimonials Section",
      visible: true,
      locked: false,
      children: [
        { id: generateId(), type: "heading", name: "Section Title", visible: true, locked: false, children: [], styles: { textAlign: "center", marginBottom: "2.5rem" }, props: { content: "What Our Readers Say", level: 2 } },
        {
          id: generateId(),
          type: "cards",
          name: "Testimonial Grid",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "card",
              name: "Testimonial 1",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center" },
              props: {
                image: "",
                title: "Sarah M.",
                description: "\"This platform has transformed my understanding of Buddhist psychology. The curated book selections are exceptional.\"",
                linkUrl: "", variant: "elevated",
              },
            },
            {
              id: generateId(),
              type: "card",
              name: "Testimonial 2",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center" },
              props: {
                image: "",
                title: "James K.",
                description: "\"The combination of traditional teachings with modern psychological insights is exactly what I needed.\"",
                linkUrl: "", variant: "elevated",
              },
            },
            {
              id: generateId(),
              type: "card",
              name: "Testimonial 3",
              visible: true, locked: false, children: [],
              styles: { textAlign: "center" },
              props: {
                image: "",
                title: "Lena P.",
                description: "\"I've been searching for a resource like this for years. The depth and quality of content is outstanding.\"",
                linkUrl: "", variant: "elevated",
              },
            },
          ],
          styles: { gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" },
          props: { columns: 3 },
        },
      ],
      styles: { padding: "5rem 2rem", maxWidth: "1100px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // CONTACT
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Contact Section",
    "Two-column contact with form and contact info sidebar",
    "contact",
    {
      id: generateId(),
      type: "container",
      name: "Contact Section",
      visible: true,
      locked: false,
      children: [
        { id: generateId(), type: "heading", name: "Contact Heading", visible: true, locked: false, children: [], styles: { textAlign: "center", marginBottom: "0.5rem" }, props: { content: "Get in Touch", level: 2 } },
        { id: generateId(), type: "text", name: "Contact Subtext", visible: true, locked: false, children: [], styles: { textAlign: "center", color: "oklch(0.55 0 0)", marginBottom: "3rem" }, props: { content: "Have questions or suggestions? We'd love to hear from you.", html: false } },
        {
          id: generateId(),
          type: "row",
          name: "Contact Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "column",
              name: "Form Column",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "form",
                  name: "Contact Form",
                  visible: true, locked: false, children: [],
                  styles: {},
                  props: {
                    fields: [
                      { type: "text", label: "Name", placeholder: "Your name", required: true },
                      { type: "email", label: "Email", placeholder: "your@email.com", required: true },
                      { type: "textarea", label: "Message", placeholder: "How can we help?", required: true },
                    ],
                    submitLabel: "Send Message",
                    submitUrl: "",
                  },
                },
              ],
              styles: { flex: "2 1 60%" },
              props: {},
            },
            {
              id: generateId(),
              type: "column",
              name: "Info Column",
              visible: true, locked: false,
              children: [
                {
                  id: generateId(),
                  type: "container",
                  name: "Info Card",
                  visible: true, locked: false,
                  children: [
                    { id: generateId(), type: "text", name: "Email Line", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem" }, props: { content: "✉ hello@bodhimitra.com", html: false } },
                    { id: generateId(), type: "text", name: "Social Line", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", marginTop: "0.75rem" }, props: { content: "Follow us on social media for daily wisdom and updates.", html: false } },
                  ],
                  styles: { padding: "2rem", borderRadius: "0.75rem", backgroundColor: "oklch(0.97 0.005 275)", border: "1px solid oklch(0.9 0.01 275)" },
                  props: {},
                },
              ],
              styles: { flex: "1 1 35%", display: "flex", flexDirection: "column", justifyContent: "center" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "3rem", alignItems: "flex-start" },
          props: {},
        },
      ],
      styles: { padding: "4rem 2rem", maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" },
      props: {},
    },
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  section(
    "Simple Footer",
    "Three-column footer with brand, links, and newsletter signup",
    "footer",
    {
      id: generateId(),
      type: "container",
      name: "Footer",
      visible: true,
      locked: false,
      children: [
        {
          id: generateId(),
          type: "row",
          name: "Footer Row",
          visible: true, locked: false,
          children: [
            {
              id: generateId(),
              type: "column",
              name: "Brand Column",
              visible: true, locked: false,
              children: [
                { id: generateId(), type: "heading", name: "Brand Name", visible: true, locked: false, children: [], styles: { fontSize: "1.25rem", fontWeight: "700" }, props: { content: "Bodhi Mitra", level: 3 } },
                { id: generateId(), type: "text", name: "Brand Tagline", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.55 0 0)", marginTop: "0.5rem" }, props: { content: "Ancient wisdom for modern minds.", html: false } },
              ],
              styles: { flex: "1.5 1 30%" },
              props: {},
            },
            {
              id: generateId(),
              type: "column",
              name: "Links Column 1",
              visible: true, locked: false,
              children: [
                { id: generateId(), type: "text", name: "Link Header 1", visible: true, locked: false, children: [], styles: { fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }, props: { content: "Content", html: false } },
                { id: generateId(), type: "text", name: "Link 1a", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "Books", html: false } },
                { id: generateId(), type: "text", name: "Link 1b", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "Courses", html: false } },
                { id: generateId(), type: "text", name: "Link 1c", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "Blog", html: false } },
              ],
              styles: { flex: "1 1 20%" },
              props: {},
            },
            {
              id: generateId(),
              type: "column",
              name: "Links Column 2",
              visible: true, locked: false,
              children: [
                { id: generateId(), type: "text", name: "Link Header 2", visible: true, locked: false, children: [], styles: { fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }, props: { content: "Connect", html: false } },
                { id: generateId(), type: "text", name: "Link 2a", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "About", html: false } },
                { id: generateId(), type: "text", name: "Link 2b", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "Contact", html: false } },
                { id: generateId(), type: "text", name: "Link 2c", visible: true, locked: false, children: [], styles: { fontSize: "0.875rem", color: "oklch(0.5 0 0)", marginTop: "0.375rem", cursor: "pointer" }, props: { content: "Community", html: false } },
              ],
              styles: { flex: "1 1 20%" },
              props: {},
            },
          ],
          styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2rem" },
          props: {},
        },
        {
          id: generateId(),
          type: "divider",
          name: "Footer Divider",
          visible: true, locked: false, children: [],
          styles: { marginTop: "2rem", marginBottom: "1.5rem" },
          props: { style: "solid", thickness: "1px", color: "oklch(0.85 0 0)", width: "100%" },
        },
        { id: generateId(), type: "text", name: "Copyright", visible: true, locked: false, children: [], styles: { fontSize: "0.75rem", textAlign: "center", color: "oklch(0.6 0 0)" }, props: { content: "© 2026 Bodhi Mitra. All rights reserved.", html: false } },
      ],
      styles: { padding: "3rem 2rem 1.5rem", maxWidth: "1100px", marginLeft: "auto", marginRight: "auto", borderTop: "1px solid oklch(0.85 0 0)" },
      props: {},
    },
  ),
];

/* ─── Filter helpers ───────────────────────────────────────────────── */

/** Get all marketplace sections for a given category. */
export function getMarketplaceSectionsByCategory(category: MarketplaceCategory): MarketplaceSection[] {
  return MARKETPLACE_SECTIONS.filter((s) => s.category === category);
}

/** Search marketplace sections by name and description. */
export function searchMarketplaceSections(query: string): MarketplaceSection[] {
  const q = query.toLowerCase();
  return MARKETPLACE_SECTIONS.filter(
    (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
  );
}
