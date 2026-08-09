import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { cn, ACTION_PILL_CLS } from "@/lib/utils";

interface WishlistButtonProps {
  resourceId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Wishlist toggle — works for guests too. The WishlistProvider persists to
 * localStorage (per-device), and the /wishlist page copy already tells guests
 * their list is "stored locally". No login gate needed for the heart toggle.
 */
export function WishlistButton({ resourceId, compact = false, className }: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();

  const wishlisted = isWishlisted(resourceId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(resourceId);
  };

  // Compact: heart icon with instant color change
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          "p-2 rounded-full backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)] ring-1 ring-foreground/[0.04] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer",
          wishlisted
            ? "bg-red-50 dark:bg-red-950/50 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/70"
            : "bg-white/95 dark:bg-zinc-800/95 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-700",
          className,
        )}
        title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors duration-200",
            wishlisted ? "fill-red-500 text-red-500" : "fill-none",
          )}
        />
      </button>
    );
  }

  // Full: labeled pill matching the bookmark button's ACTION_PILL_CLS treatment
  // (bordered, uppercase, tracking) so the two save actions sit side by side
  // consistently on the book detail page.
  return (
    <button
      onClick={handleToggle}
      className={cn(
        ACTION_PILL_CLS,
        "cursor-pointer",
        wishlisted
          ? "text-red-600 dark:text-red-400 border-red-500/40 bg-red-50 dark:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 hover:border-red-500/70 hover:bg-red-100 dark:hover:bg-red-950/50"
          : "",
        className,
      )}
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-colors duration-200",
          wishlisted ? "fill-red-500 text-red-500" : "fill-none",
        )}
      />
      {wishlisted ? "Wishlisted" : "Add to Wishlist"}
    </button>
  );
}
