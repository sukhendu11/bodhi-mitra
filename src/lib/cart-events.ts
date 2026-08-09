/**
 * Cart drawer open event — lets any page (e.g. the book product page) ask the
 * header's CartDrawer to open after an add-to-cart action, without coupling
 * the page to the header component. SSR-safe (no-op when window is absent).
 */
export const OPEN_CART_DRAWER_EVENT = "sabbe-satta:open-cart-drawer";

export function openCartDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CART_DRAWER_EVENT));
}
