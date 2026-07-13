import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current rating value (0-5, supports half stars) */
  value: number;
  /** Called when user clicks a star. If not provided, the rating is read-only */
  onChange?: (rating: number) => void;
  /** Maximum star count (default 5) */
  max?: number;
  /** Size class for stars (default "h-4 w-4") */
  size?: string;
  /** If true, show the numeric value next to the stars */
  showValue?: boolean;
  /** If true, show the total ratings count */
  totalRatings?: number;
  /** Disable interaction */
  disabled?: boolean;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "h-4 w-4",
  showValue = false,
  totalRatings,
  disabled = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const isInteractive = !!onChange && !disabled;

  const displayValue = hovered || value;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= displayValue;
          const halfFilled = !filled && starValue - 0.5 <= displayValue;

          return (
            <button
              key={i}
              type="button"
              disabled={!isInteractive}
              onClick={() => {
                if (isInteractive) onChange?.(starValue);
              }}
              onMouseEnter={() => {
                if (isInteractive) setHovered(starValue);
              }}
              onMouseLeave={() => {
                if (isInteractive) setHovered(0);
              }}
              className={cn(
                "transition-all duration-150",
                isInteractive ? "cursor-pointer hover:scale-110 active:scale-90" : "cursor-default",
                disabled && "opacity-60",
              )}
              aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            >
              <svg
                className={cn(size, "transition-colors duration-150")}
                viewBox="0 0 24 24"
                fill={filled || halfFilled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {showValue && displayValue > 0 && (
        <span className="text-xs font-medium text-muted-foreground ml-1">
          {displayValue.toFixed(1)}
        </span>
      )}
      {totalRatings !== undefined && totalRatings > 0 && (
        <span className="text-[0.55rem] text-muted-foreground/60 ml-0.5">({totalRatings})</span>
      )}
    </div>
  );
}

/* ─── Rating Breakdown Component ───────────────────────────────── */

interface RatingBreakdownProps {
  distribution: Record<number, number>;
  totalRatings: number;
  avgRating: number;
}

export function RatingBreakdown({ distribution, totalRatings, avgRating }: RatingBreakdownProps) {
  if (totalRatings === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No ratings yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to rate this book.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Average rating display */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold font-serif">{avgRating.toFixed(1)}</span>
        <div>
          <StarRating value={Math.round(avgRating)} size="h-5 w-5" />
          <p className="text-[0.55rem] text-muted-foreground/60 mt-0.5">
            {totalRatings} rating{totalRatings !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-right text-muted-foreground">{star}★</span>
              <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/60 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground/60">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
