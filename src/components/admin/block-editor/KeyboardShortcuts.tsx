import { useState, useEffect } from "react";
import { X, Command, ArrowUp, ArrowDown, Keyboard } from "lucide-react";

/* ─── Shortcut Group ─────────────────────────────────────────────── */

interface ShortcutDef {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Formatting",
    shortcuts: [
      { keys: ["Ctrl", "B"], label: "Bold" },
      { keys: ["Ctrl", "I"], label: "Italic" },
      { keys: ["Ctrl", "U"], label: "Underline" },
      { keys: ["Ctrl", "Shift", "X"], label: "Strikethrough" },
      { keys: ["Ctrl", "."], label: "Superscript" },
      { keys: ["Ctrl", ","], label: "Subscript" },
      { keys: ["Ctrl", "E"], label: "Clear formatting" },
    ],
  },
  {
    title: "Heading",
    shortcuts: [
      { keys: ["Ctrl", "Alt", "1"], label: "Heading 1" },
      { keys: ["Ctrl", "Alt", "2"], label: "Heading 2" },
      { keys: ["Ctrl", "Alt", "3"], label: "Heading 3" },
      { keys: ["Ctrl", "Alt", "0"], label: "Paragraph" },
    ],
  },
  {
    title: "Lists & Blocks",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "7"], label: "Ordered list" },
      { keys: ["Ctrl", "Shift", "8"], label: "Bullet list" },
      { keys: ["Ctrl", "Shift", "9"], label: "Task list" },
      { keys: ["Ctrl", "Shift", "B"], label: "Blockquote" },
      { keys: ["Ctrl", "Alt", "C"], label: "Code block" },
    ],
  },    {
    title: "Tables",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "T"], label: "Insert table" },
      { keys: ["Ctrl", "Shift", "I"], label: "Insert row before" },
      { keys: ["Ctrl", "Shift", "J"], label: "Insert row after" },
      { keys: ["Ctrl", "Shift", "K"], label: "Insert column before" },
      { keys: ["Ctrl", "Shift", "L"], label: "Insert column after" },
      { keys: ["Ctrl", "Shift", "Delete"], label: "Delete row/column" },
    ],
  },
  {
    title: "Undo & Redo",
    shortcuts: [
      { keys: ["Ctrl", "Z"], label: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], label: "Redo" },
    ],
  },
  {
    title: "Block Commands",
    shortcuts: [
      { keys: ["/"], label: "Slash commands menu" },
      { keys: ["Ctrl", "D"], label: "Duplicate block" },
      { keys: ["Ctrl", "Shift", "D"], label: "Delete block" },
      { keys: ["Alt", "ArrowUp"], label: "Move block up" },
      { keys: ["Alt", "ArrowDown"], label: "Move block down" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: ["Ctrl", "S"], label: "Save (trigger flush)" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
      { keys: ["Ctrl", "Shift", "P"], label: "Toggle preview" },
      { keys: ["Ctrl", "Shift", "H"], label: "Toggle HTML view" },
      { keys: ["Ctrl", "Shift", "C"], label: "Compare drafts" },
    ],
  },
];

/* ─── Props ──────────────────────────────────────────────────────── */

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

/* ─── Keyboard Shortcuts Dialog ──────────────────────────────────── */

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && navigator.platform?.includes("Mac"));
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-[0.55rem] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs text-foreground/80">
                      {shortcut.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-[0.5rem] font-mono font-medium bg-secondary/80 text-muted-foreground rounded border border-border/40 min-w-[18px] text-center">
                            {key === "Ctrl" ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Command className="h-2.5 w-2.5 inline" />
                                {isMac ? "⌘" : "Ctrl"}
                              </span>
                            ) : key === "ArrowUp" ? (
                              <ArrowUp className="h-2.5 w-2.5 inline" />
                            ) : key === "ArrowDown" ? (
                              <ArrowDown className="h-2.5 w-2.5 inline" />
                            ) : (
                              key
                            )}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-[0.45rem] text-muted-foreground/40">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-border/60 bg-secondary/10 shrink-0">
          <p className="text-[0.45rem] text-muted-foreground/60 text-center">
            Press <kbd className="px-1 py-0.5 text-[0.4rem] font-mono bg-secondary/60 rounded border border-border/40">?</kbd> to toggle this dialog from the editor
          </p>
        </div>
      </div>
    </div>
  );
}
