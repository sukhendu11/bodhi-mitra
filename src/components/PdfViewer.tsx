import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  FileX2,
  LayoutGrid,
  ListTree,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  Download,
  Printer,
  X,
  PanelLeft,
  Sun,
  Moon,
  Rows3,
  Columns2,
  AlignVerticalSpaceAround,
} from "lucide-react";
import type * as PdfJs from "pdfjs-dist";
import { encodePdfSrc } from "@/lib/pdf-proxy";
import { cn } from "@/lib/utils";
import { useLang, toBanglaDigits } from "@/lib/i18n";
import { useUserPreferences } from "@/hooks/useUserPreferences";

/* ── Reading theme (light / dark / sepia) ───────────────────────── */
export type ReaderTheme = "light" | "dark" | "sepia";

/** CSS filter applied to a rendered page to reach dark/sepia reading modes.
 *  We paint the page white as usual and let the filter re-map colors, so we
 *  never pay a re-render cost to switch modes. */
const THEME_FILTER: Record<ReaderTheme, string> = {
  light: "none",
  dark: "invert(1) hue-rotate(180deg)",
  sepia: "sepia(0.4) contrast(1.02)",
};

/** Decode the proxy's base64 JSON payload back to PDF bytes. */
function base64ToBytes(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const MAX_DPR = 2;

/**
 * Render a pdf.js page into a canvas using pdf.js v6's native output-scale
 * model. We size the backing store at `devicePixelRatio` and pass the matching
 * `transform` so pdf.js applies the scale itself (we avoid both a manual
 * `getContext(...).setTransform` — which pdf.js discards when given a `canvas`
 * — and sharing one canvas across two concurrent renders).
 */
function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  page: PdfJs.PDFPageProxy,
  viewport: PdfJs.PageViewport,
): PdfJs.RenderTask {
  const outputScale = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
  canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const transform =
    outputScale !== 1 ? ([outputScale, 0, 0, outputScale, 0, 0] as number[]) : undefined;
  return page.render({ canvas, transform, viewport });
}

/** Minimum horizontal drag (px) that counts as a page-turn swipe. */
const SWIPE_THRESHOLD = 60;
/** Max drag-follow distance (px) before the page rubber-bands back. */
const SWIPE_FOLLOW = 90;

/** Zoom-fit modes: fit the page to the viewport width, or both dimensions. */
type ZoomMode = "fit-width" | "fit-page" | "custom";
/** Page layout mode: one page, two-page spread, or continuous vertical scroll. */
export type ReaderMode = "single" | "spread" | "continuous";

/** Zoom percentage presets offered in the preset dropdown. */
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

/* ── Chapter model for the in-viewer table of contents ──────────── */
export interface PdfChapter {
  title: string;
  page: number;
}

/* ── Page thumbnail sidebar ────────────────────────────────────── */
const THUMB_W = 112;
const THUMB_H = 150;

