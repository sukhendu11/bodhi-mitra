import { useBlocker } from "@tanstack/react-router";

/**
 * Combines `beforeunload` (tab/window close) with TanStack Router's
 * `useBlocker` (in-app navigation) to warn when a form has unsaved changes.
 *
 * Uses TanStack Router v1's modern `shouldBlockFn` API (not the deprecated
 * `condition`/`blockerFn` pattern).
 *
 * @param isDirty - Whether the form has unsaved changes.
 * @param message - Optional custom warning message (default: "You have unsaved changes. Are you sure you want to leave?").
 */
export function useUnsavedChanges(isDirty: boolean, message?: string) {
  const warning =
    message ||
    "You have unsaved changes. Are you sure you want to leave?";

  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) return false;
      // eslint-disable-next-line no-alert
      return !window.confirm(warning);
    },
    // Enable beforeunload when the form is dirty
    enableBeforeUnload: isDirty,
    // Disable the blocker entirely when the form is clean
    disabled: !isDirty,
  });
}
