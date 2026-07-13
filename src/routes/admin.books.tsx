import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { createColumnHelper } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  BookOpen,
  Edit3,
  CheckCircle,
  XCircle,
  DollarSign,
  ImagePlus,
  FileUp,
  Eye,
  Star,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { bookSchema, type BookFormValues } from "@/lib/schemas";
import { deleteBook, getBookStats, slugifyBook, type Book } from "@/lib/books";
import { ResourceListPage, registerResource } from "@/components/admin/resource-engine";
import { StatusBadge, DateCell } from "@/components/admin/data-table";
import { FormRenderer } from "@/components/admin/form-engine";
import { MediaPicker } from "@/components/admin/media-engine";
import { ErrorPage } from "@/components/error-page";

/* ─── Book Categories ────────────────────────────────────────────── */

const BOOK_CATEGORIES = [
  "general",
  "buddhist-psychology",
  "wisdom",
  "meditation",
  "philosophy",
  "sutra",
  "commentary",
  "biography",
  "reference",
];

/* ─── Column Definitions ─────────────────────────────────────────── */

const columnHelper = createColumnHelper<Book>();

const columns = [
  columnHelper.accessor("title_en", {
    header: "Title",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center gap-3 min-w-0">
        {row.original.cover_image ? (
          <img
            src={row.original.cover_image}
            alt={row.original.title_en || "Book cover"}
            className="w-8 h-10 rounded object-cover border border-border/40 shrink-0"
          />
        ) : (
          <div className="w-8 h-10 rounded bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-sm font-medium line-clamp-1">{row.original.title_en}</span>
          {row.original.title_bn && (
            <span className="text-[0.6rem] text-muted-foreground block">
              {row.original.title_bn}
            </span>
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
    cell: ({ row }) =>
      row.original.is_free ? (
        <span className="text-green-600 dark:text-green-400 text-xs font-medium">Free</span>
      ) : (
        <span className="text-xs font-medium">${row.original.price.toFixed(2)}</span>
      ),
  }),
  columnHelper.accessor("avg_rating", {
    header: "Rating",
    enableSorting: true,
    cell: ({ row }) => {
      const avg = row.original.avg_rating;
      const total = row.original.total_ratings;
      if (!avg && !total) return <span className="text-muted-foreground/50">—</span>;
      return (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span className="text-xs font-medium">{avg.toFixed(1)}</span>
          <span className="text-[0.5rem] text-muted-foreground/50">({total})</span>
        </div>
      );
    },
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
    id: "preview",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const b = row.original;
      if (b.status !== "published" || !b.slug) return null;
      return (
        <Link
          to="/books/$slug"
          params={{ slug: b.slug }}
          search={{} as any}
          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors inline-flex"
          title="View on site"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      );
    },
  }),
];

/* ─── Book Form (using Form Engine) ──────────────────────────────── */

const BOOK_FORM_GROUPS = [
  {
    title: "Basic Info",
    columns: 2 as const,
    fields: [
      {
        type: "bilingual" as const,
        nameEn: "title_en" as const,
        nameBn: "title_bn" as const,
        labelEn: "Title (English)",
        labelBn: "Title (বাংলা)",
        placeholderEn: "Book title",
        placeholderBn: "বইয়ের শিরোনাম",
      },
    ],
  },
  {
    columns: 2 as const,
    fields: [
      { type: "text" as const, name: "slug" as const, label: "Slug", placeholder: "book-slug" },
      {
        type: "text" as const,
        name: "author_name" as const,
        label: "Author",
        placeholder: "Author name",
      },
    ],
  },
  {
    title: "Description",
    columns: 2 as const,
    fields: [
      {
        type: "bilingual-textarea" as const,
        nameEn: "description_en" as const,
        nameBn: "description_bn" as const,
        labelEn: "Description (EN)",
        labelBn: "Description (BN)",
        rows: 3,
      },
    ],
  },
  {
    title: "Details",
    columns: 3 as const,
    fields: [
      { type: "number" as const, name: "pages" as const, label: "Pages", min: 0 },
      { type: "number" as const, name: "price" as const, label: "Price ($)", min: 0, step: 0.01 },
      { type: "text" as const, name: "isbn" as const, label: "ISBN", placeholder: "978-…" },
    ],
  },
  {
    columns: 3 as const,
    fields: [
      { type: "checkbox" as const, name: "is_free" as const, label: "Free" },
      { type: "checkbox" as const, name: "featured" as const, label: "Featured" },
      {
        type: "select" as const,
        name: "category" as const,
        label: "Category",
        options: BOOK_CATEGORIES.map((c) => ({
          label: c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          value: c,
        })),
      },
    ],
  },
  {
    title: "Publishing",
    columns: 3 as const,
    fields: [
      {
        type: "select" as const,
        name: "status" as const,
        label: "Status",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
      },
      { type: "number" as const, name: "sort_order" as const, label: "Sort Order", min: 0 },
    ],
  },
  {
    title: "SEO",
    columns: 2 as const,
    fields: [
      {
        type: "textarea" as const,
        name: "meta_description_en" as const,
        label: "Meta Description (EN)",
        rows: 2,
      },
      {
        type: "textarea" as const,
        name: "meta_description_bn" as const,
        label: "Meta Description (BN)",
        rows: 2,
      },
    ],
  },
];

function BookFormContent({ form }: { form: ReturnType<typeof useForm<BookFormValues>> }) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [pdfPickerOpen, setPdfPickerOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!form.formState.defaultValues?.slug);
  const coverImage = form.watch("cover_image");
  const pdfUrl = form.watch("pdf_url");
  const titleEn = form.watch("title_en");
  const isFree = form.watch("is_free");

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugTouched && titleEn) {
      form.setValue("slug", slugifyBook(titleEn), { shouldDirty: true });
    }
  }, [titleEn, slugTouched, form]);

  return (
    <FormRenderer form={form} groups={BOOK_FORM_GROUPS}>
      {/* Price hint when free is checked */}
      {isFree && (
        <p className="text-[0.55rem] text-green-600 dark:text-green-400 -mt-4">
          ✓ This book is free — price will be ignored on purchase.
        </p>
      )}

      {/* Cover Image — using MediaPicker */}
      <div>
        <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
          Cover Image
        </label>
        {coverImage ? (
          <div className="relative w-32 h-44 rounded-lg overflow-hidden border border-border/60 mb-2">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            <button
              onClick={() => form.setValue("cover_image", "")}
              className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setCoverPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {coverImage ? "Replace" : "Browse Media Library"}
        </button>
      </div>

      {/* PDF Upload — using MediaPicker */}
      <div>
        <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
          PDF File
        </label>
        {pdfUrl ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-secondary/20">
            <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground flex-1 truncate">
              {pdfUrl.split("/").pop()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPdfPickerOpen(true)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Replace PDF"
              >
                <FileUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  form.setValue("pdf_url", "");
                  form.setValue("pdf_file_size", 0);
                }}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Remove PDF"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPdfPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border border-dashed border-border/60 rounded-lg hover:border-foreground/30 hover:bg-secondary/20 transition-colors w-full"
          >
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Browse for PDF</span>
          </button>
        )}
      </div>

      <MediaPicker
        open={coverPickerOpen}
        options={{
          title: "Select Cover Image",
          bucket: "book-covers",
          allowedFileTypes: ["image/*"],
        }}
        onSelect={(result) => {
          form.setValue("cover_image", result.url);
          setCoverPickerOpen(false);
        }}
        onClose={() => setCoverPickerOpen(false)}
      />

      <MediaPicker
        open={pdfPickerOpen}
        options={{ title: "Select PDF", bucket: "site-assets", allowedFileTypes: [".pdf"] }}
        onSelect={(result) => {
          form.setValue("pdf_url", result.path);
          form.setValue("pdf_file_size", result.size);
          setPdfPickerOpen(false);
        }}
        onClose={() => setPdfPickerOpen(false)}
      />
    </FormRenderer>
  );
}

