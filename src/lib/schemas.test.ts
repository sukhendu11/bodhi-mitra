import { describe, it, expect } from "vitest";
import {
  postSchema,
  pageSchema,
  bookSchema,
  videoSchema,
  navItemSchema,
  categorySchema,
  tagSchema,
} from "./schemas";

/* ─── Post Schema ───────────────────────────────────────────────── */

describe("postSchema", () => {
  const validPost = {
    title_en: "Test Post",
    title_bn: "টেস্ট পোস্ট",
    content_en: "Content here",
    content_bn: "কন্টেন্ট এখানে",
    slug: "test-post",
    category: "Wisdom" as const,
    status: "draft" as const,
  };

  it("validates a correct post", () => {
    const result = postSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it("rejects missing English title", () => {
    const result = postSchema.safeParse({ ...validPost, title_en: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = postSchema.safeParse({ ...validPost, category: "Invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format", () => {
    const result = postSchema.safeParse({ ...validPost, slug: "UPPERCASE" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional fields", () => {
    const result = postSchema.parse(validPost);
    expect(result.tags).toEqual([]);
    expect(result.excerpt_en).toBe("");
    expect(result.cover_image).toBe("");
  });
});

/* ─── Page Schema ───────────────────────────────────────────────── */

describe("pageSchema", () => {
  const validPage = {
    slug: "about",
    title_en: "About",
    title_bn: "পরিচিতি",
  };

  it("validates a correct page", () => {
    const result = pageSchema.safeParse(validPage);
    expect(result.success).toBe(true);
  });

  it("rejects missing slug", () => {
    const result = pageSchema.safeParse({ ...validPage, slug: "" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for booleans and numbers", () => {
    const result = pageSchema.parse(validPage);
    expect(result.visible).toBe(true);
    expect(result.sort_order).toBe(0);
  });
});

/* ─── Book Schema ───────────────────────────────────────────────── */

describe("bookSchema", () => {
  const validBook = {
    slug: "my-book",
    title_en: "My Book",
    title_bn: "আমার বই",
  };

  it("validates a correct book", () => {
    const result = bookSchema.safeParse(validBook);
    expect(result.success).toBe(true);
  });

  it("defaults is_free to true and status to draft", () => {
    const result = bookSchema.parse(validBook);
    expect(result.is_free).toBe(true);
    expect(result.status).toBe("draft");
    expect(result.price).toBe(0);
  });

  it("rejects invalid status", () => {
    const result = bookSchema.safeParse({ ...validBook, status: "unknown" });
    expect(result.success).toBe(false);
  });
});

/* ─── Video Schema ──────────────────────────────────────────────── */

describe("videoSchema", () => {
  const validVideo = {
    title: "My Video",
    youtube_url: "https://youtube.com/watch?v=abc123",
  };

  it("validates a correct video", () => {
    const result = videoSchema.safeParse(validVideo);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = videoSchema.safeParse({ youtube_url: "https://youtube.com/watch?v=abc123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid YouTube URL", () => {
    const result = videoSchema.safeParse({ title: "Test", youtube_url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("defaults status to draft", () => {
    const result = videoSchema.parse(validVideo);
    expect(result.status).toBe("draft");
  });
});

/* ─── Nav Item Schema ───────────────────────────────────────────── */

describe("navItemSchema", () => {
  const base = {
    type: "internal" as const,
    label_en: "Home",
    label_bn: "হোম",
    slug: "/",
  };

  it("validates a correct internal nav item", () => {
    const result = navItemSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects external nav item without URL", () => {
    const result = navItemSchema.safeParse({
      ...base,
      type: "external",
      url: "",
      slug: "",
    });
    expect(result.success).toBe(false);
  });

  it("defaults location to header", () => {
    const result = navItemSchema.parse(base);
    expect(result.location).toBe("header");
  });
});

/* ─── Category Schema ───────────────────────────────────────────── */

describe("categorySchema", () => {
  const valid = { slug: "buddhist-psychology", name_en: "Buddhist Psychology" };

  it("validates a correct category", () => {
    const result = categorySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing English name", () => {
    const result = categorySchema.safeParse({ slug: "test", name_en: "" });
    expect(result.success).toBe(false);
  });

  it("defaults color and visibility", () => {
    const result = categorySchema.parse(valid);
    expect(result.color).toBe("#d35400");
    expect(result.visible).toBe(true);
  });
});

/* ─── Tag Schema ────────────────────────────────────────────────── */

describe("tagSchema", () => {
  const valid = { slug: "mindfulness", name_en: "Mindfulness" };

  it("validates a correct tag", () => {
    const result = tagSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("defaults color", () => {
    const result = tagSchema.parse(valid);
    expect(result.color).toBe("#666");
  });
});
