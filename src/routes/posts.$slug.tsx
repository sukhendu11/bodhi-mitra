import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { fetchPostBySlug, fetchPosts } from "@/lib/posts";
import { useLang, pickLocalized, toBanglaDigits } from "@/lib/i18n";
import { localizeCategoryName } from "@/lib/taxonomy";
import { LetterAvatar } from "@/components/LetterAvatar";
import { fetchSiteSettings, useSiteSettings } from "@/lib/siteSettings";
import { ErrorPage } from "@/components/error-page";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SanitizedHtml } from "@/components/SanitizedHtml";
import { Comments } from "@/components/Comments";
import { BookmarkButton } from "@/components/BookmarkButton";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { SocialShare } from "@/components/SocialShare";
import { TypographyControls, useTypography, mapReadingPrefs } from "@/components/TypographyControls";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { READING_WIDTH_MAX } from "@/lib/user-preferences";
import { ArticleSkeleton } from "@/components/ArticleSkeleton";
import { Reveal } from "@/components/Reveal";
import { TableOfContents } from "@/components/TableOfContents";
import { parseHeadings, injectHeadingIds } from "@/lib/headings";
import { PostCard } from "@/components/PostCard";
import { Compass, BookOpen, Video } from "lucide-react";
import { LotusIcon } from "@/components/LotusIcon";
import { seoHead } from "@/lib/seo";

