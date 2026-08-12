/**
 * Global search palette open event — lets the header search buttons (desktop
 * + mobile) ask the shared SearchPalette (mounted in __root) to open, without
 * coupling the header to the palette component. SSR-safe (no-op without window).
 * Mirrors the cart-events.ts pattern.
 */
export const OPEN_SEARCH_PALETTE_EVENT = "sabbe-satta:open-search-palette";

export function openSearchPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_SEARCH_PALETTE_EVENT));
}
