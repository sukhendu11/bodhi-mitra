import { useEffect, useRef, useState } from "react";
import { fabScrollStep, createFabScrollState, FAB_REVEAL_GRACE_MS } from "@/lib/fab-scroll-visibility";

/**
 * Scroll-aware visibility for the AI-chat FAB (2026-08-12).
 *
 * Returns `true` while the FAB should be hidden. The FAB hides ONLY while the
 * user is actively scrolling DOWN; a 200ms grace timer (restarted on every
 * scroll tick) reveals it again the moment scrolling pauses — even if the
 * user stopped mid-way down a page. Scroll-up and near-top always reveal.
 *
 * Cleanup: the grace timer is cleared on unmount.
 */
export function useFabScrollVisibility(): boolean {
  const [hidden, setHidden] = useState(false);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Closure-local mirrors of the state (no re-render needed between ticks).
    const init = createFabScrollState(window.scrollY);
    let lastY = init.lastY;
    let localHidden = init.hidden;

    const scheduleReveal = () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
      revealTimerRef.current = window.setTimeout(() => {
        localHidden = false;
        setHidden(false);
        revealTimerRef.current = null;
      }, FAB_REVEAL_GRACE_MS);
    };

    const onScroll = () => {
      const next = fabScrollStep({ hidden: localHidden, lastY }, window.scrollY);
      localHidden = next.hidden;
      lastY = next.lastY;
      setHidden(next.hidden);
      // Restart the grace period on every scroll tick — the FAB stays hidden
      // only while scrolling keeps happening.
      scheduleReveal();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  return hidden;
}
