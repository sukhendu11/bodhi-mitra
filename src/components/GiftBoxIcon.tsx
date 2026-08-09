/**
 * GiftBoxIcon — the shared gift-box (cart) icon used across the header
 * trigger, the CartDrawer, the /cart page, and /checkout.
 *
 * Extracted so every surface renders the identical mark: a wrapped gift
 * with a lid, center ribbon, and bow knot.
 */
export function GiftBoxIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Box body */}
      <rect x="4" y="10" width="16" height="11" rx="1.5" />
      {/* Lid */}
      <rect x="3" y="6" width="18" height="4.5" rx="1" />
      {/* Bow knot */}
      <polygon points="12,7.2 13.3,8.5 12,9.8 10.7,8.5" strokeWidth="1.3" />
      {/* Center ribbon */}
      <line x1="12" y1="6" x2="12" y2="21" strokeWidth="0.8" opacity="0.25" />
    </svg>
  );
}
