import { useEffect, useRef, useState } from "react";
import type { HeadingItem } from "@/lib/headings";

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first heading that's entering the viewport from below
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    const observer = observerRef.current;
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    // Set initial active heading
    const scrollPos = window.scrollY;
    let closest: string | null = null;
    let closestDist = Infinity;
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) {
        const dist = Math.abs(el.getBoundingClientRect().top + window.scrollY - scrollPos - 80);
        if (dist < closestDist) {
          closestDist = dist;
          closest = h.id;
        }
      }
    }
    if (closest) setActiveId(closest);

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileOpen(false);
    }
  };

  if (headings.length === 0) return null;

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav aria-label="Table of contents" className="hidden lg:block">
        <div className="sticky top-28">
          <p className="text-[0.65rem] uppercase tracking-[0.15em] font-medium text-muted-foreground/50 mb-4">
            On this page
          </p>
          <ul className="space-y-1.5 border-l border-border/40">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => handleClick(h.id)}
                  className={`block text-left w-full text-sm leading-snug py-1.5 transition-all duration-200 border-l -ml-px ${
                    activeId === h.id
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                  style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile: collapsible */}
      <nav aria-label="Table of contents" className="lg:hidden mb-10">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 w-full text-xs uppercase tracking-[0.15em] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-3"
        >
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${mobileOpen ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          On this page ({headings.length})
        </button>
        {mobileOpen && (
          <ul className="mt-2 space-y-0.5 border-l-2 border-border/60 pl-4">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => handleClick(h.id)}
                  className={`block text-left w-full text-sm py-2 leading-snug transition-colors ${
                    activeId === h.id
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/60 hover:text-muted-foreground"
                  }`}
                  style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  );
}
