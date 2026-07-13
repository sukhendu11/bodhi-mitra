import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBookById, type Book } from "@/lib/books";
import { useAuthSession } from "@/hooks/useAuth";
import { useLang, pickLocalized } from "@/lib/i18n";
import {
  getPdfReaderUrl,
  getReaderBookmarks,
  addReaderBookmark,
  removeReaderBookmark,
  getReaderNotes,
  addReaderNote,
  deleteReaderNote,
} from "@/lib/books-reader";
import { getReadingProgress, upsertProgress } from "@/lib/books-progress";
import { PdfViewer } from "@/components/PdfViewer";
import { ErrorPage } from "@/components/error-page";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Search,
  FileText,
  StickyNote,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";

/* ─── Theme types ──────────────────────────────────────────────── */

export type ReaderTheme = "light" | "dark" | "sepia";

const THEME_CONFIG: Record<
  ReaderTheme,
  { bg: string; text: string; accent: string; label: string; icon: typeof Sun }
> = {
  light: {
    bg: "bg-white",
    text: "text-zinc-900",
    accent: "bg-zinc-100",
    label: "Light",
    icon: Sun,
  },
  dark: {
    bg: "bg-zinc-950",
    text: "text-zinc-100",
    accent: "bg-zinc-800",
    label: "Dark",
    icon: Moon,
  },
  sepia: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    accent: "bg-amber-100",
    label: "Sepia",
    icon: Sun,
  },
};

/* ─── Route ────────────────────────────────────────────────────── */

