import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPageBySlug } from "@/lib/pages";
import { useLang, pickLocalized } from "@/lib/i18n";
import { getSiteName } from "@/lib/siteSettings";
import { PageSectionRenderer } from "@/components/PageSectionRenderer";
import { Reveal } from "@/components/Reveal";
import { BuilderPreview, deserializeTree } from "@/components/admin/page-builder";
import { generateHoverCss, generateResponsiveCss } from "@/lib/page-builder/utils";
import type { BuilderComponentNode } from "@/lib/page-builder/types";

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

  // Detect builder data: sections array with a single _builder entry
  const rawSections = (page.sections ?? []) as unknown as Array<Record<string, unknown>>;
  const builderEntry =
    hasSections && rawSections.length === 1 && rawSections[0]?._builder
      ? (rawSections[0] as { _builder: boolean; tree: string })
      : null;

  let parsedBuilderTree: BuilderComponentNode | null = null;
  if (builderEntry?.tree) {
    try {
      parsedBuilderTree = deserializeTree(builderEntry.tree);
    } catch {
      // Fall through to legacy rendering
    }
  }

  const isBuilderPage = parsedBuilderTree !== null;

  return (
    <article className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      {/* Page header — always rendered from DB metadata */}
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

      {/* Banner image — skip for builder pages (builder manages its own visuals) */}
      {!isBuilderPage && page.banner_url && (
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

      {/* Content: Builder tree OR legacy sections OR body */}
      {isBuilderPage ? (
        <>
          {/* Builder dynamic CSS: animations + hover + responsive */}
          <style>{`
            @keyframes pb-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes pb-slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pb-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes pb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            @keyframes pb-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pb-scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
            @keyframes pb-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
            @keyframes pb-float { 0%, 100% { transform: translateY(0); box-shadow: 0 4px 12px oklch(0 0 0 / 0.1); } 50% { transform: translateY(-6px); box-shadow: 0 8px 24px oklch(0 0 0 / 0.15); } }
            @keyframes pb-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
            ${generateHoverCss(parsedBuilderTree!)}
            ${generateResponsiveCss(parsedBuilderTree!)}
          `}</style>
          <BuilderPreview tree={parsedBuilderTree!} />
        </>
      ) : hasSections ? (
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
