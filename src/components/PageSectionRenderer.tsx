import { type PageSection } from "@/lib/pages";
import { Reveal } from "@/components/Reveal";
import { getYoutubeId } from "@/lib/videos";

interface Props {
  sections: PageSection[];
  lang: "en" | "bn";
}

export function PageSectionRenderer({ sections, lang }: Props) {
  if (!sections || sections.length === 0) return null;

  const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-16 md:space-y-24">
      {sorted.map((section, i) => (
        <Reveal key={section.id} delay={Math.min(i * 0.1, 0.4)}>
          <SectionBlock section={section} lang={lang} />
        </Reveal>
      ))}
    </div>
  );
}

function SectionBlock({ section, lang }: { section: PageSection; lang: "en" | "bn" }) {
  const content = lang === "en" ? section.content_en : section.content_bn;

  switch (section.type) {
    case "hero":
      return <HeroSection content={content} />;
    case "text":
      return <TextSection content={content} />;
    case "image":
      return <ImageSection content={content} />;
    case "quote":
      return <QuoteSection content={content} />;
    case "video":
      return <VideoSection content={content} />;
    case "cta":
      return <CTASection content={content} />;
    default:
      return null;
  }
}

/* ─── Individual Section Renderers ────────────────────────────────── */

function HeroSection({ content }: { content: Record<string, string> }) {
  return (
    <div className="text-center max-w-3xl mx-auto px-4">
      {content.heading && (
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight">
          {content.heading}
        </h1>
      )}
      {content.subheading && (
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">{content.subheading}</p>
      )}
      {content.body && (
        <div className="mt-8 prose-mitra max-w-none">
          <p>{content.body}</p>
        </div>
      )}
      {content.button_text && content.button_url && (
        <a
          href={content.button_url}
          className="mt-8 inline-block px-8 py-3 text-sm uppercase tracking-[0.2em] bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          {content.button_text}
        </a>
      )}
    </div>
  );
}

function TextSection({ content }: { content: Record<string, string> }) {
  if (!content.body) return null;
  return (
    <div className="max-w-2xl mx-auto px-6">
      <div className="prose-mitra">
        <div dangerouslySetInnerHTML={{ __html: content.body }} />
      </div>
    </div>
  );
}

function ImageSection({ content }: { content: Record<string, string> }) {
  if (!content.src) return null;
  return (
    <div className="max-w-4xl mx-auto px-6">
      <figure>
        <img
          src={content.src}
          alt={content.alt || ""}
          className="w-full rounded-lg border border-border/60"
          loading="lazy"
        />
        {content.caption && (
          <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
            {content.caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function QuoteSection({ content }: { content: Record<string, string> }) {
  if (!content.text) return null;
  return (
    <div className="max-w-2xl mx-auto px-6">
      <blockquote className="border-l-2 border-foreground/30 pl-6 md:pl-8">
        <p className="font-serif text-xl md:text-2xl leading-relaxed italic">
          &ldquo;{content.text}&rdquo;
        </p>
        {content.attribution && (
          <footer className="mt-4 text-sm text-muted-foreground not-italic">
            — {content.attribution}
          </footer>
        )}
      </blockquote>
    </div>
  );
}

function VideoSection({ content }: { content: Record<string, string> }) {
  if (!content.url) return null;
  const ytId = getYoutubeId(content.url);
  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="aspect-video rounded-lg overflow-hidden border border-border/60 bg-secondary/20">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={content.caption || "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Video unavailable</p>
          </div>
        )}
      </div>
      {content.caption && (
        <p className="mt-3 text-center text-sm text-muted-foreground">{content.caption}</p>
      )}
    </div>
  );
}

function CTASection({ content }: { content: Record<string, string> }) {
  if (!content.heading && !content.body) return null;
  return (
    <div className="max-w-2xl mx-auto px-6 text-center">
      <div className="p-10 md:p-14 rounded-xl border border-border/60 bg-secondary/20">
        {content.heading && <h2 className="font-serif text-2xl md:text-3xl">{content.heading}</h2>}
        {content.body && <p className="mt-4 text-muted-foreground">{content.body}</p>}
        {content.button_text && content.button_url && (
          <a
            href={content.button_url}
            className="mt-6 inline-block px-8 py-3 text-sm uppercase tracking-[0.2em] bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            {content.button_text}
          </a>
        )}
      </div>
    </div>
  );
}
