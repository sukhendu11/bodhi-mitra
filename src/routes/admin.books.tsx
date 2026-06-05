import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
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
import { bookSchema, type BookFormValues } from "@/lib/schemas";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { DataTable, StatusBadge, DateCell } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { FIELD_LABEL, BilingualField, FormFieldRow } from "@/components/admin/bilingual-field";
import { FormActions } from "@/components/admin/form-actions";

export const Route = createFileRoute("/admin/books")({
  component: AdminBooksPage,
});

function AdminBooksPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | BookStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;

  const form = useForm<BookFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bookSchema) as any,
    defaultValues: {
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
    },
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

  const columnHelper = createColumnHelper<Book>();

  const bookColumns = useMemo(
    () => [
      columnHelper.accessor("title_en", {
        header: "Title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            {row.original.cover_image ? (
              <img src={row.original.cover_image} alt="" className="w-8 h-10 rounded object-cover border border-border/40 shrink-0" />
            ) : (
              <div className="w-8 h-10 rounded bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm font-medium line-clamp-1">{row.original.title_en}</span>
              {row.original.title_bn && (
                <span className="text-[0.6rem] text-muted-foreground block">{row.original.title_bn}</span>
              )}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("author_name", {
        header: "Author",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("is_free", {
        header: "Price",
        enableSorting: true,
        cell: ({ row }) => (
          row.original.is_free
            ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">Free</span>
            : <span className="text-xs font-medium">${row.original.price.toFixed(2)}</span>
        ),
      }),
      columnHelper.accessor("pages", {
        header: "Pages",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        enableSorting: true,
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.status === "published" && (
              <Link to="/books" className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="View">
                <Eye className="h-3.5 w-3.5" />
              </Link>
            )}
            <button onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setDeletingId(row.original.id)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      }),
    ],
    [],
  );

  const createMutation = useMutation({
    mutationFn: (input: BookInput) => createBook(input),
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
    form.reset({
      slug: "", title_en: "", title_bn: "", author_name: "",
      description_en: "", description_bn: "", cover_image: "",
      pdf_url: "", pdf_file_size: 0, price: 0, is_free: true,
      pages: 0, isbn: "", status: "draft", featured: false,
      tags: [], category: "general", meta_description_en: "",
      meta_description_bn: "", sort_order: 0,
    });
  };

  const handleEdit = (book: Book) => {
    form.reset({
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
    form.handleSubmit(
      (values) => {
        const input: BookInput = {
          ...values,
          ...(values.is_free ? { price: 0 } : {}),
        };
        if (!values.slug.trim()) input.slug = slugifyBook(values.title_en);

        if (editingId) {
          updateMutation.mutate({ id: editingId, input });
        } else {
          createMutation.mutate(input);
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
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
    form.setValue("cover_image", pub.publicUrl);
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
    form.setValue("pdf_url", pub.publicUrl);
    form.setValue("pdf_file_size", file.size);
  };

  const isFree = form.watch("is_free");
  const coverImage = form.watch("cover_image");
  const pdfUrl = form.watch("pdf_url");
  const statusVal = form.watch("status");

  // Unsaved changes warning (only when form modal is open)
  useUnsavedChanges(showForm && form.formState.isDirty);

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

      {/* Filters */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 w-fit">
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

      {/* Book table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No books found.</p>
        </div>
      ) : (
        <DataTable
          columns={bookColumns}
          data={books}
          searchPlaceholder="Search books…"
          pageSize={15}
        />
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
              <Form {...form}>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                  <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Title (EN/BN) */}
                    <BilingualField
                      control={form.control}
                      nameEn="title_en"
                      nameBn="title_bn"
                      labelEn="Title (English)"
                      labelBn="Title (বাংলা)"
                      placeholderEn="Book title"
                      placeholderBn="বইয়ের শিরোনাম"
                    />

                    {/* Slug */}
                    <FormField control={form.control} name="slug" render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className={FIELD_LABEL}>Slug</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="book-slug"
                            onBlur={() => {
                              if (!field.value?.trim() && form.watch("title_en")?.trim()) {
                                form.setValue("slug", slugifyBook(form.watch("title_en")));
                              }
                            }}
                          />
                        </FormControl>
                        {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                      </FormItem>
                    )} />

                    {/* Author */}
                    <FormFieldRow control={form.control} name="author_name" label="Author" placeholder="Author name" />

                    {/* Description (EN/BN) */}
                    <BilingualField
                      control={form.control}
                      nameEn="description_en"
                      nameBn="description_bn"
                      labelEn="Description (EN)"
                      labelBn="Description (BN)"
                      as="textarea"
                      textareaRows={3}
                    />

                    {/* Cover image */}
                    <div>
                      <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Cover Image</label>
                      {coverImage ? (
                        <div className="relative w-32 h-44 rounded-lg overflow-hidden border border-border/60 mb-2">
                          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                          <button
                            onClick={() => form.setValue("cover_image", "")}
                            className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Input value={coverImage} onChange={(e) => form.setValue("cover_image", e.target.value)} placeholder="https://…" />
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
                      {pdfUrl ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-secondary/20">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-foreground hover:underline flex-1 truncate">
                            {pdfUrl.split("/").pop()}
                          </a>
                          <button onClick={() => { form.setValue("pdf_url", ""); form.setValue("pdf_file_size", 0); }}
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
                      <FormField control={form.control} name="pages" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={FIELD_LABEL}>Pages</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={FIELD_LABEL}>Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step="0.01" {...field} disabled={isFree}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="isbn" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={FIELD_LABEL}>ISBN</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ""} placeholder="978-…" /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isFree} onChange={(e) => { form.setValue("is_free", e.target.checked); if (e.target.checked) form.setValue("price", 0); }}
                          className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                        <span className="text-[0.6rem] font-medium">Free</span>
                      </label>
                      <FormField control={form.control} name="featured" render={({ field }) => (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                          <span className="text-[0.6rem] font-medium">Featured</span>
                        </label>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <span className="text-[0.6rem] font-medium text-muted-foreground">Status:</span>
                          <select value={field.value} onChange={field.onChange}
                            className="text-xs border border-border/60 rounded-lg px-2 py-1 bg-background focus:outline-none">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      )} />
                    </div>

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={FIELD_LABEL}>Category</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="general" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Footer */}
                  <FormActions
                    onCancel={resetForm}
                    isPending={createMutation.isPending || updateMutation.isPending}
                    submitLabel={editingId ? "Update Book" : "Create Book"}
                  />
                </form>
              </Form>
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


