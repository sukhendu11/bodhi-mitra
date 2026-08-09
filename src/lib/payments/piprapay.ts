/**
 * PipraPayProvider — the production payment provider for Bangladesh.
 *
 * PipraPay is self-hosted (AGPL) and manages bKash/Nagad/card payments. It is
 * NOT deployed yet (no cPanel assumption) — this provider is the code seam
 * that will plug in later WITHOUT touching checkout or order logic.
 *
 * Everything about PipraPay comes from environment variables (see config.ts):
 *   - PIPRAPAY_BASE_URL, PIPRAPAY_MERCHANT_ID, PIPRAPAY_API_KEY,
 *     PIPRAPAY_API_SECRET, PIPRAPAY_WEBHOOK_SECRET,
 *     PIPRAPAY_CREATE_PAYMENT_PATH, PIPRAPAY_WEBHOOK_URL
 *
 * Until those are set, `createPayment` throws a descriptive configuration
 * error and `isConfigured()` returns false — the checkout falls back to the
 * simulated provider, so dev/test keep working.
 */
import { isPipraPayConfigured, piprapayConfig } from "./config";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifiedPayment,
} from "./types";

/** Encode bytes as lowercase hex (HMAC digest). */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 HMAC over UTF-8 bytes — uses the global WebCrypto API (SSR-safe). */
async function hmacSha256(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(new Uint8Array(sig));
}

/** Constant-time-ish comparison of two hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Webhook HMAC verification per the PipraPay IPN contract: the payload body
 * is HMAC-SHA256 signed with the webhook secret and sent in the
 * `X-PipraPay-Signature` header (lowercase `x-piprapay-signature` accepted).
 */
async function verifySignature(
  body: string,
  headers: Headers,
): Promise<boolean> {
  if (!piprapayConfig.webhookSecret) return false;
  const received = headers.get("x-piprapay-signature");
  if (!received) return false;
  try {
    const expected = await hmacSha256(piprapayConfig.webhookSecret, body);
    return safeEqual(received.trim(), expected);
  } catch {
    return false;
  }
}

export const piprapayProvider: PaymentProvider = {
  id: "piprapay",

  isConfigured() {
    return isPipraPayConfigured();
  },

  /**
   * Create a payment on the PipraPay server and return the hosted checkout
   * URL the payer should be redirected to.
   *
   * The exact request/response contract may vary by PipraPay version — the
   * endpoint path is env-configurable (`PIPRAPAY_CREATE_PAYMENT_PATH`) so it
   * can be matched to the deployed instance without code changes.
   */
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!isPipraPayConfigured()) {
      throw new Error(
        "PipraPay is not configured. Set PAYMENT_PROVIDER=piprapay plus " +
          "PIPRAPAY_BASE_URL, PIPRAPAY_MERCHANT_ID, PIPRAPAY_API_KEY, " +
          "PIPRAPAY_API_SECRET and PIPRAPAY_WEBHOOK_SECRET (see .env.example).",
      );
    }

    const url = `${piprapayConfig.baseUrl}${piprapayConfig.createPaymentPath}`;
    const payload = {
      merchant_id: piprapayConfig.merchantId,
      api_key: piprapayConfig.apiKey,
      order_id: input.orderId,
      amount: Math.round(input.amount), // PipraPay uses whole taka
      currency: input.currency,
      success_url: `${piprapayConfig.webhookUrl}`,
      cancel_url: input.cancelUrl,
      items: input.items.map((i) => ({
        book_id: i.bookId,
        title: i.titleEn || i.titleBn || "Book",
        price: Math.round(i.price),
      })),
    };

    const signature = await hmacSha256(
      piprapayConfig.apiSecret,
      JSON.stringify(payload),
    );

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-piprapay-signature": signature,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `PipraPay create-payment failed (HTTP ${res.status}). Check PIPRAPAY_* configuration.`,
      );
    }

    const data = (await res.json().catch(() => ({}))) as {
      checkout_url?: string;
      redirect_url?: string;
      url?: string;
    };
    const checkoutUrl = data.checkout_url || data.redirect_url || data.url;
    if (!checkoutUrl) {
      throw new Error(
        "PipraPay response did not include a checkout URL. Verify the deployed PipraPay API contract.",
      );
    }

    return { kind: "redirect", url: checkoutUrl };
  },

  /**
   * Verify an incoming PipraPay IPN callback (HMAC signature) and normalize
   * it. Returns null when the signature fails or the payload is unparseable.
   */
  async verifyWebhook(
    body: string,
    headers: Headers,
  ): Promise<VerifiedPayment | null> {
    const ok = await verifySignature(body, headers);
    if (!ok) return null;

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

      const orderId = String(parsed.order_id ?? parsed.orderId ?? "");
      if (!orderId) return null;

      return {
        orderId,
        status: paymentStatus,
        gatewayReference: String(parsed.trx_id ?? parsed.transaction_id ?? ""),
        amountPaid:
          parsed.amount !== undefined ? Number(parsed.amount) : undefined,
        raw: parsed,
      };
    } catch {
      return null;
    }
  },
};
