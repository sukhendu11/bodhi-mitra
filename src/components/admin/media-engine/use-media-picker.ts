import { useState, useCallback } from "react";
import type { MediaPickerOptions } from "./types";

/* ─── Hook ───────────────────────────────────────────────────────── */

export interface UseMediaPickerReturn {
  /** Whether the picker dialog is open */
  isOpen: boolean;
  /** Open the picker with the given options (user must provide onSelect/onClose) */
  open: (options: MediaPickerOptions) => void;
  /** Close the picker without selection */
  close: () => void;
  /** Current picker options */
  options: MediaPickerOptions | null;
}

/**
 * Hook for managing Media Picker open/close state.
 * The caller provides their own onSelect/onClose callbacks when
 * calling `open()`, which are passed directly to the MediaPicker component.
 *
 * Usage:
 * ```tsx
 * const picker = useMediaPicker();
 * picker.open({
 *   title: "Select Image",
 *   onSelect: (result) => setImageUrl(result.url),
 *   onClose: () => console.log("closed"),
 * });
 * // Render:
 * <MediaPicker open={picker.isOpen} options={picker.options}
 *   onSelect={(r) => { setImageUrl(r.url); picker.close(); }}
 *   onClose={picker.close} />
 * ```
 */
export function useMediaPicker(): UseMediaPickerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<MediaPickerOptions | null>(null);

  const open = useCallback((opts: MediaPickerOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  return { isOpen, open, close, options };
}
