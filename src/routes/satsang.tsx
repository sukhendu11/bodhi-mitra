import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSiteName } from "@/lib/siteSettings";
import { fetchPageBySlug } from "@/lib/pages";
import { useLang, pickLocalized } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/satsang")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Satsang — ${loaderData}` },
      { name: "description", content: "Gatherings in good company." },
      { property: "og:title", content: `Satsang — ${loaderData}` },
      { property: "og:description", content: "Gatherings in good company." },
    ],
  }),
  component: SatsangPage,
});

function SatsangPage() {
  const { lang } = useLang();

  const { data: page, isLoading } = useQuery({
    queryKey: ["public-page", "satsang"],
    queryFn: () => fetchPageBySlug("satsang"),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <div className="h-8 w-48 bg-secondary/60 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-secondary/30 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!page || page.visible === false) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center text-muted-foreground">
        <p>This page is currently hidden.</p>
      </div>
    );
  }

  const eyebrow = pickLocalized(page.title_en, page.title_bn, lang, "Satsang");
  const heading = pickLocalized(page.header_en, page.header_bn, lang, "Satsang");
  const body = pickLocalized(page.body_en, page.body_bn, lang, "");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      {page.banner_url && (
        <Reveal delay={0}>
          <div className="mb-12 -mx-6 md:mx-0 overflow-hidden rounded-md">
            <img src={page.banner_url} alt={heading} className="w-full aspect-[21/9] object-cover" />
          </div>
        </Reveal>
      )}
      <Reveal delay={0.1}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.2}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">{heading}</h1>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="prose-mitra mt-10 whitespace-pre-line">{body}</div>
      </Reveal>
    </div>
  );
}
