import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBookById, type Book } from "@/lib/books";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, pickLocalized, toBanglaDigits } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useTheme } from "@/hooks/useTheme";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  getPdfReaderUrl,
  downloadBookPdf,
  getReaderBookmarks,
  addReaderBookmark,
  removeReaderBookmark,
  getReaderNotes,
  addReaderNote,
  deleteReaderNote,
  updateReaderNote,
} from "@/lib/books-reader";
import { getReadingProgress, upsertProgress } from "@/lib/books-progress";
import { PdfViewer, type PdfViewerHandle } from "@/components/PdfViewer";
import { triggerPdfDownload, printPdfBlob } from "@/lib/reader-download";
import { recordReadingSession } from "@/lib/reading-history";
import { ErrorPage } from "@/components/error-page";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Search,
  FileText,
  ListTree,
  StickyNote,
  Download,
  Printer,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";

import { seoHead } from "@/lib/seo";
import { callFn } from "@/lib/call-fn";
import { cn } from "@/lib/utils";

/* ─── Theme types ──────────────────────────────────────────────── */

export type ReaderTheme = "light" | "dark" | "sepia";

const THEME_CONFIG: Record<
  ReaderTheme,
  { bg: string; text: string; label: string; icon: typeof Sun }
> = {
  light: {
    bg: "bg-white",
    text: "text-zinc-900",
    label: "Light",
    icon: Sun,
  },
  dark: {
    bg: "bg-zinc-950",
    text: "text-zinc-100",
    label: "Dark",
    icon: Moon,
  },
  sepia: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    label: "Sepia",
    icon: Sun,
  },
};

/* Reader-theme-aware panel tokens — the reader panel is independent of the site theme,
   so site tokens (muted-foreground, secondary, border, foreground) would mismatch when
   e.g. the site is dark but the reader is in light/sepia mode. */
const THEME_MUTED: Record<ReaderTheme, string> = {
  light: "text-zinc-500",
  dark: "text-zinc-400",
  sepia: "text-amber-600",
};
const THEME_HOVER_TEXT: Record<ReaderTheme, string> = {
  light: "hover:text-zinc-900",
  dark: "hover:text-zinc-100",
  sepia: "hover:text-amber-900",
};
const THEME_ACTIVE: Record<ReaderTheme, string> = {
  light: "text-zinc-900 border-b-2 border-zinc-900",
  dark: "text-zinc-100 border-b-2 border-zinc-100",
  sepia: "text-amber-800 border-b-2 border-amber-600",
};
const THEME_BORDER: Record<ReaderTheme, string> = {
  light: "border-zinc-200",
  dark: "border-zinc-700",
  sepia: "border-amber-200",
};
const THEME_HOVER_SURFACE: Record<ReaderTheme, string> = {
  light: "hover:bg-zinc-100",
  dark: "hover:bg-zinc-800",
  sepia: "hover:bg-amber-100",
};
const THEME_ITEM_SURFACE: Record<ReaderTheme, string> = {
  light: "bg-zinc-100",
  dark: "bg-zinc-800",
  sepia: "bg-amber-100",
};
const THEME_SOLID: Record<ReaderTheme, string> = {
  light: "bg-zinc-900 text-zinc-50",
  dark: "bg-zinc-100 text-zinc-900",
  sepia: "bg-amber-900 text-amber-50",
};
const THEME_BOOKMARKED: Record<ReaderTheme, string> = {
  light: "border-amber-400 bg-amber-50 text-amber-700",
  dark: "border-amber-500 bg-amber-950/30 text-amber-300",
  sepia: "border-amber-500 bg-amber-100 text-amber-800",
};

/* Reader toolbar button — theme-aware cousin of ACTION_PILL_CLS (article page).
   Same interaction language (border, hover lift, shadow, active press, focus ring)
   but colored with the reader's own light/dark/sepia tokens. */