const CAT_COLORS: Record<string, string> = {
  meditation: "#8B5CF6",
  mindfulness: "#10B981",
  "mental-health": "#F59E0B",
  philosophy: "#3B82F6",
};

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const [post, settings] = await Promise.all([fetchPostBySlug(params.slug), fetchSiteSettings()]);
    if (!post) throw notFound();
    return { post, siteName: settings.branding.site_name_en || "Sabbe Satta", siteUrl: settings.seo.site_url || "https://sabbesatta.com" };
  },
  head: ({ loaderData }: Record<string, unknown>) => {
    const ld = loaderData as { post: { title_en?: string | null; title_bn?: string | null; title?: string | null; excerpt_en?: string | null; excerpt_bn?: string | null; content_en?: string | null; content?: string | null; cover_image?: string | null; slug?: string | null; created_at?: string | null; author_name?: string | null } | null; siteName: string; siteUrl: string } | undefined;
    const p = ld?.post;
    const name = ld?.siteName ?? "Sabbe Satta";
    const postTitle = p?.title_en || p?.title_bn || p?.title || "Post";
    const desc = (p?.excerpt_en || p?.excerpt_bn || "Read a reflection.").slice(0, 158);
    const postUrl = `/posts/${p?.slug || ""}`;
    const rawContent = (p?.content_en || p?.content || "").replace(/<[^>]*>/g, "");
    const wordCount = rawContent.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
    const timeRequired = `PT${readingTimeMinutes}M`;
    const articleSchema = generateArticleSchema({ title: postTitle, description: desc, url: postUrl, imageUrl: p?.cover_image || undefined, datePublished: p?.created_at || new Date().toISOString(), authorName: p?.author_name || ld?.siteName || "Sabbe Satta", siteName: name, wordCount, timeRequired });
    const breadcrumbSchema = generateBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Reflections", url: "/reflections" }, { name: postTitle, url: postUrl }]);
    const head = seoHead({
      title: postTitle,
      description: desc,
      path: postUrl,
      ogImage: p?.cover_image || undefined,
      ogType: "article",
      siteName: name,
      siteUrl: ld?.siteUrl,
    });
    return {
      ...head,
      scripts: [
        { type: "application/ld+json", JSON: articleSchema },
        { type: "application/ld+json", JSON: breadcrumbSchema },
      ],
    };
  },
  component: PostPage,
  notFoundComponent: () => {
    const { lang } = useLang();
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-serif text-3xl">{lang === "bn" ? "এই প্রতিফলনটি এখনো লেখা হয়নি।" : "This reflection has not been written yet."}</h1>
        <Link to="/reflections" className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground">{lang === "bn" ? "প্রতিফলনে ফিরুন" : "Back to Reflections"}</Link>
      </div>
    );
  },
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function PostPage() {
  const { slug } = Route.useParams();
  const articleRef = useRef<HTMLElement>(null);
  const { lang, t } = useLang();
  const cfg = useSiteSettings();
  const a = cfg.article;

  const { data: post, isLoading, isError } = useQuery({ queryKey: ["post", slug], queryFn: () => fetchPostBySlug(slug), staleTime: 60_000 });
  const { data: relatedData } = useQuery({ queryKey: ["related", post?.category, post?.id], queryFn: () => fetchPosts(post!.category, 1, 10), enabled: !!post && a.show_related_posts, staleTime: 60_000 });
  const related = relatedData?.data ?? [];

  // Reading preferences saved on /settings (profile) feed the article
  // typography, so "Reading font size / Line spacing" actually take effect.
  const { data: userPrefs } = useUserPreferences();
  // Memoize the seed — mapReadingPrefs returns a fresh object each call, and
  // an unstable identity would re-trigger useTypography's seed effect every render.
  const readingSeed = useMemo(
    () => (userPrefs ? mapReadingPrefs(userPrefs.reading) : undefined),
    [userPrefs],
  );
  const { settings: typoSettings, setSettings: setTypoSettings, typoStyle } = useTypography(readingSeed);
  // Reading measure (narrow / normal / wide) — caps the article column width.
  const readingMaxWidth = userPrefs ? READING_WIDTH_MAX[userPrefs.reading.width] : undefined;

  if (isLoading) return <ArticleSkeleton />;
  if (isError) throw notFound();
  if (!post) throw notFound();

  const title = pickLocalized(post.title_en ?? post.title, post.title_bn, lang, "Untitled");
  const excerpt = pickLocalized(post.excerpt_en, post.excerpt_bn, lang, "");
  const content = pickLocalized(post.content_en ?? post.content, post.content_bn, lang, "");
  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const date = new Date(post.created_at).toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  const headings = isHtml ? parseHeadings(content) : [];
  const contentWithIds = isHtml ? injectHeadingIds(content) : content;
  const plainText = isHtml ? content.replace(/<[^>]*>/g, "") : content;
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));
  const sidebarTitle = pickLocalized(a.sidebar_title_en, a.sidebar_title_bn, lang, "");
  const sidebarText = pickLocalized(a.sidebar_text_en, a.sidebar_text_bn, lang, "");
  const newsletterTitle = pickLocalized(a.newsletter_title_en, a.newsletter_title_bn, lang, "");
  const newsletterText = pickLocalized(a.newsletter_text_en, a.newsletter_text_bn, lang, "");
  const relatedFiltered = related.filter((r) => r.id !== post.id).slice(0, 3);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://sabbesatta.com"}/posts/${(post as any).slug}`;
  const categorySlug = post.category?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "reflections";
  const catColor = CAT_COLORS[categorySlug] || "#888";
  const paragraphs = isHtml ? [] : content.split("\n\n").filter(Boolean);
  const firstSentence = isHtml ? "" : (() => {
    const firstPara = paragraphs[0] || "";
    const match = firstPara.match(/^[^.!?]*[.!?]/);
    const sentence = match ? match[0].trim() : "";
    return sentence.length > 20 ? sentence : "";
  })();
  const remainingParagraphs = firstSentence
    ? [paragraphs[0].slice(firstSentence.length).replace(/^[.\s]+/, ""), ...paragraphs.slice(1)].filter(Boolean)
    : paragraphs;
  const midIndex = Math.floor(paragraphs.length / 2);

  return (
    <>
      {/* Cover image — overlapping header */}
      {post.cover_image && (
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
          <img
            src={post.cover_image}
            alt={title}
            className="w-full h-full object-cover"
            style={{
              maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 -mt-16 relative z-10">
        <PublicBreadcrumbs />

        {/* Full-width header above the grid split */}
        <Reveal delay={0} className="relative z-30">
          <header className="mb-12">
            {/* Category + reading time */}
            <div className="flex items-center gap-3 mb-5">
              <Link
                to="/reflections/$slug"
                params={{ slug: categorySlug }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] rounded-md transition-colors"
                style={{ color: catColor, backgroundColor: `${catColor}10` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                {localizeCategoryName(post.category, lang)}
              </Link>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground">
                {lang === "bn" ? toBanglaDigits(readingTime) : readingTime} {t("min_read")}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.15] tracking-tight">
              {title}
            </h1>

            {/* Excerpt */}
            {excerpt && (
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {excerpt}
              </p>
            )}

            {/* Author + date */}
            <div className="mt-6 flex items-center gap-3">
              <LetterAvatar name={post.author_name} src={post.author_image} size={44} />
              <div>
                <p className="text-sm font-medium">{post.author_name}</p>
                <p className="text-xs text-muted-foreground">{date}</p>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tg) => (
                  <span key={tg} className="text-xs uppercase tracking-[0.1em] border border-border/50 bg-secondary/60 text-secondary-foreground px-2.5 py-1 rounded-full">
                    {tg}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center gap-3">
              <BookmarkButton resourceId={post.id} resourceType="post" />
              <SocialShare url={shareUrl} title={title} description={excerpt} />
              <TypographyControls settings={typoSettings} onChange={setTypoSettings} />
            </div>

          </header>
        </Reveal>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
          {/* Main article body content — header is above grid */}
          <article ref={articleRef}>
            {/* Mobile ToC */}
            {headings.length > 0 && (
              <div className="mb-8 lg:hidden">
                <TableOfContents headings={headings} />
              </div>
            )}

            {/* Content */}
            <Reveal delay={0.1}>
              <div style={{ ...typoStyle, ...(readingMaxWidth ? { maxWidth: readingMaxWidth } : {}) }}>
                {isHtml ? (
                  <SanitizedHtml html={contentWithIds} />
                ) : (
                  <div className="prose-mitra">
                    {firstSentence && (
                      <p className="font-serif text-xl md:text-2xl leading-relaxed italic text-foreground/80 border-l-2 border-saffron/40 pl-5 mb-8 -ml-1">
                        {firstSentence}
                      </p>
                    )}
                    {remainingParagraphs.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
              </div>
            </Reveal>

            {/* Editorial pullquote — after content */}
            {sidebarTitle && (
              <Reveal delay={0.12}>
                <blockquote className="my-10 mx-auto max-w-lg px-8 py-6 rounded-xl border border-border/40 bg-secondary/20 text-center">
                  <p className="font-serif text-xl md:text-2xl leading-relaxed italic text-foreground/90 mb-3">{sidebarTitle}</p>
                  {sidebarText && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{sidebarText}</p>
                  )}
                </blockquote>
              </Reveal>
            )}

            {/* Divider */}
            <div className="h-px bg-border my-8" />

            {/* Bottom share row — catches the post-reading share moment */}
            <Reveal delay={0.2} className="relative z-30">
              <div className="my-10 flex flex-col items-center gap-4 text-center">
                <p className="font-serif text-lg md:text-xl italic text-foreground/80">
                  {lang === "bn"
                    ? "প্রতিফলনটি যদি সহায়ক হয়, তবে যার প্রয়োজন তার সাথে শেয়ার করুন।"
                    : "If this reflection was helpful, share it with someone who needs it."}
                </p>
                <SocialShare url={shareUrl} title={title} description={excerpt} />
              </div>
            </Reveal>

            {/* Author Card */}
            <Reveal delay={0.25}>
              <div className="mt-12 p-6 rounded-xl border border-border/50 bg-secondary/10">
                <div className="flex items-start gap-4">
                  <LetterAvatar name={post.author_name} src={post.author_image} size={56} />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">
                      {lang === "bn" ? "লেখক" : "Written by"}
                    </p>
                    <p className="font-serif text-lg font-medium">{post.author_name}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {lang === "bn" ? "সাব্বে সত্তা প্রতিফলনের লেখক" : "Author of this reflection"}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Comments — right after content + author */}
            <Reveal delay={0.3}>
              <section className="mt-12">
                <Comments postId={post.id} />
              </section>
            </Reveal>

            {/* Related posts — after comments */}
            {a.show_related_posts && relatedFiltered.length > 0 && (
              <Reveal delay={0.35}>
                <section className="mt-16 pt-10 border-t border-border/40">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-6 font-medium">
                    {lang === "bn" ? "সম্পর্কিত প্রতিফলন" : "Continue reading"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {relatedFiltered.map((r) => (
                      <PostCard key={r.id} post={r} />
                    ))}
                  </div>
                </section>
              </Reveal>
            )}
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* ToC */}
              {headings.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-primary/30">
                  <TableOfContents headings={headings} sidebar />
                </div>
              )}

              {/* Newsletter */}
              {(newsletterTitle || newsletterText) && (
                <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-primary/30">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {lang === "bn" ? "নিউজলেটার" : "Newsletter"}
                  </p>
                  <NewsletterSignup title={newsletterTitle} text={newsletterText} />
                </div>
              )}

              {/* Explore */}
              <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-primary/30">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-4 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  {lang === "bn" ? "আরও পড়ুন" : "Explore"}
                </p>
                <div className="space-y-2">
                  {[
                    { to: "/reflections", label: lang === "bn" ? "সব প্রতিফলন" : "All Reflections", desc: lang === "bn" ? "সমস্ত লেখা পড়ুন" : "Browse all articles", icon: Compass },
                    { to: "/books", label: lang === "bn" ? "বই" : "Books", desc: lang === "bn" ? "বই পড়ুন" : "Read & download", icon: BookOpen },
                    { to: "/videos", label: lang === "bn" ? "ভিডিও" : "Videos", desc: lang === "bn" ? "ভিডিও দেখুন" : "Watch & learn", icon: Video },
                    { to: "/donate", label: lang === "bn" ? "দান" : "Donate", desc: lang === "bn" ? "সহায়তা করুন" : "Support our mission", lotus: true },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 group rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
                          {item.lotus ? <LotusIcon size={14} /> : Icon && <Icon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
