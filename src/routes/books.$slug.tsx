import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { fetchBookBySlug, type Book } from "@/lib/books";
import { fetchSiteSettings, useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized, formatMoney, toBanglaDigits, localizeCartResult } from "@/lib/i18n";
import { localizeCategoryName, localizeAuthorName } from "@/lib/taxonomy";
import { useAuthSession } from "@/hooks/useAuth";
import { useNotificationGate } from "@/hooks/useNotificationGate";
import { getBookRatingAggregates, getUserRating, submitRating } from "@/lib/books-ratings";
import { fetchBookReviews } from "@/lib/books-reviews";
import { getReadingProgress } from "@/lib/books-progress";
import { getPdfReaderUrl, purchaseBookAction } from "@/lib/books-reader";
import { checkOwnership as fetchCheckOwnership } from "@/lib/books-purchases";
import { AuthModal } from "@/components/AuthModal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StarRating, RatingBreakdown } from "@/components/StarRating";
import { BookDetailSkeleton } from "@/components/BookSkeleton";
import { useServerFn } from "@tanstack/react-start";
import { addToCart } from "@/lib/cart";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { openCartDrawer } from "@/lib/cart-events";
import { BookmarkButton } from "@/components/BookmarkButton";
import { WishlistButton } from "@/components/WishlistButton";
import { BookRecommendations } from "@/components/BookRecommendations";
import { formatReadingTime } from "@/lib/commerce";
import { generateBookSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { SocialShare } from "@/components/SocialShare";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
import { BookOpen, Download, Eye, Loader2, CheckCircle, Lock, ShoppingCart, Tag, ListOrdered, ChevronDown } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { LetterAvatar } from "@/components/LetterAvatar";
import { Reveal } from "@/components/Reveal";
import { BookReviews } from "@/components/BookReviews";
import { seoHead } from "@/lib/seo";
import { callFn } from "@/lib/call-fn";

const PdfViewer = lazy(() =>
  import("@/components/PdfViewer").then((m) => ({ default: m.PdfViewer })),
);

export const Route = createFileRoute("/books/$slug")({
  loader: async ({ params }) => {
    const [book, settings] = await Promise.all([fetchBookBySlug(params.slug), fetchSiteSettings()]);
    if (!book) throw notFound();
    return { book, siteName: settings.branding.site_name_en || "Sabbe Satta", siteUrl: settings.seo.site_url || "https://sabbesatta.com", currency: settings.commerce.currency || "USD" };
  },
  head: ({ loaderData }) => {
    const ld = loaderData as { book: Book; siteName: string; siteUrl: string; currency: string } | undefined;
    const b = ld?.book;
    const name = ld?.siteName ?? "Sabbe Satta";
    const bookTitle = b?.title_en || b?.title_bn || "Book";
    const desc = b?.meta_description_en || b?.description_en || "View book details.";
    const bookUrl = `/books/${b?.slug || ""}`;

    const bookSchema = generateBookSchema({
      name: bookTitle,
      description: desc,
      url: bookUrl,
      imageUrl: b?.cover_image || undefined,
      author: b?.author_name || undefined,
      isbn: b?.isbn || undefined,
      price: b?.price || 0,
      currency: ld?.currency || "USD",
      rating: b?.avg_rating || undefined,
      ratingCount: b?.total_ratings || undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Books", url: "/books" },
      { name: bookTitle, url: bookUrl },
    ]);

    const head = seoHead({
      title: bookTitle,
      description: desc,
      path: bookUrl,
      ogImage: b?.cover_image || undefined,
      ogType: "book",
      siteName: name,
      siteUrl: ld?.siteUrl,
      scripts: [
        { type: "application/ld+json", JSON: bookSchema },
        { type: "application/ld+json", JSON: breadcrumbSchema },
      ],
    });

    return head;
  },
  component: BookDetailPage,
  notFoundComponent: () => {
    const { lang } = useLang();
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-serif text-3xl">{lang === "bn" ? "এই বইটি এখনো লেখা হয়নি।" : "This book hasn't been written yet."}</h1>
        <Link
          to="/books"
          search={{ search: "", page: 1 }}
          className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground"
        >
          {lang === "bn" ? "বই ব্রাউজ করুন" : "Browse books"}
        </Link>
      </div>
    );
  },
});

function BookDetailPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const config = useSiteSettings();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<string | null>(null);
  // Latest-action refs — handleAuthSuccess is memoized with [] deps, so it must
  // call through refs to avoid capturing stale first-render handlers (which
  // close over an undefined book / null user).
  const handleReadActionRef = useRef<() => void>(() => {});
  const handlePurchaseRef = useRef<() => void>(() => {});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [pdfReaderUrl, setPdfReaderUrl] = useState<string | null>(null);
  const [redirectToastShown, setRedirectToastShown] = useState(false);
  const showRecommendations = useFeatureFlag("book_recommendations");
  const { canNotify } = useNotificationGate();

  const doPurchase = useServerFn(purchaseBookAction);
  const doGetPdfReaderUrl = useServerFn(getPdfReaderUrl);

  /* ── Book data ───────────────────────────────────────────────── */
  const { data: book, isLoading, isError } = useQuery({
    queryKey: ["book", slug],
    queryFn: () => fetchBookBySlug(slug),
    staleTime: 60_000,
  });

  /* ── Rating aggregates ───────────────────────────────────────── */
  const { data: ratingAgg } = useQuery({
    queryKey: ["book-rating-agg", book?.id],
    queryFn: () => getBookRatingAggregates(book!.id),
    enabled: !!book,
    staleTime: 30_000,
  });

  /* ── User rating ─────────────────────────────────────────────── */
  const { data: userRating } = useQuery({
    queryKey: ["book-user-rating", book?.id, user?.id],
    queryFn: () => getUserRating(user?.id, book!.id),
    enabled: !!book && !!user,
    staleTime: 30_000,
  });

  /* ── Reader reviews (count for the rating-row summary link) ─── */
  const { data: reviews = [] } = useQuery({
    queryKey: ["book-reviews", book?.id],
    queryFn: () => fetchBookReviews(book!.id),
    enabled: !!book,
    staleTime: 30_000,
  });

  /* ── Reading progress ────────────────────────────────────────── */
  const { data: progress } = useQuery({
    queryKey: ["book-progress", book?.id, user?.id],
    queryFn: () => getReadingProgress(user?.id, book!.id),
    enabled: !!book && !!user,
    staleTime: 30_000,
  });

  /* ── Ownership check ─────────────────────────────────────────── */
  const { data: owned } = useQuery({
    queryKey: ["book-owned", book?.id, user?.id],
    queryFn: () => fetchCheckOwnership(user!.id, book!.id),
    enabled: !!book && !!user && !book.is_free,
    staleTime: 30_000,
  });

  /* ── Payment-redirect feedback (provider-agnostic) ───────────── */
  useEffect(() => {
    if (redirectToastShown || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    if (purchase === "success") {
      // "Orders & purchases" preference off → suppress the order toast.
      if (canNotify("orders")) toast.success(lang === "bn" ? "ক্রয় সম্পন্ন! আপনি এখন এই বইটির মালিক।" : "Purchase complete! You now own this book.");
      window.history.replaceState({}, "", window.location.pathname);
      setRedirectToastShown(true);
    } else if (purchase === "cancel") {
      if (canNotify("orders")) toast.info(lang === "bn" ? "ক্রয় বাতিল হয়েছে। কোনো চার্জ নেওয়া হয়নি।" : "Purchase was cancelled. No charges were made.");
      window.history.replaceState({}, "", window.location.pathname);
      setRedirectToastShown(true);
    }
  }, [redirectToastShown, canNotify]);

  /* ── Auth callback (non-recursive) ───────────────────────────── */
  const handleUnauthenticatedAction = useCallback((actionName: string) => {
    pendingActionRef.current = actionName;
    setAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      // Dispatch the action after auth state propagates — call through refs so
      // the freshest handler (with loaded book/user) is used, not the
      // first-render closure captured by this memoized callback.
      setTimeout(() => {
        if (action === "read") handleReadActionRef.current();
        else if (action === "purchase") handlePurchaseRef.current();
      }, 500);
    }
  }, []);

  /* ── Rating mutation (with optimistic update) ────────────────── */
  const ratingMutation = useMutation({
    mutationFn: (rating: number) => {
      if (!user) throw new Error("Not authenticated");
      return submitRating({ userId: user.id, bookId: book!.id, rating });
    },
    onMutate: async (newRating) => {
      await queryClient.cancelQueries({ queryKey: ["book-user-rating", book!.id, user?.id] });
      const previous = queryClient.getQueryData(["book-user-rating", book!.id, user?.id]);
      queryClient.setQueryData(["book-user-rating", book!.id, user?.id], newRating);
      return { previous };
    },
    onError: (_err, _newRating, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["book-user-rating", book!.id, user?.id], context.previous);
      }
      toast.error(lang === "bn" ? "রেটিং আপডেট করা যায়নি। আবার চেষ্টা করুন।" : "Failed to update rating. Try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-user-rating", book!.id] });
      queryClient.invalidateQueries({ queryKey: ["book-rating-agg", book!.id] });
      queryClient.invalidateQueries({ queryKey: ["public-books"] });
      // "Reviews" preference off → suppress the rating-saved toast.
      if (canNotify("reviews")) toast.success(lang === "bn" ? "রেটিং সংরক্ষিত হয়েছে" : "Rating saved");
    },
  });

  const handleRating = (rating: number) => {
    if (!user) {
      handleUnauthenticatedAction("rate");
      return;
    }
    ratingMutation.mutate(rating);
  };

  /** Smooth-scroll to the Reader Reviews section (shared query key keeps one fetch). */
  const scrollToReviews = () => {
    if (typeof document === "undefined") return;
    document.getElementById("book-reviews-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── Add to cart mutation ─────────────────────────────────── */
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
      openCartDrawer();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const doAddToCart = useServerFn(addToCart);

  /* ── Purchase mutation (provider redirect or inline) ─────────── */
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      return callFn(doPurchase, { bookId: book!.id, bookSlug: book!.slug, userId: user?.id });
    },
    onSuccess: (result: any) => {
      if (result.url) {
        window.location.href = result.url;
      } else if (result.alreadyOwned) {
        // "Orders & purchases" preference off → suppress the order toast.
        if (canNotify("orders")) toast.info(lang === "bn" ? "আপনি ইতিমধ্যে এই বইটির মালিক।" : "You already own this book.");
      } else {
        if (canNotify("orders")) toast.success(lang === "bn" ? "বইটি আপনার লাইব্রেরিতে যোগ হয়েছে!" : "Book added to your library!");
        // Mark owned instantly so the Purchase → Read Now CTA flips immediately
        // (covers both mock purchases and direct free/paid completions).
        queryClient.setQueryData(["book-owned", book!.id, user?.id], true);
        queryClient.invalidateQueries({ queryKey: ["book-owned", book!.id] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || (lang === "bn" ? "ক্রয় প্রক্রিয়া ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" : "Failed to process purchase. Try again."));
    },
  });

  const handlePurchase = () => {
    if (!user) {
      handleUnauthenticatedAction("purchase");
      return;
    }
    purchaseMutation.mutate();
  };

  /* ── Open PDF reader modal (same viewer as the books grid eye icon) ─ */
  const openPdfReader = useCallback(
    async (target: Book) => {
      if (!target.pdf_url) {
        toast.error(lang === "bn" ? "এই বইয়ের জন্য কোনো PDF নেই।" : "No PDF available for this book.");
        return;
      }
      setPdfLoading(true);
      if (import.meta.env.DEV) {
        // Dev mode: serve local/public PDFs directly (mock/public PDF)
        setReaderBook(target);
        setPdfReaderUrl(target.pdf_url);
        setPdfLoading(false);
        return;
      }
      try {
        const result = await callFn(doGetPdfReaderUrl, {
          bookId: target.id,
          bucketPath: target.pdf_url,
          userId: user?.id,
        });
        setReaderBook(target);
        setPdfReaderUrl(result.signedUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : (lang === "bn" ? "রিডার খোলা যায়নি।" : "Failed to open reader."));
      } finally {
        setPdfLoading(false);
      }
    },
    [doGetPdfReaderUrl, user],
  );

  /* ── Read action (opens the inline modal viewer) ─────────────── */
  const handleReadAction = useCallback(() => {
    if (!book) return;
    openPdfReader(book);
  }, [book, openPdfReader]);

  const handleRead = () => {
    if (!user) {
      handleUnauthenticatedAction("read");
      return;
    }
    handleReadAction();
  };

  // Keep the refs fresh with the latest handlers (see handleAuthSuccess).
  handleReadActionRef.current = handleReadAction;
  handlePurchaseRef.current = handlePurchase;

  /* ── Guards (kept after every hook — Rules of Hooks) ─────────── */
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <p className="text-sm text-muted-foreground">{lang === "bn" ? "বইটি লোড করা যায়নি। পরে আবার চেষ্টা করুন।" : "Failed to load this book. Please try again later."}</p>
      </div>
    );
  }
  if (isLoading) return <BookDetailSkeleton />;
  if (!book) throw notFound();

  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");
  const description = pickLocalized(book.description_en, book.description_bn, lang, "");
  const authorBio = pickLocalized(book.author_bio_en, book.author_bio_bn, lang, "");
  const isOwned = book.is_free || !!owned;
  const hasProgress = progress && progress.progress_pct > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      <BackLink to="/books" label={lang === "bn" ? "সব বই" : "All Books"} search={{ search: "", page: 1 }} />

      <div className="grid md:grid-cols-[340px_1fr] gap-10 md:gap-16">
        {/* Cover — sticky only on md+ (two-column grid); on small screens it
            scrolls away in normal flow so it never overlaps the details. */}
        <div className="md:sticky md:top-28 md:self-start">
          <div className="aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-xl overflow-hidden border border-border/50 shadow-lg shadow-black/5">
            {book.cover_image ? (
              <img src={book.cover_image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BookOpen className="h-24 w-24 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {book.is_free && (
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border border-green-300/50 leading-none">{lang === "bn" ? "বিনামূল্যে" : "Free"}</span>
            )}
            {book.featured && (
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/50 leading-none">{lang === "bn" ? "বিশেষ" : "Featured"}</span>
            )}
          </div>

          {/* Reading progress (owned books) */}
          {isOwned && hasProgress && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/40">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{lang === "bn" ? "পড়ার অগ্রগতি" : "Reading Progress"}</span>
                <span className="font-medium text-foreground">{lang === "bn" ? toBanglaDigits(Math.round(progress!.progress_pct)) : Math.round(progress!.progress_pct)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress!.progress_pct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-8">
          {/* Title + Author */}
          <div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">{title}</h1>
            {book.author_name && (
              <p className="mt-3 text-sm text-muted-foreground">
                {lang === "bn" ? "লেখক" : "By"} <span className="text-foreground/80">{localizeAuthorName(book.author_name, lang)}</span>
              </p>
            )}
          </div>

          {/* Save actions — wishlist + bookmark, immediately visible next to the title.
              Bookmark uses the labeled pill variant so it shows for signed-out users too
              (with a sign-in affordance) instead of vanishing. */}
          <div className="flex items-center gap-2">
            <WishlistButton resourceId={book.id} />
            <BookmarkButton resourceId={book.id} resourceType="book" />
          </div>

          {/* Category & Tags */}
          {(book.category || book.tags?.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {book.category && (
                <Link
                  to="/reflections/$slug"
                  params={{ slug: book.category }}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border/40"
                >
                  {localizeCategoryName(book.category, lang)}
                </Link>
              )}
              {book.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/40 text-muted-foreground/70 border border-border/30"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          {ratingAgg && (
            <div>
              <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2">
                Rating
              </p>
              <div className="flex items-center gap-3">
                <StarRating
                  value={userRating ?? Math.round(ratingAgg.avg_rating)}
                  onChange={handleRating}
                  size="h-5 w-5"
                  showValue
                  totalRatings={ratingAgg.total_ratings}
                />
              </div>
              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-primary transition-colors cursor-pointer"
                >
                  {lang === "bn"
                    ? `${toBanglaDigits(reviews.length)}টি পর্যালোচনা পড়ুন`
                    : `Read ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <div>
              <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2">
                Description
              </p>
              <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {description}
              </div>
            </div>
          )}

          {/* Contents preview */}
          <Reveal delay={0.15}>
          {book.chapters && book.chapters.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-primary/30">
              <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
                <ListOrdered className="h-3.5 w-3.5" />
                {lang === "bn" ? "সূচিপত্র" : "Contents"}
              </p>
              <ol className="space-y-2.5">
                {book.chapters.slice(0, 6).map((ch, i) => (
                  <li key={ch} className="flex items-baseline gap-3 text-sm">
                    <span className="shrink-0 w-6 text-right font-serif text-xs text-primary/70 tabular-nums">{lang === "bn" ? toBanglaDigits(i + 1) : i + 1}</span>
                    <span className="text-foreground/80">{ch}</span>
                  </li>
                ))}
              </ol>
              {book.chapters.length > 6 && (
                <p className="mt-3 pl-9 text-xs text-muted-foreground/60">
                  {lang === "bn" ? `আরও ${toBanglaDigits(book.chapters.length - 6)}টি অধ্যায়…` : `+ ${book.chapters.length - 6} more chapters`}
                </p>
              )}
              {isOwned && (
                <button
                  onClick={() => openPdfReader(book)}
                  disabled={pdfLoading}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {pdfLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5" />
                  )}
                  {lang === "bn" ? "পড়া শুরু করুন" : "Start reading"} →
                </button>
              )}
            </div>
          )}
          </Reveal>

          {/* Metadata grid — 2 cols on phones so the Price / File Size cells breathe */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {book.pages > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
                  {lang === "bn" ? "পৃষ্ঠা" : "Pages"}
                </p>
                <p className="text-sm font-medium">{lang === "bn" ? toBanglaDigits(book.pages) : book.pages}</p>
              </div>
            )}
            {book.pages > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
                  {lang === "bn" ? "পড়ার সময়" : "Read Time"}
                </p>
                <p className="text-sm font-medium">
                  {lang === "bn"
                    ? `${toBanglaDigits(book.pages * 250)} মিনিট পড়া`
                    : formatReadingTime(book.pages * 250)}
                </p>
              </div>
            )}
            {book.isbn && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">ISBN</p>
                <p className="text-sm font-medium">{book.isbn}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
                {lang === "bn" ? "মূল্য" : "Price"}
              </p>
              <p className="text-sm font-medium">
                {book.is_free ? (
                  <span className="text-green-600 dark:text-green-400">{lang === "bn" ? "বিনামূল্যে" : "Free"}</span>
                ) : (
                  formatMoney(Number(book.price), lang)
                )}
              </p>
            </div>
            {book.pdf_file_size > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
                  {lang === "bn" ? "ফাইল সাইজ" : "File Size"}
                </p>
                <p className="text-sm font-medium">
                  {book.pdf_file_size >= 1024 * 1024
                    ? lang === "bn"
                      ? `${toBanglaDigits((book.pdf_file_size / (1024 * 1024)).toFixed(1))} MB`
                      : `${(book.pdf_file_size / (1024 * 1024)).toFixed(1)} MB`
                    : lang === "bn"
                      ? `${toBanglaDigits(Math.max(1, Math.round(book.pdf_file_size / 1024)))} KB`
                      : `${Math.max(1, Math.round(book.pdf_file_size / 1024))} KB`}
                </p>
              </div>
            )}
          </div>

          {/* Author bio */}
          <Reveal delay={0.2}>
          {authorBio && (
            <div className="rounded-xl border border-border/50 bg-secondary/10 p-5">
              <div className="flex items-start gap-4">
                <LetterAvatar name={localizeAuthorName(book.author_name, lang)} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
                    {lang === "bn" ? "লেখক সম্পর্কে" : "About the author"}
                  </p>
                  <p className="font-serif text-lg font-medium mb-2">{localizeAuthorName(book.author_name, lang)}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{authorBio}</p>
                </div>
              </div>
            </div>
          )}
          </Reveal>

          {/* Refund policy */}
          {config.commerce.refund_policy_en && !book.is_free && (
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              {lang === "bn" && config.commerce.refund_policy_bn
                ? config.commerce.refund_policy_bn
                : config.commerce.refund_policy_en}
            </p>
          )}

          {/* Rating breakdown */}
          <Reveal delay={0.25}>
          {ratingAgg && ratingAgg.total_ratings > 0 && (
            <div className="border border-border/60 rounded-xl p-6 bg-secondary/20">
              <p className="text-xs uppercase tracking-[0.15em] font-medium text-muted-foreground mb-4">
                Rating Breakdown
              </p>
              <RatingBreakdown
                distribution={ratingAgg.distribution}
                totalRatings={ratingAgg.total_ratings}
                avgRating={ratingAgg.avg_rating}
              />
            </div>
          )}
          </Reveal>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {book.pdf_url && (
              <>
                {isOwned ? (
                  <button
                    onClick={handleRead}
                    disabled={pdfLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {pdfLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {lang === "bn" ? "খোলা হচ্ছে..." : "Opening…"}
                      </>
                    ) : hasProgress ? (
                      <>
                        <BookOpen className="h-4 w-4" /> {lang === "bn" ? "পড়া চালিয়ে যান" : "Continue Reading"}
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" /> {lang === "bn" ? "এখনই পড়ুন" : "Read Now"}
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <BrandCtaButton
                      onClick={handlePurchase}
                      disabled={purchaseMutation.isPending}
                      className="px-6 py-3"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> {lang === "bn" ? "প্রক্রিয়া হচ্ছে..." : "Processing…"}
                        </>
                      ) : book.is_free ? (
                        <>
                          <Download className="h-4 w-4" /> {pickLocalized(config.commerce.get_free_copy_label_en, config.commerce.get_free_copy_label_bn, lang, "Get Free Copy")}
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" /> {lang === "bn" ? "কিনুন" : "Purchase"} — {formatMoney(Number(book.price), lang)}
                        </>
                      )}
                    </BrandCtaButton>
                    {!book.is_free && (
                      <button
                        onClick={() => cartMutation.mutate({ bookId: book.id, book })}
                        disabled={cartMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border border-border/60 rounded-lg hover:bg-secondary/60 hover:border-foreground/30 transition-colors disabled:opacity-50"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {lang === "bn" ? "কার্টে যোগ করুন" : "Add to Cart"}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Ownership & share row */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              {isOwned && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {book.is_free ? (lang === "bn" ? "বিনামূল্যে" : "Free to read") : (lang === "bn" ? "আপনি কিনেছেন" : "You own this book")}
                </span>
              )}
            </div>
            <SocialShare
              url={`${typeof window !== "undefined" ? window.location.origin : "https://sabbesatta.com"}/books/${book.slug}`}
              title={title}
              description={pickLocalized(book.description_en, book.description_bn, lang, "")}
            />
          </div>
        </div>
      </div>

      {/* Reader Reviews — full width, before recommendations */}
      <Reveal as="section" delay={0.3} className="mt-20 pt-10 border-t border-border/40">
        <BookReviews
          bookId={book.id}
          lang={lang}
          user={user}
          requireAuth={handleUnauthenticatedAction}
        />
      </Reveal>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          setAuthModalOpen(open);
          if (!open) pendingActionRef.current = null;
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Recommendations */}
      {showRecommendations && (
        <Reveal delay={0.35} className="mt-20 pt-10 border-t border-border/40">
          <BookRecommendations
            contentType="book"
            contentId={book.id}
            title={lang === "bn" ? "আপনি এটাও পছন্দ করতে পারেন" : "You Might Also Like"}
            limit={6}
          />
        </Reveal>
      )}

      {/* PDF Reader Modal — same inline viewer as the books grid eye icon */}
      <Dialog
        open={!!pdfReaderUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPdfReaderUrl(null);
            setReaderBook(null);
          }
        }}
      >
        <DialogContent hideClose className="sm:max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">
            {readerBook ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Book reader") : title}
          </DialogTitle>
          {pdfReaderUrl && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
                  Loading reader…
                </div>
              }
            >
              <PdfViewer
                url={pdfReaderUrl}
                title={
                  readerBook
                    ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Untitled")
                    : title
                }
                onClose={() => {
                  setPdfReaderUrl(null);
                  setReaderBook(null);
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
