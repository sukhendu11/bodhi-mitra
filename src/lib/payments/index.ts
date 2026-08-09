/**
 * Payment provider registry — the single entry point the rest of the app
 * uses. `getPaymentProvider()` returns the provider selected by
 * `PAYMENT_PROVIDER` env, with a graceful fallback:
 *
 *   - `PAYMENT_PROVIDER=piprapay` → PipraPay (when configured), else
 *     a descriptive error at call time
 *   - anything else / unset → simulated (offline dev/test default)
 */
import { getConfiguredProviderId } from "./config";
import { simulatedProvider } from "./simulated";
import { piprapayProvider } from "./piprapay";
import type { PaymentProvider, PaymentProviderId } from "./types";

export type { PaymentProvider, PaymentProviderId } from "./types";
export type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentOrder,
  PaymentOrderItem,
  PaymentOrderStatus,
  VerifiedPayment,
} from "./types";

export { getConfiguredProviderId } from "./config";
export { isPipraPayConfigured } from "./config";

export function getPaymentProvider(): PaymentProvider {
  const id: PaymentProviderId = getConfiguredProviderId();
  if (id === "piprapay") return piprapayProvider;
  return simulatedProvider;
}

/** True when the live PipraPay provider is currently selected AND configured. */
export function isLivePaymentsActive(): boolean {
  return getConfiguredProviderId() === "piprapay" && piprapayProvider.isConfigured();
}
