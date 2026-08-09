import { describe, it, expect, beforeEach } from "vitest";
import {
  mockAddComment,
  mockDeleteComment,
  mockFetchComments,
  mockGetComment,
  mockUpdateComment,
} from "@/lib/mock-comments";
import { isMockId } from "@/lib/utils";

beforeEach(() => {
  localStorage.clear();
});

describe("isMockId", () => {
  it("detects mock string ids and real UUIDs", () => {
    expect(isMockId("post-3")).toBe(true);
    expect(isMockId("book-1")).toBe(true);
    expect(isMockId("mock-c-123")).toBe(true);
    expect(isMockId("")).toBe(true);
    expect(isMockId(null)).toBe(true);
    expect(isMockId(undefined)).toBe(true);
    expect(isMockId("123e4567-e89b-12d3-a456-426614174000")).toBe(false);
  });
});

describe("mock comments store", () => {
  it("adds and fetches comments per post", () => {
    const c = mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "Lovely reflection",
    });
    expect(c.id).toMatch(/^mock-c-/);
    expect(c.user_name).toBe("Maya");

    const list = mockFetchComments("post-3");
    expect(list).toHaveLength(1);
    expect(list[0].comment_text).toBe("Lovely reflection");
    expect(mockFetchComments("post-9")).toHaveLength(0);
  });

  it("supports threaded replies via parent_id", () => {
    const root = mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "Root",
    });
    const reply = mockAddComment({
      post_id: "post-3",
      user_id: "demo-admin",
      user_name: "Admin",
      comment_text: "Reply",
      parent_id: root.id,
    });
    const list = mockFetchComments("post-3");
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.id === reply.id)?.parent_id).toBe(root.id);
  });

  it("gets a comment by id", () => {
    const c = mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "Hi",
    });
    expect(mockGetComment(c.id)?.comment_text).toBe("Hi");
    expect(mockGetComment("nope")).toBeNull();
  });

  it("updates a comment and its updated_at", () => {
    const c = mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "v1",
    });
    const updated = mockUpdateComment(c.id, "v2");
    expect(updated.comment_text).toBe("v2");
    expect(updated.updated_at >= c.updated_at).toBe(true);
    expect(mockFetchComments("post-3")[0].comment_text).toBe("v2");
  });

  it("throws when updating a missing comment", () => {
    expect(() => mockUpdateComment("ghost", "x")).toThrow("Comment not found");
  });

  it("deletes a comment", () => {
    const c = mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "bye",
    });
    mockDeleteComment(c.id);
    expect(mockFetchComments("post-3")).toHaveLength(0);
  });

  it("persists to localStorage", () => {
    mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "persisted",
    });
    expect(localStorage.getItem("sabbe-satta-mock-comments")).toContain("persisted");
  });
});

describe("fetchComments read path (comments.ts)", () => {
  it("routes mock post ids to the mock store without touching the backend", async () => {
    mockAddComment({
      post_id: "post-3",
      user_id: "demo-user",
      user_name: "Maya",
      comment_text: "read-path test",
    });
    const { fetchComments } = await import("@/lib/comments");
    const list = await fetchComments("post-3");
    expect(list).toHaveLength(1);
    expect(list[0].comment_text).toBe("read-path test");
  });
});
