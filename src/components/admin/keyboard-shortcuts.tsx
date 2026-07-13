import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: "⌘K", label: "Command Palette", description: "Search pages and content" },
  { key: "N", label: "New Post", description: "Create a new blog post" },
  { key: "B", label: "Books", description: "Go to Books management" },
  { key: "V", label: "Videos", description: "Go to Videos management" },
  { key: "C", label: "Courses", description: "Go to Courses management" },
  { key: "P", label: "Pages", description: "Go to Pages management" },
  { key: "M", label: "Media", description: "Go to Media Library" },
  { key: "?", label: "Help", description: "Show keyboard shortcuts" },
];

const isInputFocused = () => {
  const tag = document.activeElement?.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    document.activeElement?.getAttribute("contenteditable") === "true"
  );
};

export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Use these shortcuts to navigate faster.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-3">
                <kbd className="inline-flex items-center justify-center h-6 min-w-[2rem] px-1.5 text-[0.6rem] font-mono font-semibold bg-secondary text-secondary-foreground border border-border/60 rounded">
                  {s.key}
                </kbd>
                <span className="text-sm">{s.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAdminKeyboardShortcuts(openCommandPalette: () => void) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.shiftKey || e.altKey) return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp(true);
          break;
        case "n":
        case "N":
          e.preventDefault();
          navigate({ to: "/admin/new" });
          break;
        case "b":
        case "B":
          e.preventDefault();
          navigate({ to: "/admin/books" });
          break;
        case "v":
        case "V":
          e.preventDefault();
          navigate({ to: "/admin/videos" });
          break;
        case "c":
        case "C":
          e.preventDefault();
          navigate({ to: "/admin/courses" });
          break;
        case "p":
        case "P":
          e.preventDefault();
          navigate({ to: "/admin/pages" });
          break;
        case "m":
        case "M":
          e.preventDefault();
          navigate({ to: "/admin/media" });
          break;
        case "/":
          e.preventDefault();
          openCommandPalette();
          break;
      }
    },
    [navigate, openCommandPalette],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
