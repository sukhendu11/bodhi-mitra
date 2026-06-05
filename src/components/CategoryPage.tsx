import { useQuery } from "@tanstack/react-query";
import { PostGrid } from "./PostGrid";
import type { PostCategory } from "@/lib/posts";
import { fetchPageBySlug } from "@/lib/pages";
import { useLang, pickLocalized } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";

export function CategoryPage({
  category,
  slug,
  titleEn,
  titleBn,
  defaultDescriptionEn,
  defaultDescriptionBn,
}: {
  category: PostCategory;
  slug: string;
  titleEn: string;
  titleBn: string;
  defaultDescriptionEn: string;
  defaultDescriptionBn: string;
}) {
  const { lang } = useLang();

  const { data: page, isLoading } = useQuery({
    queryKey: ["public-page", slug],
    queryFn: () => fetchPageBySlug(slug),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="h-8 w-48 bg-secondary/60 animate-pulse rounded mb-6" />
        <div className="h-4 w-96 bg-secondary/40 animate-pulse rounded mb-12" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-secondary/30 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (page && page.visible === false) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center text-muted-foreground">
        <p>This page is currently hidden.</p>
      </div>
    );
  }

  const eyebrow = pickLocalized(page?.title_en || titleEn, page?.title_bn || titleBn, lang, titleEn);
  const heading = pickLocalized(page?.header_en || titleEn, page?.header_bn || titleBn, lang, titleEn);
  const description = pickLocalized(
    page?.body_en || defaultDescriptionEn,
    page?.body_bn || defaultDescriptionBn,
    lang,
    defaultDescriptionEn,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      {page?.banner_url && (
        <Reveal delay={0}>
          <div className="mb-12 -mx-6 md:mx-0 overflow-hidden rounded-md">
            <img src={page.banner_url} alt={heading} className="w-full aspect-[21/9] object-cover" />
          </div>
        </Reveal>
      )}
      <Reveal delay={0.1}>
        <header className="max-w-2xl mb-20">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">{eyebrow}</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">{heading}</h1>
          <p className="mt-6 text-muted-foreground leading-relaxed text-lg whitespace-pre-line">{description}</p>
        </header>
      </Reveal>
      <PostGrid category={category} />
    </div>
  );
}
