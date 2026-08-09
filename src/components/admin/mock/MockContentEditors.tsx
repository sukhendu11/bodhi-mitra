/**
 * Mock admin content CRUD — M5 (ROADMAP.md E5.2).
 *
 * Editor dialogs for books / posts / videos against the mock CMS store
 * (`src/lib/mock-cms.ts`). Creating or editing a row updates the
 * localStorage overrides, so public pages reflect the change immediately.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Book } from "@/lib/books";
import type { Post } from "@/lib/posts";
import type { Video } from "@/lib/videos";
import {
  mockNewBook,
  mockNewPost,
  mockNewVideo,
  mockUpsertBook,
  mockUpsertPost,
  mockUpsertVideo,
} from "@/lib/mock-cms";

const POST_CATEGORIES = [
  "Meditation",
  "Mindfulness",
  "Mental Health",
  "Philosophy",
  "Buddhist Psychology",
];

/* ─── Shared field wrapper ──────────────────────────────────────── */

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 transition-shadow";

/* ─── Books editor ──────────────────────────────────────────────── */

export function BookEditorDialog({
  book,
  open,
  onOpenChange,
}: {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState({
    title_en: "",
    title_bn: "",
    author_name: "",
    category: "Meditation",
    price: "0",
    pages: "0",
    cover_image: "",
    pdf_url: "",
    description_en: "",
    is_free: false,
    featured: false,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title_en: book?.title_en ?? "",
      title_bn: book?.title_bn ?? "",
      author_name: book?.author_name ?? "",
      category: book?.category ?? "Meditation",
      price: String(book?.price ?? 0),
      pages: String(book?.pages ?? 0),
      cover_image: book?.cover_image ?? "",
      pdf_url: book?.pdf_url ?? "",
      description_en: book?.description_en ?? "",
      is_free: book?.is_free ?? false,
      featured: book?.featured ?? false,
    });
  }, [open, book]);

  const save = () => {
    if (!form.title_en.trim()) {
      toast.error("Title is required.");
      return;
    }
    const patch = {
      title_en: form.title_en.trim(),
      title_bn: form.title_bn.trim() || form.title_en.trim(),
      author_name: form.author_name.trim(),
      category: form.category,
      price: Math.max(0, Number(form.price) || 0),
      pages: Math.max(0, Number(form.pages) || 0),
      cover_image: form.cover_image.trim(),
      pdf_url: form.pdf_url.trim(),
      description_en: form.description_en.trim(),
      is_free: form.is_free,
      featured: form.featured,
    };
    const next = book
      ? mockUpsertBook({ ...book, ...patch })
      : mockUpsertBook(mockNewBook(patch));
    toast.success(book ? `Book "${next.title_en}" updated.` : `Book "${next.title_en}" created.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{book ? "Edit book" : "New book"}</DialogTitle>
          <DialogDescription>
            Changes apply to the public books grid immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Title (EN)" className="col-span-full">
            <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="h-9" placeholder="The Heart of Meditation" />
          </Field>
          <Field label="Title (BN)">
            <Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} className="h-9" placeholder="ধ্যানের হৃদয়" />
          </Field>
          <Field label="Author">
            <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="h-9" placeholder="Siddhartha Gautama" />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            >
              {POST_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price">
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-9" />
            </Field>
            <Field label="Pages">
              <Input type="number" min={0} value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} className="h-9" />
            </Field>
          </div>
          <Field label="Cover image URL" className="col-span-full">
            <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="h-9" placeholder="https://…" />
          </Field>
          <Field label="PDF URL" className="col-span-full">
            <Input value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} className="h-9" placeholder="/pdfs/example.pdf" />
          </Field>
          <Field label="Description (EN)" className="col-span-full">
            <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} placeholder="A short description of the book." />
          </Field>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} />
              Free
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              Featured on homepage
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{book ? "Save changes" : "Create book"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Posts editor ──────────────────────────────────────────────── */

export function PostEditorDialog({
  post,
  open,
  onOpenChange,
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState({
    title_en: "",
    title_bn: "",
    author_name: "",
    category: "Meditation",
    excerpt_en: "",
    content_en: "",
    cover_image: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title_en: post?.title_en ?? "",
      title_bn: post?.title_bn ?? "",
      author_name: post?.author_name ?? "",
      category: post?.category ?? "Meditation",
      excerpt_en: post?.excerpt_en ?? "",
      content_en: post?.content_en ?? "",
      cover_image: post?.cover_image ?? "",
    });
  }, [open, post]);

  const save = () => {
    if (!form.title_en.trim()) {
      toast.error("Title is required.");
      return;
    }
    const patch = {
      title_en: form.title_en.trim(),
      title_bn: form.title_bn.trim() || form.title_en.trim(),
      author_name: form.author_name.trim(),
      category: form.category,
      excerpt_en: form.excerpt_en.trim() || null,
      content_en: form.content_en.trim() || null,
      cover_image: form.cover_image.trim() || null,
    };
    const next = post
      ? mockUpsertPost({ ...post, ...patch })
      : mockUpsertPost(mockNewPost(patch));
    toast.success(post ? `Post "${next.title_en}" updated.` : `Post "${next.title_en}" created.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{post ? "Edit reflection" : "New reflection"}</DialogTitle>
          <DialogDescription>
            Changes apply to /reflections immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Title (EN)" className="col-span-full">
            <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="h-9" placeholder="The Art of Sitting Still" />
          </Field>
          <Field label="Title (BN)" className="col-span-full">
            <Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} className="h-9" placeholder="স্থির হয়ে বসার শিল্প" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author">
              <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="h-9" placeholder="Ananda" />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
              >
                {POST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Excerpt" className="col-span-full">
            <Textarea value={form.excerpt_en} onChange={(e) => setForm({ ...form, excerpt_en: e.target.value })} rows={2} placeholder="A one-line summary." />
          </Field>
          <Field label="Content (plain text or HTML)" className="col-span-full">
            <Textarea value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} rows={6} placeholder="Write the reflection body…" />
          </Field>
          <Field label="Cover image URL" className="col-span-full">
            <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="h-9" placeholder="https://…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{post ? "Save changes" : "Create reflection"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Videos editor ─────────────────────────────────────────────── */

export function VideoEditorDialog({
  video,
  open,
  onOpenChange,
}: {
  video: Video | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    category: "Meditation",
    duration: "0",
    thumbnail_url: "",
    youtube_url: "",
    description: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: video?.title ?? "",
      category: video?.category ?? "Meditation",
      duration: String(video?.duration ?? 0),
      thumbnail_url: video?.thumbnail_url ?? "",
      youtube_url: video?.youtube_url ?? "",
      description: video?.description ?? "",
    });
  }, [open, video]);

  const save = () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const patch = {
      title: form.title.trim(),
      category: form.category,
      duration: Math.max(0, Number(form.duration) || 0),
      thumbnail_url: form.thumbnail_url.trim(),
      youtube_url: form.youtube_url.trim(),
      description: form.description.trim(),
    };
    const next = video
      ? mockUpsertVideo({ ...video, ...patch })
      : mockUpsertVideo(mockNewVideo(patch));
    toast.success(video ? `Video "${next.title}" updated.` : `Video "${next.title}" created.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{video ? "Edit video" : "New video"}</DialogTitle>
          <DialogDescription>
            Changes apply to the videos hub immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Title" className="col-span-full">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9" placeholder="Morning Mindfulness Meditation (20 min)" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
              >
                <option value="Meditation">Meditation</option>
                <option value="Teachings">Teachings</option>
                <option value="Mindfulness">Mindfulness</option>
              </select>
            </Field>
            <Field label="Duration (seconds)">
              <Input type="number" min={0} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="h-9" />
            </Field>
          </div>
          <Field label="YouTube URL" className="col-span-full">
            <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} className="h-9" placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <Field label="Thumbnail URL" className="col-span-full">
            <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} className="h-9" placeholder="https://…" />
          </Field>
          <Field label="Description" className="col-span-full">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Short description." />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{video ? "Save changes" : "Create video"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