/* ─── Resource Registration ──────────────────────────────────────── */

const bookResource = registerResource<Book, BookFormValues>({
  name: "books",
  label: "Book",
  labelPlural: "Books",
  description: "Manage your digital book collection with PDF downloads, pricing, and ratings",
  icon: BookOpen,
  columns,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: bookSchema as any,
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
  FormContent: BookFormContent as any,
  filterField: "status",
  searchField: "title_en",
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
  pageSize: 20,
  stats: {
    fetch: getBookStats,
    cards: (data) => [
      { icon: BookOpen, label: "Total", value: data.total, color: "blue" },
      { icon: CheckCircle, label: "Published", value: data.published, color: "green" },
      { icon: Edit3, label: "Drafts", value: data.draft, color: "amber" },
      { icon: XCircle, label: "Archived", value: data.archived, color: "slate" },
      { icon: DollarSign, label: "Free", value: data.free, color: "purple" },
      { icon: ShoppingCart, label: "Purchases", value: data.totalPurchases, color: "blue" },
      { icon: TrendingUp, label: "Revenue", value: data.totalRevenue, color: "green" },
    ],
  },
  filters: [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
  ],
  onBulkDelete: async (ids) => {
    for (const id of ids) {
      try {
        await deleteBook(id);
      } catch {
        /* continue */
      }
    }
    toast.success(`${ids.length} book(s) deleted`);
  },
});

/* ─── Route ──────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin/books")({
  component: AdminBooksPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminBooksPage() {
  return <ResourceListPage resource={bookResource} />;
}
