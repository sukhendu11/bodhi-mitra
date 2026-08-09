import { Search, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional accent color (e.g. a category taxonomy color) applied to the
   *  search icon + placeholder in dark mode for thematic consistency. */
  accentColor?: string;
}

export function SearchBar({ value, onChange, placeholder, accentColor }: SearchBarProps) {
  const { t } = useLang();

  const accentStyle: CSSProperties | undefined = accentColor
    ? ({ "--search-accent": accentColor } as CSSProperties)
    : undefined;

  return (
    <div className="relative" style={accentStyle}>
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 dark:text-muted-foreground/80 pointer-events-none",
          accentColor && "dark:text-[var(--search-accent)]",
        )}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("search_posts")}
        className={cn(
          "w-full border border-border/60 bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 focus:outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/40 transition-all duration-300 rounded-lg",
          accentColor && "dark:placeholder:text-[var(--search-accent)]",
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors duration-200"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
