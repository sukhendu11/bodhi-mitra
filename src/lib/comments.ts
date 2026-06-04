import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function addComment(input: {
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  parent_id?: string | null;
}): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert(input as never)
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateComment(id: string, comment_text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .update({ comment_text, updated_at: new Date().toISOString() } as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Comment;
}
