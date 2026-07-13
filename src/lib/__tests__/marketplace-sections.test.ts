// ============================================================================
// Page Builder — Marketplace Sections Tests
// ============================================================================
//
// Tests for marketplace-sections.ts — bundled section definitions, category
// grouping, and search/filter helpers.
// ============================================================================

import { describe, it, expect } from "vitest";

/* ─── Dynamic imports (loaded once at top level, matching project pattern) ─── */

const marketplaceModule = (await import("../page-builder/marketplace-sections")) as {
  MARKETPLACE_SECTIONS: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    tree: string;
    componentCount: number;
  }>;
  MARKETPLACE_CATEGORIES: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
  getMarketplaceSectionsByCategory: (category: string) => any[];
  searchMarketplaceSections: (query: string) => any[];
};

const { MARKETPLACE_SECTIONS, MARKETPLACE_CATEGORIES, getMarketplaceSectionsByCategory, searchMarketplaceSections } = marketplaceModule;

/* ════════════════════════════════════════════════════════════════════
   Data Integrity — MARKETPLACE_SECTIONS
   ════════════════════════════════════════════════════════════════════ */

describe("MARKETPLACE_SECTIONS data integrity", () => {
  it("has exactly 10 bundled sections", () => {
    expect(MARKETPLACE_SECTIONS).toHaveLength(10);
  });

  it("every section has a non-empty id", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      expect(s.id).toBeTruthy();
      expect(typeof s.id).toBe("string");
    }
  });

  it("every section has a non-empty name", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      expect(s.name).toBeTruthy();
      expect(typeof s.name).toBe("string");
    }
  });

  it("every section has a non-empty description", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      expect(s.description).toBeTruthy();
      expect(typeof s.description).toBe("string");
    }
  });

  it("every section has a valid category", () => {
    const validCategories = new Set(MARKETPLACE_CATEGORIES.map((c) => c.id));
    for (const s of MARKETPLACE_SECTIONS) {
      expect(validCategories.has(s.category)).toBe(true);
    }
  });

  it("every section has a serialized tree (JSON string)", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      expect(typeof s.tree).toBe("string");
      expect(s.tree.length).toBeGreaterThan(0);
      // Verify it's valid JSON
      expect(() => JSON.parse(s.tree)).not.toThrow();
    }
  });

  it("every section has a positive componentCount", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      expect(s.componentCount).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(s.componentCount)).toBe(true);
    }
  });

  it("every section has unique IDs (no duplicates)", () => {
    const ids = MARKETPLACE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every section has unique names (no duplicates)", () => {
    const names = MARKETPLACE_SECTIONS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

/* ════════════════════════════════════════════════════════════════════
   Serialized Tree Validation
   ════════════════════════════════════════════════════════════════════ */

describe("Serialized tree data integrity", () => {
  it("each deserialized tree has required fields", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      const tree = JSON.parse(s.tree);
      expect(tree).toHaveProperty("id");
      expect(tree).toHaveProperty("type");
      expect(tree).toHaveProperty("name");
      expect(tree).toHaveProperty("visible");
      expect(tree).toHaveProperty("locked");
      expect(tree).toHaveProperty("children");
      expect(tree).toHaveProperty("styles");
      expect(tree).toHaveProperty("props");
      expect(typeof tree.type).toBe("string");
      expect(typeof tree.name).toBe("string");
      expect(typeof tree.visible).toBe("boolean");
      expect(typeof tree.locked).toBe("boolean");
      expect(Array.isArray(tree.children)).toBe(true);
    }
  });

  it("each tree root is a container type", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      const tree = JSON.parse(s.tree);
      expect(tree.type).toBe("container");
    }
  });

  it("each tree has at least one child node", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      const tree = JSON.parse(s.tree);
      expect(tree.children.length).toBeGreaterThan(0);
    }
  });

  it("componentCount matches actual node count in the tree", () => {
    function countNodes(obj: any): number {
      let count = 1;
      if (Array.isArray(obj.children)) {
        for (const child of obj.children) {
          count += countNodes(child);
        }
      }
      return count;
    }

    for (const s of MARKETPLACE_SECTIONS) {
      const tree = JSON.parse(s.tree);
      const actualCount = countNodes(tree);
      expect(s.componentCount).toBe(actualCount);
    }
  });

  it("all nested children have valid structure", () => {
    function validateNode(node: any, path: string[]) {
      expect(node.id).toBeTruthy();
      expect(node.type).toBeTruthy();
      expect(typeof node.visible).toBe("boolean");
      expect(typeof node.locked).toBe("boolean");
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.styles).toBeTruthy();
      expect(node.props).toBeTruthy();
      node.children.forEach((child: any, i: number) => validateNode(child, [...path, String(i)]));
    }

    for (const s of MARKETPLACE_SECTIONS) {
      const tree = JSON.parse(s.tree);
      expect(() => validateNode(tree, [s.name])).not.toThrow();
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   Categories
   ════════════════════════════════════════════════════════════════════ */

describe("MARKETPLACE_CATEGORIES", () => {
  it("has exactly 7 categories", () => {
    expect(MARKETPLACE_CATEGORIES).toHaveLength(7);
  });

  it("each category has required fields", () => {
    for (const cat of MARKETPLACE_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(typeof cat.id).toBe("string");
      expect(typeof cat.label).toBe("string");
      expect(typeof cat.icon).toBe("string");
    }
  });

  it("every category has at least one section", () => {
    for (const cat of MARKETPLACE_CATEGORIES) {
      const count = getMarketplaceSectionsByCategory(cat.id).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("each section belongs to exactly one category", () => {
    for (const s of MARKETPLACE_SECTIONS) {
      const matchingCats = MARKETPLACE_CATEGORIES.filter((c) => c.id === s.category);
      expect(matchingCats).toHaveLength(1);
    }
  });

  it("category labels are human-readable strings", () => {
    const expectedLabels = ["Hero", "Features", "Content", "Call to Action", "Testimonials", "Contact", "Footer"];
    const labels = MARKETPLACE_CATEGORIES.map((c) => c.label);
    for (const label of expectedLabels) {
      expect(labels).toContain(label);
    }
  });
});

describe("getMarketplaceSectionsByCategory", () => {
  it("returns correct sections for hero category", () => {
    const heroSections = getMarketplaceSectionsByCategory("hero");
    expect(heroSections).toHaveLength(2);
    expect(heroSections.map((s: any) => s.name)).toEqual(["Gradient Hero", "Split Hero"]);
  });

  it("returns correct sections for features category", () => {
    const sections = getMarketplaceSectionsByCategory("features");
    expect(sections).toHaveLength(2);
    expect(sections.map((s: any) => s.name)).toEqual(["4-Column Features", "Icon Feature Strip"]);
  });

  it("returns correct sections for content category", () => {
    const sections = getMarketplaceSectionsByCategory("content");
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Content with Quote");
  });

  it("returns correct sections for cta category", () => {
    const sections = getMarketplaceSectionsByCategory("cta");
    expect(sections).toHaveLength(2);
    expect(sections.map((s: any) => s.name)).toEqual(["Newsletter CTA", "Simple CTA Banner"]);
  });

  it("returns correct sections for testimonials category", () => {
    const sections = getMarketplaceSectionsByCategory("testimonials");
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Testimonial Cards");
  });

  it("returns correct sections for contact category", () => {
    const sections = getMarketplaceSectionsByCategory("contact");
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Contact Section");
  });

  it("returns correct sections for footer category", () => {
    const sections = getMarketplaceSectionsByCategory("footer");
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("Simple Footer");
  });

  it("returns empty array for unknown category", () => {
    const sections = getMarketplaceSectionsByCategory("unknown" as any);
    expect(sections).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   Search
   ════════════════════════════════════════════════════════════════════ */

describe("searchMarketplaceSections", () => {
  it("returns all sections for empty query", () => {
    const results = searchMarketplaceSections("");
    expect(results).toHaveLength(10);
  });

  it("finds sections by name (case-insensitive)", () => {
    const results = searchMarketplaceSections("hero");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((s: any) => s.name.toLowerCase().includes("hero"))).toBe(true);
  });

  it("finds sections by partial name match", () => {
    const results = searchMarketplaceSections("feature");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map((s: any) => s.name);
    expect(names).toContain("4-Column Features");
    expect(names).toContain("Icon Feature Strip");
  });

  it("finds sections by description match", () => {
    const results = searchMarketplaceSections("gradient");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((s: any) => s.name === "Gradient Hero")).toBe(true);
  });

  it("finds sections by description keywords", () => {
    const results = searchMarketplaceSections("testimonial");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((s: any) => s.name)).toContain("Testimonial Cards");
  });

  it("returns all sections matching 'cta' (matches names + descriptions)", () => {
    const results = searchMarketplaceSections("cta");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map((s: any) => s.name);
    expect(names).toContain("Gradient Hero");  // "dual CTAs" in description
    expect(names).toContain("Newsletter CTA");
    expect(names).toContain("Simple CTA Banner");
  });

  it("is case-insensitive", () => {
    const upper = searchMarketplaceSections("HERO");
    const lower = searchMarketplaceSections("hero");
    expect(upper).toEqual(lower);
  });

  it("returns empty array for non-matching query", () => {
    const results = searchMarketplaceSections("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("returns sections sorted by original order (no reordering)", () => {
    const results = searchMarketplaceSections("");
    for (let i = 0; i < results.length; i++) {
      expect(results[i].id).toBe(MARKETPLACE_SECTIONS[i].id);
    }
  });

  it("matches on partial words within descriptions", () => {
    // "pull-quote" appears in "Content with Quote" description
    const results = searchMarketplaceSections("pull-quote");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((s: any) => s.name)).toContain("Content with Quote");
  });

  it("handles special regex characters safely (plain string includes)", () => {
    // The search uses String.includes, not regex, so special chars are safe
    const results = searchMarketplaceSections("(Imported)");  // Not in any marketplace data
    expect(results).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   Section Names & Descriptions
   ════════════════════════════════════════════════════════════════════ */

describe("Section content verification", () => {
  it("Gradient Hero section exists with correct metadata", () => {
    const section = MARKETPLACE_SECTIONS.find((s) => s.name === "Gradient Hero");
    expect(section).toBeDefined();
    expect(section!.category).toBe("hero");
    expect(section!.description).toContain("gradient");
    expect(section!.componentCount).toBeGreaterThan(3);
  });

  it("Split Hero section has image + text structure", () => {
    const section = MARKETPLACE_SECTIONS.find((s) => s.name === "Split Hero");
    expect(section).toBeDefined();
    const tree = JSON.parse(section!.tree);
    // Has a row with text column and image column
    const row = tree.children[0];
    expect(row.type).toBe("row");
    expect(row.children).toHaveLength(2);
    expect(row.children[0].type).toBe("column");
    expect(row.children[1].children[0].type).toBe("image");
  });

  it("4-Column Features has 4 cards inside cards component", () => {
    const section = MARKETPLACE_SECTIONS.find((s) => s.name === "4-Column Features");
    expect(section).toBeDefined();
    const tree = JSON.parse(section!.tree);
    const cards = tree.children.find((c: any) => c.type === "cards");
    expect(cards).toBeDefined();
    expect(cards.children).toHaveLength(4);
    expect(cards.props.columns).toBe(4);
  });

  it("Newsletter CTA has gradient background", () => {
    const section = MARKETPLACE_SECTIONS.find((s) => s.name === "Newsletter CTA");
    expect(section).toBeDefined();
    const tree = JSON.parse(section!.tree);
    const inner = tree.children[0];
    expect(inner.styles.backgroundGradient).toBeDefined();
    expect(inner.styles.backgroundGradient.type).toBe("linear");
    expect(inner.styles.backgroundGradient.stops).toHaveLength(2);
  });

  it("Simple Footer has divider and copyright", () => {
    const section = MARKETPLACE_SECTIONS.find((s) => s.name === "Simple Footer");
    expect(section).toBeDefined();
    const tree = JSON.parse(section!.tree);
    const divider = tree.children.find((c: any) => c.type === "divider");
    expect(divider).toBeDefined();
    const copyright = tree.children.find((c: any) => c.type === "text" && c.props.content?.includes("©"));
    expect(copyright).toBeDefined();
  });
});
