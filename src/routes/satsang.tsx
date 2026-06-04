import { createFileRoute } from "@tanstack/react-router";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";

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
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const page = cfg.pages.find((p) => p.slug === "satsang");

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
        <div className="mb-12 -mx-6 md:mx-0 overflow-hidden rounded-md">
          <img src={page.banner_url} alt={heading} className="w-full aspect-[21/9] object-cover" />
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">{eyebrow}</p>
      <h1 className="font-serif text-4xl md:text-5xl leading-tight">{heading}</h1>
      <div className="prose-mitra mt-10 whitespace-pre-line">{body}</div>
    </div>
  );
}
