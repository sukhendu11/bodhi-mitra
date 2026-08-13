/**
 * Global Search Palette (⌘K) — A1 milestone (2026-08-12).
 *
 * A command-palette-style search over posts / books / videos / pages, opened
 * from:
 *   - the global ⌘K / Ctrl+K shortcut
 *   - the header search icon (desktop + mobile) via OPEN_SEARCH_PALETTE_EVENT
 *   - the mobile bottom-tab "Search" button (same event)
 *
 * Queries the same `searchContent` server function as /search, which is
 * mock-first — so the palette works fully offline in mock mode. Results are
 * grouped by content type with type icons and navigate on Enter / click.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Command } from "cmdk";
import { useLang } from "@/lib/i18n";
import { searchContent, type SearchResult, type ContentType } from "@/lib/search";
import { callFn } from "@/lib/call-fn";
import { OPEN_SEARCH_PALETTE_EVENT } from "@/lib/search-events";
import { Search, BookOpen, Video, File, Loader2, CornerDownLeft, X, ArrowUp, ArrowDown } from "lucide-react";
import { FeatherPenIcon } from "@/components/FeatherPenIcon";

const TYPE_META: Record<ContentType, { labelEn: string; labelBn: string; icon: React.ComponentType<{ className?: string }> }> = {
  post: { labelEn: "Reflections", labelBn: "প্রতিফলন", icon: FeatherPenIcon },
  page: { labelEn: "Pages", labelBn: "পৃষ্ঠা", icon: File },
  book: { labelEn: "Books", labelBn: "বই", icon: BookOpen },
  video: { labelEn: "Videos", labelBn: "ভিডিও", icon: Video },
};

const GROUP_ORDER: ContentType[] = ["post", "book", "video", "page"];

export function SearchPalette() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request counter — a stale (slow) response never overwrites a
  // newer query's results (debounce race guard).
  const reqSeqRef = useRef(0);
  const doSearch = useServerFn(searchContent);

  /* ── Open triggers: ⌘K/Ctrl+K + the header event ─────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_PALETTE_EVENT, onOpen);
    };
  }, []);

  // Reset + focus when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  /* ── Debounced search ────────────────────────────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const seq = ++reqSeqRef.current;
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await callFn(doSearch, { q, page: 1 });
        // Drop stale responses — only the latest query may write results.
        if (seq !== reqSeqRef.current) return;
        setResults(res.results.slice(0, 12));
      } catch {
        if (seq !== reqSeqRef.current) return;
        setResults([]);
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate({ to: url as never });
    },
    [navigate],
  );

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search Sabbe Satta"
      shouldFilter={false}
      overlayClassName="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      contentClassName="fixed left-1/2 top-[12vh] z-[61] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-border/70 bg-popover shadow-2xl ring-1 ring-foreground/5 overflow-hidden"
    >
      {/* Input row */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder={
            lang === "bn"
              ? "প্রতিফলন, বই, ভিডিও খুঁজুন…"
              : "Search reflections, books, videos…"
          }
          className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground/50" />
        ) : (
          <kbd className="hidden sm:inline-flex shrink-0 items-center rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        )}
        {/* Close — a visible ✕ on every screen. Mobile has no esc key, so
            this is the primary close affordance there. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={lang === "bn" ? "অনুসন্ধান বন্ধ করুন" : "Close search"}
          title={lang === "bn" ? "বন্ধ করুন" : "Close"}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-secondary/60 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Command.List className="max-h-[50vh] overflow-y-auto p-1.5 thumbnail-scroll">
        <Command.Empty className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {query.trim().length >= 2
              ? lang === "bn"
                ? "কোনো ফলাফল পাওয়া যায়নি"
                : "No results found"
              : lang === "bn"
                ? "অনুসন্ধান শুরু করতে টাইপ করুন…"
                : "Type to start searching…"}
          </p>
        </Command.Empty>

        {grouped.map((group) => {
          const meta = TYPE_META[group.type];
          const Icon = meta.icon;
          return (
            <Command.Group
              key={group.type}
              heading={
                <span className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <Icon className="h-3 w-3" />
                  {lang === "bn" ? meta.labelBn : meta.labelEn}
                </span>
              }
              className="overflow-hidden rounded-lg"
            >
              {group.items.map((r) => (
                <Command.Item
                  key={`${r.type}-${r.id}`}
                  value={`${r.type}:${r.title}`}
                  onSelect={() => handleSelect(r.url)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/90 data-[selected=true]:bg-secondary/50 data-[selected=true]:text-foreground"
                >
                  {r.thumbnail ? (
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-black/5"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary/40 text-muted-foreground/50">
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
      </Command.List>

      {/* Footer hints — keyboard hints are desktop-only, so the whole line
          hides on small screens (mobile closes via the ✕ button in the input
          row or an outside tap). All glyphs are lucide icons + plain ASCII
          so nothing renders as an unknown box character. */}
      <div className="hidden sm:flex items-center gap-3 border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground/50">
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-secondary/40 px-1 py-px">
            <ArrowUp className="h-2.5 w-2.5" />
            <ArrowDown className="h-2.5 w-2.5" />
          </kbd>{" "}
          navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center rounded border border-border/60 bg-secondary/40 px-1 py-px">
            <CornerDownLeft className="h-3 w-3" />
          </kbd>{" "}
          open
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/60 bg-secondary/40 px-1 py-px">esc</kbd> close
        </span>
        <span className="ml-auto">
          {lang === "bn" ? "এন্টার চাপুন" : "Press Ctrl K anytime"}
        </span>
      </div>
    </Command.Dialog>
  );
}
