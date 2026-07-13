import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserBookmarks, type BookmarkedItem } from "@/lib/bookmarks";
import { useAuthSession } from "@/hooks/useAuth";
import { Bookmark, BookmarkCheck, Loader2, ArrowLeft, BookOpen, FileText } from "lucide-react";
import { getSiteName } from "@/lib/siteSettings";
import { pickLocalized, useLang } from "@/lib/i18n";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/bookmarks")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Bookmarks — ${loaderData}` },
      { name: "description", content: "Your bookmarked reflections and books." },
    ],
  }),
  component: BookmarksPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function BookmarksPage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const doGetBookmarks = useServerFn(getUserBookmarks);

  const { data, isLoading } = useQuery({
    queryKey: ["user-bookmarks"],
    queryFn: () => (doGetBookmarks as any)(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const bookmarks: BookmarkedItem[] = data ?? [];
  const postCount = bookmarks.filter((b) => b.resourceType === "post").length;
  const bookCount = bookmarks.filter((b) => b.resourceType === "book").length;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28 text-center">
        <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">Bookmarks</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to save and view your bookmarked reflections and books.
        </p>
        <Link
          to="/login"
          search={{ message: "Sign in to view bookmarks", redirect: "/bookmarks" }}
          className="px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          style={{ backgroundColor: "var(--color-saffron)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
      <div className="mb-10">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight mt-4">
          Bookmarks
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {bookmarks.length} {bookmarks.length === 1 ? "item" : "items"} saved
          {postCount > 0 && ` · ${postCount} ${postCount === 1 ? "reflection" : "reflections"}`}
          {bookCount > 0 && ` · ${bookCount} ${bookCount === 1 ? "book" : "books"}`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border/60 p-5 animate-pulse">
              <div className="h-4 bg-secondary/30 rounded w-1/4 mb-3" />
              <div className="h-5 bg-secondary/30 rounded w-3/4 mb-2" />
              <div className="h-3 bg-secondary/20 rounded w-full" />
            </div>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16 border border-border/60">
          <BookmarkCheck className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            <Link to="/" className="underline hover:text-foreground">
              Browse reflections
            </Link>
            {" or "}
            <Link
              to="/books"
              search={{ search: "", page: 1 }}
              className="underline hover:text-foreground"
            >
              browse books
            </Link>
            {" and bookmark the ones you love."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((b) => {
            const title = pickLocalized(b.titleEn, b.titleBn, lang, "Untitled");
            const excerpt =
              b.resourceType === "post" ? pickLocalized(b.excerptEn, b.excerptBn, lang, "") : null;

            if (b.resourceType === "book") {
              return (
                <Link
                  key={b.id}
                  to="/books/$slug"
                  params={{ slug: b.slug }}
                  search={{ search: "", page: 1 }}
                  className="group block border border-border/60 p-5 hover:border-foreground/30 hover:bg-secondary/10 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {b.coverImage ? (
                      <div className="hidden sm:block w-16 h-20 shrink-0 bg-secondary/20 overflow-hidden rounded">
                        <img
                          src={b.coverImage}
                          alt={title || "Book cover"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="hidden sm:flex w-16 h-20 shrink-0 bg-secondary/30 rounded items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookmarkCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium">
                          Book
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                        {title}
                      </h3>
                      {b.authorName && (
                        <p className="text-xs text-muted-foreground mt-1">By {b.authorName}</p>
                      )}
                      <p className="text-[0.6rem] text-muted-foreground/50 mt-2">
                        Bookmarked{" "}
                        {new Date(b.bookmarkedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            }

            // Post bookmark
            return (
              <Link
                key={b.id}
                to={`/posts/${b.slug}` as any}
                className="group block border border-border/60 p-5 hover:border-foreground/30 hover:bg-secondary/10 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {b.coverImage && (
                    <div className="hidden sm:block w-20 h-20 shrink-0 bg-secondary/20 overflow-hidden">
                      <img
                        src={b.coverImage}
                        alt={title || "Bookmark cover"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <BookmarkCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium">
                        {b.category ?? "Post"}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                      {title}
                    </h3>
                    {excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {excerpt}
                      </p>
                    )}
                    <p className="text-[0.6rem] text-muted-foreground/50 mt-2">
                      Bookmarked{" "}
                      {new Date(b.bookmarkedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
