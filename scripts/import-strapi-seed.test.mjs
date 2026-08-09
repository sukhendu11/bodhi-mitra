import { describe, it, expect } from "vitest";
import { validateBundle, bundleStats, CONTENT_KEYS } from "./import-strapi-seed.mjs";

function makeValidBundle() {
  return {
    categories: [{ slug: "meditation" }],
    tags: [{ slug: "mindfulness" }],
    navigation: [{ url: "/" }],
    pages: [{ slug: "about" }],
    posts: [{ slug: "post-1" }],
    books: [{ slug: "book-1" }],
    videos: [{ slug: "video-1" }],
    siteSettings: { site_name: "Sabbe Satta" },
  };
}

describe("validateBundle", () => {
  it("accepts a well-formed bundle", () => {
    expect(validateBundle(makeValidBundle())).toEqual([]);
  });

  it("rejects non-object bundles", () => {
    expect(validateBundle(null).length).toBeGreaterThan(0);
    expect(validateBundle([]).length).toBeGreaterThan(0);
  });

  it("rejects missing sections", () => {
    const b = makeValidBundle();
    delete b.books;
    const errors = validateBundle(b);
    expect(errors).toContain("books must be an array");
  });

  it("rejects duplicate slugs per keyed type", () => {
    const b = makeValidBundle();
    b.books = [{ slug: "dup" }, { slug: "dup" }];
    const errors = validateBundle(b);
    expect(errors.some((e) => e.includes("duplicate slugs"))).toBe(true);
  });

  it("requires siteSettings", () => {
    const b = makeValidBundle();
    delete b.siteSettings;
    expect(validateBundle(b).some((e) => e.includes("siteSettings"))).toBe(true);
  });
});

describe("bundleStats", () => {
  it("counts every section", () => {
    const stats = bundleStats(makeValidBundle());
    expect(stats.posts).toBe(1);
    expect(stats.siteSettings).toBe(1);
    for (const key of CONTENT_KEYS) expect(typeof stats[key]).toBe("number");
  });
});
