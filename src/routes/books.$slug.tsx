import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchBookBySlug, type Book } from "@/lib/books";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/useAuth";
import { getBookRatingAggregates, getUserRating, submitRating } from "@/lib/books-ratings";
import { getReadingProgress } from "@/lib/books-progress";
import { purchaseBookAction } from "@/lib/books-reader";
import { checkOwnership as fetchCheckOwnership } from "@/lib/books-purchases";
import { AuthModal } from "@/components/AuthModal";
import { StarRating, RatingBreakdown } from "@/components/StarRating";
import { BookDetailSkeleton } from "@/components/BookSkeleton";
import { useServerFn } from "@tanstack/react-start";
import { addToCart } from "@/lib/cart";
import { BookmarkButton } from "@/components/BookmarkButton";
import { BookRecommendations } from "@/components/BookRecommendations";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { estimateReadingTime, formatReadingTime } from "@/lib/commerce";
import { generateBookSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { SocialShare } from "@/components/SocialShare";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  Eye,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Lock,
  ShoppingCart,
} from "lucide-react";

export const Route = createFileRoute("/books/$slug")({
  loader: async ({ params }) => {
    const [book, siteName] = await Promise.all([fetchBookBySlug(params.slug), getSiteName()]);
    if (!book) throw notFound();
    return { book, siteName };
  },
  head: ({ loaderData }) => {
    const ld = loaderData as { book: Book; siteName: string } | undefined;
    const b = ld?.book;
    const name = ld?.siteName ?? "Sabbe Satta";
    const bookTitle = b?.title_en || b?.title_bn || "Book";
    const desc = b?.meta_description_en || b?.description_en || "View book details.";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bodhimitra.com";
    const bookUrl = `${baseUrl}/books/${b?.slug || ""}`;

    const bookSchema = generateBookSchema({
      name: bookTitle,
      description: desc,
      url: bookUrl,
      imageUrl: b?.cover_image || undefined,
      author: b?.author_name || undefined,
      isbn: b?.isbn || undefined,
      price: b?.price || 0,
      currency: "USD",
      rating: b?.avg_rating || undefined,
      ratingCount: b?.total_ratings || undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: baseUrl },
      { name: "Books", url: `${baseUrl}/books` },
      { name: bookTitle, url: bookUrl },
    ]);

    return {
      meta: [
        { title: `${bookTitle} — ${name}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${bookTitle} — ${name}` },
        { property: "og:description", content: desc },
        { property: "og:image", content: b?.cover_image || "" },
        { property: "og:url", content: bookUrl },
        { property: "og:type", content: "book" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: bookTitle },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: b?.cover_image || "" },
      ],
      scripts: [
        { type: "application/ld+json", JSON: bookSchema },
        { type: "application/ld+json", JSON: breadcrumbSchema },
      ],
    };
  },
  component: BookDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-3xl">This book hasn't been written yet.</h1>
      <Link
        to="/books"
        search={{ search: "", page: 1 }}
        className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground"
      >
        Browse books
      </Link>
    </div>
  ),
});

function BookDetailPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const config = useSiteSettings();
  const symbol = config.commerce.currency_symbol || "$";
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const [isReadingAction, setIsReadingAction] = useState(false);
  const [stripeToastShown, setStripeToastShown] = useState(false);

  const doPurchase = useServerFn(purchaseBookAction);

  /* ── Book data ───────────────────────────────────────────────── */
  const { data: book, isLoading } = useQuery({
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

  /* ── Stripe redirect feedback ────────────────────────────────── */
  useEffect(() => {
    if (stripeToastShown || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    if (purchase === "success") {
      toast.success("Purchase complete! You now own this book.");
      window.history.replaceState({}, "", window.location.pathname);
      setStripeToastShown(true);
    } else if (purchase === "cancel") {
      toast.info("Purchase was cancelled. No charges were made.");
      window.history.replaceState({}, "", window.location.pathname);
      setStripeToastShown(true);
    }
  }, [stripeToastShown]);

  if (isLoading) return <BookDetailSkeleton />;
  if (!book) throw notFound();

  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");
  const description = pickLocalized(book.description_en, book.description_bn, lang, "");
  const isOwned = book.is_free || !!owned;
  const hasProgress = progress && progress.progress_pct > 0;

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
      // Dispatch the action after auth state propagates
      setTimeout(() => {
        if (action === "read") handleReadAction();
        else if (action === "purchase") handlePurchase();
      }, 500);
    }
  }, []);

  /* ── Rating mutation (with optimistic update) ────────────────── */
  const ratingMutation = useMutation({
    mutationFn: (rating: number) => {
      if (!user) throw new Error("Not authenticated");
      return submitRating({ userId: user.id, bookId: book.id, rating });
    },
    onMutate: async (newRating) => {
      await queryClient.cancelQueries({ queryKey: ["book-user-rating", book.id, user?.id] });
      const previous = queryClient.getQueryData(["book-user-rating", book.id, user?.id]);
      queryClient.setQueryData(["book-user-rating", book.id, user?.id], newRating);
      return { previous };
    },
    onError: (_err, _newRating, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["book-user-rating", book.id, user?.id], context.previous);
      }
      toast.error("Failed to update rating. Try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-user-rating", book.id] });
      queryClient.invalidateQueries({ queryKey: ["book-rating-agg", book.id] });
      queryClient.invalidateQueries({ queryKey: ["public-books-infinite"] });
      toast.success("Rating saved");
    },
  });

  const handleRating = (rating: number) => {
    if (!user) {
      handleUnauthenticatedAction("rate");
      return;
    }
    ratingMutation.mutate(rating);
  };

  /* ── Add to cart mutation ─────────────────────────────────── */
  const cartMutation = useMutation({
    mutationFn: (bookId: string) => (doAddToCart as any)({ data: { bookId } }),
    onSuccess: (result: any) => {
      if (result.alreadyInCart) {
        toast.info(result.message);
      } else {
        toast.success(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const doAddToCart = useServerFn(addToCart);

  /* ── Purchase mutation (with Stripe Checkout redirect) ───────── */
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      return (doPurchase as any)({ data: { bookId: book.id, bookSlug: book.slug } });
    },
    onSuccess: (result: any) => {
      if (result.url) {
        window.location.href = result.url;
      } else if (result.alreadyOwned) {
        toast.info("You already own this book.");
      } else {
        toast.success("Book added to your library!");
        queryClient.invalidateQueries({ queryKey: ["book-owned", book.id] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process purchase. Try again.");
    },
  });

  const handlePurchase = () => {
    if (!user) {
      handleUnauthenticatedAction("purchase");
      return;
    }
    purchaseMutation.mutate();
  };

  /* ── Read action (navigate to dedicated reader route) ────────── */
  const handleReadAction = useCallback(() => {
    if (!book?.id) return;
    navigate({ to: `/reader/${book.id}` as any });
  }, [book, navigate]);

  const handleRead = () => {
    if (!user) {
      handleUnauthenticatedAction("read");
      return;
    }
    handleReadAction();
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <PublicBreadcrumbs />

      <div className="grid md:grid-cols-[320px_1fr] gap-10 md:gap-14">
        {/* Cover */}
        <div className="sticky top-28 self-start">
          <div className="aspect-[3/4] bg-gradient-to-br from-secondary/40 to-secondary/10 rounded-xl overflow-hidden border border-border/50">
            {book.cover_image ? (
              <img src={book.cover_image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BookOpen className="h-24 w-24 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Badges below cover */}
          <div className="flex flex-wrap gap-2 mt-4">
            {book.is_free && (
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border border-green-300/50">
                Free
              </span>
            )}
            {book.featured && (
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/50">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-8">
          {/* Title + Author */}
          <div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">{title}</h1>
            {book.author_name && (
              <p className="mt-3 text-sm text-muted-foreground">By {book.author_name}</p>
            )}
          </div>

          {/* Rating */}
          {ratingAgg && (
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2">
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
            </div>
          )}

          {/* Description */}
          {description && (
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-2">
                Description
              </p>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {description}
              </div>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {book.pages > 0 && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                  Pages
                </p>
                <p className="text-sm font-medium">{book.pages}</p>
              </div>
            )}
            {book.pages > 0 && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                  Reading Time
                </p>
                <p className="text-sm font-medium">{formatReadingTime(book.pages * 250)}</p>
              </div>
            )}
            {book.isbn && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                  ISBN
                </p>
                <p className="text-sm font-medium">{book.isbn}</p>
              </div>
            )}
            <div>
              <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                Price
              </p>
              <p className="text-sm font-medium">
                {book.is_free ? "Free" : `${symbol}${Number(book.price).toFixed(2)}`}
              </p>
            </div>
            {book.pdf_file_size > 0 && (
              <div>
                <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                  File Size
                </p>
                <p className="text-sm font-medium">
                  {(book.pdf_file_size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            )}
            {config.commerce.refund_policy_en && !book.is_free && (
              <div className="col-span-2 mt-2">
                <p className="text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                  Refund Policy
                </p>
                <p className="text-xs text-muted-foreground">
                  {lang === "bn" && config.commerce.refund_policy_bn
                    ? config.commerce.refund_policy_bn
                    : config.commerce.refund_policy_en}
                </p>
              </div>
            )}
          </div>

          {/* Rating breakdown */}
          {ratingAgg && ratingAgg.total_ratings > 0 && (
            <div className="border border-border/60 rounded-xl p-6 bg-secondary/20">
              <p className="text-[0.55rem] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-4">
                Rating Breakdown
              </p>
              <RatingBreakdown
                distribution={ratingAgg.distribution}
                totalRatings={ratingAgg.total_ratings}
                avgRating={ratingAgg.avg_rating}
              />
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {/* Social sharing */}
            <SocialShare
              url={`${typeof window !== "undefined" ? window.location.origin : "https://bodhimitra.com"}/books/${book.slug}`}
              title={title}
              description={pickLocalized(book.description_en, book.description_bn, lang, "")}
            />
            {/* Bookmark button */}
            <div className="ml-auto">
              <BookmarkButton resourceId={book.id} resourceType="book" compact />
            </div>
            {/* Read Now / Continue */}
            {book.pdf_url && (
              <>
                {isOwned ? (
                  <button
                    onClick={handleRead}
                    disabled={isReadingAction}
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {isReadingAction ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…
                      </>
                    ) : hasProgress ? (
                      <>
                        <BookOpen className="h-3.5 w-3.5" /> Continue Reading
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Read Now
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePurchase}
                      disabled={purchaseMutation.isPending}
                      className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
                        </>
                      ) : book.is_free ? (
                        <>
                          <Download className="h-3.5 w-3.5" /> Get Free Copy
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Purchase — {symbol}
                          {Number(book.price).toFixed(2)}
                        </>
                      )}
                    </button>
                    {!book.is_free && (
                      <button
                        onClick={() => cartMutation.mutate(book.id)}
                        disabled={cartMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-3 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 hover:border-foreground/30 transition-colors disabled:opacity-40"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to Cart
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Already owned indicator */}
          {isOwned && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Free to read
            </div>
          )}
        </div>
      </div>

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
      <BookRecommendations
        contentType="book"
        contentId={book.id}
        title="You Might Also Like"
        limit={6}
      />
    </div>
  );
}
