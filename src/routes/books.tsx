import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchPublishedBooks, type Book } from "@/lib/books";
import { fetchPageBySlug } from "@/lib/pages";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, pickLocalized, type Lang } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/useAuth";
import { submitRating, getUserRating } from "@/lib/books-ratings";
import { getReadingProgress } from "@/lib/books-progress";
import { checkOwnership } from "@/lib/books-purchases";
import { getPdfReaderUrl, purchaseBookAction } from "@/lib/books-reader";
import { AuthModal } from "@/components/AuthModal";
import { StarRating } from "@/components/StarRating";

const PdfViewer = lazy(() => import("@/components/PdfViewer").then((m) => ({ default: m.PdfViewer })));
import { BookSkeleton } from "@/components/BookSkeleton";
import { Reveal } from "@/components/Reveal";
import { SearchBar } from "@/components/SearchBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Search,
  BookMarked,
  ChevronRight,
  Lock,
  X,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

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
  validateSearch: (search: Record<string, unknown>) => ({
    search: (search.search as string) ?? "",
    page: (search.page as number) ?? 1,
  }),
});

function BooksPage() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const search_params = Route.useSearch();
  const [search, setSearch] = useState<string>(String(search_params.search ?? ""));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const pageSize = 12;

  /* ── Infinite query ──────────────────────────────────────────── */

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["public-books-infinite", search],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchPublishedBooks(pageParam, pageSize, {
        search: search || undefined,
      });
      return { ...result, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.max(1, Math.ceil(lastPage.total / pageSize));
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });

  const { data: pageData } = useQuery({
    queryKey: ["public-page", "books"],
    queryFn: () => fetchPageBySlug("books"),
    staleTime: 60_000,
  });

  const books = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const header = pageData?.header_en || "Books";
  const description = pageData?.body_en || "A small shelf of companions — books we return to, and the ones we recommend without hesitation.";
  const banner = pageData?.banner_url || "";

  /* ── Infinite scroll observer ────────────────────────────────── */

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* ── Handle search changes ───────────────────────────────────── */

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      navigate({
        to: "/books",
        search: { search: value || "", page: 1 },
        replace: true,
      });
    },
    [navigate],
  );

  /* ── Auth modal resume flow ──────────────────────────────────── */
  // Use refs to avoid closure-staleness issues after auth state changes
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

  /* ── Server functions (defined before callbacks that use them) ── */
  const doGetPdfReaderUrl = useServerFn(getPdfReaderUrl);
  const doPurchase = useServerFn(purchaseBookAction);

  /* Ref-based pending book for eye icon auth resume (avoids closure collision with rating's pendingAction) */
  const pendingBookRef = useRef<Book | null>(null);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);

    // Resume eye-icon action (separate ref — no closure staleness)
    const book = pendingBookRef.current;
    pendingBookRef.current = null;
    if (book) {
      setTimeout(async () => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        if (book.is_free || (await checkOwnership(currentUser.id, book.id))) {
          if (!book.pdf_url) {
            toast.error("No PDF available for this book.");
            return;
          }
          setPdfLoading(true);
          setPdfExpired(false);
          try {
            const result = await (doGetPdfReaderUrl as any)({
              data: { bookId: book.id, bucketPath: book.pdf_url },
            });
            setReaderBook(book);
            setPdfReaderUrl(result.signedUrl);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to open reader.");
          } finally {
            setPdfLoading(false);
          }
        } else {
          setPurchaseBook(book);
        }
      }, 500);
      return;
    }

    // Execute the existing pending action (e.g. rating)
    if (pendingAction) {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 500);
    }
  }, [pendingAction, doGetPdfReaderUrl]);

  /* ── PDF reader state ────────────────────────────────────────── */
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [pdfReaderUrl, setPdfReaderUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfExpired, setPdfExpired] = useState(false);

  /* ── Purchase modal state ────────────────────────────────────── */
  const [purchaseBook, setPurchaseBook] = useState<Book | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  /* ── Open PDF reader ─────────────────────────────────────────── */
  const openPdfReader = useCallback(async (book: Book) => {
    if (!book.pdf_url) {
      toast.error("No PDF available for this book.");
      return;
    }
    setPdfLoading(true);
    setPdfExpired(false);
    try {
      const result = await (doGetPdfReaderUrl as any)({
        data: { bookId: book.id, bucketPath: book.pdf_url },
      });
      setReaderBook(book);
      setPdfReaderUrl(result.signedUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open reader.",
      );
    } finally {
      setPdfLoading(false);
    }
  }, [doGetPdfReaderUrl]);

  /* ── Eye icon click handler ──────────────────────────────────── */
  const handleEyeClick = useCallback(async (book: Book) => {
    if (!user) {
      // Store the pending book in a ref (separate from pendingAction to avoid closure issues)
      pendingBookRef.current = book;
      setAuthModalOpen(true);
      return;
    }

    // Free books or already-owned: open PDF directly
    if (book.is_free || (await checkOwnership(user.id, book.id))) {
      await openPdfReader(book);
    } else {
      // Premium, not purchased: show purchase modal
      setPurchaseBook(book);
    }
  }, [user, openPdfReader]);

  /* ── Purchase confirmation ───────────────────────────────────── */
  const handlePurchaseConfirm = useCallback(async () => {
    if (!purchaseBook || !user) return;
    setPurchaseLoading(true);
    try {
      const result = await (doPurchase as any)({
        data: { bookId: purchaseBook.id, bookSlug: purchaseBook.slug },
      });
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
        toast.info("You already own this book.");
      } else {
        toast.success("Book purchased! You can now read it.");
      }
      // Invalidate ownership so the card updates
      queryClient.invalidateQueries({ queryKey: ["book-owned", purchaseBook.id] });
      const purchased = purchaseBook;
      setPurchaseBook(null);
      // Open the PDF reader automatically
      await openPdfReader(purchased);
    } catch (err) {
      setPurchaseLoading(false);
      toast.error(
        err instanceof Error ? err.message : "Purchase failed.",
      );
    }
  }, [purchaseBook, user, doPurchase, queryClient, openPdfReader]);

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
          {total > 0 && (
            <p className="mt-3 text-xs text-muted-foreground/60">
              {total} book{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </Reveal>

      {/* Search */}
      <Reveal delay={0.1}>
        <div className="max-w-md mx-auto mb-12">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>
      </Reveal>

      {/* Loading state */}
      {isLoading && <BookSkeleton count={8} />}

      {/* Error state with retry */}
      {isError && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            Unable to load books right now.
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <Loader2 className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && books.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">
            {search ? "No books match your search." : "No books available yet."}
          </p>
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Book grid */}
      {!isLoading && !isError && books.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {books.map((book, i) => (
            <Reveal key={book.id} delay={Math.min(i * 0.04, 0.3)}>
              <BookCard
                book={book}
                lang={lang}
                userId={user?.id}
                onEyeClick={handleEyeClick}
                requireAuth={requireAuth}
                pdfLoading={pdfLoading}
              />
            </Reveal>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-10 mt-8 flex items-center justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more books…
          </div>
        )}
        {!hasNextPage && books.length > 0 && !isLoading && (
          <p className="text-xs text-muted-foreground/50">
            You've reached the end{total > 0 && ` — ${total} book${total !== 1 ? "s" : ""} total`}
          </p>
        )}
      </div>

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
      <Dialog open={!!purchaseBook} onOpenChange={(open) => { if (!open) setPurchaseBook(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              {purchaseBook && pickLocalized(purchaseBook.title_en, purchaseBook.title_bn, lang, "Untitled")}
            </DialogTitle>
          </DialogHeader>

          {purchaseBook && (
            <div className="space-y-5">
              {/* Cover thumbnail */}
              <div className="mx-auto w-32 aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-lg overflow-hidden border border-border/50">
                {purchaseBook.cover_image ? (
                  <img src={purchaseBook.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              {/* Author */}
              {purchaseBook.author_name && (
                <p className="text-xs text-muted-foreground text-center">
                  by {purchaseBook.author_name}
                </p>
              )}

              {/* Price */}
              <p className="text-center text-lg font-medium">
                {purchaseBook.is_free ? "Free" : `$${Number(purchaseBook.price).toFixed(2)}`}
              </p>

              {/* Purchasing indicator */}
              {purchaseLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handlePurchaseConfirm}
                  disabled={purchaseLoading}
                  className="w-full px-6 py-3 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  {purchaseLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</>
                  ) : purchaseBook.is_free ? (
                    <><Download className="h-3.5 w-3.5" /> Get Free Copy</>
                  ) : (
                    <><Lock className="h-3.5 w-3.5" /> Purchase — ${Number(purchaseBook.price).toFixed(2)}</>
                  )}
                </button>
                <button
                  onClick={() => setPurchaseBook(null)}
                  disabled={purchaseLoading}
                  className="w-full px-6 py-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary/40 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PDF Reader Modal ────────────────────────────────────── */}
      <Dialog open={!!pdfReaderUrl} onOpenChange={(open) => { if (!open) { setPdfReaderUrl(null); setReaderBook(null); setPdfExpired(false); } }}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          {pdfReaderUrl && (
            <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">Loading reader…</div>}>
              <PdfViewer
                url={pdfReaderUrl}
                title={readerBook ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Untitled") : undefined}
                onClose={() => { setPdfReaderUrl(null); setReaderBook(null); setPdfExpired(false); }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF loading overlay */}
      {pdfLoading && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl px-8 py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
            <span className="text-sm text-foreground">Opening reader…</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Book Card ────────────────────────────────────────────────────── */

function BookCard({
  book,
  lang,
  userId,
  onEyeClick,
  requireAuth,
  pdfLoading,
}: {
  book: Book;
  lang: Lang;
  userId?: string | null;
  onEyeClick: (book: Book) => void;
  requireAuth: (action: () => void) => void;
  pdfLoading?: boolean;
}) {
  const queryClient = useQueryClient();
  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");
  const author = book.author_name || "Unknown";

  /* ── User's rating for this book ─────────────────────────────── */
  const { data: userRating } = useQuery({
    queryKey: ["book-user-rating", book.id, userId],
    queryFn: () => getUserRating(userId, book.id),
    enabled: !!userId,
    staleTime: 30_000,
  });

  /* ── Reading progress ────────────────────────────────────────── */
  const { data: progress } = useQuery({
    queryKey: ["book-progress", book.id, userId],
    queryFn: () => getReadingProgress(userId, book.id),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const hasProgress = progress && progress.progress_pct > 0;

  /* ── Ownership check ─────────────────────────────────────────── */
  const { data: owned } = useQuery({
    queryKey: ["book-owned", book.id, userId],
    queryFn: () => checkOwnership(userId, book.id),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const isUnlocked = book.is_free || !!owned;

  /* ── Rating mutation ─────────────────────────────────────────── */
  const ratingMutation = useMutation({
    mutationFn: (rating: number) => {
      if (!userId) throw new Error("Not authenticated");
      return submitRating({ userId, bookId: book.id, rating });
    },
    onMutate: async (newRating) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["book-user-rating", book.id, userId] });
      const previous = queryClient.getQueryData(["book-user-rating", book.id, userId]);
      queryClient.setQueryData(["book-user-rating", book.id, userId], newRating);
      return { previous };
    },
    onError: (err: Error, _newRating, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["book-user-rating", book.id, userId], context.previous);
      }
      toast.error("Failed to update rating. Try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-user-rating", book.id] });
      queryClient.invalidateQueries({ queryKey: ["public-books-infinite"] });
      toast.success("Rating saved");
    },
  });

  const handleRating = (rating: number) => {
    requireAuth(() => ratingMutation.mutate(rating));
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-border/50 overflow-hidden hover:border-foreground/30 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      {/* Clickable cover area — navigates to detail page */}
      <Link
        to="/books/$slug"
        params={{ slug: book.slug }}
        search={{ search: "", page: 1 }}
        className="block"
      >
        <div className="aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center overflow-hidden relative">
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

          {/* Access state badge — always visible */}
          <div className="absolute top-3 right-3 z-10">
            {isUnlocked ? (
              <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-950/60 border border-green-300/50 flex items-center justify-center">
                <Eye className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300/50 flex items-center justify-center">
                <EyeOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
              </div>
            )}
          </div>

          {/* Hover overlay — eye action button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEyeClick(book);
              }}
              disabled={pdfLoading}
              className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75 hover:scale-110 disabled:opacity-40"
              title={isUnlocked ? "Read book" : "Purchase to read"}
            >
              {isUnlocked ? (
                <Eye className="h-5 w-5 text-foreground" />
              ) : (
                <Lock className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <Link
          to="/books/$slug"
          params={{ slug: book.slug }}
          search={{ search: "", page: 1 }}
          className="block"
        >
          <p className="text-sm font-medium line-clamp-1 font-serif hover:text-primary transition-colors">{title}</p>
          <p className="text-[0.6rem] text-muted-foreground mt-1">{author}</p>
        </Link>

        {/* Rating stars */}
        <div className="mt-1.5">
          <StarRating
            value={userRating ?? Math.round(book.avg_rating ?? 0)}
            onChange={handleRating}
            size="h-3 w-3"
            showValue
            totalRatings={book.total_ratings ?? 0}
          />
        </div>

        {/* Progress bar (if reading) */}
        {hasProgress && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <BookMarked className="h-2.5 w-2.5 text-blue-500" />
              <span className="text-[0.5rem] font-medium text-blue-600 dark:text-blue-400">
                Continue
              </span>
            </div>
            <div className="mt-1 h-1 bg-secondary/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress!.progress_pct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 text-[0.55rem] text-muted-foreground">
            {book.pages > 0 && <span>{book.pages} pages</span>}
          </div>
          <Link
            to="/books/$slug"
            params={{ slug: book.slug }}
            search={{ search: "", page: 1 }}
            className="text-[0.5rem] text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
