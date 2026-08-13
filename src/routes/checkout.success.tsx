import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyLibrary } from "@/lib/books-purchases";
import { getOrders, type OrderReceipt } from "@/lib/orders";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, formatMoney } from "@/lib/i18n";
import { invalidateCheckoutQueries } from "@/lib/checkout-invalidation";
import { seoHead } from "@/lib/seo";
import { CheckCircle, BookOpen, ArrowRight, Library, Lock } from "lucide-react";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { callFn } from "@/lib/call-fn";

export const Route = createFileRoute("/checkout/success")({
  head: () => seoHead({
    title: "Purchase Complete",
    description: "Your books have been added to your library.",
    path: "/checkout/success",
    noIndex: true,
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const queryClient = useQueryClient();
  const doGetLibrary = useServerFn(getMyLibrary);
  const doGetOrders = useServerFn(getOrders);

  useEffect(() => {
    // Purchased books flip lock → eye on every BookCard immediately,
    // without waiting for the 30s staleTime on book-owned queries.
    invalidateCheckoutQueries(queryClient);
  }, [queryClient]);

  const { data: library } = useQuery({
    queryKey: ["library"],
    queryFn: () => callFn(doGetLibrary, { userId: user?.id }),
    enabled: !!user,
    staleTime: 10_000,
  });

  // Latest order (receipt) for the confirmation breakdown (F5 #5).
  const { data: orders = [] } = useQuery<OrderReceipt[]>({
    queryKey: ["orders", user?.id],
    queryFn: () => callFn(doGetOrders, { userId: user?.id }),
    enabled: !!user,
    staleTime: 0,
  });

  const latestOrder = orders[0];
  const recentBooks = library?.books?.slice(0, 3) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
      {/* Celebration mark — saffron gradient + soft glow.
          Intentional brand-celebration divergence from the green success
          token (DESIGN.md §2.1): this is the funnel's completion moment,
          so it wears the saffron brand language like the CTAs around it.
          The green 'Secure' pill below keeps the success/trust semantics. */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ background: "linear-gradient(135deg, var(--color-saffron-500), var(--color-saffron-gold))" }}
          aria-hidden="true"
        />
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg ring-1 ring-[var(--color-saffron)]/20"
          style={{ background: "linear-gradient(135deg, var(--color-saffron-500), var(--color-saffron-gold))" }}
        >
          <CheckCircle className="h-9 w-9 text-white" aria-hidden="true" />
        </div>
      </div>

      <h1 className="font-serif text-3xl md:text-4xl mb-3">
        {lang === "bn" ? "কেনাকাটা সম্পন্ন!" : "Purchase Complete!"}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        {lang === "bn"
          ? "আপনার বইগুলো এখন আপনার লাইব্রেরিতে যোগ করা হয়েছে। আপনি এখনই পড়া শুরু করতে পারেন।"
          : "Your books have been added to your library. You can start reading right away."}
      </p>

      {/* Recently purchased books — tinted cards matching the cart drawer */}
      {recentBooks.length > 0 && (
        <div className="mt-10 text-left">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4 text-center">
            {lang === "bn" ? "সম্প্রতি কেনা বই" : "Recently Purchased"}
          </p>
          <div className="space-y-3">
            {recentBooks.map((book: any) => (
              <Link
                key={book.bookId}
                to="/books/$slug"
                params={{ slug: book.slug }}
                className="group/item flex items-center gap-4 p-4 rounded-xl bg-secondary/20 border border-border/20 hover:border-border/40 hover:bg-secondary/30 hover:shadow-sm transition-all duration-200"
              >
                {book.coverImage ? (
                  <img src={book.coverImage} alt="" className="w-10 h-14 rounded-lg object-cover shrink-0 shadow-sm ring-1 ring-black/5" />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5">
                    <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium line-clamp-1 group-hover/item:text-[var(--color-saffron)] transition-colors">
                    {book.titleEn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover/item:text-[var(--color-saffron)] group-hover/item:translate-x-0.5 transition-all duration-200" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Order receipt — elevated card */}
      {latestOrder && (
        <div className="mt-10 text-left max-w-sm mx-auto rounded-2xl border border-border/50 bg-card p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {lang === "bn" ? "রসিদ" : "Receipt"}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-300/40">
              <Lock className="h-2.5 w-2.5" /> {lang === "bn" ? "নিরাপদ" : "Secure"}
            </span>
          </div>
          <div className="pt-2 space-y-1 text-sm">
            {latestOrder.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-muted-foreground">
                <span className="min-w-0 flex-1 truncate pr-3">
                  {lang === "bn" && item.titleBn ? item.titleBn : item.titleEn}
                </span>
                <span className="shrink-0 font-sans tabular-nums">{formatMoney(item.price, lang)}</span>
              </div>
            ))}
            {latestOrder.discount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{lang === "bn" ? "ছাড়" : "Discount"}</span>
                <span className="text-green-600 dark:text-green-400 font-sans tabular-nums">-{formatMoney(latestOrder.discount, lang)}</span>
              </div>
            )}
            {latestOrder.tax > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{lang === "bn" ? "কর" : "Tax"}</span>
                <span className="font-sans tabular-nums">{formatMoney(latestOrder.tax, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-border/30 font-medium">
              <span>{lang === "bn" ? "মোট" : "Total"}</span>
              <span className="font-sans text-base font-semibold tabular-nums">{formatMoney(latestOrder.total, lang)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <BrandCtaButton asChild className="px-6 py-3">
          <Link to="/purchases">
            <Library className="h-4 w-4" />
            {lang === "bn" ? "আমার লাইব্রেরি" : "Go to Library"}
          </Link>
        </BrandCtaButton>
        <Link
          to="/books"
          search={{ search: "", page: 1 }}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl border border-border/50 hover:border-foreground/30 hover:bg-secondary/40 transition-all duration-200"
        >
          {lang === "bn" ? "আরও বই দেখুন" : "Browse More Books"}
        </Link>
      </div>
    </div>
  );
}
