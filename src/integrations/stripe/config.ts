export const STRIPE_WEBHOOK_SECRET = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
};

export const STRIPE_PRICE_CURRENCY = "usd";

export const CHECKOUT_SUCCESS_URL = (bookSlug: string) =>
  `${getBaseUrl()}/books/${bookSlug}?purchase=success`;

export const CHECKOUT_CANCEL_URL = (bookSlug: string) =>
  `${getBaseUrl()}/books/${bookSlug}?purchase=cancel`;

// Cart checkout redirects to /cart with status params
export const CHECKOUT_CART_SUCCESS_URL = (bookSlug: string) =>
  `${getBaseUrl()}/cart?checkout=success`;

export const CHECKOUT_CART_CANCEL_URL = (bookSlug: string) =>
  `${getBaseUrl()}/cart?checkout=cancel`;

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.SITE_URL || "http://localhost:3000";
}
