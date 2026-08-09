import { describe, it, expect, beforeEach } from "vitest";
import {
  mockGetBookmarkStatus,
  mockToggleBookmark,
  mockGetUserBookmarks,
} from "@/lib/mock-bookmarks";

const STORE_KEY = "sabbe-satta-mock-bookmarks";

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
});

describe("mockToggleBookmark", () => {
  it("adds a bookmark", async () => {
    const result = await mockToggleBookmark("user-1", "book-2", "book");
    expect(result).toEqual({ bookmarked: true });
    expect(await mockGetBookmarkStatus("user-1", "book-2", "book")).toEqual({
      bookmarked: true,
    });
  });

  it("removes a bookmark on second toggle", async () => {
    await mockToggleBookmark("user-1", "book-2", "book");
    const result = await mockToggleBookmark("user-1", "book-2", "book");
    expect(result).toEqual({ bookmarked: false });
    expect(await mockGetBookmarkStatus("user-1", "book-2", "book")).toEqual({
      bookmarked: false,
    });
  });

  it("scopes bookmarks per user", async () => {
    await mockToggleBookmark("user-1", "book-2", "book");
    expect(await mockGetBookmarkStatus("user-2", "book-2", "book")).toEqual({
      bookmarked: false,
    });
  });

  it("tracks posts and books independently", async () => {
    await mockToggleBookmark("user-1", "post-3", "post");
    expect(await mockGetBookmarkStatus("user-1", "post-3", "post")).toEqual({
      bookmarked: true,
    });
    expect(await mockGetBookmarkStatus("user-1", "post-3", "book")).toEqual({
      bookmarked: false,
    });
  });
});

describe("mockGetUserBookmarks (enriched)", () => {
  it("returns an empty list for users with no bookmarks", async () => {
    expect(await mockGetUserBookmarks("user-1")).toEqual([]);
  });

  it("enriches book bookmarks with cover/title/slug", async () => {
    await mockToggleBookmark("user-1", "book-2", "book");
    const items = await mockGetUserBookmarks("user-1");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      resourceId: "book-2",
      resourceType: "book",
      slug: "walking-the-middle-way",
      titleEn: "Walking the Middle Way",
    });
    expect(items[0].coverImage).toBeTruthy();
  });

  it("enriches post bookmarks with category/excerpt", async () => {
    await mockToggleBookmark("user-1", "post-3", "post");
    const items = await mockGetUserBookmarks("user-1");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      resourceId: "post-3",
      resourceType: "post",
      slug: "mindfulness-in-the-morning",
      titleEn: "Mindfulness in the Morning",
      category: "Mindfulness",
    });
  });

  it("sorts newest bookmarks first and mixes types", async () => {
    await mockToggleBookmark("user-1", "book-2", "book");
    await mockToggleBookmark("user-1", "post-3", "post");
    const items = await mockGetUserBookmarks("user-1");
    expect(items).toHaveLength(2);
    expect(items[0].resourceType).toBe("post"); // added last → newest first
    expect(items[1].resourceType).toBe("book");
  });
});
