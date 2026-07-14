import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type * as PdfJs from "pdfjs-dist";

interface PdfViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  /** Initial page to display (for "resume from last read") */
  initialPage?: number;
  /** Initial zoom scale (1.0 = 100%) */
  initialScale?: number;
  /** Whether to show page numbers in the toolbar */
  showPageNumbers?: boolean;
  /** Called when the user changes page */
  onPageChange?: (page: number, totalPages: number) => void;
}

export function PdfViewer({ url, title, onClose, initialPage, initialScale, showPageNumbers = true, onPageChange }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfJs.PDFDocumentProxy | null>(null);
  const [pdfjs, setPdfjs] = useState<typeof PdfJs | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(initialScale ?? 1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const renderTaskRef = useRef<PdfJs.RenderTask | null>(null);
  const isInitialResume = useRef(true);

  useEffect(() => {
    import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      setPdfjs(mod);
    });
  }, []);

  useEffect(() => {
    if (!pdfjs) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    pdfjs
      .getDocument({ url })
      .promise.then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        // Resume from initialPage if provided and valid
        const startPage =
          initialPage && initialPage >= 1 && initialPage <= doc.numPages ? initialPage : 1;
        setPageNum(startPage);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Failed to load PDF. It may be expired or unavailable.");
        setLoading(false);
        console.error("[PdfViewer] load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [url, pdfjs, initialPage]);

  const renderPage = useCallback(
    async (num: number) => {
      if (!pdf || !canvasRef.current) return;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const page = await pdf.getPage(num);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvas, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("[PdfViewer] render error:", err);
        }
      }
    },
    [pdf, scale],
  );

  useEffect(() => {
    renderPage(pageNum);
  }, [pageNum, renderPage]);

  // Notify parent of page changes
  useEffect(() => {
    if (totalPages > 0 && onPageChange) {
      onPageChange(pageNum, totalPages);
    }
  }, [pageNum, totalPages, onPageChange]);

  const goToPage = (n: number) => {
    const target = Math.max(1, Math.min(totalPages, n));
    setPageNum(target);
    setPageInput("");
  };

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.4, s - 0.2));

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const n = parseInt(pageInput, 10);
      if (!isNaN(n) && n >= 1 && n <= totalPages) goToPage(n);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <p className="text-sm text-muted-foreground">{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Close reader
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              &larr; Back
            </button>
          )}
          {title && <h2 className="text-sm font-medium truncate max-w-[200px]">{title}</h2>}
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-1 border-r border-border/40 pr-3">
            <button
              onClick={() => goToPage(pageNum - 1)}
              disabled={pageNum <= 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className={`flex items-center gap-0.5 min-w-[4.5rem] justify-center ${!showPageNumbers ? "opacity-0 pointer-events-none" : ""}`}>
              <input
                type="text"
                value={pageInput || pageNum}
                onChange={(e) => setPageInput(e.target.value)}
                onFocus={() => setPageInput(String(pageNum))}
                onKeyDown={handlePageInputKeyDown}
                className="w-8 text-center text-xs tabular-nums bg-transparent border-b border-transparent focus:border-foreground/40 focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">/ {totalPages}</span>
            </div>
            <button
              onClick={() => goToPage(pageNum + 1)}
              disabled={pageNum >= totalPages}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-r border-border/40 pr-3">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.4}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs tabular-nums text-muted-foreground min-w-[2.5rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-secondary/10">
        {loading ? (
          <div className="flex items-center gap-2 py-24">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading PDF…</span>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-lg bg-white max-w-full" />
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div
        tabIndex={0}
        className="sr-only"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            goToPage(pageNum - 1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goToPage(pageNum + 1);
          }
          if (e.key === "f" || e.key === "F") {
            e.preventDefault();
            toggleFullscreen();
          }
        }}
      />
    </div>
  );
}
