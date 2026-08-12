import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPublishedBooks, type Book } from "@/lib/books";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, localizeCartResult, toBanglaDigits } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { addToCart } from "@/lib/cart";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { callFn } from "@/lib/call-fn";
import { openCartDrawer } from "@/lib/cart-events";
import { Heart, ArrowLeft, BookOpen, Loader2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { getSiteName } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import { BookCard } from "@/components/BookCard";
import { BookSkeleton } from "@/components/BookSkeleton";
import { Reveal } from "@/components/Reveal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/wishlist")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => seoHead({
    title: "Wishlist",
    description: "Your wishlisted books.",
    path: "/wishlist",
    siteName: loaderData || undefined,
  }),
  component: WishlistPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function WishlistPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const queryClient = useQueryClient();
  const { ids: wishlistIds, remove: removeFromWishlist, clear: clearWishlist } = useWishlist();
  const doAddToCart = useServerFn(addToCart);
  // Pending destructive remove — confirmed via the shared ConfirmDialog.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Fetch all books to get details for wishlisted IDs
  const { data: allBooksData, isLoading: booksLoading, isError: booksError } = useQuery({
    queryKey: ["wishlist-books"],
    queryFn: async () => {
      const result = await fetchPublishedBooks(1, 100, {});
      return result;
    },
    staleTime: 60_000,
  });

  /* ── Wishlist → cart bridge: add to cart + remove from wishlist ── */
  const cartMutation = useMutation({
    mutationFn: (payload: { bookId: string; book: MockCartBookSnapshot }) =>
      callFn(doAddToCart, { bookId: payload.bookId, book: payload.book }),
    onSuccess: (result: any, payload: { bookId: string; book: MockCartBookSnapshot }) => {
      removeFromWishlist(payload.bookId);
      if (result.alreadyInCart) toast.info(localizeCartResult(lang, result));
      else toast.success(localizeCartResult(lang, result));
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      openCartDrawer();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleMoveToCart = (book: MockCartBookSnapshot) => {
    cartMutation.mutate({ bookId: book.id, book });
  };

  /* ── Bulk action: move ALL wishlisted books to the cart ──────── */
  const bulkMoveMutation = useMutation({
    mutationFn: async (books: Book[]) => {
      // Sequentially add each book (the server mock is idempotent per book).
      for (const book of books) {
        await callFn(doAddToCart, { bookId: book.id, book: book as MockCartBookSnapshot });
      }
    },
    onSuccess: (_res, books) => {
      // Everything added — clear the wishlist and surface the drawer.
      clearWishlist();
      toast.success(
        lang === "bn"
          ? `${books.length}টি বই কার্টে যোগ করা হয়েছে`
          : `${books.length} book${books.length !== 1 ? "s" : ""} moved to cart`,
      );
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      openCartDrawer();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allBooks: Book[] = allBooksData?.data ?? [];
  const wishlistBooks = allBooks.filter((book) => wishlistIds.includes(String(book.id)));

  if (booksError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 text-center">
        <p className="text-sm text-muted-foreground">{lang === "bn" ? "উইশলিস্ট লোড করা যায়নি। পরে আবার চেষ্টা করুন।" : "Failed to load wishlist. Please try again later."}</p>
      </div>
    );
  }

  const handleRemove = (bookId: string) => {
    setConfirmRemoveId(bookId);
  };

  const pendingRemoveBook = allBooks.find((b) => String(b.id) === confirmRemoveId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-10">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> {lang === "bn" ? "হোম" : "Home"}
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mt-4">
          {lang === "bn" ? "উইশলিস্ট" : "Wishlist"}
        </h1>
      </div>

      {booksLoading ? (
        <BookSkeleton count={8} />
      ) : wishlistBooks.length === 0 ? (
        <div className="text-center py-24">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="text-lg font-medium mb-2">{lang === "bn" ? "আপনার উইশলিস্টে কোনো বই নেই" : "No books in your wishlist"}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {user
              ? (lang === "bn" ? "বই ব্রাউজ করুন এবং সেগুলি যোগ করতে হার্ট আইকনে ক্লিক করুন।" : "Browse books and click the heart icon to add them here.")
              : (lang === "bn" ? "ডিভাইস জুড়ে আপনার উইশলিস্ট সংরক্ষণ করতে সাইন ইন করুন, অথবা স্থানীয়ভাবে যোগ করতে বই ব্রাউজ করুন।" : "Sign in to save your wishlist across devices, or browse books to add locally.")}
          </p>
          <BrandCtaButton asChild className="px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
            <Link to="/books">
              {lang === "bn" ? "বই ব্রাউজ করুন" : "Browse Books"}
            </Link>
          </BrandCtaButton>
        </div>
      ) : (
        <>
          {/* Bulk action bar — appears when 2+ books are wishlisted */}
          {wishlistBooks.length > 1 && (
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? `${toBanglaDigits(wishlistBooks.length)}টি বই আপনার তালিকায় আছে`
                  : `${wishlistBooks.length} book${wishlistBooks.length !== 1 ? "s" : ""} in your wishlist`}
              </p>
              <button
                onClick={() => bulkMoveMutation.mutate(wishlistBooks)}
                disabled={bulkMoveMutation.isPending}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--color-saffron)]/40 bg-[var(--color-saffron)]/10 px-4 py-2 text-xs font-medium text-[var(--color-saffron)] hover:bg-[var(--color-saffron)]/20 hover:shadow-sm active:scale-95 transition-all duration-300 disabled:opacity-50"
              >
                {bulkMoveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShoppingCart className="h-3.5 w-3.5" />
                )}
                {lang === "bn" ? "সব কার্টে যোগ করুন" : "Move all to cart"}
              </button>
            </div>
          )}
          <div className="book-grid">
            {wishlistBooks.map((book, i) => (
              <Reveal key={book.id} delay={Math.min(i * 0.04, 0.3)}>
                <BookCard
                  book={book}
                  lang={lang}
                  userId={user?.id}
                  onRemove={handleRemove}
                  onAddToCart={handleMoveToCart}
                  isCartAdding={cartMutation.isPending}
                />
              </Reveal>
            ))}
          </div>
        </>
      )}

      {/* ── Destructive-action confirmation ── */}
      <ConfirmDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
        title={lang === "bn" ? "উইশলিস্ট থেকে সরাবেন?" : "Remove from wishlist?"}
        description={
          lang === "bn"
            ? `"${pendingRemoveBook?.title_bn || pendingRemoveBook?.title_en || ""}" উইশলিস্ট থেকে সরানো হবে।`
            : `Remove "${pendingRemoveBook?.title_en || pendingRemoveBook?.title_bn || ""}" from your wishlist?`
        }
        confirmLabel={lang === "bn" ? "সরান" : "Remove"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
        onConfirm={() => {
          if (confirmRemoveId) {
            removeFromWishlist(confirmRemoveId);
            toast.success(lang === "bn" ? "উইশলিস্ট থেকে সরানো হয়েছে" : "Removed from wishlist");
          }
          setConfirmRemoveId(null);
        }}
      />
    </div>
  );
}
