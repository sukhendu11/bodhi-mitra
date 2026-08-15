/**
 * Per-content SEO contract (2026-08-15).
 *
 * Posts/books gained optional `seo_title`/`seo_description` (admin-editable
 * via the Refine admin) and the detail routes prefer them over derived
 * values. These tests pin the data side: which mock rows carry the overrides
 * and that rows WITHOUT them fall back (fields absent).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchPostBySlug } from "@/lib/posts";
import { fetchBookBySlug } from "@/lib/books";
import { setMockModeOverride } from "@/lib/data-source";

beforeEach(() => {
  setMockModeOverride(true);
});

describe("posts — per-content SEO", () => {
  it("exposes seo_title/seo_description for posts that define them", async () => {
    const post = await fetchPostBySlug("the-art-of-sitting-still");
    expect(post).not.toBeNull();
    expect(post?.seo_title).toMatch(/Sitting Still/);
    expect(post?.seo_description).toMatch(/meditation/i);
  });

  it("leaves seo fields undefined for posts without overrides (fallback to title/excerpt)", async () => {
    const post = await fetchPostBySlug("breath-as-anchoring");
    expect(post).not.toBeNull();
    expect(post?.seo_title).toBeUndefined();
    expect(post?.seo_description).toBeUndefined();
  });
});

describe("books — per-content SEO", () => {
  it("exposes a seo_title override for books that define one", async () => {
    const book = await fetchBookBySlug("the-heart-of-meditation");
    expect(book).not.toBeNull();
    expect(book?.seo_title).toMatch(/Practice Guide/);
    // The description already prefers meta_description_en (existing contract).
    expect(book?.meta_description_en).toBeTruthy();
  });
});
