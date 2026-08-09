/**
 * Mock comments store — M4 Community seam (ROADMAP.md).
 *
 * Mock posts use string ids like "post-3" that cannot be written into the
 * Supabase `comments.post_id` UUID column, and the offline demo has no
 * comments backend at all. This store mirrors the `comments` table
 * (threaded via parent_id) with localStorage on the client and an
 * in-memory fallback on the server — same pattern as mock-cart.ts.
 */
import type { Comment } from "@/lib/comments";

const MOCK_COMMENTS_KEY = "sabbe-satta-mock-comments";

interface MockCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

const memoryComments: MockCommentRow[] = [];

function readAll(): MockCommentRow[] {
  if (typeof window === "undefined") return [...memoryComments];
  try {
    return JSON.parse(localStorage.getItem(MOCK_COMMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(rows: MockCommentRow[]) {
  if (typeof window === "undefined") {
    memoryComments.length = 0;
    memoryComments.push(...rows);
    return;
  }
  localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(rows));
}

function generateId() {
  return `mock-c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function mockFetchComments(postId: string): Comment[] {
  return readAll()
    .filter((c) => c.post_id === postId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c) => ({ ...c }));
}

export function mockGetComment(id: string): Comment | null {
  const row = readAll().find((c) => c.id === id);
  return row ? { ...row } : null;
}

export function mockAddComment(input: {
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  parent_id?: string | null;
}): Comment {
  const now = new Date().toISOString();
  const row: MockCommentRow = {
    id: generateId(),
    post_id: input.post_id,
    user_id: input.user_id,
    user_name: input.user_name,
    comment_text: input.comment_text,
    created_at: now,
    updated_at: now,
    parent_id: input.parent_id ?? null,
  };
  const all = readAll();
  all.push(row);
  writeAll(all);
  return { ...row };
}

export function mockUpdateComment(id: string, comment_text: string): Comment {
  const all = readAll();
  const row = all.find((c) => c.id === id);
  if (!row) throw new Error("Comment not found");
  row.comment_text = comment_text;
  row.updated_at = new Date().toISOString();
  writeAll(all);
  return { ...row };
}

export function mockDeleteComment(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

/** Count a user's comments (for the profile stats grid). */
export function mockCountUserComments(userId: string): number {
  return readAll().filter((c) => c.user_id === userId).length;
}
