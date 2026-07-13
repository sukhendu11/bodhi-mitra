import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPageBySlug } from "@/lib/pages";
import { useLang, pickLocalized } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { PageSectionRenderer } from "@/components/PageSectionRenderer";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const [page, siteName] = await Promise.all([fetchPageBySlug(params.slug), getSiteName()]);
    if (!page) throw notFound();
    return { page, siteName };
  },
  head: ({ loaderData }: Record<string, unknown>) => {
    const ld = loaderData as
      | {
          page: {
            title_en?: string | null;
            title_bn?: string | null;
            meta_description_en?: string | null;
            meta_description_bn?: string | null;
            banner_url?: string | null;
          };
          siteName: string;
        }
      | undefined;
    const p = ld?.page;
    const name = ld?.siteName ?? "Bodhi Mitra";
    const pageTitle = p?.title_en || p?.title_bn || "Page";
    const desc = p?.meta_description_en || p?.meta_description_bn || "";
    return {
      meta: [
        { title: `${pageTitle} — ${name}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${pageTitle} — ${name}` },
        { property: "og:description", content: desc },
        { property: "og:image", content: p?.banner_url || "" },
      ],
    };
  },
  component: PublicPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-serif text-3xl">Page not found</h1>
      <Link
        to="/"
        className="mt-6 inline-block border-b border-foreground/40 pb-0.5 text-sm hover:border-foreground"
      >
        Return home
      </Link>
    </div>
  ),
});

function PublicPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();

  const { data: page, isLoading } = useQuery({
    queryKey: ["public-page", slug],
    queryFn: async () => {
      const p = await fetchPageBySlug(slug);
      // Only serve visible pages publicly
      if (!p || !p.visible) return null;
      return p;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
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

  if (!page) throw notFound();

  const title = pickLocalized(page.title_en, page.title_bn, lang, "Untitled");
  const header = pickLocalized(page.header_en, page.header_bn, lang, "");
  const metaDesc = pickLocalized(page.meta_description_en, page.meta_description_bn, lang, "");

  const hasSections = page.sections && page.sections.length > 0;
  const hasLegacyBody = page.body_en || page.body_bn;

  return (
    <article className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      {/* Header */}
      <header className="text-center mb-16">
        <Reveal delay={0}>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">{title}</h1>
        </Reveal>
        {header && (
          <Reveal delay={0.1}>
            <p className="mt-4 text-lg text-muted-foreground">{header}</p>
          </Reveal>
        )}
        {metaDesc && !header && (
          <Reveal delay={0.1}>
            <p className="mt-4 text-muted-foreground">{metaDesc}</p>
          </Reveal>
        )}
      </header>

      {/* Banner image */}
      {page.banner_url && (
        <Reveal delay={0.15}>
          <div className="mb-16 -mx-6 md:mx-0">
            <img
              src={page.banner_url}
              alt={title}
              className="w-full aspect-[21/9] object-cover rounded-lg border border-border/60"
            />
          </div>
        </Reveal>
      )}

      {/* Section-based content */}
      {hasSections ? (
        <PageSectionRenderer sections={page.sections} lang={lang} />
      ) : hasLegacyBody ? (
        <div className="max-w-2xl mx-auto">
          <Reveal delay={0.2}>
            <div className="prose-mitra whitespace-pre-line">
              {pickLocalized(page.body_en, page.body_bn, lang, "")}
            </div>
          </Reveal>
        </div>
      ) : null}
    </article>
  );
}
