import { describe, it, expect } from "vitest";
import {
  blocksToText,
  mediaUrl,
  mapStrapiBook,
  MIRRORED_COLUMNS,
  extractStrapiBooks,
} from "./sync-strapi-books.mjs";

const STRAPI_URL = "http://localhost:1337";

const FIXTURE = {
  slug: "the-heart-of-meditation",
  title_en: "The Heart of Meditation",
  title_bn: "ধ্যানের হৃদয়",
  description_en: [
    { type: "heading", level: 2, children: [{ type: "text", text: "A guide" }] },
    { type: "paragraph", children: [{ type: "text", text: "Covers breath awareness." }] },
    {
      type: "list",
      format: "unordered",
      children: [{ type: "list-item", children: [{ type: "text", text: "Item A" }] }],
    },
  ],
  cover_image: { url: "/uploads/cover-1.jpg" },
  pdf_file: { url: "/uploads/book-1.pdf", size: 862 },
  price: "1799",
  is_free: false,
  book_status: "published",
  featured: true,
  categories: [{ slug: "meditation" }],
  tags: [{ slug: "mindfulness" }, { name_en: "Buddhism" }],
  sort_order: 3,
  rating: "4.5",
  rating_count: 128,
  seo_description: "A comprehensive guide.",
};

describe("blocksToText", () => {
  it("passes plain strings through untouched", () => {
    expect(blocksToText("plain text")).toBe("plain text");
  });

  it("flattens Strapi v5 blocks with paragraphs, headings and lists", () => {
    const text = blocksToText(FIXTURE.description_en);
    expect(text).toContain("A guide");
    expect(text).toContain("Covers breath awareness.");
    expect(text).toContain("Item A");
    expect(text).toMatch(/^A guide\n\nCovers/);
  });

  it("returns an empty string for null/undefined", () => {
    expect(blocksToText(null)).toBe("");
    expect(blocksToText(undefined)).toBe("");
    expect(blocksToText([])).toBe("");
  });
});

describe("mediaUrl", () => {
  it("absolutizes relative Strapi media paths", () => {
    expect(mediaUrl({ url: "/uploads/x.jpg" }, STRAPI_URL)).toBe(`${STRAPI_URL}/uploads/x.jpg`);
  });

  it("keeps absolute URLs as-is", () => {
    expect(mediaUrl({ url: "https://cdn.example.com/x.jpg" }, STRAPI_URL)).toBe("https://cdn.example.com/x.jpg");
  });

  it("returns '' for missing media", () => {
    expect(mediaUrl(null, STRAPI_URL)).toBe("");
    expect(mediaUrl({}, STRAPI_URL)).toBe("");
  });
});

describe("mapStrapiBook", () => {
  const row = mapStrapiBook(FIXTURE, STRAPI_URL);

  it("maps identity + editorial fields", () => {
    expect(row.slug).toBe("the-heart-of-meditation");
    expect(row.title_en).toBe("The Heart of Meditation");
    expect(row.title_bn).toBe("ধ্যানের হৃদয়");
    expect(row.author_name).toBe("");
    expect(row.description_en).toContain("Covers breath awareness.");
  });

  it("maps commerce-critical fields (AD-027)", () => {
    expect(row.price).toBe(1799);
    expect(row.is_free).toBe(false);
    expect(row.pdf_url).toBe(`${STRAPI_URL}/uploads/book-1.pdf`);
    expect(row.pdf_file_size).toBe(862);
    expect(row.cover_image).toBe(`${STRAPI_URL}/uploads/cover-1.jpg`);
  });

  it("maps status, featured, taxonomy and ratings", () => {
    expect(row.status).toBe("published");
    expect(row.featured).toBe(true);
    expect(row.category).toBe("meditation");
    expect(row.tags).toEqual(["mindfulness", "buddhism"]);
    expect(row.avg_rating).toBe(4.5);
    expect(row.total_ratings).toBe(128);
    expect(row.sort_order).toBe(3);
    expect(row.meta_description_en).toBe("A comprehensive guide.");
  });

  it("omits category when no relation exists (DB default applies on insert)", () => {
    const noCat = mapStrapiBook({ slug: "x", title_en: "X" }, STRAPI_URL);
    expect("category" in noCat).toBe(false);
  });

  it("never touches non-mirrored columns (preserved on conflict)", () => {
    expect("id" in row).toBe(false);
    expect("pages" in row).toBe(false);
    expect("isbn" in row).toBe(false);
    expect("created_at" in row).toBe(false);
  });

  it("defaults free books and drafts", () => {
    const bare = mapStrapiBook({ slug: "y", title_en: "Y" }, STRAPI_URL);
    expect(bare.is_free).toBe(true);
    expect(bare.status).toBe("draft");
    expect(bare.price).toBe(0);
  });
});

describe("MIRRORED_COLUMNS", () => {
  it("includes every column written by mapStrapiBook", () => {
    const row = mapStrapiBook(FIXTURE, STRAPI_URL);
    for (const key of Object.keys(row)) {
      expect(MIRRORED_COLUMNS).toContain(key);
    }
  });

  it("includes the AD-027 commerce-critical fields", () => {
    for (const col of ["slug", "price", "is_free", "cover_image", "pdf_url"]) {
      expect(MIRRORED_COLUMNS).toContain(col);
    }
  });
});

describe("extractStrapiBooks", () => {
  it("unwraps { data: [...] } responses", () => {
    expect(extractStrapiBooks({ data: [{ slug: "a" }] })).toHaveLength(1);
  });

  it("passes raw arrays through", () => {
    expect(extractStrapiBooks([{ slug: "a" }])).toHaveLength(1);
  });

  it("returns [] for empty responses", () => {
    expect(extractStrapiBooks(null)).toEqual([]);
    expect(extractStrapiBooks({})).toEqual([]);
  });
});
