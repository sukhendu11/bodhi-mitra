/**
 * Payment-provider abstraction — the seam that makes the payment flow
 * provider-agnostic (approved architecture AD-026).
 *
 * The checkout/order layer only speaks to the `PaymentProvider` interface;
 * concrete providers (simulated, piprapay) live in ./simulated.ts and
 * ./piprapay.ts. Swapping the gateway is a `PAYMENT_PROVIDER` env change,
 * never a checkout or order-logic change.
 *
 * All provider credentials and URLs MUST come from environment variables —
 * never hardcoded (PipraPay-ready rule).
 */

export type PaymentProviderId = "simulated" | "piprapay";

/** Server-side payment order lifecycle. */
export type PaymentOrderStatus = "pending" | "paid" | "failed" | "cancelled";

/** One purchasable line inside an order. */
export interface PaymentOrderItem {
  bookId: string;
  titleEn: string | null;
  titleBn: string | null;
  price: number;
}

/**
 * Server-side order record. Created as `pending` BEFORE the payer is sent to
 * the gateway; the webhook (or the simulated completion) transitions it to
 * `paid` / `failed` / `cancelled`. Idempotent transitions protect against
 * duplicate callbacks.
 */
export interface PaymentOrder {
  id: string;
  userId: string;
  items: PaymentOrderItem[];
  /** Coupon discount subtracted from the subtotal (0 when none). */
  discount: number;
  /** Sales-tax amount included in the total (0 when none). */
  tax: number;
  /** Total amount the payer must pay (subtotal - discount + tax). */
  total: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: PaymentProviderId;
  /** Provider-side reference (e.g. PipraPay TrxID) recorded after payment. */
  gatewayReference?: string | null;
  couponId?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

/** Everything the provider needs to initiate a payment for a pending order. */
export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  items: PaymentOrderItem[];
  amount: number;
  discount: number;
  tax: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
}

/**
 * Result of initiating a payment.
 *  - `simulated` → no redirect; the client completes via the simulated flow
 *    (the order is already `pending` and gets fulfilled on completion).
 *  - `redirect`  → send the payer to `url` (hosted gateway checkout).
 */
export type CreatePaymentResult =
  | { kind: "simulated"; orderId: string; amount: number }
  | { kind: "redirect"; url: string };

/**
 * Normalized, verified payment event extracted from an IPN/webhook callback.
 * Produced by `PaymentProvider.verifyWebhook` — a provider MUST verify the
 * signature/source before returning a result, or return `null`.
 */
export interface VerifiedPayment {
  orderId: string;
  status: "paid" | "failed" | "cancelled";
  gatewayReference?: string;
  amountPaid?: number;
  raw: unknown;
}

/** The contract every payment provider implements. */
export interface PaymentProvider {
  readonly id: PaymentProviderId;

  /** True when all required env credentials/URLs are present. */
  isConfigured(): boolean;

  /**
   * Create a payment session for a pending order.
   * @throws a descriptive error when the provider is not configured.
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Verify + normalize an incoming IPN/webhook callback.
   * Returns `null` when the callback cannot be verified (bad signature,
   * malformed payload, unsupported status).
   */
  verifyWebhook(body: string, headers: Headers): Promise<VerifiedPayment | null>;
}
