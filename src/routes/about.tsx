import { createFileRoute } from "@tanstack/react-router";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/about")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `About — ${loaderData}` },
      { name: "description", content: `About the psychiatrists behind ${loaderData}.` },
      { property: "og:title", content: `About — ${loaderData}` },
      { property: "og:description", content: `About the psychiatrists behind ${loaderData}.` },
    ],
  }),
  component: About,
});

function About() {
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const a = cfg.about;

  const eyebrow = pickLocalized(a.eyebrow_en, a.eyebrow_bn, lang, "About");
  const title = pickLocalized(a.title_en, a.title_bn, lang, "");
  const body = pickLocalized(a.body_en, a.body_bn, lang, "");
  const mission = pickLocalized(a.mission_en, a.mission_bn, lang, "");
  const noteTitle = pickLocalized(a.note_title_en, a.note_title_bn, lang, "");
  const noteText = pickLocalized(a.note_text_en, a.note_text_bn, lang, "");
  const imageAlt = pickLocalized(a.image_alt_en, a.image_alt_bn, lang, title);

  return (
    <article className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Reveal delay={0}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">{title}</h1>
      </Reveal>

      {a.image_url && (
        <Reveal delay={0.2}>
          <div className="mt-12 -mx-6 md:mx-0">
            <img src={a.image_url} alt={imageAlt} className="w-full aspect-[16/9] object-cover rounded-md" />
          </div>
        </Reveal>
      )}

      <Reveal delay={0.25}>
        <div className="prose-mitra mt-12 whitespace-pre-line">{body}</div>
      </Reveal>

      {mission && (
        <Reveal delay={0.35}>
          <div className="mt-12 p-6 border-l-2 border-foreground/30 bg-secondary/30">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              {lang === "bn" ? "মিশন" : "Mission"}
            </p>
            <p className="font-serif text-xl leading-relaxed whitespace-pre-line">{mission}</p>
          </div>
        </Reveal>
      )}

      {(noteTitle || noteText) && (
        <Reveal delay={0.45}>
          <div className="mt-16 border-t border-border pt-10 text-sm text-muted-foreground">
            {noteTitle && <p className="font-serif text-base text-foreground mb-2">{noteTitle}</p>}
            {noteText && <p className="whitespace-pre-line">{noteText}</p>}
          </div>
        </Reveal>
      )}
    </article>
  );
}
