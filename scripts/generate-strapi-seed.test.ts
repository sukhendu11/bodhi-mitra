import { describe, it, expect } from "vitest";
import {
  slugify,
  textToBlocks,
  categoryNameToSlug,
  mapMockBook,
  mapMockPost,
  mapMockVideo,
  mapMockPage,
  mapMockNav,
  deriveSiteSettings,
  buildBundle,
} from "./generate-strapi-seed";

describe("slugify", () => {
  it("lowercases and kebab-cases", () => {
    expect(slugify("The Four Noble Truths")).toBe("the-four-noble-truths");
  });
  it("handles punctuation and dashes", () => {
    expect(slugify("Loving-Kindness (Metta) — A Guide")).toBe("loving-kindness-metta-a-guide");
  });
  it("caps length", () => {
    expect(slugify("x".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("textToBlocks", () => {
  it("converts plain text into Strapi v5 paragraph blocks", () => {
    const blocks = textToBlocks("First paragraph.\n\nSecond paragraph.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "paragraph", children: [{ type: "text", text: "First paragraph." }] });
    expect(blocks[1].children[0].text).toBe("Second paragraph.");
  });
  it("returns [] for empty input", () => {
    expect(textToBlocks(null)).toEqual([]);
    expect(textToBlocks("")).toEqual([]);
  });
});

describe("categoryNameToSlug", () => {
  it("maps known display names to slugs", () => {
    expect(categoryNameToSlug("Mental Health")).toBe("mental-health");
    expect(categoryNameToSlug("Buddhist Psychology")).toBe("buddhist-psychology");
  });
  it("falls back to slugify", () => {
    expect(categoryNameToSlug("New Category")).toBe("new-category");
  });
});

describe("mapMockBook", () => {
  const book = mapMockBook({
    slug: "walking-the-middle-way",
    title_en: "Walking the Middle Way",
    title_bn: "মধ্যম পথে হাঁটা",
    description_en: "Para one.\n\nPara two.",
    description_bn: "এক।",
    author_name: "Ananda Bhikkhu",
    price: 1799,
    is_free: false,
    status: "published",
    featured: true,
    sort_order: 1,
    avg_rating: 4.8,
    total_ratings: 95,
    category: "Philosophy",
    tags: ["philosophy", "buddhism", "Wisdom"],
    meta_description_en: "Practical wisdom.",
    cover_image: "https://images.unsplash.com/x",
    pdf_url: "/pdfs/walking-the-middle-way.pdf",
  });

  it("maps commerce fields with the BDT currency standard", () => {
    expect(book.price).toBe(1799);
    expect(book.currency).toBe("BDT");
    expect(book.is_free).toBe(false);
  });

  it("maps editorial + taxonomy fields", () => {
    expect(book.title_en).toBe("Walking the Middle Way");
    expect(book.author_name).toBe("Ananda Bhikkhu");
    expect(book.book_status).toBe("published");
    expect(book.categories).toEqual(["philosophy"]);
    expect(book.tags).toEqual(["philosophy", "buddhism", "wisdom"]);
    expect(book.description_en).toHaveLength(2);
  });

  it("keeps import reference metadata for the importer", () => {
    expect(book.pdf_local_path).toBe("/pdfs/walking-the-middle-way.pdf");
    expect(book.cover_image_url).toBe("https://images.unsplash.com/x");
  });
});

describe("mapMockPost", () => {
  it("maps content to blocks and category name to slug", () => {
    const post = mapMockPost(
      {
        slug: "the-art-of-sitting-still",
        title_en: "The Art of Sitting Still",
        content_en: "Line one.\n\nLine two.",
        content_bn: null,
        category: "Meditation",
        author_name: "Ananda",
        excerpt_en: "An excerpt.",
      },
      0,
    );
    expect(post.content_en).toHaveLength(2);
    expect(post.categories).toEqual(["meditation"]);
    expect(post.author).toBe("Ananda");
    expect(post.reading_time).toBeGreaterThanOrEqual(1);
  });
});

describe("mapMockVideo", () => {
  it("derives a slug from the title and keeps the youtube url as embed_url", () => {
    const video = mapMockVideo(
      { title: "Understanding Impermanence", title_en: "Understanding Impermanence", youtube_url: "https://www.youtube.com/watch?v=AEQtqW1RAm0", duration: 2400, sort_order: 7 },
      7,
    );
    expect(video.slug).toBe("understanding-impermanence");
    expect(video.embed_url).toBe("https://www.youtube.com/watch?v=AEQtqW1RAm0");
    expect(video.duration).toBe(2400);
  });
});

describe("mapMockPage", () => {
  it("combines header + body into blocks", () => {
    const page = mapMockPage({
      slug: "about",
      title_en: "About",
      header_en: "Where ancient wisdom meets modern psychology.",
      body_en: "A sanctuary for practice.",
      visible: true,
      sort_order: 0,
      meta_description_en: "About Sabbe Satta.",
    });
    expect(page.content_en).toHaveLength(2);
    expect(page.seo_description).toBe("About Sabbe Satta.");
  });
});

describe("mapMockNav", () => {
  it("produces flat internal header items", () => {
    const nav = mapMockNav({ label_en: "Reflections", label_bn: "প্রতিফলন", url: "/reflections", sort_order: 1 });
    expect(nav.title_en).toBe("Reflections");
    expect(nav.type).toBe("internal");
    expect(nav.location).toBe("header");
  });
});

describe("deriveSiteSettings", () => {
  it("derives top-level fields from the config and falls back to Sabbe Satta", () => {
    const s = deriveSiteSettings({ branding: { site_name_en: "Sabbe Satta", site_name_bn: "সব্বে সত্তা" } });
    expect(s.site_name).toBe("Sabbe Satta");
    expect(s.site_name_bn).toBe("সব্বে সত্তা");
    expect(s.accent_color).toBe("#92400E");
    const fallback = deriveSiteSettings({});
    expect(fallback.site_name).toBe("Sabbe Satta");
  });
});

describe("buildBundle", () => {
  const bundle = buildBundle();

  it("contains all sections with the expected current mock counts", () => {
    expect(bundle.categories).toHaveLength(5);
    expect(bundle.navigation).toHaveLength(5);
    expect(bundle.pages).toHaveLength(4);
    expect(bundle.posts.length).toBeGreaterThanOrEqual(20);
    expect(bundle.books.length).toBeGreaterThanOrEqual(8);
    expect(bundle.videos.length).toBeGreaterThanOrEqual(5);
    expect(bundle.tags.length).toBeGreaterThan(0);
  });

  it("has unique slugs for slug-keyed sections", () => {
    for (const key of ["categories", "posts", "books", "videos", "pages"]) {
      const slugs = bundle[key].map((x) => x.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("includes the rebranded site settings config", () => {
    expect(bundle.siteSettings.site_name).toBe("Sabbe Satta");
    expect(bundle.siteSettings.config.branding.site_name_en).toBe("Sabbe Satta");
  });

  it("all books carry the BDT currency", () => {
    for (const b of bundle.books) expect(b.currency).toBe("BDT");
  });
});
