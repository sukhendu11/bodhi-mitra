import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, FileCode } from "lucide-react";

/* ─── Props ──────────────────────────────────────────────────────── */

interface DraftComparisonProps {
  open: boolean;
  onClose: () => void;
  /** The HTML content as last saved (original/committed version) */
  originalHtml: string;
  /** The current HTML content in the editor (draft/working version) */
  currentHtml: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── Draft Comparison ───────────────────────────────────────────── */

export function DraftComparison({
  open,
  onClose,
  originalHtml,
  currentHtml,
}: DraftComparisonProps) {
  const [view, setView] = useState<"side-by-side" | "inline">("side-by-side");

  const diffStats = useMemo(() => {
    if (!originalHtml && !currentHtml) {
      return { added: 0, removed: 0, changed: false };
    }
    // Simple stats based on length comparison
    const added = Math.max(0, currentHtml.length - originalHtml.length);
    const removed = Math.max(0, originalHtml.length - currentHtml.length);
    return {
      added,
      removed,
      changed: originalHtml !== currentHtml,
    };
  }, [originalHtml, currentHtml]);

  if (!open) return null;

  const originalText = stripHtml(originalHtml);
  const currentText = stripHtml(currentHtml);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Draft Comparison</h3>
            <div className="flex items-center gap-1.5 text-[0.5rem] text-muted-foreground">
              {diffStats.changed ? (
                <>
                  <span className="text-green-600 dark:text-green-400">
                    +{diffStats.added} chars
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    -{diffStats.removed} chars
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/60">
                  No changes — identical to saved version
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
              <button
                onClick={() => setView("side-by-side")}
                className={`px-2.5 py-1.5 text-[0.5rem] font-medium transition-colors ${
                  view === "side-by-side"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ChevronLeft className="h-3 w-3 inline mr-1" />
                <ChevronRight className="h-3 w-3 inline" />
              </button>
              <button
                onClick={() => setView("inline")}
                className={`px-2.5 py-1.5 text-[0.5rem] font-medium transition-colors ${
                  view === "inline"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileCode className="h-3 w-3 inline mr-1" />
                Inline
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {view === "side-by-side" ? (
            <div className="grid grid-cols-2 divide-x divide-border/60">
              {/* Original (saved) */}
              <div>
                <div className="px-4 py-2 bg-secondary/20 border-b border-border/40">
                  <span className="text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider">
                    Saved Version
                  </span>
                  <span className="text-[0.45rem] text-muted-foreground/50 ml-2">
                    {originalText.length} chars
                  </span>
                </div>
                <div
                  className="prose-mitra p-4 text-sm max-w-none opacity-70"
                  dangerouslySetInnerHTML={{
                    __html: originalHtml || "<p class='text-muted-foreground italic'>No saved content</p>",
                  }}
                />
              </div>

              {/* Current (draft) */}
              <div>
                <div className="px-4 py-2 bg-secondary/20 border-b border-border/40">
                  <span className="text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider">
                    Current Draft
                  </span>
                  <span className="text-[0.45rem] text-muted-foreground/50 ml-2">
                    {currentText.length} chars
                  </span>
                  {diffStats.changed && (
                    <span className="ml-2 text-[0.45rem] font-medium text-amber-600 dark:text-amber-400">
                      (unsaved changes)
                    </span>
                  )}
                </div>
                <div
                  className="prose-mitra p-4 text-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: currentHtml || "<p class='text-muted-foreground italic'>Empty content</p>",
                  }}
                />
              </div>
            </div>
          ) : (
            /* Inline diff view — shows original with changes highlighted */
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider">
                  Original Text
                </label>
                <div className="bg-secondary/10 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                    {originalText || (
                      <span className="italic">No saved content</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider">
                  Current Draft
                </label>
                <div className="bg-secondary/10 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                    {currentText || (
                      <span className="italic">Empty content</span>
                    )}
                  </p>
                </div>
              </div>
              {diffStats.changed && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                  <p className="text-[0.5rem] font-medium text-amber-700 dark:text-amber-400 mb-1">
                    Summary
                  </p>
                  <p className="text-[0.55rem] text-amber-600 dark:text-amber-300">
                    Added ~{diffStats.added} characters · Removed ~{diffStats.removed} characters
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 shrink-0">
          <p className="text-[0.5rem] text-muted-foreground">
            Comparing draft against last saved version
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
}
