import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { fetchPostBySlug, fetchPosts } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { LetterAvatar } from "@/components/LetterAvatar";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import { NewsletterSignup } from "@/components/NewsletterSignup";

import { SanitizedHtml } from "@/components/SanitizedHtml";
import { Comments } from "@/components/Comments";
import { BookmarkButton } from "@/components/BookmarkButton";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { SocialShare } from "@/components/SocialShare";
import { TypographyControls, useTypography } from "@/components/TypographyControls";
import { ArticleSkeleton } from "@/components/ArticleSkeleton";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Reveal } from "@/components/Reveal";
import { TableOfContents } from "@/components/TableOfContents";
import { parseHeadings, injectHeadingIds } from "@/lib/headings";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const [post, siteName] = await Promise.all([fetchPostBySlug(params.slug), getSiteName()]);
    if (!post) throw notFound();
    return { post, siteName };
  },
  head: ({ loaderData }: Record<string, unknown>) => {
    const ld = loaderData as
      | {
          post: {
            title_en?: string | null;
            title_bn?: string | null;
            title?: string | null;
            excerpt_en?: string | null;
            excerpt_bn?: string | null;
            cover_image?: string | null;
          };
          siteName: string;
        }
      | undefined;
    const p = ld?.post;
    const name = ld?.siteName ?? "Bodhi Mitra";
    const postTitle = p?.title_en || p?.title_bn || p?.title || "Post";
    const desc = p?.excerpt_en || p?.excerpt_bn || "Read a reflection.";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bodhimitra.com";
    const postUrl = `${baseUrl}/posts/${(ld?.post as any)?.slug || ""}`;

    const articleSchema = generateArticleSchema({
      title: postTitle,
      description: desc,
      url: postUrl,
      imageUrl: p?.cover_image || undefined,
      datePublished: (ld?.post as any)?.created_at || new Date().toISOString(),
      authorName: (ld?.post as any)?.author_name || "Bodhi Mitra",
      siteName: name,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: baseUrl },
      { name: "Reflections", url: `${baseUrl}/posts` },
      { name: postTitle, url: postUrl },
    ]);

    return {
      meta: [
        { title: `${postTitle} — ${name}` },
        { name: "description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:title", content: `${postTitle} — ${name}` },
        { property: "og:description", content: desc },
        { property: "og:image", content: p?.cover_image || "" },
        { property: "og:url", content: postUrl },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: postTitle },
        { name: "twitter:image", content: p?.cover_image || "" },
      ],
      scripts: [
        { type: "application/ld+json", JSON: articleSchema },
        { type: "application/ld+json", JSON: breadcrumbSchema },
      ],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-3xl">This reflection has not been written yet.</h1>
      <Link
        to="/"
        className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground"
      >
        Return home
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function PostPage() {
  const { slug } = Route.useParams();
  const articleRef = useRef<HTMLElement>(null);
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
    return <ArticleSkeleton />;
  }

  if (!post) throw notFound();

  const title = pickLocalized(post.title_en ?? post.title, post.title_bn, lang, "Untitled");
  const content = pickLocalized(post.content_en ?? post.content, post.content_bn, lang, "");

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const date = new Date(post.created_at).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  // Parse headings from HTML content and inject IDs for ToC anchors
  const headings = isHtml ? parseHeadings(content) : [];
  const contentWithIds = isHtml ? injectHeadingIds(content) : content;

  // Reading time estimate (~200 words/min, strip HTML for isHtml content)
  const plainText = isHtml ? content.replace(/<[^>]*>/g, "") : content;
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const sidebarTitle = pickLocalized(a.sidebar_title_en, a.sidebar_title_bn, lang, "");
  const sidebarText = pickLocalized(a.sidebar_text_en, a.sidebar_text_bn, lang, "");
  const newsletterTitle = pickLocalized(a.newsletter_title_en, a.newsletter_title_bn, lang, "");
  const newsletterText = pickLocalized(a.newsletter_text_en, a.newsletter_text_bn, lang, "");

  const { settings: typoSettings, setSettings: setTypoSettings, typoClass } = useTypography();

  const relatedFiltered = related.filter((r) => r.id !== post.id).slice(0, 3);

  return (
    <>
      <ReadingProgress targetRef={articleRef} />
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <PublicBreadcrumbs />
        <div
          className={
            headings.length > 0
              ? "lg:grid lg:grid-cols-[minmax(0,42rem)_1fr] lg:gap-8 xl:gap-12"
              : ""
          }
        >
          <article ref={articleRef} className="mx-auto lg:mx-0 w-full max-w-2xl">
            <Reveal delay={0}>
              <header className="mb-14 text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
                  {post.category}
                </p>
                <h1 className="font-serif text-4xl md:text-5xl leading-[1.15]">{title}</h1>
                {a.show_author_bio && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                    <LetterAvatar name={post.author_name} src={post.author_image} size={36} />
                    <span className="inline-flex flex-wrap items-center gap-x-1.5">
                      {t("by")} <span className="italic">{post.author_name}</span>
                      <span className="text-muted-foreground/40" aria-hidden="true">
                        ·
                      </span>
                      <span>{date}</span>
                      <span className="text-muted-foreground/40" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs uppercase tracking-[0.12em] whitespace-nowrap">
                        {readingTime} {t("min_read")}
                      </span>
                    </span>
                  </div>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {post.tags.map((tg) => (
                      <span
                        key={tg}
                        className="text-[0.7rem] uppercase tracking-[0.14em] border border-border/50 bg-secondary/60 text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90 transition-colors"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-4">
                  <BookmarkButton resourceId={post.id} resourceType="post" />
                  <SocialShare
                    url={`${typeof window !== "undefined" ? window.location.origin : "https://bodhimitra.com"}/posts/${(post as any).slug}`}
                    title={title}
                    description={pickLocalized(post.excerpt_en, post.excerpt_bn, lang, "")}
                  />
                  <TypographyControls settings={typoSettings} onChange={setTypoSettings} />
                </div>
              </header>
            </Reveal>

            {post.cover_image && (
              <Reveal delay={0.1}>
                <div className="mb-14 -mx-6 md:mx-0">
                  <img
                    src={post.cover_image}
                    alt={title}
                    className="w-full aspect-[16/9] object-cover rounded-md"
                  />
                </div>
              </Reveal>
            )}

            <Reveal delay={0.15}>
              {/* Mobile ToC (collapsible, only with headings) */}
              {headings.length > 0 && <TableOfContents headings={headings} />}

              <div className={typoClass}>
                {isHtml ? (
                  <SanitizedHtml html={contentWithIds} />
                ) : (
                  <div className="prose-mitra">
                    {content
                      .split("\n\n")
                      .filter(Boolean)
                      .map((p, i, arr) => {
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
              </div>
            </Reveal>

            {(sidebarTitle || sidebarText || newsletterTitle || newsletterText) && (
              <Reveal delay={0.2}>
                <aside className="mt-16 grid gap-6 md:grid-cols-2">
                  {(sidebarTitle || sidebarText) && (
                    <div className="border border-border rounded-md p-6 bg-secondary/30">
                      {sidebarTitle && <p className="font-serif text-lg mb-2">{sidebarTitle}</p>}
                      {sidebarText && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {sidebarText}
                        </p>
                      )}
                    </div>
                  )}
                  {(newsletterTitle || newsletterText) && (
                    <div className="border border-border rounded-md p-6 bg-secondary/30">
                      <NewsletterSignup title={newsletterTitle} text={newsletterText} />
                    </div>
                  )}
                </aside>
              </Reveal>
            )}

            <Reveal delay={0.25}>
              <Comments postId={post.id} />
            </Reveal>

            {a.show_related_posts && relatedFiltered.length > 0 && (
              <Reveal delay={0.3}>
                <section className="mt-20 pt-10 border-t border-border">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
                    {lang === "bn" ? "সম্পর্কিত প্রতিফলন" : "Related reflections"}
                  </p>
                  <ul className="space-y-4">
                    {relatedFiltered.map((r) => {
                      const rt = pickLocalized(r.title_en ?? r.title, r.title_bn, lang, "Untitled");
                      return (
                        <li key={r.id}>
                          <Link
                            to="/posts/$slug"
                            params={{ slug: r.slug }}
                            className="font-serif text-lg hover:underline"
                          >
                            {rt}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </Reveal>
            )}

            <Reveal delay={0.35}>
              <footer className="mt-20 pt-10 border-t border-border text-center">
                <Link
                  to="/"
                  className="text-sm text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground/40 pb-0.5"
                >
                  {t("back_all")}
                </Link>
              </footer>
            </Reveal>
          </article>

          {/* Desktop ToC sidebar */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>
    </>
  );
}

function MindfulConnection() {
  return (
    <aside className="my-12 border-y border-border/70 py-10 px-2 md:px-8 bg-secondary/30 not-prose">
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground mb-3 text-center">
        ❖ The Mindful Connection
      </p>
      <p className="font-serif text-xl md:text-2xl leading-relaxed text-center text-foreground/90">
        Here, the Buddhist insight and the clinical evidence meet — two languages pointing toward
        one quiet truth about the mind.
      </p>
    </aside>
  );
}
