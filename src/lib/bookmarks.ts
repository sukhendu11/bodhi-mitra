import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export interface BookmarkedPost {
  id: string;
  post_id: string;
  slug: string;
  title_en: string | null;
  title_bn: string | null;
  excerpt_en: string | null;
  excerpt_bn: string | null;
  cover_image: string | null;
  category: string;
  author_name: string;
  created_at: string;
  bookmarked_at: string;
}

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { postId: string };
    const db = supabase as any;

    const existing = await db
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", input.postId)
      .maybeSingle();

    if (existing.data) {
      await db.from("bookmarks").delete().eq("id", existing.data.id);
      return { bookmarked: false };
    }

    await db.from("bookmarks").insert({ user_id: userId, post_id: input.postId });
    return { bookmarked: true };
  });

export const getUserBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const db = supabase as any;

    const { data, error } = await db
      .from("bookmarks")
      .select(`
        id,
        post_id,
        created_at,
        posts!inner(id, slug, title_en, title_bn, excerpt_en, excerpt_bn, cover_image, category, author_name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const results: BookmarkedPost[] = (data ?? []).map((b: any) => ({
      id: b.id,
      post_id: b.post_id,
      slug: b.posts.slug,
      title_en: b.posts.title_en,
      title_bn: b.posts.title_bn,
      excerpt_en: b.posts.excerpt_en,
      excerpt_bn: b.posts.excerpt_bn,
      cover_image: b.posts.cover_image,
      category: b.posts.category,
      author_name: b.posts.author_name,
      created_at: b.posts.created_at,
      bookmarked_at: b.created_at,
    }));

    return results;
  });

export const getBookmarkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { postId: string };
    const db = supabase as any;

    const { data: existing } = await db
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", input.postId)
      .maybeSingle();

    return { bookmarked: !!existing };
  });
