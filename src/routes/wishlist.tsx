import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPublishedBooks, type Book } from "@/lib/books";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, localizeCartResult } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { addToCart } from "@/lib/cart";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { callFn } from "@/lib/call-fn";
import { openCartDrawer } from "@/lib/cart-events";
import { Heart, ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { getSiteName } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import { BookCard } from "@/components/BookCard";
import { BookSkeleton } from "@/components/BookSkeleton";
import { BrandCtaButton } from "@/components/BrandCtaButton";
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
  const { ids: wishlistIds, remove: removeFromWishlist } = useWishlist();
  const doAddToCart = useServerFn(addToCart);

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
    removeFromWishlist(bookId);
    toast.success(lang === "bn" ? "উইশলিস্ট থেকে সরানো হয়েছে" : "Removed from wishlist");
  };

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
        <div className="book-grid">
          {wishlistBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              lang={lang}
              userId={user?.id}
              onRemove={handleRemove}
              onAddToCart={handleMoveToCart}
              isCartAdding={cartMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
