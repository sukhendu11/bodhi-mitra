import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useWishlist } from "@/hooks/useWishlist";
import { useLang, formatCountBadge } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface WishlistBadgeProps {
  className?: string;
}

export function WishlistBadge({ className }: WishlistBadgeProps) {
  const { count } = useWishlist();
  const { lang } = useLang();

  return (
    <Link
      to="/wishlist"
      className={cn(
        "group relative inline-flex items-center justify-center p-1.5 rounded-full",
        "text-muted-foreground hover:text-[var(--color-saffron)]",
        "hover:scale-110",
        "hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]",
        "active:scale-95",
        "transition-all duration-300 cursor-pointer",
        className,
      )}
      title={`Wishlist (${count} items)`}
    >
      {/* Heart icon — scales + glows saffron on hover */}
      <Heart className="h-5 w-5 transition-all duration-300 group-hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.35)]" />
      
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 text-xs font-bold text-white flex items-center justify-center px-1 shadow-sm ring-2 ring-background animate-in zoom-in duration-200">
          {formatCountBadge(count, lang)}
        </span>
      )}
    </Link>
  );
}
