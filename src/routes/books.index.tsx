import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchPublishedBooks, type Book, type BookSortOption } from "@/lib/books";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { fetchPageBySlug } from "@/lib/pages";
import { fetchSiteSettings, useSiteSettings } from "@/lib/siteSettings";
import { fetchCategories } from "@/lib/taxonomy";
import { useLang, pickLocalized, formatMoney, localizeCartResult, toBanglaDigits } from "@/lib/i18n";
import { localizeAuthorName } from "@/lib/taxonomy";
import { useAuthSession } from "@/hooks/useAuth";
import { useNotificationGate } from "@/hooks/useNotificationGate";
import { checkOwnership } from "@/lib/books-purchases";
import { getPdfReaderUrl, purchaseBookAction } from "@/lib/books-reader";
import { addToCart } from "@/lib/cart";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { AuthModal } from "@/components/AuthModal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { BookCard } from "@/components/BookCard";

const PdfViewer = lazy(() =>
  import("@/components/PdfViewer").then((m) => ({ default: m.PdfViewer })),
);
import { BookSkeleton } from "@/components/BookSkeleton";
import { EditorialHeader } from "@/components/EditorialHeader";
import { Reveal } from "@/components/Reveal";
import { SearchBar } from "@/components/SearchBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  Loader2,
  RefreshCw,
  Lock,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { seoHead } from "@/lib/seo";
import { callFn } from "@/lib/call-fn";

export const Route = createFileRoute("/books/")({
  loader: async () => {
    const [settings, page] = await Promise.all([
      fetchSiteSettings(),
      fetchPageBySlug("books").catch(() => null),
    ]);
    return { settings, page };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings;
    const page = loaderData?.page;
    const metaDesc =
      page?.meta_description_en ||
      "A small shelf of companions — books we return to, and the ones we recommend without hesitation.";
    const pageTitle = page?.title_en || "Books";
    return seoHead({
      title: pageTitle,
      description: metaDesc,
      path: "/books",
      siteName: settings?.branding?.site_name_en,
      siteUrl: settings?.seo?.site_url,
    });
  },
  component: BooksPage,
});

type SortOption = {
  value: BookSortOption;
  labelEn: string;
  labelBn: string;
};

const SORT_OPTIONS: SortOption[] = [
  { value: "newest", labelEn: "Newest", labelBn: "নতুন" },
  { value: "oldest", labelEn: "Oldest", labelBn: "পুরনো" },
  { value: "title-asc", labelEn: "Title A–Z", labelBn: "শিরোনাম আ–য" },
  { value: "title-desc", labelEn: "Title Z–A", labelBn: "শিরোনাম য–আ" },
  { value: "rating-desc", labelEn: "Highest Rated", labelBn: "সর্বোচ্চ রেটিং" },
  { value: "rating-asc", labelEn: "Lowest Rated", labelBn: "সর্বনিম্ন রেটিং" },
  { value: "price-asc", labelEn: "Price: Low–High", labelBn: "মূল্য: কম–বেশি" },
  { value: "price-desc", labelEn: "Price: High–Low", labelBn: "মূল্য: বেশী–কম" },
  { value: "popular", labelEn: "Most Popular", labelBn: "সবচেয়ে জনপ্রিয়" },
];

function BooksPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const config = useSiteSettings();
  const { canNotify } = useNotificationGate();
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<BookSortOption>("newest");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const pageSize = config.book_grid.page_size || 12;
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  /* ── Categories query ──────────────────────────────────────────── */
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
    staleTime: 300_000,
  });

  const visibleCategories = useMemo(
    () => (categories ?? []).filter((c) => c.visible),
    [categories],
  );

  /* ── Books query (regular, page-based) ─────────────────────── */

  const { data: booksData, isLoading, isError, isFetching, refetch } =
    useQuery({
      queryKey: ["public-books", page, pageSize, search, categoryFilter, sort],
      queryFn: async () => {
        const result = await fetchPublishedBooks(page, pageSize, {
          search: search || undefined,
          category: categoryFilter || undefined,
          sort,
        });
        return result;
      },
      staleTime: 60_000,
    });

  const { data: pageData } = useQuery({
    queryKey: ["public-page", "books"],
    queryFn: () => fetchPageBySlug("books"),
    staleTime: 60_000,
  });

  const books = booksData?.data ?? [];
  const total = booksData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const header = pickLocalized(
    pageData?.header_en,
    pageData?.header_bn,
    lang,
    lang === "bn" ? "বই" : "Books",
  );
  const description = pickLocalized(
    pageData?.body_en,
    pageData?.body_bn,
    lang,
    lang === "bn"
      ? "সঙ্গীদের একটি ছোট তাক — যে বইগুলোতে আমরা ফিরে আসি, আর যেগুলো নিঃসন্দেহে সুপারিশ করি।"
      : "A small shelf of companions — books we return to, and the ones we recommend without hesitation.",
  );
  /* ── Reset to page 1 when filters change ────────────────────── */
  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  /* ── Handle search changes ───────────────────────────────────── */

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      navigate({
        to: "/books",
        search: { search: value || "", page: 1 },
        replace: true,
      });
    },
    [navigate],
  );

  /* ── Handle sort change (resets to page 1) ────────────────── */
  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort as BookSortOption);
    resetPage();
  }, [resetPage]);

  /* ── Handle category filter change (resets to page 1) ──────── */
  const handleCategoryChange = useCallback((slug: string) => {
    setCategoryFilter((prev) => (prev === slug ? "" : slug));
    resetPage();
  }, [resetPage]);

  /* ── Auth modal resume flow ──────────────────────────────────── */
  const userRef = useRef(user);
  userRef.current = user;

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        setPendingAction(() => action);
        setAuthModalOpen(true);
      }
    },
    [user],
  );

  /* ── Cart mutation ────────────────────────────────────────── */
  const cartMutation = useMutation({
    mutationFn: (payload: { bookId: string; book: MockCartBookSnapshot }) =>
      callFn(doAddToCart, { bookId: payload.bookId, book: payload.book }),
    onSuccess: (result: any) => {
      if (result.alreadyInCart) {
        toast.info(localizeCartResult(lang, result));
      } else {
        toast.success(localizeCartResult(lang, result));
      }
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Server functions ────────────────────────────────────────── */
  const doGetPdfReaderUrl = useServerFn(getPdfReaderUrl);
  const doPurchase = useServerFn(purchaseBookAction);
  const doAddToCart = useServerFn(addToCart);

  const pendingBookRef = useRef<Book | null>(null);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);

    const book = pendingBookRef.current;
    pendingBookRef.current = null;
    if (book) {
      setTimeout(async () => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        if (book.is_free || (await checkOwnership(currentUser.id, book.id))) {
          if (!book.pdf_url) {
            toast.error(lang === "bn" ? "এই বইয়ের জন্য কোনো PDF নেই।" : "No PDF available for this book.");
            return;
          }
          setPdfLoading(true);
          setPdfExpired(false);
          if (import.meta.env.DEV) {
            // Dev mode: serve local/public PDFs directly (mock/public PDF)
            setReaderBook(book);
            setPdfReaderUrl(book.pdf_url);
            setPdfLoading(false);
            return;
          }
          try {
            const result = await callFn(doGetPdfReaderUrl, { bookId: book.id, bucketPath: book.pdf_url, userId: currentUser.id });
            setReaderBook(book);
            setPdfReaderUrl(result.signedUrl);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : (lang === "bn" ? "রিডার খোলা যায়নি।" : "Failed to open reader."));
          } finally {
            setPdfLoading(false);
          }
        } else {
          setPurchaseBook(book);
        }
      }, 500);
      return;
    }

    if (pendingAction) {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 500);
    }
  }, [pendingAction, doGetPdfReaderUrl, lang]);

  /* ── PDF reader state ────────────────────────────────────────── */
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [pdfReaderUrl, setPdfReaderUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfExpired, setPdfExpired] = useState(false);

  /* ── Purchase modal state ────────────────────────────────────── */
  const [purchaseBook, setPurchaseBook] = useState<Book | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  /* ── Open PDF reader ─────────────────────────────────────────── */
  const openPdfReader = useCallback(
    async (book: Book) => {
      if (!book.pdf_url) {
        toast.error(lang === "bn" ? "এই বইয়ের জন্য কোনো PDF নেই।" : "No PDF available for this book.");
        return;
      }
      setPdfLoading(true);
      setPdfExpired(false);
      if (import.meta.env.DEV) {
        // Dev mode: serve local/public PDFs directly (mock/public PDF)
        setReaderBook(book);
        setPdfReaderUrl(book.pdf_url);
        setPdfLoading(false);
        return;
      }
      try {
        const result = await callFn(doGetPdfReaderUrl, { bookId: book.id, bucketPath: book.pdf_url, userId: user?.id });
        setReaderBook(book);
        setPdfReaderUrl(result.signedUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : (lang === "bn" ? "রিডার খোলা যায়নি।" : "Failed to open reader."));
      } finally {
        setPdfLoading(false);
      }
    },
    [doGetPdfReaderUrl, lang],
  );

  /* ── Eye icon click handler ────────────────────────────────────
     Free books open the reader for anyone (no auth gate) — they're
     publicly accessible. Paid books require sign-in + ownership. */
  const handleEyeClick = useCallback(
    async (book: Book) => {
      if (book.is_free) {
        await openPdfReader(book);
        return;
      }

      if (!user) {
        pendingBookRef.current = book;
        setAuthModalOpen(true);
        return;
      }

      if (await checkOwnership(user.id, book.id)) {
        await openPdfReader(book);
      } else {
        setPurchaseBook(book);
      }
    },
    [user, openPdfReader],
  );

  /* ── Purchase confirmation ───────────────────────────────────── */
  const handlePurchaseConfirm = useCallback(async () => {
    if (!purchaseBook || !user) return;
    setPurchaseLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await callFn(doPurchase, { bookId: purchaseBook.id, bookSlug: purchaseBook.slug, userId: user.id }) as any;
      setPurchaseLoading(false);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.alreadyOwned) {
        // "Orders & purchases" preference off → suppress the order toast.
        if (canNotify("orders")) toast.info(lang === "bn" ? "আপনি ইতিমধ্যে এই বইটির মালিক।" : "You already own this book.");
      } else {
        if (canNotify("orders")) toast.success(lang === "bn" ? "বইটি কেনা হয়েছে! এখন আপনি এটি পড়তে পারেন।" : "Book purchased! You can now read it.");
      }
      queryClient.invalidateQueries({ queryKey: ["book-owned", purchaseBook.id] });
      // Mark owned instantly — the grid's Lock → Eye flips without a round-trip.
      queryClient.setQueryData(["book-owned", purchaseBook.id, user.id], true);
      const purchased = purchaseBook;
      setPurchaseBook(null);
      await openPdfReader(purchased);
    } catch (err) {
      setPurchaseLoading(false);
      toast.error(err instanceof Error ? err.message : (lang === "bn" ? "কেনা সফল হয়নি।" : "Purchase failed."));
    }
  }, [purchaseBook, user, doPurchase, queryClient, openPdfReader, lang, canNotify]);

  /* ── Pagination controls ───────────────────────────────────── */
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      scrollToTop();
    },
    [scrollToTop],
  );

  /* ── Helper: build pagination page range ───────────────────── */
  const pageRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    pages.push(1);

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [totalPages, page]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <PublicBreadcrumbs />

      {/* Page header — shared editorial treatment (matches Videos/Reflections) */}
      <Reveal delay={0}>
        <div className="mb-14">
          <EditorialHeader title={header} description={description} />
        </div>
      </Reveal>

      {/* Search + Sort bar */}
      <Reveal delay={0.1}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl mx-auto mb-6">
          <div className="flex-1">
            <SearchBar value={search} onChange={handleSearchChange} />
          </div>
          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label={lang === "bn" ? "বই সাজান" : "Sort books"}
              className="appearance-none w-full sm:w-auto px-3 pr-8 py-2 text-xs font-medium uppercase tracking-[0.1em] bg-background border border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-colors duration-200 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {lang === "bn" ? opt.labelBn : opt.labelEn}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60 pointer-events-none" />
          </div>
        </div>
      </Reveal>

      {/* Filter bar: All + category pills */}
      <Reveal delay={0.15}>
        <div className="flex items-center gap-3 mb-10 max-w-full">
          <button
            onClick={() => handleCategoryChange("")}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] rounded-full border transition-all duration-200 ${
              !categoryFilter
                ? "bg-foreground text-background border-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:scale-105 active:scale-95"
            }`}
          >
            {lang === "bn" ? "সব" : "All"}
          </button>
          {visibleCategories.length > 0 && (
            <div className="flex-1 min-w-0 relative">
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              <Carousel opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}>
                <CarouselContent>
                  {visibleCategories.map((cat) => {
                    const isActive = categoryFilter === cat.slug;
                    return (
                      <CarouselItem key={cat.slug} className="basis-auto pl-2">
                        <button
                          onClick={() => handleCategoryChange(cat.slug)}
                          className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] rounded-full border transition-all duration-200 inline-flex items-center gap-1.5 ${
                            isActive
                              ? "bg-foreground text-background border-foreground"
                              : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:scale-105 active:scale-95"
                          }`}
                        >
                          {pickLocalized(cat.name_en, cat.name_bn, lang, cat.name_en)}
                          {isActive && <X className="h-2.5 w-2.5" />}
                        </button>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            </div>
          )}

          {/* Active filter indicator */}
          {categoryFilter && (
            <button
              onClick={() => handleCategoryChange("")}
              className="shrink-0 text-xs text-muted-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {lang === "bn" ? "সব দেখান" : "Show all"}
            </button>
          )}
        </div>
      </Reveal>

      {/* Book grid */}
      <>
        {/* Loading state */}
        {isLoading && <BookSkeleton count={8} />}

        {/* Error state with retry */}
        {isError && (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              {lang === "bn" ? "এই মুহূর্তে বই লোড করা যাচ্ছে না।" : "Unable to load books right now."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> {lang === "bn" ? "আবার চেষ্টা করুন" : "Retry"}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && books.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">
              {search
                ? lang === "bn"
                  ? "আপনার অনুসন্ধানের সাথে মিলে এমন কোনো বই নেই।"
                  : "No books match your search."
                : lang === "bn"
                  ? "এখনো কোনো বই পাওয়া যায়নি।"
                  : "No books available yet."}
            </p>
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                {lang === "bn" ? "অনুসন্ধান মুছুন" : "Clear search"}
              </button>
            )}
          </div>
        )}

        {/* Book grid */}
        {!isLoading && !isError && books.length > 0 && (
          <div className="book-grid">
            {books.map((book, i) => (
              <Reveal key={book.id} fade={false} delay={Math.min(i * 0.04, 0.3)}>
                <BookCard
                  book={book}
                  lang={lang}
                  userId={user?.id}
                  onEyeClick={handleEyeClick}
                  requireAuth={requireAuth}
                  pdfLoading={pdfLoading}
                  onAddToCart={(book) => cartMutation.mutate({ bookId: book.id, book })}
                  isCartAdding={cartMutation.isPending}
                />
              </Reveal>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        <div className="mt-12 space-y-6">
          {/* Loading indicator */}
          {isFetching && !isLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              {lang === "bn" ? "বই লোড হচ্ছে…" : "Loading books…"}
            </div>
          )}

          {/* Page navigation */}
          {totalPages > 1 && !isLoading && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1 || isFetching}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                <span className="hidden sm:inline">{lang === "bn" ? "পূর্ববর্তী" : "Previous"}</span>
              </button>

              {/* Page number buttons */}
              <div className="hidden sm:flex items-center gap-1">
                {pageRange.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground/40">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      disabled={isFetching}
                      className={`w-7 h-7 text-xs font-medium rounded-full transition-all duration-200 ${
                        p === page
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {lang === "bn" ? toBanglaDigits(p) : p}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isFetching}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">{lang === "bn" ? "পরবর্তী" : "Next"}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}


        </div>
      </>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          setAuthModalOpen(open);
          if (!open) {
            setPendingAction(null);
            pendingBookRef.current = null;
          }
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Purchase Modal ──────────────────────────────────────── */}
      <Dialog
        open={!!purchaseBook}
        onOpenChange={(open) => {
          if (!open) setPurchaseBook(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              {purchaseBook &&
                pickLocalized(purchaseBook.title_en, purchaseBook.title_bn, lang, "Untitled")}
            </DialogTitle>
          </DialogHeader>

          {purchaseBook && (
            <div className="space-y-5">
              {/* Cover thumbnail */}
              <div className="mx-auto w-32 aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-lg overflow-hidden border border-border/50">
                {purchaseBook.cover_image ? (
                  <img
                    src={purchaseBook.cover_image}
                    alt={pickLocalized(purchaseBook.title_en, purchaseBook.title_bn, lang, "Book cover")}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              {/* Author */}
              {purchaseBook.author_name && (
                <p className="text-xs text-muted-foreground text-center">
                  {lang === "bn" ? `লেখক: ${purchaseBook.author_name}` : `by ${purchaseBook.author_name}`}
                </p>
              )}

              {/* Price */}
              <p className="text-center text-lg font-medium">
                {purchaseBook.is_free ? pickLocalized(config.commerce.get_free_copy_label_en, config.commerce.get_free_copy_label_bn, lang, "Free") : formatMoney(Number(purchaseBook.price), lang)}
              </p>

              {/* CTA Buttons */}
              <div className="space-y-2">
                <BrandCtaButton
                  onClick={handlePurchaseConfirm}
                  disabled={purchaseLoading}
                  className="w-full px-6 py-3"
                >
                  {purchaseLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {lang === "bn" ? "প্রক্রিয়া হচ্ছে…" : "Processing…"}
                    </>
                  ) : purchaseBook.is_free ? (
                    <>
                      <Download className="h-4 w-4" /> {pickLocalized(config.commerce.get_free_copy_label_en, config.commerce.get_free_copy_label_bn, lang, "Get Free Copy")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> {lang === "bn" ? "কিনুন" : "Purchase"} — {formatMoney(Number(purchaseBook.price), lang)}
                    </>
                  )}
                </BrandCtaButton>
                <button
                  onClick={() => setPurchaseBook(null)}
                  disabled={purchaseLoading}
                  className="w-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PDF Reader Modal ────────────────────────────────────── */}
      <Dialog
        open={!!pdfReaderUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPdfReaderUrl(null);
            setReaderBook(null);
            setPdfExpired(false);
          }
        }}
      >
        <DialogContent hideClose className="sm:max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">
            {readerBook ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Book reader") : "Book reader"}
          </DialogTitle>
          {pdfReaderUrl && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
                  {lang === "bn" ? "রিডার লোড হচ্ছে…" : "Loading reader…"}
                </div>
              }
            >
              <PdfViewer
                url={pdfReaderUrl}
                title={
                  readerBook
                    ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Untitled")
                    : undefined
                }
                onClose={() => {
                  setPdfReaderUrl(null);
                  setReaderBook(null);
                  setPdfExpired(false);
                }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF loading overlay */}
      {pdfLoading && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
          <div className="bg-card rounded-xl shadow-xl px-8 py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
            <span className="text-sm text-foreground">{lang === "bn" ? "রিডার খোলা হচ্ছে…" : "Opening reader…"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
