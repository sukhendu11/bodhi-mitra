import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCart, removeFromCart, clearCart, checkoutCart, type Cart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { useLang, pickLocalized, formatMoney, toBanglaDigits } from "@/lib/i18n";
import { callFn } from "@/lib/call-fn";
import { useSiteSettings } from "@/lib/siteSettings";
import { calculateTax } from "@/lib/commerce";
import { OPEN_CART_DRAWER_EVENT } from "@/lib/cart-events";
import { CheckoutPaymentDialog } from "@/components/CheckoutPaymentDialog";
import { GiftBoxIcon } from "@/components/GiftBoxIcon";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Trash2,
  Loader2,
  BookOpen,
  CreditCard,
  XCircle,
  X,
} from "lucide-react";

interface CartDrawerProps {
  children: React.ReactNode | ((open: boolean) => React.ReactNode);
  cartCount?: number;
}

/** Map server-returned coupon validation errors to the active UI language. */
function localizeCouponError(msg: string, lang: "en" | "bn"): string {
  if (lang !== "bn") return msg;
  const map: Record<string, string> = {
    "Please enter a coupon code": "দয়া করে কুপন কোড লিখুন।",
    "Invalid coupon code": "ভুল কুপন কোড।",
    "This coupon has expired": "কুপনটির মেয়াদ শেষ হয়ে গেছে।",
    "This coupon has reached its usage limit": "কুপনটির ব্যবহারের সীমা শেষ।",
    "Failed to validate coupon": "কুপন যাচাই করা যায়নি।",
  };
  return map[msg] ?? msg;
}

