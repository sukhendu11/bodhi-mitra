import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchPublishedBooks, type Book } from "@/lib/books";
import { fetchPageBySlug } from "@/lib/pages";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, pickLocalized, type Lang } from "@/lib/i18n";
import {
  BookOpen,
  Download,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SearchBar } from "@/components/SearchBar";

export const Route = createFileRoute("/books")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Books — ${loaderData}` },
      { name: "description", content: "A small shelf of companions — books we return to, and the ones we recommend without hesitation." },
      { property: "og:title", content: `Books — ${loaderData}` },
      { property: "og:description", content: "A small shelf of companions — books we return to, and the ones we recommend without hesitation." },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const { lang, t } = useLang();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const pageSize = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["public-books", page, search],
    queryFn: () => fetchPublishedBooks(page, pageSize, { search: search || undefined }),
    staleTime: 60_000,
  });

  const { data: pageData } = useQuery({
    queryKey: ["public-page", "books"],
    queryFn: () => fetchPageBySlug("books"),
    staleTime: 60_000,
  });

  const books = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Get page settings from the public pages table
  const header = pageData?.header_en || "Books";
  const description = pageData?.body_en || "A small shelf of companions — books we return to, and the ones we recommend without hesitation.";
  const banner = pageData?.banner_url || "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      {/* Header */}
      <Reveal delay={0}>
        <div className="text-center mb-16">
          {banner && (
            <img src={banner} alt="" className="w-full aspect-[21/9] object-cover rounded-md mb-10" />
          )}
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
            {lang === "bn" ? "বই" : "Books"}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">{header}</h1>
          <p className="mt-6 max-w-xl mx-auto text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </Reveal>

      {/* Search */}
      <Reveal delay={0.1}>
        <div className="max-w-md mx-auto mb-12">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
      </Reveal>

      {/* Book grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">
            {search ? "No books match your search." : "No books available yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {books.map((book, i) => (
            <Reveal key={book.id} delay={Math.min(i * 0.05, 0.3)}>
              <BookCard book={book} onOpen={() => setSelectedBook(book)} lang={lang} />
            </Reveal>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Reveal delay={0.3}>
          <div className="flex items-center justify-center gap-4 mt-14">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors min-h-[44px] px-4"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors min-h-[44px] px-4"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reveal>
      )}

      {/* Book detail modal */}
      {selectedBook && (
        <BookDetailModal book={selectedBook} lang={lang} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  );
}

/* ─── Book Card ────────────────────────────────────────────────────── */

function BookCard({ book, onOpen, lang }: { book: Book; onOpen: () => void; lang: Lang }) {
  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");
  const author = book.author_name || "Unknown";

  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer bg-white dark:bg-zinc-900 rounded-xl border border-border/50 overflow-hidden hover:border-foreground/30 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
    >
      {/* Cover */}
      <div className="aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center overflow-hidden">
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <BookOpen className="h-16 w-16 text-muted-foreground/20" />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {book.is_free && (
            <span className="text-[0.5rem] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border border-green-300/50">
              Free
            </span>
          )}
          {book.featured && (
            <span className="text-[0.5rem] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/50">
              Featured
            </span>
          )}
        </div>

        {/* Preview icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75">
            <Eye className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-medium line-clamp-1 font-serif">{title}</p>
        <p className="text-[0.6rem] text-muted-foreground mt-1">{author}</p>
        <div className="flex items-center gap-2 mt-2 text-[0.55rem] text-muted-foreground">
          {book.pages > 0 && <span>{book.pages} pages</span>}
          {book.pdf_url && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-0.5">
                <Download className="h-2.5 w-2.5" /> PDF
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Book Detail Modal ───────────────────────────────────────────── */

function BookDetailModal({ book, lang, onClose }: { book: Book; lang: Lang; onClose: () => void }) {
  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");
  const description = pickLocalized(book.description_en, book.description_bn, lang, "");
  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className="min-h-screen flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-4xl bg-background border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {showPdf && book.pdf_url ? (
            /* PDF Viewer */
            <div className="relative">
              <button
                onClick={() => setShowPdf(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background shadow-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <iframe
                src={book.pdf_url}
                className="w-full h-[80vh] rounded-t-xl"
                title={title}
              />
            </div>
          ) : (
            <div className="grid md:grid-cols-[300px_1fr]">
              {/* Cover image */}
              <div className="aspect-[3/4] md:aspect-auto md:h-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center overflow-hidden">
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-24 w-24 text-muted-foreground/20" />
                )}
              </div>

              {/* Details */}
              <div className="p-8 md:p-10 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl md:text-3xl leading-tight">{title}</h2>
                    {book.author_name && (
                      <p className="mt-2 text-sm text-muted-foreground">By {book.author_name}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {description && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {book.pages > 0 && (
                    <div>
                      <span className="text-[0.55rem] uppercase tracking-[0.05em] block mb-0.5">Pages</span>
                      <span className="font-medium text-foreground">{book.pages}</span>
                    </div>
                  )}
                  {book.isbn && (
                    <div>
                      <span className="text-[0.55rem] uppercase tracking-[0.05em] block mb-0.5">ISBN</span>
                      <span className="font-medium text-foreground">{book.isbn}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[0.55rem] uppercase tracking-[0.05em] block mb-0.5">Price</span>
                    <span className="font-medium text-foreground">
                      {book.is_free ? "Free" : `$${book.price.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  {book.pdf_url && (
                    <>
                      <button
                        onClick={() => setShowPdf(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Eye className="h-3.5 w-3.5" /> Read Online
                      </button>
                      <a
                        href={book.pdf_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