function PageThumbnail({
  pdf,
  pageNumber,
  rotation,
  active,
  visible,
  onSelect,
  width,
  height,
}: {
  pdf: PdfJs.PDFDocumentProxy;
  pageNumber: number;
  rotation: number;
  active: boolean;
  visible: boolean;
  onSelect: (n: number) => void;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const taskRef = useRef<PdfJs.RenderTask | null>(null);
  const { lang } = useLang();

  // Render only when the thumbnail is (near) the sidebar's viewport
  useEffect(() => {
    if (done || !visible) return;
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;
      try {
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1, rotation });
        // Contain the thumbnail inside width × height (no squish or clipping)
        const scale = Math.min(width / base.width, height / base.height);
        const viewport = page.getViewport({ scale, rotation });
        const task = renderPageToCanvas(canvas, page, viewport);
        taskRef.current = task;
        await task.promise;
        if (!cancelled) setDone(true);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          // Leave a blank page rather than retrying forever
          setDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [pdf, pageNumber, rotation, visible, done, width, height]);

  return (
    <button
      type="button"
      data-page={pageNumber}
      onClick={() => onSelect(pageNumber)}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={active ? "page" : undefined}
      className={`relative shrink-0 rounded-md border-2 overflow-hidden flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "border-primary bg-secondary/20 shadow-md"
          : "border-border/50 hover:border-foreground/40 hover:shadow-sm hover:-translate-y-0.5"
      }`}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 m-auto shadow-sm ${done ? "" : "invisible"}`}
      />
      {!done && (
        <div className={`w-full h-full bg-secondary/40 ${visible ? "animate-pulse" : ""}`} />
      )}
      <span
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-medium px-1 rounded-sm bg-background/85 backdrop-blur-sm border border-border/40 leading-tight ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {lang === "bn" ? toBanglaDigits(pageNumber) : pageNumber}
      </span>
    </button>
  );
}

/* ── Continuous mode: one lazy canvas per page, stacked ────────── */
const CONT_PAD = 24;
const CONT_GAP = 40;

function ContinuousPage({
  pdf,
  pageNumber,
  rotation,
  fitWidth,
  customScale,
  theme,
  visible,
}: {
  pdf: PdfJs.PDFDocumentProxy;
  pageNumber: number;
  rotation: number;
  fitWidth: number;
  customScale: number;
  theme: ReaderTheme;
  visible: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const taskRef = useRef<PdfJs.RenderTask | null>(null);
  const { lang } = useLang();

  // Re-render when the target width / zoom changes
  useEffect(() => {
    setDone(false);
  }, [fitWidth, customScale, rotation]);

  useEffect(() => {
    if (done || !visible) return;
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;
      try {
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1, rotation });
        const scale =
          fitWidth > 0
            ? Math.max(0.2, Math.min(3, fitWidth / base.width))
            : customScale;
        const viewport = page.getViewport({ scale, rotation });
        const task = renderPageToCanvas(canvas, page, viewport);
        taskRef.current = task;
        await task.promise;
        if (!cancelled) setDone(true);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          setDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [pdf, pageNumber, rotation, fitWidth, customScale, visible, done]);

  return (
    <div
      data-page={pageNumber}
      className="relative mx-auto"
      style={{ marginBottom: CONT_GAP }}
    >
      <canvas
        ref={canvasRef}
        className={cn("reader-page-shadow block", done ? "" : "invisible")}
        style={{ filter: THEME_FILTER[theme] }}
      />
      <span
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium tabular-nums px-1.5 rounded-sm bg-background/85 border border-border/40 text-muted-foreground"
      >
        {lang === "bn" ? toBanglaDigits(pageNumber) : pageNumber}
      </span>
    </div>
  );
}

function ContinuousView({
  pdf,
  totalPages,
  rotation,
  zoomMode,
  scale,
  currentPage,
  onPageChange,
  theme,
  scrollRef,
}: {
  pdf: PdfJs.PDFDocumentProxy;
  totalPages: number;
  rotation: number;
  zoomMode: ZoomMode;
  scale: number;
  currentPage: number;
  onPageChange: (n: number) => void;
  theme: ReaderTheme;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [visible, setVisible] = useState<Set<number>>(() => new Set());
  const curRef = useRef(currentPage);

  // Measure the content width so pages can fit to it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pre-render pages near the scroll viewport
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          let changed = false;
          const next = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const n = Number((entry.target as HTMLElement).dataset.page);
              if (!next.has(n)) {
                next.add(n);
                changed = true;
              }
            }
          });
          return changed ? next : prev;
        });
      },
      { root, rootMargin: "800px 0px" },
    );
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-page]"));
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [scrollRef, totalPages, rotation]);

  // Report the page nearest the vertical center of the viewport
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const rootTop = root.getBoundingClientRect().top;
      const mid = root.clientHeight / 2;
      let cur = 1;
      root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top - rootTop + r.height / 2 <= mid) {
          cur = Number(el.dataset.page);
        }
      });
      if (cur !== curRef.current) {
        curRef.current = cur;
        onPageChange(cur);
      }
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollRef, totalPages, onPageChange]);

  const fitWidth = zoomMode === "custom" ? 0 : containerW - CONT_PAD * 2;

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col items-center"
      style={{ paddingTop: CONT_PAD }}
    >
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <ContinuousPage
          key={`${n}-${rotation}`}
          pdf={pdf}
          pageNumber={n}
          rotation={rotation}
          fitWidth={fitWidth}
          customScale={scale}
          theme={theme}
          visible={visible.has(n)}
        />
      ))}
    </div>
  );
}

/* ── Left sidebar: Table of Contents + Page thumbnails ─────────── */
type SidebarTab = "toc" | "thumbs";

function TocList({
  chapters,
  pageNum,
  theme,
  onSelect,
}: {
  chapters: PdfChapter[];
  pageNum: number;
  theme: ReaderTheme;
  onSelect: (p: number) => void;
}) {
  const { lang } = useLang();
  const activeCls =
    theme === "sepia"
      ? "font-medium text-amber-800 bg-amber-100"
      : theme === "dark"
        ? "font-medium text-zinc-100 bg-zinc-800"
        : "font-medium text-zinc-900 bg-zinc-100";
  const hoverCls =
    theme === "sepia"
      ? "hover:bg-amber-100"
      : theme === "dark"
        ? "hover:bg-zinc-800"
        : "hover:bg-zinc-100";
  return (
    <div className="space-y-1">
      {chapters.map((ch, i) => {
        const active =
          pageNum >= ch.page &&
          (chapters[i + 1] ? pageNum < chapters[i + 1].page : true);
        return (
          <button
            key={`${ch.title}-${i}`}
            type="button"
            onClick={() => onSelect(ch.page)}
            className={cn(
              "w-full text-left flex items-baseline gap-2 px-2 py-2 rounded-md text-sm transition-colors cursor-pointer",
              hoverCls,
              active && activeCls,
            )}
          >
            <span className="text-xs tabular-nums opacity-60 shrink-0">
              {lang === "bn" ? toBanglaDigits(ch.page) : ch.page}
            </span>
            <span className="truncate">{ch.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeftSidebar({
  pdf,
  totalPages,
  pageNum,
  rotation,
  chapters,
  theme,
  onSelect,
}: {
  pdf: PdfJs.PDFDocumentProxy;
  totalPages: number;
  pageNum: number;
  rotation: number;
  chapters: PdfChapter[];
  theme: ReaderTheme;
  onSelect: (p: number) => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("thumbs");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              next.add(Number((entry.target as HTMLElement).dataset.page));
            }
          });
          return next;
        });
      },
      { root, rootMargin: "300px 0px" },
    );
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-page]"));
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [totalPages, rotation, tab]);

  // Keep the active page centered in the sidebar
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || tab !== "thumbs") return;
    const el = root.querySelector<HTMLElement>(`[data-page="${pageNum}"]`);
    if (!el) return;
    const top = el.offsetTop - root.clientHeight / 2 + el.offsetHeight / 2;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [pageNum, tab]);

  const muted =
    theme === "sepia"
      ? "text-amber-600"
      : theme === "dark"
        ? "text-zinc-400"
        : "text-zinc-500";
  const activeTab =
    theme === "sepia"
      ? "text-amber-800 border-b-2 border-amber-600"
      : theme === "dark"
        ? "text-zinc-100 border-b-2 border-zinc-100"
        : "text-zinc-900 border-b-2 border-zinc-900";

  return (
    <aside
      className="absolute inset-y-0 left-0 z-20 w-[72%] max-w-[17rem] sm:w-48 bg-background/95 backdrop-blur-sm border-r border-border/40 flex flex-col min-h-0 md:static md:bg-card md:backdrop-blur-none"
      aria-label="Reader sidebar"
    >
      {/* Tab switcher */}
      <div className="flex border-b border-border/40 shrink-0">
        <button
          type="button"
          onClick={() => setTab("toc")}
          disabled={chapters.length === 0}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer ${
            tab === "toc" ? activeTab : muted
          }`}
        >
          <ListTree className="h-3 w-3" /> Contents
        </button>
        <button
          type="button"
          onClick={() => setTab("thumbs")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
            tab === "thumbs" ? activeTab : muted
          }`}
        >
          <LayoutGrid className="h-3 w-3" /> Pages
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-2 thumbnail-scroll"
      >
        {tab === "toc" && chapters.length === 0 ? (
          <p className="text-xs text-center py-6">No table of contents.</p>
        ) : tab === "toc" ? (
          <TocList
            chapters={chapters}
            pageNum={pageNum}
            theme={theme}
            onSelect={onSelect}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <PageThumbnail
                key={`${n}-${rotation}`}
                pdf={pdf}
                pageNumber={n}
                rotation={rotation}
                active={n === pageNum}
                visible={visiblePages.has(n)}
                onSelect={onSelect}
                width={THUMB_W}
                height={THUMB_H}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── PdfViewer ─────────────────────────────────────────────────── */

export interface PdfViewerHandle {
  goToPage: (n: number) => void;
  getPageCount: () => number;
  getPageText: (n: number) => Promise<string>;
}

interface PdfViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  /** Initial page to display (for "resume from last read") */
  initialPage?: number;
  /** Initial zoom scale (1.0 = 100%). When omitted the viewer auto-fits to width. */
  initialScale?: number;
  /** Whether to show page numbers in the toolbar */
  showPageNumbers?: boolean;
  /** Kept for backward compatibility — the reader now closes via the ✕ button. */
  showBackButton?: boolean;
  /** Hide the in-viewer title (e.g. when a parent header already shows it) */
  showTitle?: boolean;
  /** Called when the user changes page */
  onPageChange?: (page: number, totalPages: number) => void;
  /** Document chapters for the in-viewer TOC (left sidebar). */
  chapters?: PdfChapter[];
  /** Reading mode / page theme (controlled from the parent when provided). */
  theme?: ReaderTheme;
  onThemeChange?: (t: ReaderTheme) => void;
  /** Initial layout mode. */
  defaultMode?: ReaderMode;
  /** Optional permission-gated handlers — show the Download / Print buttons. */
  onDownload?: () => void;
  onPrint?: () => void;
  /** Whether download / print actions are currently busy. */
  actionsBusy?: boolean;
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  function PdfViewer(
    {
      url,
      title,
      onClose,
      initialPage,
      initialScale,
      showPageNumbers = true,
      showTitle = true,
      onPageChange,
      chapters = [],
      theme: controlledTheme,
      onThemeChange,
      defaultMode = "single",
      onDownload,
      onPrint,
      actionsBusy = false,
    },
    ref,
  ) {
    const { lang } = useLang();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvas2Ref = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [pdf, setPdf] = useState<PdfJs.PDFDocumentProxy | null>(null);
    const [pdfjs, setPdfjs] = useState<typeof PdfJs | null>(null);
    const [pageNum, setPageNum] = useState(1);
    const pageNumRef = useRef(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoomMode, setZoomMode] = useState<ZoomMode>(
      initialScale != null ? "custom" : "fit-width",
    );
    const [scale, setScale] = useState(initialScale ?? 1);
    const [fitScale, setFitScale] = useState(initialScale ?? 1);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [error, setError] = useState("");
    const [fullscreen, setFullscreen] = useState(false);
    const [pageInput, setPageInput] = useState("");
    const [reloadToken, setReloadToken] = useState(0);
    const [focused, setFocused] = useState(false);
    // Touch swipe-to-turn
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    // True when the rendered page is wider than the viewport
    const [contentWide, setContentWide] = useState(false);
    // Collapsible left sidebar
    const [sidebarOpen, setSidebarOpen] = useState(false);
    // Narrow screen (< md): drives the mobile layout (bottom bar, spread
    // collapse, sidebar drawer behavior). Mirrors the Tailwind `md` breakpoint.
    const [isNarrow, setIsNarrow] = useState(false);
    // Layout mode
    const [mode, setMode] = useState<ReaderMode>(defaultMode);
    // Reading theme
    const [theme, setTheme] = useState<ReaderTheme>(controlledTheme ?? "light");
    // True once the user manually picks a theme in the viewer — after that the
    // saved "Reading mode" preference never overrides their in-session choice.
    const themeTouchedRef = useRef(false);
    // Saved reading-mode preference (Settings → Reading Preferences → Reading
    // mode). Applied once loaded, unless the parent controls the theme or the
    // user already changed it manually.
    const { data: userPrefs } = useUserPreferences();
    useEffect(() => {
      if (controlledTheme || themeTouchedRef.current) return;
      const mode = userPrefs?.reading?.mode;
      if (mode === "light" || mode === "sepia" || mode === "dark") setTheme(mode);
    }, [userPrefs, controlledTheme]);
    // In-document search
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<
      { page: number; snippet: string }[]
    >([]);
    const [searching, setSearching] = useState(false);
    const searchSeqRef = useRef(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    // Zoom preset dropdown
    const [zoomMenuOpen, setZoomMenuOpen] = useState(false);

    const renderTaskRef = useRef<PdfJs.RenderTask | null>(null);
    const loadingTaskRef = useRef<PdfJs.PDFDocumentLoadingTask | null>(null);
    const initialPageRef = useRef(initialPage);
    useEffect(() => {
      initialPageRef.current = initialPage;
    }, [initialPage]);
    // Narrow-screen mirror for the render callback (ref keeps it stable).
    const isNarrowRef = useRef(false);
    useEffect(() => {
      isNarrowRef.current = isNarrow;
    }, [isNarrow]);

    // Keep theme in sync with a controlled prop
    useEffect(() => {
      if (controlledTheme) setTheme(controlledTheme);
    }, [controlledTheme]);

    // Open search with Ctrl/Cmd + F
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
          e.preventDefault();
          setSearchOpen((o) => !o);
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
      import("pdfjs-dist").then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdfjs-assets/pdf.worker.min.mjs`;
        setPdfjs(mod);
      });
    }, []);

    useEffect(() => {
      if (!pdfjs) return;
      let cancelled = false;
      loadingTaskRef.current?.destroy().catch(() => {});
      loadingTaskRef.current = null;
      setLoading(true);
      setError("");

      (async () => {
        try {
          const response = await fetch(
            `${import.meta.env.BASE_URL}api/pdf?src=${encodePdfSrc(url)}`,
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF (HTTP ${response.status})`);
          }
          const payload = (await response.json()) as { data?: string };
          if (!payload.data) {
            throw new Error("PDF proxy returned no data");
          }
          const buffer = base64ToBytes(payload.data);
          if (cancelled) return;

          const loadingTask = pdfjs.getDocument({
            data: buffer,
            cMapUrl: `${import.meta.env.BASE_URL}pdfjs-assets/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs-assets/standard_fonts/`,
          });
          loadingTaskRef.current = loadingTask;
          const doc = await loadingTask.promise;
          if (cancelled) return;
          setPdf(doc);
          setTotalPages(doc.numPages);
          const resume = initialPageRef.current;
          const startPage =
            resume && resume >= 1 && resume <= doc.numPages ? resume : 1;
          setPageNum(startPage);
          pageNumRef.current = startPage;
          setLoading(false);
        } catch (err) {
          if (cancelled) return;
          const detail = err instanceof Error ? err.message : String(err);
          setError(
            `Failed to load PDF${detail ? ` — ${detail.slice(0, 140)}` : ""}.`,
          );
          setLoading(false);
          console.error("[PdfViewer] load error:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [url, pdfjs, reloadToken]);

    // Destroy the worker + document on unmount
    useEffect(() => {
      return () => {
        renderTaskRef.current?.cancel();
        loadingTaskRef.current?.destroy().catch(() => {});
      };
    }, []);

    /* ── Single-page / two-page-spread canvas render ──────────── */
    const renderCurrent = useCallback(
      async (num: number) => {
        if (!pdf || mode === "continuous") return;
        const canvas = canvasRef.current;
        const canvas2 = canvas2Ref.current;
        if (!canvas) return;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }
        setRendering(true);
        try {
          const page = await pdf.getPage(num);
          const baseVp = page.getViewport({ scale: 1, rotation });
          const availW = Math.max(200, (scrollRef.current?.clientWidth ?? 800) - 32);
          const availH = Math.max(200, (scrollRef.current?.clientHeight ?? 600) - 32);
          // Two-page spread is unreadable on phones (~140px pages) — collapse
          // to single-page rendering below the md breakpoint. `isNarrow` is
          // mirrored in a ref so the render callback stays stable.
          const spread =
            mode === "spread" && num + 1 <= totalPages && !isNarrowRef.current;
          let effective = scale;
          if (zoomMode !== "custom") {
            const targetW = spread ? availW / 2 : availW;
            const nextFit = Math.max(
              0.4,
              Math.min(
                3,
                zoomMode === "fit-page"
                  ? Math.min(availW / baseVp.width, availH / baseVp.height)
                  : targetW / baseVp.width,
              ),
            );
            effective = nextFit;
            setFitScale((prev) =>
              Math.abs(prev - nextFit) > 0.01 ? nextFit : prev,
            );
          }
          const viewport = page.getViewport({ scale: effective, rotation });

          if (scrollRef.current) {
            const wide =
              viewport.width * (spread ? 2 : 1) >
              scrollRef.current.clientWidth - 32 + 2;
            setContentWide((prev) => (prev !== wide ? wide : prev));
          }

          // Left canvas: current page
          const task = renderPageToCanvas(canvas, page, viewport);
          renderTaskRef.current = task;
          await task.promise;

          // Right canvas (spread only): next page into its OWN canvas
          if (spread && canvas2) {
            const page2 = await pdf.getPage(num + 1);
            const vp2 = page2.getViewport({ scale: effective, rotation });
            const t2 = renderPageToCanvas(canvas2, page2, vp2);
            renderTaskRef.current = t2;
            await t2.promise;
          }
          renderTaskRef.current = null;
        } catch (err: any) {
          if (err?.name !== "RenderingCancelledException") {
            // Transient errors (e.g. cancelled mid-turn) must not nuke the reader.
            // Keep the last good frame; a later navigation re-renders.
            console.error("[PdfViewer] render error:", err);
          }
        } finally {
          setRendering(false);
        }
      },
      [pdf, scale, zoomMode, rotation, mode, totalPages],
    );

    useEffect(() => {
      if (mode === "continuous") return;
      renderCurrent(pageNum);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNum, mode, renderCurrent]);

    // Re-render on zoom / rotate / mode changes
    useEffect(() => {
      if (mode === "continuous") return;
      renderCurrent(pageNumRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomMode, rotation, mode]);

    // Keep pageNumRef fresh (used by the resize observer)
    useEffect(() => {
      pageNumRef.current = pageNum;
    }, [pageNum]);

    // Re-render when the container resizes while in a fit-to-viewport mode
    useEffect(() => {
      const el = scrollRef.current;
      if (!el || zoomMode === "custom" || !pdf || mode === "continuous") return;
      const ro = new ResizeObserver(() => {
        renderCurrent(pageNumRef.current);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [zoomMode, pdf, mode, renderCurrent]);

    // Track narrow screens (width < md = 768px) — drives the mobile bottom
    // control bar, spread-mode collapse, and sidebar drawer behavior.
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const update = () => setIsNarrow(el.clientWidth < 768);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Notify parent of page changes
    useEffect(() => {
      if (totalPages > 0 && onPageChange) {
        onPageChange(pageNum, totalPages);
      }
    }, [pageNum, totalPages, onPageChange]);

    // Resume to initialPage when it arrives AFTER the document already loaded
    useEffect(() => {
      if (!pdf || !initialPage) return;
      const clamped = Math.max(1, Math.min(totalPages || pdf.numPages, initialPage));
      if (clamped !== pageNum) {
        setPageNum(clamped);
        setPageInput("");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPage, pdf]);

    const goToPage = useCallback(
      (n: number) => {
        const target = Math.max(1, Math.min(totalPages, n));
        setPageNum(target);
        setPageInput("");
        if (mode === "continuous") {
          const el = scrollRef.current?.querySelector<HTMLElement>(
            `[data-page="${target}"]`,
          );
          el?.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      },
      [totalPages, mode],
    );

    const zoomIn = () => {
      setZoomMode("custom");
      setScale((s) => Math.min(3, s + 0.15));
    };
    const zoomOut = () => {
      setZoomMode("custom");
      setScale((s) => Math.max(0.4, s - 0.15));
    };
    const setExactScale = (s: number) => {
      setZoomMode("custom");
      setScale(s);
    };
    const fitToWidth = () => setZoomMode("fit-width");
    const fitToPage = () => setZoomMode("fit-page");
    const rotate = () => setRotation((r) => (r + 90) % 360);
    const cycleTheme = () => {
      themeTouchedRef.current = true;
      const next =
        theme === "light" ? "dark" : theme === "dark" ? "sepia" : "light";
      setTheme(next);
      onThemeChange?.(next);
    };

    // Imperative API for parent integrations (search, TOC, download/print)
    useImperativeHandle(
      ref,
      () => ({
        goToPage: (n) => goToPage(n),
        getPageCount: () => totalPages,
        getPageText: async (n: number) => {
          if (!pdf) return "";
          try {
            const page = await pdf.getPage(n);
            const tc = await page.getTextContent();
            return tc.items
              .map((it) => ("str" in it ? (it as { str: string }).str : ""))
              .join(" ");
          } catch {
            return "";
          }
        },
      }),
      [goToPage, totalPages, pdf],
    );

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

    // Default the sidebar open on desktop, closed on touch/small screens
    useEffect(() => {
      const mq = window.matchMedia(
        "(min-width: 768px) and (hover: hover) and (pointer: fine)",
      );
      if (mq.matches && chapters.length) setSidebarOpen(true);
      else setSidebarOpen(false);
    }, [chapters.length]);

    const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const n = parseInt(pageInput, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
          setPageNum(n);
          setPageInput("");
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPage(pageNum - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToPage(pageNum + 1);
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-") {
        zoomOut();
      } else if (e.key === "0") {
        setExactScale(1);
      } else if (e.key === "f" || e.key === "F") {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      } else if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
        } else {
          onClose?.();
        }
      }
    };

    const handleKeyDownRef = useRef(handleKeyDown);
    useEffect(() => {
      handleKeyDownRef.current = handleKeyDown;
    }, [handleKeyDown]);
    useEffect(() => {
      const listener = (e: KeyboardEvent) => {
        handleKeyDownRef.current(e as unknown as React.KeyboardEvent);
      };
      window.addEventListener("keydown", listener);
      return () => window.removeEventListener("keydown", listener);
    }, []);

    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    /* ── Touch swipe-to-turn ─────────────────────────────────── */
    const loadingRef = useRef(loading);
    useEffect(() => {
      loadingRef.current = loading;
    }, [loading]);
    const modeRef = useRef(mode);
    useEffect(() => {
      modeRef.current = mode;
    }, [mode]);
    const goToPageRef = useRef(goToPage);
    useEffect(() => {
      goToPageRef.current = goToPage;
    }, [goToPage]);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const state = {
        startX: 0,
        startY: 0,
        active: false,
        turned: false,
        wide: false,
      };

      const onStart = (ev: TouchEvent) => {
        if (loadingRef.current || ev.touches.length !== 1) return;
        if (modeRef.current === "continuous") return;
        state.startX = ev.touches[0].clientX;
        state.startY = ev.touches[0].clientY;
        state.active = false;
        state.turned = false;
        state.wide = el.scrollWidth > el.clientWidth + 2;
      };

      const onMove = (ev: TouchEvent) => {
        if (loadingRef.current || state.turned) return;
        if (ev.touches.length !== 1) {
          if (state.active) {
            state.turned = true;
            setDragging(false);
            setSwipeOffset(0);
          }
          return;
        }
        const dx = ev.touches[0].clientX - state.startX;
        const dy = ev.touches[0].clientY - state.startY;

        if (!state.active) {
          if (state.wide) return;
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
          if (Math.abs(dy) > Math.abs(dx) * 1.15) return;
          state.active = true;
          setDragging(true);
        }

        ev.preventDefault();
        const excess = Math.max(0, Math.abs(dx) - SWIPE_FOLLOW) * 0.25;
        const offset =
          dx >= 0
            ? Math.min(dx, SWIPE_FOLLOW) + excess
            : Math.max(dx, -SWIPE_FOLLOW) - excess;
        setSwipeOffset(offset);
      };

      const onEnd = (ev: TouchEvent) => {
        if (!state.active) {
          setSwipeOffset(0);
          return;
        }
        const dx = (ev.changedTouches?.[0]?.clientX ?? state.startX) - state.startX;
        if (Math.abs(dx) >= SWIPE_THRESHOLD && !state.turned) {
          state.turned = true;
          if (dx < 0) goToPageRef.current(pageNumRef.current + 1);
          else goToPageRef.current(pageNumRef.current - 1);
        }
        setDragging(false);
        setSwipeOffset(0);
      };

      el.addEventListener("touchstart", onStart, { passive: true });
      el.addEventListener("touchmove", onMove, { passive: false });
      el.addEventListener("touchend", onEnd, { passive: true });
      el.addEventListener("touchcancel", onEnd, { passive: true });
      return () => {
        el.removeEventListener("touchstart", onStart);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("touchend", onEnd);
        el.removeEventListener("touchcancel", onEnd);
      };
    }, []);

    /* ── In-document search (text layer) ──────────────────────── */
    const apiRef = useRef<PdfViewerHandle | null>(null);
    useImperativeHandle(
      ref,
      () => {
        const api: PdfViewerHandle = {
          goToPage: (n) => goToPage(n),
          getPageCount: () => totalPages,
          getPageText: async (n: number) => {
            if (!pdf) return "";
            try {
              const page = await pdf.getPage(n);
              const tc = await page.getTextContent();
              return tc.items
                .map((it) => ("str" in it ? (it as { str: string }).str : ""))
                .join(" ");
            } catch {
              return "";
            }
          },
        };
        apiRef.current = api;
        return api;
      },
      [goToPage, totalPages, pdf],
    );

    useEffect(() => {
      const q = searchQuery.trim();
      const seq = ++searchSeqRef.current;
      if (!q) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const timer = setTimeout(async () => {
        const results: { page: number; snippet: string }[] = [];
        const total = totalPages;
        const query = q.toLowerCase();
        for (let p = 1; p <= total; p++) {
          if (searchSeqRef.current !== seq) return;
          const text = (await apiRef.current?.getPageText(p)) ?? "";
          const lower = text.toLowerCase();
          let idx = lower.indexOf(query);
          while (idx !== -1 && results.length < 100) {
            results.push({
              page: p,
              snippet: text
                .slice(Math.max(0, idx - 40), idx + query.length + 60)
                .replace(/\s+/g, " "),
            });
            idx = lower.indexOf(query, idx + query.length);
          }
        }
        if (searchSeqRef.current !== seq) return;
        setSearchResults(results);
        setSearching(false);
      }, 350);
      return () => clearTimeout(timer);
    }, [searchQuery, totalPages]);

    const displayScale = zoomMode !== "custom" ? fitScale : scale;

    const iconBtn = (t: ReaderTheme, active = false) =>
      cn(
        "flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        t === "dark"
          ? active
            ? "text-zinc-100 bg-zinc-700"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          : t === "sepia"
            ? active
              ? "text-amber-800 bg-amber-200/70"
              : "text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            : active
              ? "text-zinc-900 bg-zinc-200/70"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
      );

    const modeBtn = (t: ReaderTheme, active = false) =>
      cn(
        "flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        t === "dark"
          ? active
            ? "text-zinc-100 bg-zinc-700"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          : t === "sepia"
            ? active
              ? "text-amber-800 bg-amber-200/70"
              : "text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            : active
              ? "text-zinc-900 bg-zinc-200/70"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
      );

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 text-center">
          <FileX2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => {
                setError("");
                setReloadToken((t) => t + 1);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 hover:border-foreground/30 transition-colors cursor-pointer"
            >
              <RotateCw className="h-3 w-3" /> Try again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors cursor-pointer"
              >
                Close reader
              </button>
            )}
          </div>
        </div>
      );
    }

    const themeWrap =
      theme === "dark"
        ? "bg-zinc-900 text-zinc-100"
        : theme === "sepia"
          ? "bg-amber-50 text-amber-900"
          : "bg-white text-zinc-900";
    const themeToolbar =
      theme === "dark"
        ? "border-zinc-800 bg-zinc-900"
        : theme === "sepia"
          ? "border-amber-200 bg-amber-50"
          : "border-zinc-200 bg-white";
    const themeMuted =
      theme === "dark"
        ? "text-zinc-400"
        : theme === "sepia"
          ? "text-amber-600"
          : "text-zinc-500";
    const themeText =
      theme === "dark"
        ? "text-zinc-200"
        : theme === "sepia"
          ? "text-amber-800"
          : "text-zinc-900";
    const themeHover =
      theme === "dark"
        ? "hover:bg-zinc-800"
        : theme === "sepia"
          ? "hover:bg-amber-100"
          : "hover:bg-zinc-100";

    /* ── Shared center cluster: page nav + zoom + mode ───────────
       Rendered in the top toolbar on desktop AND in a dedicated mobile
       bottom bar on phones (same handlers, two placements). The zoom
       dropdown opens downward on desktop (`md:top-full`) and upward on
       mobile (`bottom-full`) so it never clips at the viewer edge. */
    const centerCluster = (
      <>
        {/* Page navigation */}
        <div className="flex items-center gap-1 border-r border-border/40 pr-2 sm:pr-3">
          <button
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className={iconBtn(theme)}
            title="Previous page (←)"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            className={`flex items-center gap-0.5 min-w-[4.5rem] justify-center ${
              !showPageNumbers ? "opacity-0 pointer-events-none" : ""
            }`}
          >
            <input
              type="text"
              inputMode="numeric"
              value={pageInput || pageNum}
              onChange={(e) => setPageInput(e.target.value)}
              onFocus={() => setPageInput(String(pageNum))}
              onKeyDown={handlePageInputKeyDown}
              className={cn(
                "w-8 text-center text-xs tabular-nums bg-transparent border-b border-transparent focus:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                themeText,
              )}
              aria-label="Current page"
            />
            <span className={cn("text-xs", themeMuted)}>/ {lang === "bn" ? toBanglaDigits(totalPages) : totalPages}</span>
          </div>
          <button
            onClick={() => goToPage(pageNum + 1)}
            disabled={pageNum >= totalPages}
            className={iconBtn(theme)}
            title="Next page (→)"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Unified zoom control: [-] pct [+] + preset dropdown */}
        <div className="relative flex items-center gap-1 border-r border-border/40 pr-2 sm:pr-3">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.4 && zoomMode === "custom"}
            className={iconBtn(theme)}
            title="Zoom out (−)"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomMenuOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1 text-xs tabular-nums px-1.5 py-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              themeHover,
              themeText,
            )}
            title="Zoom presets"
            aria-haspopup="listbox"
            aria-expanded={zoomMenuOpen}
          >
            {lang === "bn" ? toBanglaDigits(Math.round(displayScale * 100)) : Math.round(displayScale * 100)}%
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 3 && zoomMode === "custom"}
            className={iconBtn(theme)}
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {zoomMenuOpen && (
            <div
              role="listbox"
              className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 min-w-[9rem] rounded-md border bg-popover shadow-xl py-1 md:top-full md:mt-1 md:bottom-auto md:mb-0"
            >
              <ZoomMenuItem
                label="Fit Width"
                active={zoomMode === "fit-width"}
                onSelect={() => {
                  fitToWidth();
                  setZoomMenuOpen(false);
                }}
              />
              <ZoomMenuItem
                label="Fit Page"
                active={zoomMode === "fit-page"}
                onSelect={() => {
                  fitToPage();
                  setZoomMenuOpen(false);
                }}
              />
              <div className="my-1 h-px bg-border/40" />
              {ZOOM_PRESETS.map((p) => (
                <ZoomMenuItem
                  key={p}
                  label={`${lang === "bn" ? toBanglaDigits(p) : p}%`}
                  active={
                    zoomMode === "custom" && Math.round(scale * 100) === p
                  }
                  onSelect={() => {
                    setExactScale(p / 100);
                    setZoomMenuOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Layout mode selector */}
        <div className="flex items-center gap-0.5 border-r border-border/40 pr-2 sm:pr-3">
          <button
            onClick={() => setMode("single")}
            className={modeBtn(theme, mode === "single")}
            title="Single page"
            aria-pressed={mode === "single"}
            aria-label="Single page mode"
          >
            <Rows3 className="h-4 w-4" />
          </button>
          {/* Spread is unreadable below the md breakpoint — hidden on phones. */}
          <button
            onClick={() => setMode("spread")}
            className={cn(modeBtn(theme, mode === "spread"), "hidden md:flex")}
            title="Two-page spread"
            aria-pressed={mode === "spread"}
            aria-label="Two-page spread mode"
          >
            <Columns2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode("continuous")}
            className={modeBtn(theme, mode === "continuous")}
            title="Continuous scroll"
            aria-pressed={mode === "continuous"}
            aria-label="Continuous scroll mode"
          >
            <AlignVerticalSpaceAround className="h-4 w-4" />
          </button>
        </div>
      </>
    );

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        autoFocus
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label="PDF viewer — use arrow keys to turn pages"
        className={cn(
          "relative h-full flex flex-col overflow-hidden focus:outline-none",
          themeWrap,
        )}
      >
        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div
          className={cn(
            "flex items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-4 py-2 border-b transition-colors shrink-0 flex-wrap",
            themeToolbar,
          )}
        >
          {/* Left: sidebar toggle + title — title truncates; keep the block
              shrinkable so it never pushes the toolbar off a small screen. */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            {!loading && pdf && totalPages > 1 && (
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                aria-pressed={sidebarOpen}
                className={iconBtn(theme, sidebarOpen)}
                title={
                  sidebarOpen
                    ? "Hide sidebar"
                    : "Show sidebar (TOC & page thumbnails)"
                }
                aria-label="Toggle reader sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            {title && showTitle && (
              <h2 className={cn("text-sm font-medium truncate max-w-[160px] md:max-w-[260px]", themeText)}>
                {title}
              </h2>
            )}
          </div>

          {/* Center: page nav + zoom + mode — desktop only here (hidden on
              phones; the same cluster renders in the mobile bottom bar
              below the content area). */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 sm:gap-2">
            {centerCluster}
          </div>

          {/* Right: actions + theme + close */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              aria-pressed={searchOpen}
              className={iconBtn(theme, searchOpen)}
              title="Search in document (Ctrl+F)"
              aria-label="Search in document"
            >
              <Search className="h-4 w-4" />
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                disabled={actionsBusy}
                className={iconBtn(theme)}
                title="Download PDF"
                aria-label="Download PDF"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                disabled={actionsBusy}
                className={iconBtn(theme)}
                title="Print"
                aria-label="Print"
              >
                <Printer className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={rotate}
              className={iconBtn(theme)}
              title="Rotate 90°"
              aria-label="Rotate 90 degrees"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className={iconBtn(theme)}
              title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={cycleTheme}
              className={iconBtn(theme, theme !== "light")}
              title={`Reading mode: ${theme}`}
              aria-label="Toggle reading mode"
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className={cn(iconBtn(theme), "ml-0.5")}
                title="Close reader (Esc)"
                aria-label="Close reader"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Search overlay ───────────────────────────────────── */}
        {searchOpen && (
          <div className={cn("border-b px-3 py-2", themeToolbar)}>
            <div
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border focus-within:ring-2 focus-within:ring-primary/40",
                theme === "dark"
                  ? "border-zinc-700"
                  : theme === "sepia"
                    ? "border-amber-200"
                    : "border-zinc-200",
              )}
            >
              <Search className={cn("h-3.5 w-3.5", themeMuted)} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within PDF…"
                className={cn(
                  "flex-1 text-xs bg-transparent focus:outline-none",
                  theme === "dark"
                    ? "placeholder:text-zinc-500 text-zinc-200"
                    : theme === "sepia"
                      ? "placeholder:text-amber-400 text-amber-800"
                      : "placeholder:text-zinc-400 text-zinc-900",
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={cn("p-0.5 cursor-pointer", themeMuted, themeHover)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {searchQuery ? (
              searching ? (
                <p
                  className={cn(
                    "text-xs flex items-center justify-center gap-2 py-4",
                    themeMuted,
                  )}
                >
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                </p>
              ) : searchResults.length === 0 ? (
                <p className={cn("text-xs text-center py-4", themeMuted)}>
                  No matches for “{searchQuery}”.
                </p>
              ) : (
                <>
                  <p className={cn("text-xs mt-2", themeMuted)}>
                    {lang === "bn" ? toBanglaDigits(searchResults.length) : searchResults.length}{" "}
                    {searchResults.length === 1 ? "result" : "results"}
                  </p>
                  <div className="flex gap-2 overflow-x-auto max-h-40">
                    {searchResults.slice(0, 30).map((r, i) => (
                      <button
                        key={i}
                        onClick={() => goToPage(r.page)}
                        className={cn(
                          "min-w-[10rem] w-40 shrink-0 text-left p-2 rounded-lg border transition-colors cursor-pointer",
                          theme === "dark"
                            ? "border-zinc-700 hover:bg-zinc-800"
                            : theme === "sepia"
                              ? "border-amber-200 hover:bg-amber-100"
                              : "border-zinc-200 hover:bg-zinc-100",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-[0.08em] font-medium",
                            themeMuted,
                          )}
                        >
                          {lang === "bn" ? `পৃষ্ঠা ${toBanglaDigits(r.page)}` : `Page ${r.page}`}
                        </span>
                        <p
                          className={cn(
                            "text-xs mt-1 leading-relaxed line-clamp-3",
                            themeText,
                          )}
                        >
                          {r.snippet}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )
            ) : (
              <p className={cn("text-xs py-3", themeMuted)}>
                Search the full text of this document. Press Ctrl+F to open or
                close.
              </p>
            )}
          </div>
        )}

        {/* ── Content row: sidebar + page ──────────────────────── */}
        <div className="flex-1 flex min-h-0 relative">
          <div className="group/reader relative flex-1 overflow-hidden">
            <div
              ref={scrollRef}
              className={cn(
                // No justify-center here: with centered flex overflow the left
                // edge of a page wider than the viewport becomes unreachable.
                // Auto margins on the page wrapper center it when it fits and
                // keep it scrollable from x=0 when it doesn't.
                "h-full overflow-auto flex items-start p-2 sm:p-4",
                theme === "dark"
                  ? "bg-zinc-950"
                  : theme === "sepia"
                    ? "bg-amber-100/60"
                    : "bg-secondary/10",
              )}
              style={{
                touchAction:
                  mode === "continuous" ? "auto" : contentWide ? "auto" : "pan-y",
              }}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Loading PDF…
                  </span>
                </div>
              ) : mode === "continuous" ? (
                <ContinuousView
                  pdf={pdf!}
                  totalPages={totalPages}
                  rotation={rotation}
                  zoomMode={zoomMode}
                  scale={scale}
                  currentPage={pageNum}
                  onPageChange={setPageNum}
                  theme={theme}
                  scrollRef={scrollRef}
                />
              ) : (
                <div
                  key={`${pageNum}-${mode}-${rotation}`}
                  className="animate-in fade-in duration-200 motion-reduce:animate-none reader-page-shadow flex mx-auto"
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: dragging
                      ? "none"
                      : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
                    gap: mode === "spread" && !isNarrow ? 16 : 0,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="block"
                    style={{ filter: THEME_FILTER[theme] }}
                  />
                  {mode === "spread" && !isNarrow && pageNum + 1 <= totalPages && (
                    <canvas
                      ref={canvas2Ref}
                      className="block"
                      style={{ filter: THEME_FILTER[theme] }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Page-turn affordances (single / spread only) */}
            {!loading && mode !== "continuous" && (
              <>
                <button
                  onClick={() => goToPage(pageNum - 1)}
                  disabled={pageNum <= 1}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-12 w-8 md:h-14 md:w-10 opacity-60 md:opacity-0 md:group-hover/reader:opacity-100 md:hover:!opacity-100 disabled:opacity-0 disabled:pointer-events-none transition-opacity duration-300 cursor-pointer"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <span className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-full bg-background/85 backdrop-blur border border-border/50 shadow-sm hover:border-foreground/30 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                </button>
                <button
                  onClick={() => goToPage(pageNum + 1)}
                  disabled={pageNum >= totalPages}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-12 w-8 md:h-14 md:w-10 opacity-60 md:opacity-0 md:group-hover/reader:opacity-100 md:hover:!opacity-100 disabled:opacity-0 disabled:pointer-events-none transition-opacity duration-300 cursor-pointer"
                  title="Next page"
                  aria-label="Next page"
                >
                  <span className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-full bg-background/85 backdrop-blur border border-border/50 shadow-sm hover:border-foreground/30 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>

                {/* Swipe edge shadows */}
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-foreground/10 to-transparent"
                  style={{
                    opacity:
                      swipeOffset < 0
                        ? Math.min(0.8, -swipeOffset / SWIPE_FOLLOW)
                        : 0,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-foreground/10 to-transparent"
                  style={{
                    opacity:
                      swipeOffset > 0
                        ? Math.min(0.8, swipeOffset / SWIPE_FOLLOW)
                        : 0,
                  }}
                />

                {rendering && (
                  <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-background/85 backdrop-blur border border-border/50 shadow-sm text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Rendering…</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Left sidebar (drawer) ───────────────────────────
              On phones the drawer overlays the page; a dimmed backdrop
              (md:hidden) closes it on tap, and picking a page or chapter
              auto-dismisses so the reader returns to content immediately. */}
          {sidebarOpen && !loading && pdf && totalPages > 1 && (
            <>
              <button
                aria-label="Close reader sidebar"
                onClick={() => setSidebarOpen(false)}
                className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] md:hidden"
              />
              <LeftSidebar
                pdf={pdf}
                totalPages={totalPages}
                pageNum={pageNum}
                rotation={rotation}
                chapters={chapters}
                theme={theme}
                onSelect={(p) => {
                  goToPage(p);
                  // Pick-then-dismiss on phones; desktop keeps it open for
                  // continuous navigation between chapters/pages.
                  if (isNarrow) setSidebarOpen(false);
                }}
              />
            </>
          )}
        </div>

        {/* ── Mobile bottom bar — page nav + zoom + mode, thumb-reachable.
            The desktop toolbar keeps only toggle/title/actions; this bar
            carries the cluster on phones so controls never wrap into a
            tall strip at the top. The zoom dropdown opens UPWARD here
            (bottom-full) so it never clips at the viewer's bottom edge. */}
        {!loading && (
          <div
            className={cn(
              "md:hidden shrink-0 flex items-center justify-center gap-x-1.5 gap-y-1 flex-wrap px-2 py-1.5 border-t transition-colors",
              themeToolbar,
            )}
          >
            {centerCluster}
          </div>
        )}

        {/* Keyboard shortcut hint */}
        {focused && !sidebarOpen && (
          <div className="pointer-events-none absolute bottom-2 left-3 z-10 hidden md:flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <kbd>←</kbd> <kbd>→</kbd> <span>turn ·</span> <kbd>+</kbd>{" "}
            <kbd>−</kbd> <span>zoom ·</span> <kbd>F</kbd> <span>search ·</span>{" "}
            <kbd>Esc</kbd> <span>close</span>
          </div>
        )}
      </div>
    );
  },
);

/* ── Zoom preset menu item ──────────────────────────────────────── */
function ZoomMenuItem({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
        active
          ? "text-primary bg-secondary/60 font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
      )}
    >
      {label}
    </button>
  );
}
