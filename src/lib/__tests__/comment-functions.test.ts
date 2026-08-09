import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mock TanStack Start (server functions need runtime context) ─── */

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: any = (args: any) => builder._handler(args);
    builder.method = () => builder;
    builder.middleware = () => builder;
    builder.handler = (handlerFn: any) => {
      builder._handler = handlerFn;
      return builder;
    };
    builder.validator = () => builder;
    return builder;
  },
  // mock-auth.ts uses createMiddleware().server(...) — provide a stub
  createMiddleware: () => ({ server: () => ({}) }),
}));

/* ─── Mock the Supabase client singleton (not exercised in mock mode) ── */

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

beforeEach(() => {
  localStorage.clear();
});

const { addCommentFn, updateCommentFn, deleteCommentFn } = (await import(
  "../comment-functions"
)) as any;

describe("addCommentFn mock path", () => {
  it("stores a comment on a mock post with mock auth (no Supabase)", async () => {
    const result = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "Beautiful article",
        userId: "demo-user",
      },
    });
    expect(result.post_id).toBe("post-3");
    expect(result.user_id).toBe("demo-user");
    expect(result.parent_id).toBeNull();
  });

  it("routes to the mock store when a real user comments on a mock post", async () => {
    const result = await addCommentFn({
      context: { supabase: {}, userId: "real-uuid-1234" },
      data: {
        post_id: "post-3",
        user_name: "Real User",
        comment_text: "Hello from a real account",
        parent_id: null,
      },
    });
    expect(result.user_id).toBe("real-uuid-1234");
  });

  it("still validates comment length", async () => {
    await expect(
      addCommentFn({
        context: { supabase: null, userId: null },
        data: { post_id: "post-3", user_name: "X", comment_text: "" },
      }),
    ).rejects.toThrow("Comment text is required");
  });
});

describe("updateCommentFn mock path", () => {
  it("allows the author to edit their own mock comment", async () => {
    const added = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "v1",
        userId: "demo-user",
      },
    });
    const updated = await updateCommentFn({
      context: { supabase: null, userId: null },
      data: { id: added.id, comment_text: "v2", userId: "demo-user" },
    });
    expect(updated.comment_text).toBe("v2");
  });

  it("rejects editing someone else's mock comment", async () => {
    const added = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "mine",
        userId: "demo-user",
      },
    });
    await expect(
      updateCommentFn({
        context: { supabase: null, userId: null },
        data: { id: added.id, comment_text: "hacked", userId: "someone-else" },
      }),
    ).rejects.toThrow("You can only edit your own comments");
  });
});

describe("deleteCommentFn mock path", () => {
  it("allows the author to delete their own mock comment", async () => {
    const added = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "delete me",
        userId: "demo-user",
      },
    });
    const result = await deleteCommentFn({
      context: { supabase: null, userId: null },
      data: { id: added.id, userId: "demo-user" },
    });
    expect(result).toEqual({ success: true });
  });

  it("lets the demo admin delete any comment", async () => {
    const added = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "admin will remove this",
        userId: "demo-user",
      },
    });
    const result = await deleteCommentFn({
      context: { supabase: null, userId: null },
      data: { id: added.id, userId: "demo-admin" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects deleting someone else's mock comment (non-admin)", async () => {
    const added = await addCommentFn({
      context: { supabase: null, userId: null },
      data: {
        post_id: "post-3",
        user_name: "Demo Reader",
        comment_text: "mine",
        userId: "demo-user",
      },
    });
    await expect(
      deleteCommentFn({
        context: { supabase: null, userId: null },
        data: { id: added.id, userId: "intruder" },
      }),
    ).rejects.toThrow("You don't have permission to delete this comment");
  });
});
