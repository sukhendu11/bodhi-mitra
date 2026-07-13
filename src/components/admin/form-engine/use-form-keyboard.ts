import { useEffect, useCallback } from "react";

/* ─── Options ────────────────────────────────────────────────────── */

interface UseFormKeyboardOptions {
  /** Called on Ctrl+S (or Cmd+S on Mac) */
  onSave?: () => void;
  /** Called on Escape */
  onCancel?: () => void;
  /** Whether keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/* ─── Hook ───────────────────────────────────────────────────────── */

/**
 * Provides common form-level keyboard shortcuts:
 * - **Ctrl+S** (or Cmd+S on Mac): Triggers `onSave`
 * - **Escape**: Triggers `onCancel`
 *
 * Only fires when no input/textarea/select is focused (to avoid interfering
 * with native Ctrl+S browser save or Escape key behaviors inside fields).
 */
export function useFormKeyboard({
  onSave,
  onCancel,
  enabled = true,
}: UseFormKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+S — save
      if (isCtrl && e.key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Escape — cancel/close (only when not inside a rich text editor)
      if (e.key === "Escape") {
        const tag = (e.target as HTMLElement)?.tagName;
        // Don't intercept Escape inside contenteditable or textareas
        if (
          tag === "TEXTAREA" ||
          (e.target as HTMLElement)?.getAttribute("contenteditable") === "true"
        ) {
          return;
        }
        onCancel?.();
        return;
      }
    },
    [onSave, onCancel, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
