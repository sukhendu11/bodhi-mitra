import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyLibrary, type LibraryBook } from "@/lib/books-purchases";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, formatMoney, toBanglaDigits, formatDate } from "@/lib/i18n";
import { seoHead } from "@/lib/seo";
import { BackLink } from "@/components/BackLink";
import { AuthModal } from "@/components/AuthModal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { callFn } from "@/lib/call-fn";
import { useState } from "react";
import {
  BookOpen,
  Clock,
  CheckCircle,
  Library,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { StatCard, StatGrid } from "@/components/StatCard";

export const Route = createFileRoute("/purchases")({
  head: () => seoHead({
    title: "My Books",
    description: "Your purchased books and reading history.",
    path: "/purchases",
    noIndex: true,
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const doGetLibrary = useServerFn(getMyLibrary);

  const { data: library, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => callFn(doGetLibrary, { userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const books: LibraryBook[] = library?.books ?? [];

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
          <Library className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <h1 className="font-serif text-3xl mb-3">
          {lang === "bn" ? "আমার বই" : "My Books"}
        </h1>
        <p className="text-base text-muted-foreground mb-8">
          {lang === "bn"
            ? "আপনার বই দেখতে সাইন ইন করুন।"
            : "Sign in to view your books."}
        </p>
        <BrandCtaButton
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3 text-xs"
        >
          {lang === "bn" ? "সাইন ইন" : "Sign in"}
        </BrandCtaButton>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  const freeBooks = books.filter((b) => b.isFree);
  const paidBooks = books.filter((b) => !b.isFree);
  const totalSpent = paidBooks.reduce((sum, b) => sum + (b as any).amount_paid || 0, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-20">
      <BackLink
        to="/profile"
        label={lang === "bn" ? "প্রোফাইল" : "Profile"}
      />

      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl">
          {lang === "bn" ? "আমার বই" : "My Books"}
        </h1>
        <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-saffron/60 to-saffron/20" />
        <Link
          to="/orders"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Receipt className="h-3.5 w-3.5" />
          {lang === "bn" ? "অর্ডার ও রসিদ দেখুন" : "View orders & receipts"}
        </Link>
      </div>

      {/* Stats — StatGrid stacks the money grid to 1 col on phones */}
      <StatGrid columns={3} money className="gap-4 mb-10">
        <StatCard value={lang === "bn" ? toBanglaDigits(books.length) : books.length} label={lang === "bn" ? "মোট বই" : "Total Books"} />
        <StatCard value={lang === "bn" ? toBanglaDigits(paidBooks.length) : paidBooks.length} label={lang === "bn" ? "কেনা বই" : "Purchased"} />
        <StatCard value={formatMoney(totalSpent, lang)} label={lang === "bn" ? "মোট খরচ" : "Total Spent"} money />
      </StatGrid>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && books.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-secondary/20 border border-border/40">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            {lang === "bn"
              ? "আপনি এখনো কোনো বই কিনেনি।"
              : "You haven't purchased any books yet."}
          </p>
          <Link
            to="/books"
            search={{ search: "", page: 1 }}
            className="text-xs text-primary hover:underline"
          >
            {lang === "bn" ? "বই ব্রাউজ করুন" : "Browse books"}
          </Link>
        </div>
      )}

      {/* Paid books */}
      {!isLoading && paidBooks.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-medium text-muted-foreground mb-4">
            {lang === "bn" ? "কেনা বই" : "Purchased Books"}
          </h2>
          <div className="space-y-3">
            {paidBooks.map((book) => (
              <Link
                key={book.bookId}
                to="/books/$slug"
                params={{ slug: book.slug }}
                className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border/40 hover:border-foreground/20 hover:shadow-md transition-all duration-300 group"
              >
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt=""
                    className="w-12 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {book.titleEn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {book.author}
                  </p>
                  {book.progressPct > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1 w-20 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(book.progressPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {lang === "bn" ? toBanglaDigits(Math.round(book.progressPct)) : Math.round(book.progressPct)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(book.purchaseDate, lang, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {book.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {lang === "bn" ? "সম্পন্ন" : "Completed"}
                    </span>
                  ) : book.progressPct > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                      <Clock className="h-2.5 w-2.5" />
                      {lang === "bn" ? "পড়া চলছে" : "In Progress"}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Free books */}
      {!isLoading && freeBooks.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-muted-foreground mb-4">
            {lang === "bn" ? "বিনামূল্যের বই" : "Free Books"}
          </h2>
          <div className="space-y-3">
            {freeBooks.map((book) => (
              <Link
                key={book.bookId}
                to="/books/$slug"
                params={{ slug: book.slug }}
                className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border/40 hover:border-foreground/20 hover:shadow-md transition-all duration-300 group"
              >
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt=""
                    className="w-12 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {book.titleEn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {book.author}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