export const Route = createFileRoute("/reader/$bookId")({
  loader: async ({ params }) => {
    const book = await fetchBookById(params.bookId);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.book?.title_en || "Reader"} — Reader` },
      { name: "description", content: "Read your book." },
    ],
  }),
  component: ReaderPage,
  notFoundComponent: () => <ErrorPage error={new Error("Book not found")} />,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

/* ─── Reader Page ──────────────────────────────────────────────── */

type PanelTab = "bookmarks" | "notes" | "search";

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
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("light");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("bookmarks");
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const doGetReaderUrl = useServerFn(getPdfReaderUrl);
  const doGetBookmarks = useServerFn(getReaderBookmarks);
  const doAddBookmark = useServerFn(addReaderBookmark);
  const doRemoveBookmark = useServerFn(removeReaderBookmark);
  const doGetNotes = useServerFn(getReaderNotes);
  const doAddNote = useServerFn(addReaderNote);
  const doDeleteNote = useServerFn(deleteReaderNote);

  /* ── Load signed PDF URL ─────────────────────────────────────── */
  useEffect(() => {
    if (!book?.pdf_url) {
      setPdfError("No PDF available for this book.");
      setPdfLoading(false);
      return;
    }
    setPdfLoading(true);
    setPdfError(null);
    (doGetReaderUrl as any)({ data: { bookId: book.id, bucketPath: book.pdf_url } })
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

  // Track page changes and save progress
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePageChange = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      setTotalPages(total);

      // Debounce progress save (every 5 seconds of page stability)
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      if (user && book) {
        progressTimerRef.current = setTimeout(() => {
          upsertProgress({ userId: user.id, bookId: book.id, lastPage: page, totalPages: total })
            .then(() =>
              queryClient.invalidateQueries({ queryKey: ["book-progress", book.id, user.id] }),
            )
            .catch(() => {
              /* silent */
            });
        }, 5000);
      }
    },
    [user, book, queryClient],
  );

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

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
    queryFn: () => (doGetBookmarks as any)({ data: { bookId } }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addBkmkMutation = useMutation({
    mutationFn: (pageNumber: number) => (doAddBookmark as any)({ data: { bookId, pageNumber } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success("Page bookmarked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeBkmkMutation = useMutation({
    mutationFn: (id: string) => (doRemoveBookmark as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success("Bookmark removed");
    },
  });

  const isCurrentPageBookmarked = (bookmarks as any[]).some(
    (b: any) => b.page_number === currentPage,
  );

  /* ── Reader notes ────────────────────────────────────────────── */
  const { data: notes = [] } = useQuery({
    queryKey: ["reader-notes", bookId, user?.id],
    queryFn: () => (doGetNotes as any)({ data: { bookId } }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const addNoteMutation = useMutation({
    mutationFn: () =>
      (doAddNote as any)({ data: { bookId, pageNumber: currentPage, text: noteText } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-notes", bookId] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => (doDeleteNote as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-notes", bookId] });
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">Sign in to read</h2>
          <Link
            to="/login"
            search={{ message: "Sign in to read books", redirect: `/reader/${bookId}` }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90"
          >
            Sign in
          </Link>
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
            className={`p-1.5 rounded-md hover:${theme.accent} transition-colors shrink-0`}
            title="Back to book"
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
              className={`text-[0.55rem] tabular-nums mr-2 ${readerTheme === "sepia" ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {Math.round(progress.progress_pct)}%
            </span>
          )}

          {/* Theme toggle */}
          {(["light", "dark", "sepia"] as ReaderTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setReaderTheme(t)}
              className={`p-1.5 rounded-md transition-colors ${readerTheme === t ? theme.accent : `hover:${theme.accent}`}`}
              title={THEME_CONFIG[t].label}
            >
              {t === "light" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : t === "dark" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <BookOpen className="h-3.5 w-3.5" />
              )}
            </button>
          ))}

          {/* Panel toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`p-1.5 rounded-md transition-colors ${panelOpen ? theme.accent : `hover:${theme.accent}`}`}
            title="Open side panel"
          >
            <FileText className="h-3.5 w-3.5" />
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
                <span className="text-sm">Opening reader…</span>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm text-muted-foreground">{pdfError}</p>
              <button
                onClick={() =>
                  navigate({
                    to: `/books/$slug`,
                    params: { slug: book.slug },
                    search: { search: "", page: 1 } as any,
                  })
                }
                className="text-xs underline hover:text-foreground"
              >
                Back to book
              </button>
            </div>
          ) : pdfUrl ? (
            <PdfViewer
              url={pdfUrl}
              title={title}
              initialPage={initialPage}
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
                { id: "bookmarks" as PanelTab, icon: BookmarkCheck, label: "Bookmarks" },
                { id: "notes" as PanelTab, icon: StickyNote, label: "Notes" },
                { id: "search" as PanelTab, icon: Search, label: "Search" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[0.55rem] font-medium uppercase tracking-[0.05em] transition-colors ${
                    panelTab === tab.id
                      ? readerTheme === "sepia"
                        ? "text-amber-800 border-b-2 border-amber-600"
                        : "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3">
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
                    className={`w-full flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition-colors ${
                      isCurrentPageBookmarked
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                        : readerTheme === "sepia"
                          ? "border-amber-200 hover:bg-amber-100"
                          : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    {isCurrentPageBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 fill-amber-500" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isCurrentPageBookmarked
                      ? `Page ${currentPage} bookmarked`
                      : `Bookmark page ${currentPage}`}
                  </button>

                  {/* List of bookmarks */}
                  {(bookmarks as any[]).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No bookmarks yet. Bookmark pages as you read.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {(bookmarks as any[]).map((b: any) => (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${readerTheme === "sepia" ? "hover:bg-amber-100" : "hover:bg-secondary/30"}`}
                        >
                          <span className="text-xs font-medium">Page {b.page_number}</span>
                          <button
                            onClick={() => removeBkmkMutation.mutate(b.id)}
                            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
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
                    <p className="text-[0.5rem] uppercase tracking-[0.05em] text-muted-foreground font-medium">
                      Note on page {currentPage}
                    </p>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write a note…"
                      rows={3}
                      className={`w-full text-xs p-2 rounded-lg border resize-none focus:outline-none ${
                        readerTheme === "sepia"
                          ? "border-amber-200 bg-amber-50 placeholder:text-amber-400"
                          : readerTheme === "dark"
                            ? "border-zinc-700 bg-zinc-800"
                            : "border-border bg-background"
                      }`}
                    />
                    <button
                      onClick={() => addNoteMutation.mutate()}
                      disabled={!noteText.trim() || addNoteMutation.isPending}
                      className="w-full py-1.5 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      {addNoteMutation.isPending ? "Adding…" : "Add Note"}
                    </button>
                  </div>

                  {/* Notes list */}
                  {(notes as any[]).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No notes yet.</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {(notes as any[]).map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-lg text-xs leading-relaxed ${readerTheme === "sepia" ? "bg-amber-100" : "bg-secondary/20"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium opacity-60">Page {n.page_number}</span>
                            <button
                              onClick={() => deleteNoteMutation.mutate(n.id)}
                              className="p-0.5 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <p>{n.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Search tab (future-ready — basic text search placeholder) */}
              {panelTab === "search" && (
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      readerTheme === "sepia" ? "border-amber-200" : "border-border"
                    }`}
                  >
                    <Search
                      className={`h-3.5 w-3.5 ${readerTheme === "sepia" ? "text-amber-500" : "text-muted-foreground"}`}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search within PDF…"
                      className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {searchQuery ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Text search within PDF requires pdf.js text layer extraction.
                      <br />
                      <span className="text-[0.5rem]">Coming in the next update.</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
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
          className={`h-0.5 ${readerTheme === "sepia" ? "bg-amber-200" : "bg-zinc-200 dark:bg-zinc-800"}`}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(currentPage / totalPages) * 100}%`,
              backgroundColor: readerTheme === "sepia" ? "#b45309" : "#18181b",
            }}
          />
        </div>
      )}
    </div>
  );
}
