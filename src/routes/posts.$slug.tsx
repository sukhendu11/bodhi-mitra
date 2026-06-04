import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { fetchPostBySlug, fetchPosts } from "@/lib/posts";
import { Comments } from "@/components/Comments";
import { useLang, pickLocalized } from "@/lib/i18n";
import { LetterAvatar } from "@/components/LetterAvatar";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";


export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const [post, siteName] = await Promise.all([
      fetchPostBySlug(params.slug),
      getSiteName(),
    ]);
    if (!post) throw notFound();
    return { post, siteName };
  },
  head: ({ loaderData }: Record<string, unknown>) => {
    const ld = loaderData as { post: { title_en?: string | null; title?: string | null; excerpt_en?: string | null; cover_image?: string | null }; siteName: string } | undefined;
    const p = ld?.post;
    const name = ld?.siteName ?? "Bodhi Mitra";
    const postTitle = p?.title_en || p?.title || "Post";
    return {
      meta: [
        { title: `${postTitle} — ${name}` },
        { name: "description", content: p?.excerpt_en || "Read a reflection." },
        { property: "og:title", content: `${postTitle} — ${name}` },
        { property: "og:description", content: p?.excerpt_en || "Read a reflection." },
        { property: "og:image", content: p?.cover_image || "" },
      ],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-3xl">This reflection has not been written yet.</h1>
      <Link to="/" className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground">
        Return home
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-3xl">Something didn't load</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function PostPage() {
  const { slug } = Route.useParams();
  const { lang, t } = useLang();
  const cfg = useSiteSettings();
  const a = cfg.article;

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPostBySlug(slug),
    staleTime: 60_000,
  });

  const { data: relatedData } = useQuery({
    queryKey: ["related", post?.category, post?.id],
    queryFn: () => fetchPosts(post!.category, 1, 10),
    enabled: !!post && a.show_related_posts,
    staleTime: 60_000,
  });
  const related = relatedData?.data ?? [];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 animate-pulse">
        <div className="h-3 w-32 bg-secondary mb-6" />
        <div className="h-10 w-3/4 bg-secondary mb-4" />
        <div className="h-10 w-1/2 bg-secondary" />
      </div>
    );
  }

  if (!post) throw notFound();

  const title = pickLocalized(post.title_en ?? post.title, post.title_bn, lang, "Untitled");
  const content = pickLocalized(post.content_en ?? post.content, post.content_bn, lang, "");

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const date = new Date(post.created_at).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  const sidebarTitle = pickLocalized(a.sidebar_title_en, a.sidebar_title_bn, lang, "");
  const sidebarText = pickLocalized(a.sidebar_text_en, a.sidebar_text_bn, lang, "");
  const newsletterTitle = pickLocalized(a.newsletter_title_en, a.newsletter_title_bn, lang, "");
  const newsletterText = pickLocalized(a.newsletter_text_en, a.newsletter_text_bn, lang, "");

  const relatedFiltered = related.filter((r) => r.id !== post.id).slice(0, 3);

  return (
    <article className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <header className="mb-14 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
          {post.category}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl leading-[1.15]">
          {title}
        </h1>
        {a.show_author_bio && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <LetterAvatar name={post.author_name} src={post.author_image} size={36} />
            <span>
              {t("by")} <span className="italic">{post.author_name}</span> · {date}
            </span>
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {post.tags.map((tg) => (
              <span key={tg} className="text-[0.7rem] uppercase tracking-[0.14em] border border-border/50 bg-secondary/60 text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90 transition-colors">
                {tg}
              </span>
            ))}
          </div>
        )}
      </header>

      {post.cover_image && (
        <div className="mb-14 -mx-6 md:mx-0">
          <img
            src={post.cover_image}
            alt={title}
            className="w-full aspect-[16/9] object-cover rounded-md"
          />
        </div>
      )}

      {isHtml ? (
        <div className="prose-mitra" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
      ) : (
        <div className="prose-mitra">
          {content.split("\n\n").filter(Boolean).map((p, i, arr) => {
            const isPullout =
              post.category === "Buddhist Psychology" &&
              i === Math.floor(arr.length / 2);
            return (
              <div key={i}>
                <p>{p}</p>
                {isPullout && <MindfulConnection />}
              </div>
            );
          })}
        </div>
      )}

      {(sidebarTitle || sidebarText || newsletterTitle || newsletterText) && (
        <aside className="mt-16 grid gap-6 md:grid-cols-2">
          {(sidebarTitle || sidebarText) && (
            <div className="border border-border rounded-md p-6 bg-secondary/30">
              {sidebarTitle && <p className="font-serif text-lg mb-2">{sidebarTitle}</p>}
              {sidebarText && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{sidebarText}</p>}
            </div>
          )}
          {(newsletterTitle || newsletterText) && (
            <div className="border border-border rounded-md p-6 bg-secondary/30">
              {newsletterTitle && <p className="font-serif text-lg mb-2">{newsletterTitle}</p>}
              {newsletterText && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{newsletterText}</p>}
            </div>
          )}
        </aside>
      )}

      <Comments postId={post.id} />

      {a.show_related_posts && relatedFiltered.length > 0 && (
        <section className="mt-20 pt-10 border-t border-border">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
            {lang === "bn" ? "সম্পর্কিত প্রতিফলন" : "Related reflections"}
          </p>
          <ul className="space-y-4">
            {relatedFiltered.map((r) => {
              const rt = pickLocalized(r.title_en ?? r.title, r.title_bn, lang, "Untitled");
              return (
                <li key={r.id}>
                  <Link to="/posts/$slug" params={{ slug: r.slug }} className="font-serif text-lg hover:underline">
                    {rt}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-20 pt-10 border-t border-border text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground/40 pb-0.5">
          {t("back_all")}
        </Link>
      </footer>
    </article>
  );
}

function MindfulConnection() {
  return (
    <aside className="my-12 border-y border-border/70 py-10 px-2 md:px-8 bg-secondary/30 not-prose">
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground mb-3 text-center">
        ❖ The Mindful Connection
      </p>
      <p className="font-serif text-xl md:text-2xl leading-relaxed text-center text-foreground/90">
        Here, the Buddhist insight and the clinical evidence meet — two languages
        pointing toward one quiet truth about the mind.
      </p>
    </aside>
  );
}
