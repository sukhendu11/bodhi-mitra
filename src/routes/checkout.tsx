import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCart, type Cart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { useAuthSession } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { PaymentForm } from "@/components/PaymentForm";
import { useLang, pickLocalized, formatMoney } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import { seoHead } from "@/lib/seo";
import { BackLink } from "@/components/BackLink";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { GiftBoxIcon } from "@/components/GiftBoxIcon";
import { callFn } from "@/lib/call-fn";
import { calculateTax } from "@/lib/commerce";
import {
  BookOpen,
  AlertCircle,
  Lock,
  ShieldCheck,
  ChevronDown,
  Tag,
  Loader2,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    coupon: typeof search.coupon === "string" ? search.coupon : undefined,
  }),
  head: () =>
    seoHead({
      title: "Checkout",
      description: "Secure checkout on Sabbe Satta.",
      path: "/checkout",
      noIndex: true,
    }),
  component: CheckoutPage,
});

function AccordionSection({
  step,
  title,
  children,
  collapsed = false,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 md:p-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background shrink-0">
            {step}
          </span>
          <h2 className="font-serif text-lg text-foreground">{title}</h2>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="pt-5">{children}</div>}
    </div>
  );
}

function CheckoutPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const config = useSiteSettings();
  const queryClient = useQueryClient();
  const doGetCart = useServerFn(getCart);
  const doValidateCoupon = useServerFn(validateCoupon);
  const search = Route.useSearch();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [couponInput, setCouponInput] = useState(search.coupon ?? "");
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  /* Auto-apply coupon carried from the cart page */
  useEffect(() => {
    if (!search.coupon) return;
    const apply = async () => {
      const { data: cart } = await callFn(doGetCart);
      const subtotal = (cart as Cart | undefined)?.totalPrice ?? 0;
      const result = await callFn(doValidateCoupon, { code: search.coupon, subtotal });
      if (result.valid && result.discountAmount) {
        setDiscount(result.discountAmount);
        setCouponInput(search.coupon ?? "");
      } else {
        setCouponError(result.error || "Invalid coupon");
      }
    };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.coupon]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError("");
    setDiscount(0);
    try {
      const result = await callFn(doValidateCoupon, {
        code: couponInput.trim(),
        subtotal: totalPrice,
      });
      if (result.valid && result.discountAmount) {
        setDiscount(result.discountAmount);
      } else {
        setCouponError(result.error || "Invalid coupon");
      }
    } catch (e: any) {
      setCouponError(e.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

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

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const totalPrice = cart?.totalPrice ?? 0;
  const taxRate = config.commerce.tax_rate ?? 0;
  const tax = calculateTax(Math.max(0, totalPrice - discount), taxRate);
  const grandTotal = Math.max(0, totalPrice - discount + tax);

  const handlePay = () => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
  };

  /* ── Not signed in ────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-5 ring-1 ring-border/20">
          <GiftBoxIcon className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <h1 className="font-serif text-3xl mb-3">{lang === "bn" ? "চেকআউট" : "Checkout"}</h1>
        <p className="text-base text-muted-foreground mb-8">
          {lang === "bn" ? "চালিয়ে যেতে সাইন ইন করুন।" : "Sign in to complete checkout."}
        </p>
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
    <div className="mx-auto max-w-4xl px-6 py-12 md:py-20">
      <BackLink to="/cart" label={lang === "bn" ? "কার্ট" : "Cart"} />

      {/* Header + trust strip */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl">
          {lang === "bn" ? "চেকআউট" : "Checkout"}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-green-600" />
          {lang === "bn"
            ? "আপনার তথ্য সুরক্ষিত এবং এনক্রিপ্টেড।"
            : "Your details are secure and encrypted."}
        </p>
      </div>

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

      {/* Error */}
      {isError && (
        <div className="text-center py-16">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {lang === "bn" ? "কার্ট লোড করা যায়নি।" : "Could not load your cart."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && itemCount === 0 && (
        <div className="text-center py-16 rounded-xl bg-secondary/20 border border-border/40">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-4 ring-1 ring-border/20">
            <GiftBoxIcon className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === "bn" ? "আপনার কার্ট খালি।" : "Your cart is empty."}
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

      {/* Two-column layout */}
      {!isLoading && !isError && itemCount > 0 && (
        <div className="grid gap-6 md:grid-cols-5">
          {/* Left: contact + order summary */}
          <div className="space-y-5 md:col-span-3">
            <AccordionSection step="1" title={lang === "bn" ? "আপনার তথ্য" : "Your details"}>
              <p className="text-sm text-muted-foreground">
                {lang === "bn"
                  ? "সাইন ইন করেছেন — ক্রয়ের রসিদ আপনার অ্যাকাউন্টে সংরক্ষিত থাকবে।"
                  : "You're signed in — your receipt will be saved to your account."}
              </p>
            </AccordionSection>

            <AccordionSection
              step="2"
              title={lang === "bn" ? "আপনার আইটেম" : "Your items"}
              collapsed={true}
            >
              <ul className="space-y-3">
                {items.map((item) => {
                  const title = pickLocalized(
                    item.book_title_en,
                    item.book_title_bn,
                    lang,
                    "Untitled"
                  );
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="w-10 h-14 rounded-lg overflow-hidden border border-border/40 bg-secondary/30 flex items-center justify-center shrink-0">
                        {item.book_cover ? (
                          <img
                            src={item.book_cover}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-5 w-5 text-muted-foreground/30" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/books/$slug"
                          params={{ slug: item.book_slug }}
                          search={{ search: "", page: 1 }}
                          className="text-base font-medium line-clamp-1 hover:text-foreground/80 transition-colors"
                        >
                          {title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatMoney(Number(item.book_price), lang)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionSection>
          </div>

          {/* Right: order summary → payment */}
          <div className="md:col-span-2">
            <div className="md:sticky md:top-24 space-y-4">
              <div className="rounded-xl border border-border/60 bg-card p-5 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {lang === "bn" ? "সর্বমোট" : "Subtotal"} ({itemCount}{" "}
                    {itemCount === 1 ? (lang === "bn" ? "আইটেম" : "item") : lang === "bn" ? "আইটেম" : "items"})
                  </span>
                  <span className="font-medium">
                    {formatMoney(totalPrice, lang)}
                  </span>
                </div>

                {/* Coupon */}
                <div className="flex gap-2 pt-1">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={lang === "bn" ? "কুপন কোড" : "Coupon code"}
                      aria-invalid={!!couponError}
                      className="w-full pl-8 pr-2 py-2 text-xs font-mono border border-border/60 rounded-lg bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/40 aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/40 transition-colors duration-200"
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!couponInput || couponLoading}
                    className="px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      lang === "bn" ? "প্রয়োগ করুন" : "Apply"
                    )}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" /> {couponError}
                  </p>
                )}
                {discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {lang === "bn" ? "ছাড়" : "Discount"} ({couponInput})
                    </span>
                    <span className="font-medium text-green-600">
                      -{formatMoney(discount, lang)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{lang === "bn" ? "কর" : "Tax"}</span>
                  <span className="font-medium">
                    {formatMoney(tax, lang)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="font-medium">{lang === "bn" ? "মোট" : "Total"}</span>
                  <span className="font-semibold">
                    {formatMoney(grandTotal, lang)}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60 pt-1">
                  <ShieldCheck className="h-3 w-3 text-green-600" />
                  {lang === "bn"
                    ? "নিরাপদ পেমেন্ট — পেমেন্ট যাচাইয়ের পর অ্যাক্সেস দেওয়া হয়।"
                    : "Secure payment — access granted after verification."}
                </p>
              </div>

              <PaymentForm
                amount={grandTotal}
                itemCount={itemCount}
                discount={discount}
                tax={tax}
                taxRate={taxRate}
                onSuccess={handlePay}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}