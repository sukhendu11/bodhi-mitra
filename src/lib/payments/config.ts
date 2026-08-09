/**
 * Payment-provider configuration — ALL credentials and URLs come from
 * environment variables (PipraPay-ready rule). No hardcoded secrets or
 * production URLs anywhere.
 */

import type { PaymentProviderId } from "./types";

/** Provider selection (server-side env). Defaults to the simulated provider. */
export function getConfiguredProviderId(): PaymentProviderId {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  return raw === "piprapay" ? "piprapay" : "simulated";
}

/** Public base URL used to build success/cancel return URLs for redirects. */
export function getPaymentReturnBaseUrl(): string {
  return (
    process.env.SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  );
}

/**
 * PipraPay configuration — read from env only.
 *
 * When the self-hosted PipraPay server is later deployed (cPanel / VPS),
 * operators set exactly these variables — no code changes required.
 */
export const piprapayConfig = {
  /** Base URL of the deployed PipraPay instance, e.g. https://pay.example.com */
  baseUrl: process.env.PIPRAPAY_BASE_URL ?? "",
  /** Merchant ID issued by the PipraPay admin panel. */
  merchantId: process.env.PIPRAPAY_MERCHANT_ID ?? "",
  /** API key issued by the PipraPay admin panel. */
  apiKey: process.env.PIPRAPAY_API_KEY ?? "",
  /** Shared secret used to HMAC-sign the create-payment request. */
  apiSecret: process.env.PIPRAPAY_API_SECRET ?? "",
  /** Secret used to verify HMAC signatures on incoming IPN callbacks. */
  webhookSecret: process.env.PIPRAPAY_WEBHOOK_SECRET ?? "",
  /**
   * Path on the PipraPay server that creates a payment and returns a
   * checkout URL. Overridable because the exact route depends on the
   * deployed PipraPay version.
   */
  createPaymentPath: process.env.PIPRAPAY_CREATE_PAYMENT_PATH ?? "/api/v1/create-payment",
  /**
   * Public URL PipraPay calls back to with the IPN. Defaults to
   * `<SITE_URL>/api/payments/webhook` (registered on the PipraPay admin
   * panel). Overridable for custom hosting layouts.
   */
  webhookUrl:
    process.env.PIPRAPAY_WEBHOOK_URL ??
    `${getPaymentReturnBaseUrl()}/api/payments/webhook`,
};

/** True when every PipraPay credential required for a live payment is set. */
export function isPipraPayConfigured(): boolean {
  return Boolean(
    piprapayConfig.baseUrl &&
      piprapayConfig.merchantId &&
      piprapayConfig.apiKey &&
      piprapayConfig.apiSecret &&
      piprapayConfig.webhookSecret,
  );
}
