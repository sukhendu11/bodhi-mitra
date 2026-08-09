import { useEffect, useState } from "react";
import { Toaster, type ToasterProps } from "sonner";
import { CheckCircle2, AlertCircle, Info, TriangleAlert } from "lucide-react";

/**
 * Live dark-mode state — mirrors whatever `.dark` class is actually applied
 * on `<html>`. This covers every theme path: user toggle (ThemeToggle),
 * admin-forced dark, and OS "system" mode (via matchMedia), so the toaster's
 * `data-sonner-theme` always matches the site. Sonner's own `theme="system"`
 * only follows the OS preference and would render light toasts on a manually
 * darkened site.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();

    // Observe the class attribute — catches manual + admin-forced toggles.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Catch OS changes while in "system" mode (applyTheme swaps the class,
    // which the observer already sees — but re-checking on matchMedia change
    // covers the case where the observer fires before applyTheme settles).
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => update();
    mq.addEventListener("change", onMq);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  return isDark;
}

/**
 * SiteToaster — the single Sonner toaster for the whole app (public shell +
 * admin shell). Colors are mapped to Sabbe Satta design tokens in
 * `src/styles.css` (see the `[data-sonner-toaster]` block); this component
 * only supplies the theme mode, `richColors` tinted variants, and Lucide
 * icons (the design system is Lucide-only).
 */
export function SiteToaster(props: Partial<ToasterProps>) {
  const isDark = useIsDark();

  return (
    <Toaster
      position="bottom-center"
      theme={isDark ? "dark" : "light"}
      richColors
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        error: <AlertCircle className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
