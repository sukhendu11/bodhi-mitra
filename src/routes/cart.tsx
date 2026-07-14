import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCart, removeFromCart, clearCart, checkoutCart, type Cart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { useAuthSession } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { ErrorPage } from "@/components/error-page";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import { toast } from "sonner";
import {
  ShoppingCart,
  Trash2,
  Loader2,
  ArrowLeft,
  BookOpen,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function CartPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const config = useSiteSettings();
  const symbol = config.commerce.currency_symbol || "$";
  const queryClient = useQueryClient();
  const doGetCart = useServerFn(getCart);
  const doRemoveFromCart = useServerFn(removeFromCart);
  const doClearCart = useServerFn(clearCart);
  const doCheckoutCart = useServerFn(checkoutCart);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutToastShown, setCheckoutToastShown] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  const doValidateCoupon = useServerFn(validateCoupon);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setDiscount(0);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await doValidateCoupon({ data: { code: couponCode, subtotal: totalPrice } } as any);
      if (result.valid && result.discountAmount) {
        setDiscount(result.discountAmount);
        toast.success(`Coupon applied! -${symbol}${result.discountAmount.toFixed(2)}`);
      } else {
        setCouponError(result.error || "Invalid coupon");
      }
    } catch (e: any) {
      setCouponError(e.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle Stripe redirect feedback
  useEffect(() => {
    if (checkoutToastShown || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status === "success") {
      toast.success("Purchase complete! Books have been added to your library.");
      window.history.replaceState({}, "", window.location.pathname);
      setCheckoutToastShown(true);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    } else if (status === "cancel") {
      toast.info("Checkout was cancelled. Your cart items are still saved.");
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
    queryFn: () => (doGetCart as any)(),
    enabled: !!user,
    staleTime: 10_000,
  });

  /* ── Remove from cart mutation ───────────────────────────────── */
  const removeMutation = useMutation({
    mutationFn: (cartItemId: string) => (doRemoveFromCart as any)({ data: { cartItemId } }),
    onSuccess: (result: any) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Clear cart mutation ─────────────────────────────────────── */
  const clearMutation = useMutation({
    mutationFn: () => (doClearCart as any)(),
    onSuccess: (result: any) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Checkout mutation ───────────────────────────────────────── */
  const checkoutMutation = useMutation({
    mutationFn: () => (doCheckoutCart as any)(),
    onSuccess: (result: any) => {
      if (result.url) {
        window.location.href = result.url;
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const totalPrice = cart?.totalPrice ?? 0;

  /* ── Not signed in state ─────────────────────────────────────── */
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="font-serif text-3xl mb-3">Your Cart</h1>
        <p className="text-sm text-muted-foreground mb-8">Sign in to view and manage your cart.</p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      {/* Back link */}
      <Link
        to="/books"
        search={{ search: "", page: 1 }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="h-3 w-3" /> Back to books
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h1 className="font-serif text-3xl">Your Cart</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {itemCount} {itemCount === 1 ? "item" : "items"} — {symbol}{totalPrice.toFixed(2)} total
            </p>
          </div>
        </div>
        {itemCount > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            {clearMutation.isPending ? "Clearing…" : "Clear"}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-secondary/20 animate-pulse rounded-xl border border-border/60"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Could not load your cart.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty cart */}
      {!isLoading && !isError && itemCount === 0 && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-2">Your cart is empty.</p>
          <Link
            to="/books"
            search={{ search: "", page: 1 }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Browse books
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
                  className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 hover:border-foreground/20 transition-colors"
                >
                  {/* Cover thumbnail */}
                  <Link
                    to="/books/$slug"
                    params={{ slug: item.book_slug }}
                    search={{ search: "", page: 1 }}
                    className="shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-border/40 bg-secondary/30 flex items-center justify-center"
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
                      className="text-sm font-medium line-clamp-1 hover:text-foreground/80 transition-colors"
                    >
                      {title}
                    </Link>
                    <p className="text-[0.55rem] text-muted-foreground mt-0.5">
                      {item.book_author || "—"} · {symbol}{Number(item.book_price).toFixed(2)}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeMutation.mutate(item.id)}
                    disabled={removeMutation.isPending}
                    className="p-2 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                    title="Remove from cart"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary + Checkout */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
              <span className="font-medium">{symbol}{totalPrice.toFixed(2)}</span>
            </div>

            {/* Coupon Code */}
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1 px-3 py-2 text-xs font-mono border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponCode || couponLoading}
                className="px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors disabled:opacity-40"
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive">{couponError}</p>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Discount ({couponCode})</span>
                <span className="font-medium text-green-600">-{symbol}{discount.toFixed(2)}</span>
              </div>
            )}

            <button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Proceed to Checkout
                </>
              )}
            </button>

            <p className="text-[0.55rem] text-muted-foreground/50 text-center">
              Secure checkout powered by Stripe. You'll be redirected to complete payment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