const toolBtnCls = (t: ReaderTheme, active = false) =>
  cn(
    `inline-flex items-center justify-center p-2 rounded-full border ${THEME_BORDER[t]} transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`,
    active
      ? `${THEME_ITEM_SURFACE[t]} ${THEME_HOVER_TEXT[t]} shadow-sm`
      : `${THEME_MUTED[t]} ${THEME_HOVER_SURFACE[t]} ${THEME_HOVER_TEXT[t]}`,
  );

/* ─── Route ────────────────────────────────────────────────────── */

export const Route = createFileRoute("/reader/$bookId")({
  loader: async ({ params }) => {
    const book = await fetchBookById(params.bookId);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => {
    const book = loaderData?.book as { title_en?: string } | undefined;
    return seoHead({
      title: book?.title_en || "Reader",
      description: "Read your book.",
      path: `/reader/${loaderData?.book?.id || ""}`,
      noIndex: true,
    });
  },
  component: ReaderPage,
  notFoundComponent: () => <ErrorPage error={new Error("Book not found")} />,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

/* ─── Reader Page ──────────────────────────────────────────────── */

type PanelTab = "contents" | "bookmarks" | "notes" | "search";

/** Escape a string for use inside a RegExp constructor. */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split a snippet on the query and wrap matches in <mark>. */
function highlightMatches(text: string, query: string) {
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-200 dark:bg-amber-900 text-inherit rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function ReaderPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const { lang } = useLang();
  const { book } = Route.useLoaderData();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { theme: globalTheme } = useTheme();
  const overrideRef = useRef(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => {
    // Initialise from global theme preference (user > system > fallback)
    if (globalTheme === "dark") return "dark";
    if (globalTheme === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("bookmarks");
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { page: number; snippet: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const searchSeqRef = useRef(0);
  const [busyAction, setBusyAction] = useState<"download" | "print" | null>(null);
  const viewerRef = useRef<PdfViewerHandle>(null);

  // Sync reader theme with global preference unless user manually overrides
  useEffect(() => {
    if (overrideRef.current) return;
    if (globalTheme === "dark") setReaderTheme("dark");
    else if (globalTheme === "light") setReaderTheme("light");
    else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setReaderTheme(isDark ? "dark" : "light");
    }
  }, [globalTheme]);

  const siteConfig = useSiteSettings();
  const showNotesTab = useFeatureFlag("reader_annotations");

  const doGetReaderUrl = useServerFn(getPdfReaderUrl);
  const doDownloadPdf = useServerFn(downloadBookPdf);
  const doGetBookmarks = useServerFn(getReaderBookmarks);
  const doAddBookmark = useServerFn(addReaderBookmark);
  const doRemoveBookmark = useServerFn(removeReaderBookmark);
  const doGetNotes = useServerFn(getReaderNotes);
  const doAddNote = useServerFn(addReaderNote);
  const doDeleteNote = useServerFn(deleteReaderNote);
  const doUpdateNote = useServerFn(updateReaderNote);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  /* ── Load signed PDF URL ─────────────────────────────────────── */
  useEffect(() => {
    if (!book?.pdf_url) {
      setPdfError("No PDF available for this book.");
      setPdfLoading(false);
      return;
    }
    setPdfLoading(true);
    setPdfError(null);

    if (import.meta.env.DEV) {
      // In dev mode, use the PDF URL directly (mock/public PDF)
      setPdfUrl(book.pdf_url);
      setPdfLoading(false);
      return;
    }

    callFn(doGetReaderUrl, { bookId: book.id, bucketPath: book.pdf_url, userId: user?.id })
      .then((result: any) => {
        setPdfUrl(result.signedUrl);
        setPdfLoading(false);
      })
      .catch((err: any) => {
        setPdfError(
          err instanceof Error ? err.message : "Failed to open reader. Please try again.",
        );
        setPdfLoading(false);
      });
  }, [book, doGetReaderUrl]);

  /* ── Reading progress ────────────────────────────────────────── */
  const { data: progress } = useQuery({
    queryKey: ["book-progress", bookId, user?.id],
    queryFn: () => getReadingProgress(user?.id, bookId),
    enabled: !!user,
    staleTime: 15_000,
  });

  // Saved "Save reading progress" preference — when off, page turns still
  // update the UI but nothing is persisted (no resume, no reading history).
  const { data: userPrefs } = useUserPreferences();
  const saveProgress = userPrefs?.reading?.save_progress !== false;

  // Track page changes and save progress
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ page: number; total: number } | null>(null);

  const flushProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    const pending = pendingProgressRef.current;
    if (!pending || !user || !book) return;
    pendingProgressRef.current = null;
    if (!saveProgress) return;
    upsertProgress({
      userId: user.id,
      bookId: book.id,
      lastPage: pending.page,
      totalPages: pending.total,
    })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["book-progress", book.id, user.id] }),
      )
      .catch(() => {
        /* silent */
      });
    // Reading history (mock-first) — same debounce cadence
    recordReadingSession({
      userId: user.id,
      bookId: book.id,
      page: pending.page,
      totalPages: pending.total,
    }).catch(() => {
      /* silent */
    });
  }, [user, book, queryClient, saveProgress]);

  const flushRef = useRef(flushProgress);
  flushRef.current = flushProgress;

  // Flush pending saves on unmount instead of discarding them
  useEffect(() => {
    return () => flushRef.current();
  }, []);

  const handlePageChange = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      setTotalPages(total);
      if (!user || !book) return;
      pendingProgressRef.current = { page, total };
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(flushProgress, 5000);
    },
    [user, book, flushProgress],
  );

  // Resume from last read page on first load
  const initialPage = useMemo(() => {
    if (progress && progress.progress_pct > 0 && progress.progress_pct < 100) {
      return progress.last_page;
    }
    return 1;
  }, [progress]);

  /* ── Reader bookmarks ────────────────────────────────────────── */
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["reader-bookmarks", bookId, user?.id],
    queryFn: () => callFn(doGetBookmarks, { bookId, userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addBkmkMutation = useMutation({
    mutationFn: (pageNumber: number) =>
      callFn(doAddBookmark, { bookId, pageNumber, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success(lang === "bn" ? "পৃষ্ঠা বুকমার্ক করা হয়েছে" : "Page bookmarked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeBkmkMutation = useMutation({
    mutationFn: (id: string) => callFn(doRemoveBookmark, { id, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success(lang === "bn" ? "বুকমার্ক সরানো হয়েছে" : "Bookmark removed");
    },
    onError: (err: Error) => {
      toast.error(`${lang === "bn" ? "বুকমার্ক সরাতে ব্যর্থ" : "Failed to remove bookmark"}: ${err.message}`);
    },
  });

  const isCurrentPageBookmarked = (bookmarks as any[]).some(
    (b: any) => b.page_number === currentPage,
  );

  /* ── Reader notes ────────────────────────────────────────────── */
  const { data: notes = [] } = useQuery({
    queryKey: ["reader-notes", bookId, user?.id],
    queryFn: () => callFn(doGetNotes, { bookId, userId: user?.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      callFn(doAddNote, {
        bookId,
        pageNumber: currentPage,
        text: noteText,
        userId: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-notes", bookId] });
      setNoteText("");
      toast.success(lang === "bn" ? "নোট যোগ করা হয়েছে" : "Note added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => callFn(doDeleteNote, { id, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-notes", bookId] });
    },
    onError: (err: Error) => {
      toast.error(`${lang === "bn" ? "নোট মুছতে ব্যর্থ" : "Failed to delete note"}: ${err.message}`);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      callFn(doUpdateNote, { id, text, userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-notes", bookId] });
      setEditingNoteId(null);
      setEditingNoteText("");
    },
    onError: (err: Error) => {
      toast.error(`${lang === "bn" ? "নোট আপডেট করতে ব্যর্থ" : "Failed to update note"}: ${err.message}`);
      setEditingNoteId(null);
      setEditingNoteText("");
    },
  });

  const [demoMode, setDemoMode] = useState(false);

  /* ── Download / Print (permission-based) ─────────────────────── */
  const handleDownload = async () => {
    if (!book || busyAction) return;
    setBusyAction("download");
    try {
      const result = await callFn(doDownloadPdf, {
        bookId: book.id,
        bucketPath: book.pdf_url,
        filename: `${book.slug || book.id}.pdf`,
        userId: user?.id,
      });
      triggerPdfDownload(result);
      toast.success(lang === "bn" ? "ডাউনলোড শুরু হয়েছে" : "Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : lang === "bn" ? "ডাউনলোড ব্যর্থ হয়েছে।" : "Download failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrint = async () => {
    if (!book || busyAction) return;
    setBusyAction("print");
    try {
      const result = await callFn(doDownloadPdf, {
        bookId: book.id,
        bucketPath: book.pdf_url,
        filename: `${book.slug || book.id}.pdf`,
        userId: user?.id,
      });
      printPdfBlob(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : lang === "bn" ? "প্রিন্ট ব্যর্থ হয়েছে।" : "Print failed.");
    } finally {
      setBusyAction(null);
    }
  };

  /* ── Full-text search (pdf.js text layer) ────────────────────── */
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
      const total = viewerRef.current?.getPageCount() ?? 0;
      const query = q.toLowerCase();
      for (let p = 1; p <= total; p++) {
        if (searchSeqRef.current !== seq) return;
        const text = (await viewerRef.current?.getPageText(p)) ?? "";
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

  if (!user && !demoMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">{siteConfig.reader.sign_in_prompt_title || "Sign in to read"}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {siteConfig.reader.sign_in_prompt_message || "Sign in to read books, save your progress, and bookmark pages."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <BrandCtaButton asChild className="px-5 py-2.5">
              <Link
                to="/login"
                search={{
                  message: siteConfig.reader.sign_in_prompt_message || "Sign in to read books",
                  redirect: `/reader/${bookId}`,
                }}
              >
                Sign in
              </Link>
            </BrandCtaButton>
            {import.meta.env.DEV && (
              <button
                onClick={() => setDemoMode(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary/40"
              >
                Demo Mode
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const theme = THEME_CONFIG[readerTheme];
  const title = pickLocalized(book.title_en, book.title_bn, lang, "Untitled");

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${theme.bg} ${theme.text} transition-colors duration-300`}
    >
      {/* ── Top Toolbar ─────────────────────────────────────────── */}
      <header
        className={`flex items-center justify-between px-3 py-2 border-b ${readerTheme === "dark" ? "border-zinc-800" : "border-zinc-200"} shrink-0`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/books/$slug"
            params={{ slug: book.slug }}
            search={{ search: "", page: 1 }}
            className={`${toolBtnCls(readerTheme)} shrink-0`}
            title="Back to book"
            aria-label="Back to book"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1
            className={`text-sm font-medium truncate ${readerTheme === "sepia" ? "text-amber-800" : ""}`}
          >
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Reading progress indicator */}
          {progress && (
            <span
              className={`text-xs tabular-nums mr-2 ${THEME_MUTED[readerTheme]}`}
            >
              {lang === "bn" ? toBanglaDigits(Math.round(progress.progress_pct)) : Math.round(progress.progress_pct)}%
            </span>
          )}

          {/* Theme toggle */}
          {(["light", "dark", "sepia"] as ReaderTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                overrideRef.current = true;
                setReaderTheme(t);
              }}
              className={toolBtnCls(readerTheme, readerTheme === t)}
              title={THEME_CONFIG[t].label}
              aria-label={`${THEME_CONFIG[t].label} theme`}
              aria-pressed={readerTheme === t}
            >
              {t === "light" ? (
                <Sun className="h-4 w-4" />
              ) : t === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
            </button>
          ))}

          {/* Download / Print (permission-based) */}
          {siteConfig.reader.allow_download && (
            <button
              onClick={handleDownload}
              disabled={busyAction !== null}
              className={toolBtnCls(readerTheme)}
              title="Download PDF"
              aria-label="Download PDF"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {siteConfig.reader.allow_print && (
            <button
              onClick={handlePrint}
              disabled={busyAction !== null}
              className={toolBtnCls(readerTheme)}
              title="Print"
              aria-label="Print"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}

          {/* Panel toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={toolBtnCls(readerTheme, panelOpen)}
            title="Open side panel"
            aria-label="Open side panel"
            aria-expanded={panelOpen}
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{lang === "bn" ? "রিডার খোলা হচ্ছে…" : "Opening reader…"}</span>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className={`text-sm ${THEME_MUTED[readerTheme]}`}>{pdfError}</p>
              <button
                onClick={() =>
                  navigate({
                    to: `/books/$slug`,
                    params: { slug: book.slug },
                    search: { search: "", page: 1 } as any,
                  })
                }
                className={`text-xs underline ${THEME_HOVER_TEXT[readerTheme]}`}
              >
                Back to book
              </button>
            </div>
          ) : pdfUrl ? (
            <PdfViewer
              ref={viewerRef}
              url={pdfUrl}
              title={title}
              initialPage={initialPage}
              initialScale={siteConfig.reader.default_font_size / 16}
              showPageNumbers={siteConfig.reader.show_page_numbers}
              showBackButton={false}
              showTitle={false}
              onPageChange={handlePageChange}
              onClose={() =>
                navigate({
                  to: `/books/$slug`,
                  params: { slug: book.slug },
                  search: { search: "", page: 1 } as any,
                })
              }
            />
          ) : null}
        </div>

        {/* ── Side Panel (bookmarks / notes / search) ───────────── */}
        {panelOpen && (
          <aside
            className={`w-full sm:w-72 shrink-0 border-l overflow-y-auto ${readerTheme === "dark" ? "border-zinc-800 bg-zinc-900" : readerTheme === "sepia" ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"}`}
          >
            {/* Panel tabs */}
            <div className="flex border-b border-inherit">
              {[
                { id: "contents" as PanelTab, icon: ListTree, label: "Contents" },
                { id: "bookmarks" as PanelTab, icon: BookmarkCheck, label: "Bookmarks" },
                ...(showNotesTab
                  ? [{ id: "notes" as PanelTab, icon: StickyNote, label: "Notes" }]
                  : []),
                { id: "search" as PanelTab, icon: Search, label: "Search" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium uppercase tracking-[0.05em] transition-colors ${
                    panelTab === tab.id
                      ? THEME_ACTIVE[readerTheme]
                      : `${THEME_MUTED[readerTheme]} ${THEME_HOVER_TEXT[readerTheme]}`
                  }`}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3">
              {/* Contents tab (TOC from book.chapters) */}
              {panelTab === "contents" && (
                <div className="space-y-1">
                  {(book.chapters ?? []).length === 0 ? (
                    <p className={`text-xs ${THEME_MUTED[readerTheme]} text-center py-6`}>
                      No table of contents for this book.
                    </p>
                  ) : (
                    (book.chapters ?? []).map((chapter, i) => {
                      const chapterPage = book.chapter_pages?.[i] ?? i + 1;
                      const active = currentPage === chapterPage;
                      return (
                        <button
                          key={i}
                          onClick={() => viewerRef.current?.goToPage(chapterPage)}
                          className={`w-full text-left flex items-baseline gap-2 px-2 py-2 rounded-md text-sm transition-colors ${THEME_HOVER_SURFACE[readerTheme]} ${
                            active
                              ? `font-medium ${THEME_HOVER_TEXT[readerTheme]}`
                              : THEME_MUTED[readerTheme]
                          }`}
                        >
                          <span className="text-xs tabular-nums opacity-60 shrink-0">
                            {lang === "bn" ? toBanglaDigits(chapterPage) : chapterPage}
                          </span>
                          <span className="truncate">{chapter}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Bookmarks tab */}
              {panelTab === "bookmarks" && (
                <>
                  {/* Bookmark current page toggle */}
                  <button
                    onClick={() => {
                      if (isCurrentPageBookmarked) {
                        const bkmk = (bookmarks as any[]).find(
                          (b: any) => b.page_number === currentPage,
                        );
                        if (bkmk) removeBkmkMutation.mutate(bkmk.id);
                      } else {
                        addBkmkMutation.mutate(currentPage);
                      }
                    }}
                    disabled={addBkmkMutation.isPending || removeBkmkMutation.isPending}
                    className={`w-full flex items-center justify-center gap-2 py-2 text-sm rounded-full border transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isCurrentPageBookmarked
                        ? THEME_BOOKMARKED[readerTheme]
                        : `${THEME_BORDER[readerTheme]} ${THEME_MUTED[readerTheme]} ${THEME_HOVER_SURFACE[readerTheme]} ${THEME_HOVER_TEXT[readerTheme]}`
                    }`}
                  >
                    {isCurrentPageBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 fill-amber-500" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isCurrentPageBookmarked
                      ? lang === "bn"
                        ? `পৃষ্ঠা ${toBanglaDigits(currentPage)} বুকমার্ক করা হয়েছে`
                        : `Page ${currentPage} bookmarked`
                      : lang === "bn"
                        ? `পৃষ্ঠা ${toBanglaDigits(currentPage)} বুকমার্ক করুন`
                        : `Bookmark page ${currentPage}`}
                  </button>

                  {/* List of bookmarks */}
                  {(bookmarks as any[]).length === 0 ? (
                    <p className={`text-xs ${THEME_MUTED[readerTheme]} text-center py-6`}>
                      No bookmarks yet. Bookmark pages as you read.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {(bookmarks as any[]).map((b: any) => (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${THEME_HOVER_SURFACE[readerTheme]}`}
                        >
                          <span className="text-xs font-medium">{lang === "bn" ? `পৃষ্ঠা ${toBanglaDigits(b.page_number)}` : `Page ${b.page_number}`}</span>
                          <button
                            onClick={() => removeBkmkMutation.mutate(b.id)}
                            className={`p-0.5 ${THEME_MUTED[readerTheme]} hover:text-destructive transition-colors`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Notes tab */}
              {panelTab === "notes" && (
                <>
                  {/* Add note form */}
                  <div className="space-y-2">
                    <p className={`text-xs uppercase tracking-[0.05em] ${THEME_MUTED[readerTheme]} font-medium`}>
                      {lang === "bn" ? `পৃষ্ঠা ${toBanglaDigits(currentPage)}-এ নোট` : `Note on page ${currentPage}`}
                    </p>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={lang === "bn" ? "নোট লিখুন…" : "Write a note…"}
                      rows={3}
                      className={`w-full text-xs p-2 rounded-lg border resize-none focus:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${THEME_BORDER[readerTheme]} ${
                        readerTheme === "sepia"
                          ? "bg-amber-50 placeholder:text-amber-400"
                          : readerTheme === "dark"
                            ? "bg-zinc-800 placeholder:text-zinc-500"
                            : "bg-white placeholder:text-zinc-400"
                      }`}
                    />
                    <button
                      onClick={() => addNoteMutation.mutate()}
                      disabled={!noteText.trim() || addNoteMutation.isPending}
                      className={`w-full py-1.5 text-xs font-medium ${THEME_SOLID[readerTheme]} rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity`}
                    >
                      {addNoteMutation.isPending ? "Adding…" : "Add Note"}
                    </button>
                  </div>

                  {/* Notes list */}
                  {(notes as any[]).length === 0 ? (
                    <p className={`text-xs ${THEME_MUTED[readerTheme]} text-center py-6`}>{lang === "bn" ? "এখনো কোনো নোট নেই।" : "No notes yet."}</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {(notes as any[]).map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-lg text-xs leading-relaxed ${THEME_ITEM_SURFACE[readerTheme]}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium opacity-60">{lang === "bn" ? `পৃষ্ঠা ${toBanglaDigits(n.page_number)}` : `Page ${n.page_number}`}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingNoteId(n.id);
                                  setEditingNoteText(n.text);
                                }}
                                className={`p-0.5 ${THEME_MUTED[readerTheme]} ${THEME_HOVER_TEXT[readerTheme]}`}
                              >
                                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button
                                onClick={() => deleteNoteMutation.mutate(n.id)}
                                className={`p-0.5 ${THEME_MUTED[readerTheme]} hover:text-destructive`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                          {editingNoteId === n.id ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") updateNoteMutation.mutate({ id: n.id, text: editingNoteText });
                                  if (e.key === "Escape") { setEditingNoteId(null); setEditingNoteText(""); }
                                }}
                                className={`flex-1 px-2 py-1 text-xs border rounded focus:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${THEME_BORDER[readerTheme]} ${
                                  readerTheme === "sepia"
                                    ? "bg-amber-50"
                                    : readerTheme === "dark"
                                      ? "bg-zinc-800"
                                      : "bg-white"
                                }`}
                                autoFocus
                              />
                              <button
                                onClick={() => updateNoteMutation.mutate({ id: n.id, text: editingNoteText })}
                                className={`px-2 py-1 text-xs ${THEME_SOLID[readerTheme]} rounded`}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <p>{n.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Search tab — real pdf.js text-layer search */}
              {panelTab === "search" && (
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border focus-within:ring-2 focus-within:ring-primary/40 ${THEME_BORDER[readerTheme]}`}
                  >
                    <Search
                      className={`h-3.5 w-3.5 ${
                        readerTheme === "sepia" ? "text-amber-500" : readerTheme === "dark" ? "text-zinc-400" : "text-zinc-500"
                      }`}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={lang === "bn" ? "PDF-এর মধ্যে খুঁজুন…" : "Search within PDF…"}
                      className={`flex-1 text-xs bg-transparent focus:outline-none ${
                        readerTheme === "sepia" ? "placeholder:text-amber-400" : readerTheme === "dark" ? "placeholder:text-zinc-500" : "placeholder:text-zinc-400"
                      }`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className={`p-0.5 ${THEME_MUTED[readerTheme]} ${THEME_HOVER_TEXT[readerTheme]}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {searchQuery ? (
                    searching ? (
                      <p
                        className={`text-xs ${THEME_MUTED[readerTheme]} flex items-center justify-center gap-2 py-6`}
                      >
                        <Loader2 className="h-3 w-3 animate-spin" /> {lang === "bn" ? "খোঁজা হচ্ছে…" : "Searching…"}
                      </p>
                    ) : searchResults.length === 0 ? (
                      <p className={`text-xs ${THEME_MUTED[readerTheme]} text-center py-6`}>
                        No matches for “{searchQuery}”.
                      </p>
                    ) : (
                      <>
                        <p className={`text-xs ${THEME_MUTED[readerTheme]}`}>
                          {lang === "bn" ? toBanglaDigits(searchResults.length) : searchResults.length}{" "}
                          {searchResults.length === 1 ? "result" : "results"}
                        </p>
                        <div className="space-y-2">
                          {searchResults.slice(0, 50).map((r, i) => (
                            <button
                              key={i}
                              onClick={() => viewerRef.current?.goToPage(r.page)}
                              className={`w-full text-left p-2 rounded-lg border ${THEME_BORDER[readerTheme]} ${THEME_HOVER_SURFACE[readerTheme]} transition-colors`}
                            >
                              <span
                                className={`text-[10px] uppercase tracking-[0.08em] font-medium ${THEME_MUTED[readerTheme]}`}
                              >
                                {lang === "bn" ? `পৃষ্ঠা ${toBanglaDigits(r.page)}` : `Page ${r.page}`}
                              </span>
                              <p
                                className={`text-xs mt-1 leading-relaxed ${THEME_HOVER_TEXT[readerTheme]}`}
                              >
                                {highlightMatches(r.snippet, searchQuery)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    )
                  ) : (
                    <p className={`text-xs ${THEME_MUTED[readerTheme]} text-center py-6`}>
                      Search through the full text of this PDF.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom progress bar ─────────────────────────────────── */}
      {totalPages > 0 && (
        <div
          className={`h-0.5 ${readerTheme === "sepia" ? "bg-amber-200" : readerTheme === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(currentPage / totalPages) * 100}%`,
              backgroundColor: readerTheme === "sepia" ? "#b45309" : readerTheme === "dark" ? "#a1a1aa" : "#18181b",
            }}
          />
        </div>
      )}
    </div>
  );
}
