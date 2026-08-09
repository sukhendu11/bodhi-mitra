/**
 * SimulatedProvider — the default development/testing payment provider.
 *
 * No real gateway involved: `createPayment` returns an inline (simulated)
 * result, and the client completes the checkout through `completeMockCheckout`
 * (which routes into the provider-agnostic order service). The webhook
 * verifier is implemented so the `/api/payments/webhook` endpoint is fully
 * testable offline with a simulated payload.
 */
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifiedPayment,
} from "./types";

export const simulatedProvider: PaymentProvider = {
  id: "simulated",

  isConfigured() {
    return true; // always available — it's the offline default
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { kind: "simulated", orderId: input.orderId, amount: input.amount };
  },

  /**
   * Verify a simulated IPN payload. Accepts either the generic webhook shape
   * or a `{ orderId, status, gatewayReference, amountPaid }` test payload.
   * Returns null when the payload can't be interpreted (unverifiable).
   */
  async verifyWebhook(
    body: string,
    _headers: Headers,
  ): Promise<VerifiedPayment | null> {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const status = String(parsed.status ?? "").toLowerCase();

      let paymentStatus: VerifiedPayment["status"] | null = null;
      if (status === "paid" || status === "success" || status === "completed") {
        paymentStatus = "paid";
      } else if (status === "failed" || status === "error") {
        paymentStatus = "failed";
      } else if (status === "cancelled" || status === "canceled") {
        paymentStatus = "cancelled";
      }

      if (!paymentStatus) return null;

      const orderId = String(
        parsed.orderId ?? parsed.order_id ?? parsed.order ?? "",
      );
      if (!orderId) return null;

      return {
        orderId,
        status: paymentStatus,
        gatewayReference: parsed.gatewayReference
          ? String(parsed.gatewayReference)
          : String(parsed.trx_id ?? ""),
        amountPaid:
          parsed.amountPaid !== undefined
            ? Number(parsed.amountPaid)
            : parsed.amount !== undefined
              ? Number(parsed.amount)
              : undefined,
        raw: parsed,
      };
    } catch {
      return null;
    }
  },
};
