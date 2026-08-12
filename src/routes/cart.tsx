import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCart, removeFromCart, clearCart, type Cart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { useAuthSession } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { ErrorPage } from "@/components/error-page";
import { useLang, pickLocalized, formatMoney, toBanglaDigits, localizeCartResult } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { BackLink } from "@/components/BackLink";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { GiftBoxIcon } from "@/components/GiftBoxIcon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { callFn } from "@/lib/call-fn";
import { calculateTax } from "@/lib/commerce";
import { toast } from "sonner";
import {
  Trash2,
  Loader2,
  BookOpen,
  CreditCard,
  AlertCircle,
  XCircle,
  X,
} from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => seoHead({
    title: "Cart",
    description: "Your shopping cart on Sabbe Satta.",
    path: "/cart",
    noIndex: true,
  }),
  component: CartPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function CartPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const config = useSiteSettings();
  const queryClient = useQueryClient();
  const doGetCart = useServerFn(getCart);
  const doRemoveFromCart = useServerFn(removeFromCart);
  const doClearCart = useServerFn(clearCart);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutToastShown, setCheckoutToastShown] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  // Destructive-action confirmations (bilingual, shared ConfirmDialog).
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const doValidateCoupon = useServerFn(validateCoupon);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setDiscount(0);
    try {
      const result = await callFn(doValidateCoupon, { code: couponCode, subtotal: totalPrice });
      if (result.valid && result.discountAmount) {
        setDiscount(result.discountAmount);
        toast.success(`${lang === "bn" ? "কুপন প্রয়োগ হয়েছে! -" : "Coupon applied! -"}${formatMoney(result.discountAmount, lang)}`);
      } else {
        setCouponError(result.error || "Invalid coupon");
      }
    } catch (e: any) {
      setCouponError(e.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle payment-redirect feedback
  useEffect(() => {
    if (checkoutToastShown || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status === "success") {
      toast.success(
        lang === "bn"
          ? config.commerce.checkout_success_bn || "ক্রয় সম্পন্ন! বই আপনার লাইব্রেরিতে যোগ করা হয়েছে।"
          : config.commerce.checkout_success_en || "Purchase complete! Books have been added to your library.",
      );
      window.history.replaceState({}, "", window.location.pathname);
      setCheckoutToastShown(true);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    } else if (status === "cancel") {
      toast.info(
        lang === "bn"
          ? config.commerce.checkout_cancel_bn || "চেকআউট বাতিল হয়েছে। আপনার কার্ট আইটেমগুলি সংরক্ষিত আছে।"
          : config.commerce.checkout_cancel_en || "Checkout was cancelled. Your cart items are still saved.",
      );
      window.history.replaceState({}, "", window.location.pathname);
      setCheckoutToastShown(true);
    }
  }, [checkoutToastShown, queryClient]);

  /* ── Fetch cart ──────────────────────────────────────────────── */
  const {
    data: cart,
    isLoading,
    isError,
    refetch,
  } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => callFn(doGetCart),
    enabled: !!user,
    staleTime: 10_000,
  });

  /* ── Remove from cart mutation ───────────────────────────────── */
  const removeMutation = useMutation({
    mutationFn: (cartItemId: string) => callFn(doRemoveFromCart, { cartItemId }),
    onSuccess: (result: any) => {
      toast.success(localizeCartResult(lang, result));
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Clear cart mutation ─────────────────────────────────────── */
  const clearMutation = useMutation({
    mutationFn: () => callFn(doClearCart),
    onSuccess: (result: any) => {
      toast.success(localizeCartResult(lang, result));
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const totalPrice = cart?.totalPrice ?? 0;
  const taxRate = config.commerce.tax_rate ?? 0;
  const tax = calculateTax(Math.max(0, totalPrice - discount), taxRate);
  const grandTotal = Math.max(0, totalPrice - discount + tax);

  const pendingRemove = items.find((i) => i.id === confirmRemoveId);
  const pendingRemoveTitle = pickLocalized(
    pendingRemove?.book_title_en,
    pendingRemove?.book_title_bn,
    lang,
    "",
  );

  /* ── Not signed in state ─────────────────────────────────────── */
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
          <GiftBoxIcon className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <h1 className="font-serif text-3xl mb-3">{pickLocalized(config.commerce.cart_title_en, config.commerce.cart_title_bn, lang, "Your Cart")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{lang === "bn" ? "আপনার কার্ট দেখতে ও পরিচালনা করতে সাইন ইন করুন।" : "Sign in to view and manage your cart."}</p>
        <BrandCtaButton
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3"
        >
          {lang === "bn" ? "সাইন ইন" : "Sign in"}
        </BrandCtaButton>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-20">
      {/* Back link */}
      <BackLink
        to="/books"
        label={lang === "bn" ? "সব বই" : "All Books"}
        search={{ search: "", page: 1 }}
      />

      {/* Header — wraps so the Clear button drops below a long (Bangla) subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-saffron)]">
            <GiftBoxIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-serif text-3xl">{pickLocalized(config.commerce.cart_title_en, config.commerce.cart_title_bn, lang, "Your Cart")}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "bn"
                ? `${toBanglaDigits(itemCount)}টি আইটেম — ${formatMoney(totalPrice, lang)} মোট`
                : `${itemCount} ${itemCount === 1 ? "item" : "items"} — ${formatMoney(totalPrice, lang)} total`}
            </p>
          </div>
        </div>
        {itemCount > 0 && (
          <button
            onClick={() => setConfirmClearOpen(true)}
            disabled={clearMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            {clearMutation.isPending ? (lang === "bn" ? "মোছা হচ্ছে…" : "Clearing…") : (lang === "bn" ? "মুছুন" : "Clear")}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 skeleton-shimmer rounded-xl"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{lang === "bn" ? "আপনার কার্ট লোড করা যায়নি।" : "Could not load your cart."}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
          </button>
        </div>
      )}

      {/* Empty cart */}
      {!isLoading && !isError && itemCount === 0 && (
        <div className="text-center py-16 rounded-xl bg-secondary/20 border border-border/40">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
            <GiftBoxIcon className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {lang === "bn" ? "আপনার কার্ট খালি।" : "Your cart is empty."}
          </p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            {lang === "bn"
              ? "বই ব্রাউজ করুন এবং আপনার পছন্দের বই কিনুন।"
              : "Browse our collection and find your next read."}
          </p>
          <Link
            to="/books"
            search={{ search: "", page: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <BookOpen className="h-4 w-4" />
            {lang === "bn" ? "বই ব্রাউজ করুন" : "Browse Books"}
          </Link>
        </div>
      )}

      {/* Cart items */}
      {!isLoading && !isError && itemCount > 0 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {items.map((item) => {
              const title = pickLocalized(item.book_title_en, item.book_title_bn, lang, "Untitled");
              return (
                <div
                  key={item.id}
                  className="group/item flex items-center gap-4 p-4 rounded-xl bg-secondary/20 border border-border/20 hover:border-border/40 hover:bg-secondary/30 hover:shadow-sm transition-all duration-200"
                >
                  {/* Cover thumbnail */}
                  <Link
                    to="/books/$slug"
                    params={{ slug: item.book_slug }}
                    search={{ search: "", page: 1 }}
                    className="shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-border/40 bg-secondary/40 flex items-center justify-center shadow-sm ring-1 ring-black/5"
                  >
                    {item.book_cover ? (
                      <img
                        src={item.book_cover}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </Link>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/books/$slug"
                      params={{ slug: item.book_slug }}
                      search={{ search: "", page: 1 }}
                      className="text-sm font-medium line-clamp-1 hover:text-[var(--color-saffron)] transition-colors"
                    >
                      {title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span>{item.book_author || "—"}</span>
                      <span className="mx-1.5 text-muted-foreground/20">·</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary/40 text-xs font-semibold tabular-nums">
                        {formatMoney(Number(item.book_price), lang)}
                      </span>
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => setConfirmRemoveId(item.id)}
                    disabled={removeMutation.isPending}
                    title={lang === "bn" ? "কার্ট থেকে সরান" : "Remove from cart"}
                    className="p-2 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 focus:opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary + Checkout */}
          <div className="bg-card rounded-xl border border-border/60 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground/70">{lang === "bn" ? `উপমোট (${toBanglaDigits(itemCount)}টি আইটেম)` : `Subtotal (${itemCount} items)`}</span>
              <span className="font-sans text-base font-semibold text-foreground tabular-nums">{formatMoney(totalPrice, lang)}</span>
            </div>

            {/* Ornate coupon separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-[10px] text-muted-foreground/20 bg-card">
                  {lang === "bn" ? "কুপন" : "Coupon"}
                </span>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && couponCode.trim() && !couponLoading) {
                    handleApplyCoupon();
                  }
                }}
                placeholder={lang === "bn" ? "কুপন কোড লিখুন" : "Enter coupon code"}
                aria-invalid={!!couponError}
                className="flex-1 px-3 py-2 text-xs font-mono border border-border/50 rounded-lg bg-background/60 placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/40 aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/40 transition-all duration-200"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponCode || couponLoading}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border/50 hover:border-foreground/30 bg-background/60 hover:bg-secondary/40 transition-all duration-200 disabled:opacity-50"
              >
                {couponLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  lang === "bn" ? "প্রয়োগ" : "Apply"
                )}
              </button>
            </div>
            {couponError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3 w-3" /> {couponError}
              </p>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200/30 dark:border-green-800/30">
                <span className="text-green-700 dark:text-green-400 font-medium truncate">
                  {lang === "bn" ? "ছাড়" : "Discount"} ({couponCode})
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-sans text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
                    -{formatMoney(discount, lang)}
                  </span>
                  <button
                    onClick={() => {
                      setDiscount(0);
                      setCouponCode("");
                      setCouponError("");
                    }}
                    aria-label={lang === "bn" ? "কুপন সরান" : "Remove coupon"}
                    title={lang === "bn" ? "কুপন সরান" : "Remove coupon"}
                    className="p-1 rounded-md text-green-700/50 dark:text-green-400/50 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground/70">
                  {lang === "bn" ? "কর" : "Tax"}
                  {taxRate > 0 ? ` (${lang === "bn" ? toBanglaDigits(taxRate) : taxRate}%)` : ""}
                </span>
                <span className="font-sans text-sm font-medium tabular-nums">{formatMoney(tax, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
              <span className="font-semibold">{lang === "bn" ? "মোট" : "Total"}</span>
              <span className="font-sans text-lg font-bold text-foreground tabular-nums">{formatMoney(grandTotal, lang)}</span>
            </div>

            <BrandCtaButton asChild className="w-full px-6 py-3">
              <Link to="/checkout" search={{ coupon: couponCode }}>
                <CreditCard className="h-4 w-4" />
                {lang === "bn" ? "চেকআউটে যান" : "Proceed to Checkout"}
              </Link>
            </BrandCtaButton>

            <p className="text-xs text-muted-foreground/50 text-center">
              {lang === "bn" ? "নিরাপদ চেকআউট। পেমেন্ট সম্পূর্ণ করতে আপনাকে পুনঃনির্দেশিত করা হবে।" : "Secure checkout. You'll be redirected to complete payment."}
            </p>
          </div>
        </div>
      )}

      {/* ── Destructive-action confirmations ── */}
      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title={lang === "bn" ? "কার্ট খালি করবেন?" : "Clear cart?"}
        description={
          lang === "bn"
            ? `আপনার কার্টের ${toBanglaDigits(itemCount)}টি আইটেম মুছে যাবে। এটি ফিরিয়ে আনা যাবে না।`
            : `Remove all ${itemCount} ${itemCount === 1 ? "item" : "items"} from your cart? This cannot be undone.`
        }
        confirmLabel={lang === "bn" ? "মুছুন" : "Clear"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
        onConfirm={() => {
          clearMutation.mutate();
          setConfirmClearOpen(false);
        }}
      />
      <ConfirmDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
        title={lang === "bn" ? "কার্ট থেকে সরাবেন?" : "Remove from cart?"}
        description={
          lang === "bn"
            ? `"${pendingRemoveTitle}" কার্ট থেকে সরানো হবে।`
            : `Remove "${pendingRemoveTitle}" from your cart?`
        }
        confirmLabel={lang === "bn" ? "সরান" : "Remove"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
        onConfirm={() => {
          if (confirmRemoveId) removeMutation.mutate(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
      />
    </div>
  );
}