export function CartDrawer({ children, cartCount = 0 }: CartDrawerProps) {
  const { lang } = useLang();
  const config = useSiteSettings();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const doGetCart = useServerFn(getCart);
  const doRemoveFromCart = useServerFn(removeFromCart);
  const doClearCart = useServerFn(clearCart);
  const doCheckoutCart = useServerFn(checkoutCart);
  const doValidateCoupon = useServerFn(validateCoupon);

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | undefined>();
  // Destructive-action confirmations (bilingual, shared ConfirmDialog).
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; title: string } | null>(null);

  /* ── Fetch cart when drawer opens ──────────────────────────────
     Runs for guests too — the mock-aware server fn returns the
     localStorage cart when Supabase isn't available. */
  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => callFn(doGetCart),
    enabled: open,
    staleTime: 10_000,
  });

  /* ── Mutations ───────────────────────────────────────────────── */
  const removeMutation = useMutation({
    mutationFn: (cartItemId: string) => callFn(doRemoveFromCart, { cartItemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => callFn(doClearCart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      setDiscount(0);
      setCouponCode("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      callFn(doCheckoutCart, {
        discount,
        taxRate,
        couponId: appliedCouponId ?? undefined,
      }),
    onSuccess: (result: any) => {
      if (result.url) {
        // Redirect provider (e.g. PipraPay) — send the payer to the gateway.
        window.location.href = result.url;
      } else if (result.simulated) {
        // Simulated provider — show the inline payment step with the order.
        setPendingOrderId(result.orderId);
        setPaymentOpen(true);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setDiscount(0);
    try {
      const result = await callFn(doValidateCoupon, { code: couponCode, subtotal: totalPrice });
      if (result.valid && result.discountAmount) {
        setDiscount(result.discountAmount);
        setAppliedCouponId(result.coupon?.id ?? null);
        toast.success(
          lang === "bn"
            ? `কুপন প্রয়োগ হয়েছে! -${formatMoney(result.discountAmount, "bn")}`
            : `Coupon applied! -${formatMoney(result.discountAmount, "en")}`,
        );
      } else {
        setCouponError(localizeCouponError(result.error || "Invalid coupon", lang));
      }
    } catch (e: any) {
      setCouponError(localizeCouponError(e.message || "Failed to validate coupon", lang));
    } finally {
      setCouponLoading(false);
    }
  };

  /* ── Reset coupon on close ───────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      setCouponCode("");
      setCouponError("");
      setDiscount(0);
      setAppliedCouponId(null);
      setPendingOrderId(undefined);
    }
  }, [open]);

  /* ── Open when another page requests it (e.g. add-to-cart) ────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CART_DRAWER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CART_DRAWER_EVENT, onOpen);
  }, []);

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const totalPrice = cart?.totalPrice ?? 0;
  const taxRate = config.commerce.tax_rate ?? 0;
  const tax = calculateTax(Math.max(0, totalPrice - discount), taxRate);
  const grandTotal = Math.max(0, totalPrice - discount + tax);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {typeof children === "function" ? children(open) : children}
      </SheetTrigger>
      {/* Mobile: 75% width (not full) so a wide visible strip of the overlay
          stays clickable outside the drawer — tapping it closes the modal
          (the Radix overlay closes on outside click). Desktop keeps max-w-md. */}
      <SheetContent className="w-[75%] sm:max-w-md flex flex-col gap-0 p-0">
        {/* ── Saffron accent bar ── */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--color-saffron)] via-[var(--color-saffron)]/50 to-transparent z-10" />

        {/* Screen-reader announcement of cart changes (F7 adapt) */}
        <p aria-live="polite" className="sr-only">
          {itemCount === 0
            ? lang === "bn"
              ? "আপনার কার্ট খালি।"
              : "Your cart is empty."
            : lang === "bn"
              ? `আপনার কার্টে ${toBanglaDigits(itemCount)} টি আইটেম আছে। মোট ${formatMoney(grandTotal, "bn")}`
              : `Your cart has ${itemCount} ${itemCount === 1 ? "item" : "items"}. Total ${formatMoney(grandTotal, "en")}`}
        </p>

        {/* Header — pr-16 keeps "Clear all" clear of the sheet's close ✕
            (top-right) with real breathing room; the row wraps on the very
            narrowest screens so title and Clear all never collide. */}
        <SheetHeader className="px-6 pr-16 py-4 border-b border-border/30">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <SheetTitle className="flex items-center gap-2.5 text-base">
              <span className="text-[var(--color-saffron)]">
                <GiftBoxIcon className="h-4 w-4" />
              </span>
              {lang === "bn" ? "আপনার কার্ট" : "Your Cart"}
              {itemCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({lang === "bn" ? toBanglaDigits(itemCount) : itemCount}{" "}
                  {lang === "bn" ? "টি আইটেম" : itemCount === 1 ? "item" : "items"})
                </span>
              )}
            </SheetTitle>
            {itemCount > 0 && (
              <button
                onClick={() => setConfirmClearOpen(true)}
                disabled={clearMutation.isPending}
                className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-50 uppercase tracking-[0.08em]"
              >
                {clearMutation.isPending
                  ? lang === "bn" ? "মুছে ফেলা হচ্ছে…" : "Clearing…"
                  : lang === "bn" ? "সব মুছুন" : "Clear all"}
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Content — custom scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/20 [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Empty cart — shown for both guests and signed-in users */}
          {!isLoading && itemCount === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mb-5 ring-1 ring-border/20">
                <GiftBoxIcon className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {lang === "bn" ? "আপনার কার্ট খালি।" : "Your cart is empty."}
              </p>
              <p className="text-xs text-muted-foreground/50 max-w-[220px]">
                {lang === "bn"
                  ? "বই ব্রাউজ করুন এবং আপনার পছন্দের বই কিনুন।"
                  : "Browse our collection and find your next read."}
              </p>
              <Link
                to="/books"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group/link"
              >
                <span>{lang === "bn" ? "বই ব্রাউজ করুন" : "Browse Books"}</span>
                <span className="inline-block transition-transform duration-300 group-hover/link:translate-x-1">
                  {lang === "bn" ? "→" : "→"}
                </span>
              </Link>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl skeleton-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}

          {/* Items — visible to guests too (localStorage mock cart) */}
          {!isLoading && itemCount > 0 && (
            <div className="space-y-2.5">
              {items.map((item) => {
                const title = pickLocalized(item.book_title_en, item.book_title_bn, lang, "Untitled");
                return (
                  <div
                    key={item.id}
                    className="group/item flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/20 hover:border-border/40 hover:bg-secondary/30 hover:shadow-sm transition-all duration-200"
                  >
                    <Link
                      to="/books/$slug"
                      params={{ slug: item.book_slug }}
                      onClick={() => setOpen(false)}
                      className="shrink-0 w-11 h-15 rounded-lg overflow-hidden bg-secondary/40 flex items-center justify-center shadow-sm ring-1 ring-black/5"
                    >
                      {item.book_cover ? (
                        <img src={item.book_cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/books/$slug"
                        params={{ slug: item.book_slug }}
                        onClick={() => setOpen(false)}
                        className="text-sm font-medium line-clamp-1 hover:text-[var(--color-saffron)] transition-colors"
                      >
                        {title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span>{item.book_author || "—"}</span>
                        <span className="mx-1.5 text-muted-foreground/20">·</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary/40 text-xs font-semibold tabular-nums">
                          {formatMoney(Number(item.book_price), lang)}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmRemove({ id: item.id, title })}
                      disabled={removeMutation.isPending}
                      aria-label={lang === "bn" ? `কার্ট থেকে সরান: ${title}` : `Remove ${title} from cart`}
                      title={lang === "bn" ? "সরান" : "Remove"}
                      className="p-2 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 focus:opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — Summary + Checkout */}
        {!isLoading && itemCount > 0 && (
          <div className="border-t border-border/30 px-6 py-4 space-y-3 bg-gradient-to-t from-saffron-50/[0.02] to-background">
            {/* Subtotal — with ornate separator */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground/70">
                  {lang === "bn" ? "উপমোট" : "Subtotal"}
                </span>
                <span className="font-sans text-base font-semibold text-foreground tabular-nums">
                  {formatMoney(totalPrice, lang)}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 text-[10px] text-muted-foreground/20 bg-background">
                    {lang === "bn" ? "কুপন" : "Coupon"}
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon */}
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
                className="flex-1 px-3 py-2 text-xs font-mono border border-border/50 rounded-lg bg-background/60 placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/40 transition-all duration-200"
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
                <span className="font-sans text-sm font-medium tabular-nums">
                  {formatMoney(tax, lang)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{lang === "bn" ? "মোট" : "Total"}</span>
              <span className="font-sans text-lg font-bold text-foreground tabular-nums">
                {formatMoney(grandTotal, lang)}
              </span>
            </div>

            {/* Checkout button */}
            <BrandCtaButton
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="w-full px-6 py-3"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === "bn" ? "প্রক্রিয়া হচ্ছে..." : "Processing…"}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  {lang === "bn" ? "চেকআউট" : "Checkout"}
                </>
              )}
            </BrandCtaButton>

            <p className="text-xs text-muted-foreground/40 text-center">
              {lang === "bn"
                ? "নিরাপদ পেমেন্ট — পেমেন্ট যাচাইয়ের পর অ্যাক্সেস দেওয়া হয়।"
                : "Secure payment — access granted after verification."}
            </p>

            {/* Continue shopping — keep the browsing flow (F7 adapt) */}
            <button
              onClick={() => setOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-foreground rounded-xl border border-border/50 hover:border-foreground/30 hover:bg-secondary/40 transition-all duration-200 group/browse"
            >
              {lang === "bn" ? "ব্রাউজ চালিয়ে যান" : "Continue shopping"}
              <span className="inline-block transition-transform duration-300 group-hover/browse:-translate-x-0.5">
                {lang === "bn" ? "→" : "←"}
              </span>
            </button>
          </div>
        )}
      </SheetContent>

      {/* Simulated payment (mock mode) */}
      <CheckoutPaymentDialog
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setPendingOrderId(undefined);
        }}
        amount={grandTotal}
        itemCount={itemCount}
        discount={discount}
        tax={tax}
        taxRate={taxRate}
        orderId={pendingOrderId}
      />

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
        open={!!confirmRemove}
        onOpenChange={(open) => {
          if (!open) setConfirmRemove(null);
        }}
        title={lang === "bn" ? "কার্ট থেকে সরাবেন?" : "Remove from cart?"}
        description={
          lang === "bn"
            ? `"${confirmRemove?.title ?? ""}" কার্ট থেকে সরানো হবে।`
            : `Remove "${confirmRemove?.title ?? ""}" from your cart?`
        }
        confirmLabel={lang === "bn" ? "সরান" : "Remove"}
        cancelLabel={lang === "bn" ? "বাতিল" : "Cancel"}
        onConfirm={() => {
          if (confirmRemove) removeMutation.mutate(confirmRemove.id);
          setConfirmRemove(null);
        }}
      />
    </Sheet>
  );
}
