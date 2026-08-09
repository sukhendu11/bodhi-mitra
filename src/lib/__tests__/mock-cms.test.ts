import { describe, it, expect, beforeEach } from "vitest";
import {
  mockClearCms,
  mockNewBook,
  mockNewPost,
  mockNewVideo,
  mockUpsertBook,
  mockUpsertPost,
  mockUpsertVideo,
  mockDeleteBook,
  mockDeletePost,
  mockDeleteVideo,
  mockApplyBookOverrides,
  mockApplyPostOverrides,
  mockApplyVideoOverrides,
} from "@/lib/mock-cms";
import {
  mockFetchAllBooks,
  mockFetchAllPosts,
  mockFetchAllVideos,
  mockFetchPublishedBooks,
  mockFetchPublishedVideos,
  mockFetchBookBySlug,
  mockFetchPosts,
  mockFetchPostBySlug,
} from "@/lib/mock-data";
import type { Book } from "@/lib/books";
import type { Post } from "@/lib/posts";
import type { Video } from "@/lib/videos";

describe("mock-cms content store (M5)", () => {
  beforeEach(() => {
    mockClearCms();
  });

  it("create book → appears in mockFetchAllBooks and published grid", () => {
    const book = mockUpsertBook(
      mockNewBook({
        title_en: "Test Book of Peace",
        title_bn: "শান্তির বই",
        author_name: "Buffy",
        price: 999,
        category: "Meditation",
      }),
    );
    expect(book.id).toMatch(/^book-/);

    const all = mockFetchAllBooks();
    expect(all.some((b) => b.id === book.id)).toBe(true);
    expect(all.find((b) => b.id === book.id)?.title_en).toBe("Test Book of Peace");

    const { data } = mockFetchPublishedBooks(1, 100);
    expect(data.some((b) => b.id === book.id)).toBe(true);
    // Slug is derived from the English title
    const bySlug = mockFetchBookBySlug(book.slug);
    expect(bySlug?.title_en).toBe("Test Book of Peace");
  });

  it("edit book → override wins over base fixture", () => {
    const base = mockFetchAllBooks();
    const first = base[0];
    const updated = mockUpsertBook({ ...first, price: 42, featured: true });
    expect(updated.price).toBe(42);

    const after = mockFetchAllBooks().find((b) => b.id === first.id);
    expect(after?.price).toBe(42);
    expect(after?.featured).toBe(true);
    // Untouched fields survive the merge
    expect(after?.title_en).toBe(first.title_en);
  });

  it("delete book → removed from public grid and admin list", () => {
    const base = mockFetchAllBooks();
    const target = base[0];
    mockDeleteBook(target.id);

    expect(mockFetchAllBooks().some((b) => b.id === target.id)).toBe(false);
    const { data } = mockFetchPublishedBooks(1, 100);
    expect(data.some((b) => b.id === target.id)).toBe(false);
  });

  it("create post → appears in posts list and by-slug lookup", () => {
    const post = mockUpsertPost(
      mockNewPost({
        title_en: "A Fresh Reflection on Kindness",
        category: "Mindfulness",
        author_name: "Buffy",
        content_en: "Be kind.",
      }),
    );
    expect(post.id).toMatch(/^post-/);

    const all = mockFetchAllPosts();
    expect(all.some((p) => p.id === post.id)).toBe(true);

    const { data } = mockFetchPosts(undefined, 1, 100);
    expect(data.some((p) => p.id === post.id)).toBe(true);
    expect(mockFetchPostBySlug(post.slug)?.content_en).toBe("Be kind.");
  });

  it("delete post → hidden from list and category counts", () => {
    const all = mockFetchAllPosts();
    const target = all[0];
    mockDeletePost(target.id);
    expect(mockFetchAllPosts().some((p) => p.id === target.id)).toBe(false);
    const { data } = mockFetchPosts(undefined, 1, 100);
    expect(data.some((p) => p.id === target.id)).toBe(false);
  });

  it("create video → appears in admin list and published videos", async () => {
    const video = mockUpsertVideo(
      mockNewVideo({
        title: "Guided Peace Session",
        category: "Meditation",
        duration: 900,
      }),
    );
    expect(video.id).toMatch(/^video-/);
    expect(mockFetchAllVideos().some((v) => v.id === video.id)).toBe(true);

    const { data } = mockFetchPublishedVideos(1, 100);
    expect(data.some((v) => v.id === video.id)).toBe(true);
  });

  it("delete video → removed everywhere", async () => {
    const all = mockFetchAllVideos();
    const target = all[0];
    mockDeleteVideo(target.id);
    expect(mockFetchAllVideos().some((v) => v.id === target.id)).toBe(false);

    const { data } = mockFetchPublishedVideos(1, 100);
    expect(data.some((v) => v.id === target.id)).toBe(false);
  });

  it("apply helpers are pure over the base array (no mutation)", () => {
    const base: Book[] = [
      {
        id: "book-x",
        slug: "x",
        title_en: "X",
        title_bn: "X",
        author_name: "A",
        description_en: "",
        description_bn: "",
        cover_image: "",
        pdf_url: "",
        pdf_file_size: 0,
        price: 0,
        is_free: true,
        pages: 0,
        isbn: "",
        status: "published",
        featured: false,
        tags: [],
        category: "Meditation",
        meta_description_en: "",
        meta_description_bn: "",
        sort_order: 0,
        avg_rating: 0,
        total_ratings: 0,
        created_at: "",
        updated_at: "",
      },
    ];
    const created = mockApplyBookOverrides([...base]);
    expect(created.length).toBe(1);
    mockUpsertBook(mockNewBook({ title_en: "Added" }));
    expect(mockApplyBookOverrides([...base]).length).toBe(2);
  });

  it("post overrides merge into a Post-typed row", () => {
    const base: Post = {
      id: "post-x",
      title: "X",
      content: null,
      excerpt: "E",
      title_en: "X",
      title_bn: "X",
      content_en: null,
      content_bn: null,
      excerpt_en: "E",
      excerpt_bn: "E",
      slug: "x",
      cover_image: null,
      category: "Meditation",
      author_name: "A",
      author_image: null,
      status: "published",
      tags: [],
      created_at: "",
    };
    mockUpsertPost({ ...base, title_en: "Renamed" });
    const out = mockApplyPostOverrides([base]);
    expect(out.find((p) => p.id === "post-x")?.title_en).toBe("Renamed");
  });

  it("video overrides merge into a Video-typed row", () => {
    const base: Video = {
      id: "video-x",
      title: "V",
      description: "",
      thumbnail_url: "",
      youtube_url: "",
      duration: 60,
      category: "Meditation",
      sort_order: 0,
      status: "published",
      created_at: "",
      updated_at: "",
    };
    mockUpsertVideo({ ...base, title: "Renamed Video" });
    const out = mockApplyVideoOverrides([base]);
    expect(out.find((v) => v.id === "video-x")?.title).toBe("Renamed Video");
  });
});
