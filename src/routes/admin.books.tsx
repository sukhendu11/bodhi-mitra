import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllBooks,
  deleteBook,
  getBookStats,
  createBook,
  updateBook,
  type Book,
  type BookInput,
  type BookStatus,
  slugifyBook,
} from "@/lib/books";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  DollarSign,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/books")({
  component: AdminBooksPage,
});

function AdminBooksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | BookStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;

  // Form state
  const [form, setForm] = useState<BookInput>({
    slug: "",
    title_en: "",
    title_bn: "",
    author_name: "",
    description_en: "",
    description_bn: "",
    cover_image: "",
    pdf_url: "",
    pdf_file_size: 0,
    price: 0,
    is_free: true,
    pages: 0,
    isbn: "",
    status: "draft",
    featured: false,
    tags: [],
    category: "general",
    meta_description_en: "",
    meta_description_bn: "",
    sort_order: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-books", page, filter],
    queryFn: () =>
      fetchAllBooks(page, pageSize, {
        status: filter === "all" ? undefined : filter,
        search: search || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["book-stats"],
    queryFn: getBookStats,
    staleTime: 30_000,
  });

  const books = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["book-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-books"] });
      toast.success("Book created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BookInput> }) => updateBook(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["book-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-books"] });
      toast.success("Book updated");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["book-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-books"] });
      toast.success("Book deleted");
      setDeletingId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({
      slug: "", title_en: "", title_bn: "", author_name: "",
      description_en: "", description_bn: "", cover_image: "",
      pdf_url: "", pdf_file_size: 0, price: 0, is_free: true,
      pages: 0, isbn: "", status: "draft", featured: false,
      tags: [], category: "general", meta_description_en: "",
      meta_description_bn: "", sort_order: 0,
    });
  };

  const handleEdit = (book: Book) => {
    setForm({
      slug: book.slug,
      title_en: book.title_en,
      title_bn: book.title_bn,
      author_name: book.author_name,
      description_en: book.description_en,
      description_bn: book.description_bn,
      cover_image: book.cover_image,
      pdf_url: book.pdf_url,
      pdf_file_size: book.pdf_file_size,
      price: book.price,
      is_free: book.is_free,
      pages: book.pages,
      isbn: book.isbn,
      status: book.status,
      featured: book.featured,
      tags: book.tags,
      category: book.category,
      meta_description_en: book.meta_description_en,
      meta_description_bn: book.meta_description_bn,
      sort_order: book.sort_order,
    });
    setEditingId(book.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title_en.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) form.slug = slugifyBook(form.title_en);

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleImageUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `books/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("book-covers").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
    });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("book-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image: pub.publicUrl }));
  };

  const handlePdfUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
    const path = `books/pdfs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("book-covers").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/pdf",
    });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("book-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, pdf_url: pub.publicUrl, pdf_file_size: file.size }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Books</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your digital book collection
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Book
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard icon={BookOpen} label="Total" value={stats.total} color="blue" />
          <StatCard icon={CheckCircle} label="Published" value={stats.published} color="green" />
          <StatCard icon={Edit3} label="Drafts" value={stats.draft} color="amber" />
          <StatCard icon={XCircle} label="Archived" value={stats.archived} color="slate" />
          <StatCard icon={DollarSign} label="Free" value={stats.free} color="purple" />
        </div>
      )}

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1">
          {(["all", "published", "draft", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search books…"
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
      </div>

      {/* Book grid (Shopify-style) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No books found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden hover:border-foreground/30 hover:shadow-sm transition-all"
            >
              {/* Cover */}
              <div className="aspect-[3/4] bg-secondary/20 flex items-center justify-center overflow-hidden">
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title_en}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <BookOpen className="h-16 w-16 text-muted-foreground/20" />
                )}

                {/* Status badge */}
                <span
                  className={`absolute top-3 left-3 text-[0.5rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border ${
                    book.status === "published"
                      ? "bg-green-50 text-green-700 border-green-300/50 dark:bg-green-950/30 dark:text-green-400"
                      : book.status === "draft"
                        ? "bg-amber-50 text-amber-700 border-amber-300/50 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-slate-50 text-slate-700 border-slate-300/50 dark:bg-slate-950/30 dark:text-slate-400"
                  }`}
                >
                  {book.status}
                </span>

                {/* Price badge */}
                <span className="absolute top-3 right-3 text-[0.55rem] font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/60">
                  {book.is_free ? (
                    <span className="text-green-600 dark:text-green-400">Free</span>
                  ) : (
                    <span>${book.price.toFixed(2)}</span>
                  )}
                </span>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {book.status === "published" && (
                    <Link to="/books" className="p-2 rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white transition-colors">
                      <Eye className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => handleEdit(book)}
                    className="p-2 rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(book.id)}
                    className="p-2 rounded-full bg-white/90 text-destructive shadow-sm hover:bg-white transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-xs font-medium line-clamp-1">{book.title_en}</p>
                {book.author_name && (
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5">{book.author_name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {book.is_free ? (
                    <span className="text-[0.5rem] font-medium text-green-600 dark:text-green-400">Free</span>
                  ) : (
                    <span className="text-[0.5rem] font-medium">${book.price.toFixed(2)}</span>
                  )}
                  {book.pages > 0 && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[0.5rem] text-muted-foreground">{book.pages} pages</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">
              ← Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Book form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="min-h-screen flex items-start justify-center p-4 pt-12">
            <div
              className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-border/60">
                <h3 className="text-sm font-semibold">{editingId ? "Edit Book" : "Add New Book"}</h3>
              </div>
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Title (EN/BN) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (English)</label>
                    <Input value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} placeholder="Book title" />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (বাংলা)</label>
                    <Input value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} placeholder="বইয়ের শিরোনাম" />
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="book-slug"
                    onBlur={() => { if (!form.slug.trim() && form.title_en.trim()) setForm((f) => ({ ...f, slug: slugifyBook(form.title_en) })); }}
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Author</label>
                  <Input value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} placeholder="Author name" />
                </div>

                {/* Description (EN/BN) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Description (EN)</label>
                    <Textarea value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Description (BN)</label>
                    <Textarea value={form.description_bn} onChange={(e) => setForm((f) => ({ ...f, description_bn: e.target.value }))} rows={3} />
                  </div>
                </div>

                {/* Cover image */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Cover Image</label>
                  {form.cover_image ? (
                    <div className="relative w-32 h-44 rounded-lg overflow-hidden border border-border/60 mb-2">
                      <img src={form.cover_image} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm((f) => ({ ...f, cover_image: "" }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input value={form.cover_image} onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))} placeholder="https://…" />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                        <Upload className="h-3 w-3" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                      </label>
                    </div>
                  )}
                </div>

                {/* PDF upload */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">PDF File</label>
                  {form.pdf_url ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-secondary/20">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <a href={form.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-foreground hover:underline flex-1 truncate">
                        {form.pdf_url.split("/").pop()}
                      </a>
                      <button onClick={() => setForm((f) => ({ ...f, pdf_url: "", pdf_file_size: 0 }))}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border/60 hover:border-foreground/30 hover:bg-secondary/20 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload PDF</span>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
                    </label>
                  )}
                </div>

                {/* Metadata row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Pages</label>
                    <Input type="number" min={0} value={form.pages} onChange={(e) => setForm((f) => ({ ...f, pages: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Price ($)</label>
                    <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} disabled={form.is_free} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">ISBN</label>
                    <Input value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} placeholder="978-…" />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_free} onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked, price: e.target.checked ? 0 : f.price }))}
                      className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                    <span className="text-[0.6rem] font-medium">Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                    <span className="text-[0.6rem] font-medium">Featured</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.6rem] font-medium text-muted-foreground">Status:</span>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BookStatus }))}
                      className="text-xs border border-border/60 rounded-lg px-2 py-1 bg-background focus:outline-none">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Category</label>
                  <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="general" />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
                  {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update Book" : "Create Book"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this book? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (deletingId) deleteMutation.mutate(deletingId); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  };
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
        <p className="text-[0.55rem] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
