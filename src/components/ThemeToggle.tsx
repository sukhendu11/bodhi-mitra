import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";

const DURATION = 550;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const check = () => {
      if (theme === "dark") setIsDark(true);
      else if (theme === "light") setIsDark(false);
      else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    check();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [theme]);

  const toggle = () => {
    setIsDark(!isDark);
    requestAnimationFrame(() => setTheme(!isDark ? "dark" : "light"));
  };

  const t = reducedMotion ? 0 : DURATION;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "group relative inline-flex items-center justify-center",
        "w-9 h-9 rounded-full",
        "text-muted-foreground hover:text-foreground",
        "hover:scale-110 hover:rotate-[45deg]",
        "hover:shadow-[0_0_16px_hsl(var(--primary)/0.25)]",
        "active:scale-95",
        "transition-all duration-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      ].join(" ")}
    >
      {/* ─── Moon ───┐
          │ Light mode: visible  Dark mode: hidden
          v Crossfade with scale + opacity */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0.5)" : "scale(1)",
          transitionDuration: `${t}ms`,
          pointerEvents: "none",
        }}
      >
        <Moon className="h-5 w-5" />
      </span>

      {/* ─── Sun ───┐
          │ Dark mode: visible  Light mode: hidden
          v Crossfade with scale + opacity */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-all"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1)" : "scale(0.5)",
          transitionDuration: `${t}ms`,
          pointerEvents: "none",
        }}
      >
        <Sun className="h-5 w-5" />
      </span>
    </button>
  );
}
