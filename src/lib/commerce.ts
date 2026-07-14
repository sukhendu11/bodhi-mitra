import { fetchSiteSettings } from "@/lib/siteSettings";

/** Get currency code from site settings */
export async function getCurrency(): Promise<string> {
  const config = await fetchSiteSettings();
  return config.commerce.currency || "USD";
}

/** Get currency symbol from site settings */
export async function getCurrencySymbol(): Promise<string> {
  const config = await fetchSiteSettings();
  return config.commerce.currency_symbol || "$";
}

/** Get tax rate from site settings (0-100) */
export async function getTaxRate(): Promise<number> {
  const config = await fetchSiteSettings();
  return config.commerce.tax_rate || 0;
}

/** Get refund policy from site settings */
export async function getRefundPolicy(lang: "en" | "bn" = "en"): Promise<string> {
  const config = await fetchSiteSettings();
  return lang === "bn" ? config.commerce.refund_policy_bn : config.commerce.refund_policy_en;
}

/** Format price with currency symbol */
export function formatPrice(amount: number, symbol: string = "$"): string {
  return `${symbol}${amount.toFixed(2)}`;
}

/** Calculate tax amount */
export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

/** Calculate total with tax */
export function calculateTotal(subtotal: number, taxRate: number): number {
  const tax = calculateTax(subtotal, taxRate);
  return subtotal + tax;
}
