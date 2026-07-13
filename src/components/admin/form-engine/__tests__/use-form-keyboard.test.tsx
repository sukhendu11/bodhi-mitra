import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFormKeyboard } from "../use-form-keyboard";

/* ─── Helpers ────────────────────────────────────────────────────── */

/**
 * Dispatch a keyboard event on the currently focused element (or window
 * if nothing is focused). This mirrors real browser behavior where the
 * event target is the focused element, not window.
 */
function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const target = document.activeElement || window;
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
}

/**
 * Create a focusable element, append it to the document body, and focus it.
 * Returns the element so callers can remove it in test assertions.
 */
function createTarget(tagName: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  // Make the target "focused" by appending to body and calling focus
  document.body.appendChild(el);
  el.focus();
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

/* ════════════════════════════════════════════════════════════════════
   Ctrl+S (Save)
   ════════════════════════════════════════════════════════════════════ */

describe("Ctrl+S — save shortcut", () => {
  it("calls onSave when Ctrl+S is pressed", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave }));

    dispatchKey("s", { ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when Cmd+S (Mac) is pressed", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave }));

    dispatchKey("s", { metaKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onSave only once when both ctrl and meta are pressed", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave }));

    dispatchKey("s", { ctrlKey: true, metaKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSave when disabled", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave, enabled: false }));

    dispatchKey("s", { ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does NOT call onSave for Ctrl+other keys", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave }));

    dispatchKey("d", { ctrlKey: true });
    dispatchKey("a", { ctrlKey: true });
    dispatchKey("z", { ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls preventDefault on Ctrl+S", () => {
    const onSave = vi.fn();
    renderHook(() => useFormKeyboard({ onSave }));

    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true });
    const preventDefault = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Escape (Cancel)
   ════════════════════════════════════════════════════════════════════ */

describe("Escape — cancel shortcut", () => {
  it("calls onCancel when Escape is pressed on a plain element", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    const target = createTarget("div");
    dispatchKey("Escape");
    expect(onCancel).toHaveBeenCalledTimes(1);
    target.remove();
  });

  it("does NOT call onCancel when focused inside a textarea", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    const target = createTarget("textarea");
    dispatchKey("Escape");
    expect(onCancel).not.toHaveBeenCalled();
    target.remove();
  });

  it("does NOT call onCancel when focused inside a contenteditable element", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    const target = createTarget("div", { contenteditable: "true" });
    dispatchKey("Escape");
    expect(onCancel).not.toHaveBeenCalled();
    target.remove();
  });

  it("calls onCancel on a focused input element", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    const target = createTarget("input");
    dispatchKey("Escape");
    expect(onCancel).toHaveBeenCalledTimes(1);
    target.remove();
  });

  it("does NOT call onCancel when disabled", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel, enabled: false }));

    dispatchKey("Escape");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("does NOT call onCancel for other Escape-like keys", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    dispatchKey("Esc");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel even when focused on body direct (no specific target)", () => {
    const onCancel = vi.fn();
    renderHook(() => useFormKeyboard({ onCancel }));

    dispatchKey("Escape");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

/* ════════════════════════════════════════════════════════════════════
   Toggle Enabled
   ════════════════════════════════════════════════════════════════════ */

describe("toggle enabled", () => {
  it("responds to onSave when enabled toggles to true", () => {
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useFormKeyboard({ onSave, enabled }),
      { initialProps: { enabled: false } },
    );

    dispatchKey("s", { ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();

    rerender({ enabled: true });
    dispatchKey("s", { ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("stops responding when enabled toggles to false", () => {
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useFormKeyboard({ onSave, enabled }),
      { initialProps: { enabled: true } },
    );

    dispatchKey("s", { ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    dispatchKey("s", { ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1); // no additional call
  });
});

/* ════════════════════════════════════════════════════════════════════
   Cleanup
   ════════════════════════════════════════════════════════════════════ */

describe("cleanup", () => {
  it("removes event listener on unmount", () => {
    const onSave = vi.fn();
    const { unmount } = renderHook(() => useFormKeyboard({ onSave }));

    unmount();

    dispatchKey("s", { ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });
});
