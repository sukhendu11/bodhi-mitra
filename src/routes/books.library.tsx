import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLang } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/useAuth";
import { getMyLibrary, type LibraryBook } from "@/lib/books-purchases";
import { BookOpen, Library, ArrowRight, BookMarked, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/books/library")({
  head: () => ({
    meta: [
      { title: "My Library — Bodhi Mitra" },
      { name: "description", content: "Your personal library of owned books." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user, loading: authLoading } = useAuthSession();
  const { lang } = useLang();
  const doGetLibrary = useServerFn(getMyLibrary);

  const { data, isLoading } = useQuery({
    queryKey: ["my-library", user?.id],
    queryFn: () => (doGetLibrary as any)(),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="h-8 w-40 bg-secondary/60 animate-pulse rounded-lg mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-secondary/40 animate-pulse rounded-xl mb-3" />
              <div className="h-4 bg-secondary/40 animate-pulse rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary/30 animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="text-center py-24">
          <Library className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Sign in to view your library</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your purchased books and reading progress will appear here.
          </p>
          <Link
            to="/login"
            search={{ message: "", redirect: "/books/library" }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const books: LibraryBook[] = data?.books ?? [];

  const totalBooks = books.length;
  const completedBooks = books.filter((b: LibraryBook) => b.completed).length;
  const inProgressBooks = books.filter(
    (b: LibraryBook) => b.progressPct > 0 && !b.completed,
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Library className="h-5 w-5 text-muted-foreground/60" />
            My Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalBooks === 0
              ? "Your library is empty. Explore books to get started."
              : `${totalBooks} book${totalBooks !== 1 ? "s" : ""} · ${completedBooks} completed · ${inProgressBooks} in progress`}
          </p>
        </div>
        <Link
          to="/books"
          search={{ search: "", page: 1 }}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Browse books <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {totalBooks === 0 ? (
        <div className="text-center py-24">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium mb-2">No books yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Explore our collection and add books to your library.
          </p>
          <Link
            to="/books"
            search={{ search: "", page: 1 }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            Browse books <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
          {books.map((book) => (
            <LibraryBookCard key={book.bookId} book={book} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryBookCard({ book, lang }: { book: LibraryBook; lang: string }) {
  const title = lang === "bn" ? (book.titleBn ?? book.titleEn) : (book.titleEn ?? book.titleBn);
  const progressLabel = book.completed
    ? "Completed"
    : book.progressPct > 0
      ? `${book.progressPct}%`
      : "Not started";

  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      search={{ search: "", page: 1 }}
      className="group block text-left w-full"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary/20 border border-border/40 mb-3">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={title ?? ""}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Progress badge */}
        {book.completed ? (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        ) : book.progressPct > 0 ? (
          <div className="absolute top-2 right-2 bg-foreground/80 text-background text-[0.5rem] font-semibold px-1.5 py-0.5 rounded-full">
            {book.progressPct}%
          </div>
        ) : null}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
      </div>

      {/* Info */}
      <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-foreground/80 transition-colors">
        {title ?? "Untitled"}
      </h3>
      {book.author && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
      )}

      {/* Progress bar */}
      {!book.completed && book.progressPct > 0 && (
        <div className="mt-2 h-1 bg-secondary/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/60 rounded-full transition-all"
            style={{ width: `${book.progressPct}%` }}
          />
        </div>
      )}

      {/* Status label */}
      <div className="flex items-center gap-1 mt-1.5">
        {book.completed ? (
          <CheckCircle2 className="h-3 w-3 text-green-600" />
        ) : book.progressPct > 0 ? (
          <Clock className="h-3 w-3 text-amber-500" />
        ) : (
          <BookMarked className="h-3 w-3 text-muted-foreground/40" />
        )}
        <span className="text-[0.55rem] text-muted-foreground/70 uppercase tracking-[0.05em]">
          {progressLabel}
        </span>
      </div>
    </Link>
  );
}
