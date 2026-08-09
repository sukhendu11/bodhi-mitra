/**
 * PaymentForm — reusable simulated card-payment form (M2/M6 commerce UX).
 *
 * Extracted from CheckoutPaymentDialog so both the modal (cart page) and the
 * one-page /checkout route share identical card validation + the ~1.2s mock
 * gateway experience. Submits via `completeMockCheckout` on success.
 */
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { completeMockCheckout } from "@/lib/cart";
import { callFn } from "@/lib/call-fn";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, toBanglaDigits, formatMoney } from "@/lib/i18n";
import { Loader2, CreditCard, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { BrandCtaButton } from "@/components/BrandCtaButton";

export interface PaymentFormProps {
  amount: number;
  itemCount?: number;
  discount?: number;
  tax?: number;
  taxRate?: number;
  /**
   * Server-side pending order to fulfill on success. When omitted (legacy
   * /checkout page), `completeMockCheckout` builds one from the current cart.
   */
  orderId?: string;
  onSuccess?: () => void;
}

const TEST_CARD = "4242424242424242";

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function PaymentForm({
  amount,
  itemCount = 1,
  discount = 0,
  tax = 0,
  taxRate = 0,
  orderId,
  onSuccess,
}: PaymentFormProps) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const doCompleteCheckout = useServerFn(completeMockCheckout);

  const money = (n: number) => formatMoney(n, lang);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const validate = (): string => {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits !== TEST_CARD) {
      return "Use the demo card 4242 4242 4242 4242 to complete this simulated payment.";
    }
    if (!cardName.trim()) return "Enter the name on the card.";
    const expDigits = expiry.replace(/\D/g, "");
    if (expDigits.length !== 4) return "Enter a valid expiry (MM/YY).";
    const month = Number(expDigits.slice(0, 2));
    if (month < 1 || month > 12) return "Enter a valid expiry (MM/YY).";
    const year = 2000 + Number(expDigits.slice(2));
    const now = new Date();
    const expDate = new Date(year, month, 0);
    if (expDate < now) return "This card has expired.";
    if (!/^\d{3,4}$/.test(cvc)) return "Enter a valid CVC.";
    return "";
  };

  const handlePay = async () => {
    if (processing) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setProcessing(true);

    // Simulated gateway latency (~1.2s) before finalizing the order.
    await new Promise((r) => setTimeout(r, 1200));

    try {
      await callFn(doCompleteCheckout, {
        userId: user?.id,
        orderId,
        discount,
        taxRate,
      });
      onSuccess?.();
      navigate({ to: "/checkout/success", search: { coupon: undefined } });
    } catch (err) {
      setProcessing(false);
      setError(err instanceof Error ? err.message : lang === "bn" ? "পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" : "Payment failed. Please try again.");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200 placeholder:text-muted-foreground/50 disabled:opacity-50";

  return (
    <div className="space-y-5">
      {/* Order summary */}
      <div className="px-4 py-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {lang === "bn" ? toBanglaDigits(itemCount) : itemCount}{" "}
              {lang === "bn" ? "টি বই" : itemCount === 1 ? "book" : "books"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-300/40">
            <Lock className="h-2.5 w-2.5" /> Secure
          </span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{lang === "bn" ? "ছাড়" : "Discount"}</span>
            <span className="font-sans text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
              -{money(discount)}
            </span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {lang === "bn" ? "কর" : "Tax"}{" "}
              {taxRate > 0 ? `(${lang === "bn" ? toBanglaDigits(taxRate) : taxRate}%)` : ""}
            </span>
            <span className="font-sans text-sm font-medium tabular-nums">{money(tax)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
          <span className="text-xs text-muted-foreground">{lang === "bn" ? "মোট" : "Total"}</span>
          <span className="font-sans text-xl font-bold tabular-nums">{money(amount)}</span>
        </div>
      </div>

      {/* Card form */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1.5">
            Card number
          </label>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            disabled={processing}
            className={`${inputCls} font-mono tracking-wide`}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1.5">
            Name on card
          </label>
          <input
            autoComplete="cc-name"
            placeholder="Sidhartha Gautama"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            disabled={processing}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1.5">
              Expiry
            </label>
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="12/28"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              disabled={processing}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium mb-1.5">
              CVC
            </label>
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              disabled={processing}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Pay button — brand CTA (DESIGN.md §5.1): saffron gradient + shimmer */}
      <BrandCtaButton
        onClick={handlePay}
        disabled={processing}
        className="w-full px-6 py-3"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />{" "}
            {lang === "bn" ? "পেমেন্ট প্রক্রিয়া হচ্ছে…" : "Processing payment…"}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" /> {lang === "bn" ? "পরিশোধ করুন" : "Pay"} {money(amount)}
          </>
        )}
      </BrandCtaButton>

      {processing && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-green-600" />
          Verifying with the demo payment gateway…
        </p>
      )}

      <p className="text-xs text-muted-foreground/50 text-center leading-relaxed">
        Simulated payment — no real charge. Use card{" "}
        <span className="font-mono">4242 4242 4242 4242</span>, any future expiry and any CVC.
      </p>
    </div>
  );
}