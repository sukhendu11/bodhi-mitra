import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized, toBanglaDigits, type Lang } from "@/lib/i18n";
import { localizeAuthorName } from "@/lib/taxonomy";
import { submitRating, getUserRating } from "@/lib/books-ratings";
import { getReadingProgress } from "@/lib/books-progress";
import { checkOwnership } from "@/lib/books-purchases";
import { isMockId } from "@/lib/utils";
import { isMockMode } from "@/lib/data-source";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { StarRating } from "@/components/StarRating";
import { WishlistButton } from "@/components/WishlistButton";
import { toast } from "sonner";
import { BookOpen, Eye, Loader2, Lock, BookMarked, ChevronRight, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import type { Book } from "@/lib/books";

export function BookCard({
  book,
  lang,
  userId,
  onEyeClick,
  requireAuth,
  pdfLoading,
  onAddToCart,
  isCartAdding,
  onRemove,
}: {
  book: Book;
  lang: Lang;
  userId?: string | null;
  onEyeClick?: (book: Book) => void;
  requireAuth?: (action: () => void) => void;
  pdfLoading?: boolean;
  /** Passes the full book so the mock cart can snapshot admin-created books. */
  onAddToCart?: (book: MockCartBookSnapshot) => void;
  isCartAdding?: boolean;
  onRemove?: (bookId: string) => void;
}) {
  const queryClient = useQueryClient();
  const config = useSiteSettings();
  const title = pickLocalized(book.title_en, book.title_bn, lang, lang === "bn" ? "শিরোনামহীন" : "Untitled");
  const author = localizeAuthorName(book.author_name, lang) || (lang === "bn" ? "অজানা" : "Unknown");

  const isMockBook = isMockId(book.id);
  // In mock mode the mock store handles mock book ids, so keep the queries
  // enabled; only skip them for mock ids in real-backend mode.
  const queriesEnabled = !!userId && (isMockMode() || !isMockBook);

  const { data: userRating } = useQuery({
    queryKey: ["book-user-rating", book.id, userId],
    queryFn: () => getUserRating(userId, book.id),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const { data: progress } = useQuery({
    queryKey: ["book-progress", book.id, userId],
    queryFn: () => getReadingProgress(userId, book.id),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const hasProgress = progress && progress.progress_pct > 0;

  const { data: owned } = useQuery({
    queryKey: ["book-owned", book.id, userId],
    queryFn: () => checkOwnership(userId, book.id),
    enabled: queriesEnabled,
    staleTime: 30_000,
  });

  const isUnlocked = book.is_free || !!owned;

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => {
      if (!userId) throw new Error("Not authenticated");
      return submitRating({ userId, bookId: book.id, rating });
    },
    onMutate: async (newRating) => {
      await queryClient.cancelQueries({ queryKey: ["book-user-rating", book.id, userId] });
      const previous = queryClient.getQueryData(["book-user-rating", book.id, userId]);
      queryClient.setQueryData(["book-user-rating", book.id, userId], newRating);
      return { previous };
    },
    onError: (err: Error, _newRating, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["book-user-rating", book.id, userId], context.previous);
      }
      toast.error(lang === "bn" ? "রেটিং আপডেট করা যায়নি। আবার চেষ্টা করুন।" : "Failed to update rating. Try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-user-rating", book.id] });
      queryClient.invalidateQueries({ queryKey: ["public-books-infinite"] });
      toast.success(lang === "bn" ? "রেটিং সংরক্ষিত হয়েছে" : "Rating saved");
    },
  });

  const handleRating = (rating: number) => {
    if (requireAuth) {
      requireAuth(() => ratingMutation.mutate(rating));
    } else {
      toast.error(lang === "bn" ? "রেটিং দিতে সাইন ইন করুন" : "Please sign in to rate books");
    }
  };

  const detailSearch = { search: "", page: 1 };

  return (
    <div className="book-card group relative bg-card border border-border/40 overflow-hidden hover:border-foreground/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
      {/* Stretched link — the ENTIRE card navigates to the book detail page */}
      <Link
        to="/books/$slug"
        params={{ slug: book.slug }}
        search={detailSearch}
        aria-label={`${title} — ${author}`}
        title={title}
        className="absolute inset-0 z-10 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
      />

      <div className="book-card-cover bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center overflow-hidden relative">
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

        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
          {book.is_free && (
            <span className="book-card-free-badge font-semibold uppercase px-1.5 py-px rounded bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border border-green-300/50 leading-none">{pickLocalized(config.commerce.get_free_copy_label_en, config.commerce.get_free_copy_label_bn, lang, "Free")}</span>
          )}
          {book.featured && (
            <span className="book-card-featured-badge font-semibold uppercase px-1.5 py-px rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/50 leading-none">{lang === "bn" ? "বিশেষ" : "Featured"}</span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
          <WishlistButton resourceId={book.id} compact />
          {onEyeClick && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEyeClick(book);
              }}
              disabled={pdfLoading}
              className="p-2 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)] ring-1 ring-foreground/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-700 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              title={isUnlocked ? (lang === "bn" ? "বই পড়ুন" : "Read book") : (lang === "bn" ? "কিনে পড়ুন" : "Purchase to read")}
            >
              {isUnlocked ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Hover affordance — darkens the cover and reveals a "View details"
            pill, hinting the whole card is clickable. pointer-events-none so it
            never blocks the stretched link or the eye/heart controls (z-20). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 motion-reduce:transition-none" />
          <div className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-lg ring-1 ring-black/10 text-xs font-medium uppercase tracking-[0.12em] text-foreground translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 motion-reduce:translate-y-0 motion-reduce:transition-none">
            <ArrowRight className="h-3.5 w-3.5" />
            {lang === "bn" ? "বিস্তারিত" : "View Details"}
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="book-card-title font-medium font-serif group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="book-card-author text-muted-foreground mt-1">{author}</p>

        {/* Star rating sits above the stretched link so it stays interactive.
            w-fit shrink-wraps the row so clicks on the empty card area around
            the stars fall through to the navigation link. */}
        <div className="relative z-20 mt-1.5 w-fit">
          <StarRating
            value={userRating ?? Math.round(book.avg_rating ?? 0)}
            onChange={handleRating}
            size="h-3 w-3"
            showValue
            totalRatings={book.total_ratings ?? 0}
          />
        </div>

        {hasProgress && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <BookMarked className="h-2.5 w-2.5 text-blue-500" />
              <span className="book-card-metadata font-medium text-blue-600 dark:text-blue-400">
                {lang === "bn" ? "চালিয়ে যান" : "Continue"}
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

        <div className="flex items-center gap-1 mt-2">
          {!isUnlocked && onAddToCart && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(book);
              }}
              disabled={isCartAdding}
              className="book-card-metadata relative z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-border/70 bg-secondary/30 text-foreground/90 hover:bg-primary hover:border-primary hover:text-primary-foreground hover:shadow-[0_2px_10px_hsl(var(--primary)/0.3)] active:scale-95 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-sm ring-1 ring-black/5"
              title={lang === "bn" ? "কার্টে যোগ করুন" : "Add to cart"}
            >
              {isCartAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {lang === "bn" ? "কার্টে যোগ করুন" : "Add to Cart"}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-muted-foreground">
            {book.pages > 0 && <span className="book-card-metadata">{lang === "bn" ? `${toBanglaDigits(book.pages)} পৃষ্ঠা` : `${book.pages} pages`}</span>}
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(String(book.id));
          }}
          className="absolute top-2 right-2 z-30 p-2 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)] ring-1 ring-foreground/[0.04] text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title={lang === "bn" ? "উইশলিস্ট থেকে সরান" : "Remove from wishlist"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
