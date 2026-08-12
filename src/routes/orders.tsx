import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOrders, type OrderReceipt } from "@/lib/orders";
import { addToCart } from "@/lib/cart";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, formatMoney, toBanglaDigits, formatDate } from "@/lib/i18n";
import { seoHead } from "@/lib/seo";
import { BackLink } from "@/components/BackLink";
import { AuthModal } from "@/components/AuthModal";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { callFn } from "@/lib/call-fn";
import { openCartDrawer } from "@/lib/cart-events";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { StatCard, StatGrid } from "@/components/StatCard";
import { Receipt, BookOpen, ShoppingBag, ChevronDown, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () =>
    seoHead({
      title: "Order History",
      description: "Your orders and receipts on Sabbe Satta.",
      path: "/orders",
      noIndex: true,
    }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const doGetOrders = useServerFn(getOrders);

  const { data: orders = [], isLoading } = useQuery<OrderReceipt[]>({
    queryKey: ["orders", user?.id],
    queryFn: () => callFn(doGetOrders, { userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── Reorder: add each item of an order back to the cart ───────── */
  const queryClient = useQueryClient();
  const doAddToCart = useServerFn(addToCart);
  const reorderMutation = useMutation({
    mutationFn: async (items: OrderReceipt["items"]) => {
      for (const item of items) {
        await callFn(doAddToCart, {
          bookId: item.bookId,
          book: {
            id: item.bookId,
            title_en: item.titleEn,
            title_bn: item.titleBn,
            slug: item.bookId,
            cover_image: null,
            price: item.price,
            is_free: false,
            author_name: null,
          },
        });
      }
    },
    onSuccess: (_data, items) => {
      const n = items.length;
      toast.success(
        lang === "bn"
          ? `${toBanglaDigits(n)} টি বই কার্টে যোগ হয়েছে`
          : `${n} ${n === 1 ? "book" : "books"} added to your cart`
      );
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      openCartDrawer();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="font-serif text-3xl mb-3">
          {lang === "bn" ? "অর্ডার ও রসিদ" : "Orders & Receipts"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {lang === "bn"
            ? "আপনার অর্ডার ও রসিদ দেখতে সাইন ইন করুন।"
            : "Sign in to view your orders and receipts."}
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

  const totalSpent = orders.reduce((sum: number, o) => sum + o.total, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-20">
      <BackLink to="/profile" label={lang === "bn" ? "প্রোফাইল" : "Profile"} />

      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl">
          {lang === "bn" ? "অর্ডার ও রসিদ" : "Orders & Receipts"}
        </h1>
        <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-saffron/60 to-saffron/20" />
        <Link
          to="/purchases"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {lang === "bn" ? "আমার বই দেখুন" : "View my books"}
        </Link>
      </div>

      {/* Stats — StatGrid keeps 2-col on phones (text-xl money fits) */}
      <StatGrid columns={2} money className="gap-4 mb-10">
        <StatCard value={orders.length} label={lang === "bn" ? "মোট অর্ডার" : "Total Orders"} />
        <StatCard value={formatMoney(totalSpent, lang)} label={lang === "bn" ? "মোট খরচ" : "Total Spent"} money />
      </StatGrid>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 skeleton-shimmer rounded-xl"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-secondary/20 border border-border/40">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            {lang === "bn" ? "আপনার এখনো কোনো অর্ডার নেই।" : "You haven't placed any orders yet."}
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

      {/* Orders */}
      {!isLoading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order: OrderReceipt) => (
            <OrderCard
              key={order.id}
              order={order}
              lang={lang}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onReorder={() => reorderMutation.mutate(order.items)}
              reordering={reorderMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  lang,
  expanded,
  onToggle,
  onReorder,
  reordering,
}: {
  order: OrderReceipt;
  lang: "en" | "bn";
  expanded: boolean;
  onToggle: () => void;
  onReorder: () => void;
  reordering: boolean;
}) {
  const itemCount = order.items.reduce((s, i) => s + 1, 0);
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header — always visible */}        <button
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left hover:bg-secondary/20 transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
          <Receipt className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {lang === "bn" ? "অর্ডার" : "Order"} #{lang === "bn" ? toBanglaDigits(order.id.slice(-8).toUpperCase()) : order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(order.createdAt, lang)} ·{" "}
            {lang === "bn"
              ? `${toBanglaDigits(itemCount)} টি বই`
              : `${itemCount} ${itemCount === 1 ? "book" : "books"}`}
          </p>
        </div>
        <OrderStatusBadge status="paid" lang={lang} />
        <span className="text-sm font-semibold shrink-0">
          {formatMoney(order.total, lang)}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded receipt detail */}
      {expanded && (
        <div className="border-t border-border/40 px-4 py-4 space-y-3">
          <ul className="space-y-2.5">
            {order.items.map((item, i) => (
              <li key={`${item.bookId}-${i}`} className="flex items-start gap-3">
                <span className="text-sm font-medium text-foreground/80 min-w-0 flex-1">
                  {lang === "bn" && item.titleBn ? item.titleBn : item.titleEn}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatMoney(item.price, lang)}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-border/30 space-y-1 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{lang === "bn" ? "উপমোট" : "Subtotal"}</span>
              <span>
                {formatMoney(order.subtotal, lang)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{lang === "bn" ? "ছাড়" : "Discount"}</span>
                <span className="text-green-600 dark:text-green-400">
                  -{formatMoney(order.discount, lang)}
                </span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{lang === "bn" ? "কর" : "Tax"}</span>
                <span>
                  {formatMoney(order.tax, lang)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 font-medium">
              <span>{lang === "bn" ? "মোট" : "Total"}</span>
              <span>
                {formatMoney(order.total, lang)}
              </span>
            </div>
          </div>

          {order.items.length > 0 && (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/purchases"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {lang === "bn" ? "লাইব্রেরিতে পড়ুন" : "Read in your library"}
              </Link>
              <button
                onClick={onReorder}
                disabled={reordering}
                className="inline-flex items-center gap-1.5 self-start text-xs font-medium px-3 py-1.5 rounded-lg border border-border/50 hover:border-foreground/30 hover:bg-secondary/50 transition-all duration-200 disabled:opacity-50"
              >
                {reordering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {lang === "bn" ? "আবার কিনুন" : "Buy again"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
