import { useEffect, useRef, useState } from "react";

interface ReadingProgressProps {
  targetRef: React.RefObject<HTMLElement | null>;
}

export function ReadingProgress({ targetRef }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = targetRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const articleTop = rect.top + window.scrollY;
        const articleHeight = rect.height;
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;

        // Progress = how much of the article has been scrolled past
        // 0% when top of article enters viewport, 100% when bottom clears viewport
        const totalScrollable = articleHeight + viewportHeight;
        const scrolled = scrollTop - articleTop + viewportHeight;
        const pct = Math.min(100, Math.max(0, (scrolled / totalScrollable) * 100));

        setProgress(pct);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial calculation
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetRef]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none">
      <div
        className="h-full transition-[transform] duration-75 ease-linear will-change-transform"
        style={{
          width: "100%",
          transform: `translateX(${progress - 100}%)`,
          backgroundColor: "var(--color-saffron)",
        }}
      />
    </div>
  );
}
