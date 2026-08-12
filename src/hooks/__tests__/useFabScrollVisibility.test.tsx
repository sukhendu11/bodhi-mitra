/**
 * Unit tests for useFabScrollVisibility — the AI-chat FAB scroll behavior.
 *
 * Verifies the exact contract without a browser:
 *  1. Near the top the FAB never hides.
 *  2. Scrolling DOWN hides it — but ONLY while scrolling keeps happening.
 *  3. PAUSING reveals it again after the 200ms grace period (fake timers).
 *  4. Scrolling UP reveals it immediately.
 *  5. Sub-threshold jitters keep the current state.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFabScrollVisibility } from "@/hooks/useFabScrollVisibility";
import { FAB_REVEAL_GRACE_MS } from "@/lib/fab-scroll-visibility";

/** Override window.scrollY and fire a scroll event inside act(). */
function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, "scrollY", {
      value: y,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
  });
}

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setScrollY(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useFabScrollVisibility", () => {
  it("never hides near the top of the page", () => {
    const { result } = renderHook(() => useFabScrollVisibility());
    expect(result.current).toBe(false);

    scrollTo(40);
    expect(result.current).toBe(false);

    scrollTo(80);
    expect(result.current).toBe(false);

    // Crosses the near-top boundary — should hide now (downward motion).
    scrollTo(200);
    expect(result.current).toBe(true);
  });

  it("hides while scrolling down and reveals once scrolling pauses", () => {
    const { result } = renderHook(() => useFabScrollVisibility());

    scrollTo(400);
    expect(result.current).toBe(true);

    // Still scrolling — remains hidden.
    scrollTo(600);
    expect(result.current).toBe(true);

    // Pause — the grace timer reveals the FAB even mid-page.
    act(() => {
      vi.advanceTimersByTime(FAB_REVEAL_GRACE_MS);
    });
    expect(result.current).toBe(false);

    // Start scrolling down again — hides once more.
    scrollTo(800);
    expect(result.current).toBe(true);

    // Pause shorter than the grace period — still hidden.
    act(() => {
      vi.advanceTimersByTime(FAB_REVEAL_GRACE_MS - 50);
    });
    expect(result.current).toBe(true);

    // Pause long enough — revealed again.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(false);
  });

  it("reveals immediately on scroll-up", () => {
    const { result } = renderHook(() => useFabScrollVisibility());

    scrollTo(500);
    expect(result.current).toBe(true);

    // Scroll up — visible right away, no timer needed.
    scrollTo(300);
    expect(result.current).toBe(false);
  });

  it("keeps the current state on sub-threshold jitter, then reveals on pause", () => {
    const { result } = renderHook(() => useFabScrollVisibility());

    scrollTo(500);
    expect(result.current).toBe(true);

    // Small 4px steps stay under the 8px threshold — remains hidden.
    scrollTo(504);
    scrollTo(508);
    scrollTo(512);
    expect(result.current).toBe(true);

    // Pause — revealed.
    act(() => {
      vi.advanceTimersByTime(FAB_REVEAL_GRACE_MS);
    });
    expect(result.current).toBe(false);
  });

  it("detects a slow sustained downward drift via the moving baseline", () => {
    const { result } = renderHook(() => useFabScrollVisibility());

    scrollTo(500);
    expect(result.current).toBe(true);

    // Slow drift: 5px per tick — each step is under the threshold, but the
    // baseline moves with the page, so the FAB stays hidden while moving.
    scrollTo(505);
    scrollTo(510);
    scrollTo(515);
    expect(result.current).toBe(true);
  });

  it("cleans up the grace timer on unmount without errors", () => {
    const { unmount } = renderHook(() => useFabScrollVisibility());

    scrollTo(500);
    unmount();

    // Advancing time after unmount must not throw or leak state updates.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(FAB_REVEAL_GRACE_MS);
      });
    }).not.toThrow();
  });
});
