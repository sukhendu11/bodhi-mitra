/**
 * AI-chat FAB scroll visibility — pure state reducer (2026-08-12).
 *
 * Behavior contract:
 *  - Near the top of the page (< FAB_NEAR_TOP_PX) the FAB is always visible.
 *  - Scrolling DOWN (past the direction threshold) hides the FAB — but ONLY
 *    while the scroll is actually moving; the component's effect layer adds a
 *    reveal-on-pause grace timer (FAB_REVEAL_GRACE_MS) that brings it back
 *    once scrolling stops.
 *  - Scrolling UP reveals it immediately.
 *  - Small jitters (movement below the threshold) keep the current state.
 *
 * Extracted from src/components/AiChatPanel.tsx so the state machine is
 * unit-testable without a browser.
 */

export const FAB_NEAR_TOP_PX = 96;
export const FAB_DIRECTION_THRESHOLD_PX = 8;
export const FAB_REVEAL_GRACE_MS = 300;

export interface FabScrollState {
  /** Whether the FAB should be hidden (faded out + non-interactive). */
  hidden: boolean;
  /** Scroll position of the last processed event (delta baseline). */
  lastY: number;
}

export function createFabScrollState(lastY: number): FabScrollState {
  return { hidden: false, lastY };
}

/** Pure step: given the previous state and the new scroll position, decide
 *  the next visibility state. Never mutates the input state. */
export function fabScrollStep(state: FabScrollState, y: number): FabScrollState {
  if (y < FAB_NEAR_TOP_PX) {
    return { hidden: false, lastY: y };
  }
  if (y > state.lastY + FAB_DIRECTION_THRESHOLD_PX) {
    return { hidden: true, lastY: y };
  }
  if (y < state.lastY - FAB_DIRECTION_THRESHOLD_PX) {
    return { hidden: false, lastY: y };
  }
  // Jitter below the threshold — keep the current visibility, but keep the
  // baseline moving so a sustained slow drift is still detected.
  return { hidden: state.hidden, lastY: y };
}
