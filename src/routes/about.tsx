import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSiteName, useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { fetchPageBySlug } from "@/lib/pages";
import { Reveal } from "@/components/Reveal";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { PenLine, BookOpen, Play, HeartHandshake, ArrowRight } from "lucide-react";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  loader: () => getSiteName(),
  head: ({ loaderData }) =>
    seoHead({
      title: "About",
      description: `About the psychiatrists behind ${loaderData}.`,
      path: "/about",
    }),
  component: About,
});

function About() {
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const a = cfg.about;

  // Banner image lives on the About Page (Strapi/Supabase/mock), not the
  // site settings — fetch it so a configured banner renders as the hero.
  const { data: page } = useQuery({
    queryKey: ["public-page", "about"],
    queryFn: () => fetchPageBySlug("about"),
    staleTime: 60_000,
  });
  const banner = page?.banner_url || "";
  const tagline = pickLocalized(page?.header_en, page?.header_bn, lang, "");

  const eyebrow = pickLocalized(a.eyebrow_en, a.eyebrow_bn, lang, "About");
  const title = pickLocalized(a.title_en, a.title_bn, lang, "");
  const body = pickLocalized(a.body_en, a.body_bn, lang, "");
  const mission = pickLocalized(a.mission_en, a.mission_bn, lang, "");
  const noteTitle = pickLocalized(a.note_title_en, a.note_title_bn, lang, "");
  const noteText = pickLocalized(a.note_text_en, a.note_text_bn, lang, "");
  const imageAlt = pickLocalized(a.image_alt_en, a.image_alt_bn, lang, title);

  const exploreItems = [
    {
      to: "/reflections" as const,
      icon: PenLine,
      titleEn: "Reflections",
      titleBn: "প্রতিফলন",
      descEn: "Essays on the dharma, the mind, and the examined life.",
      descBn: "ধর্ম, মন এবং পরীক্ষিত জীবন নিয়ে প্রবন্ধ।",
    },
    {
      to: "/books" as const,
      icon: BookOpen,
      titleEn: "Books",
      titleBn: "বই",
      descEn: "A small shelf of companions we return to.",
      descBn: "সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই।",
    },
    {
      to: "/videos" as const,
      icon: Play,
      titleEn: "Videos",
      titleBn: "ভিডিও",
      descEn: "Talks and guided meditations on the path.",
      descBn: "পথের উপর আলোচনা ও নির্দেশিত ধ্যান।",
    },
  ];

  return (
    <>
      {/* Full-bleed banner hero — edge-to-edge, homepage-hero language.
          Renders only when a banner image is configured; otherwise the
          plain centered hero inside the article below. */}
      {banner && (
        <Reveal delay={0}>
          <section className="relative overflow-hidden border-b border-border/60">
            <img
              src={banner}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/15 to-background/80" />
            <div className="relative mx-auto max-w-3xl px-6 py-28 md:py-36 text-center text-foreground dark:text-white">
              <p className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] font-medium text-foreground/70 dark:text-white/80">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-foreground/30 dark:bg-white/40"
                />
                {eyebrow}
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-foreground/30 dark:bg-white/40"
                />
              </p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight mt-5">
                {title}
              </h1>
              <div className="mt-7 flex items-center justify-center gap-3" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span className="h-0.5 w-16 rounded-full bg-gradient-to-r from-saffron/70 to-saffron/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              </div>
              {tagline && (
                <p className="mt-6 max-w-xl mx-auto text-sm md:text-base leading-relaxed text-foreground/80 dark:text-white/70">
                  {tagline}
                </p>
              )}
            </div>
            {/* Bottom saffron hairline accent */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-saffron/60 to-transparent"
            />
          </section>
        </Reveal>
      )}

      <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <PublicBreadcrumbs />

        {/* Fallback hero — plain centered header when no banner image */}
        {!banner && (
          <Reveal delay={0}>
            <header className="text-center max-w-2xl mx-auto mt-8">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium inline-flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-8 bg-border" />
                {eyebrow}
                <span aria-hidden="true" className="h-px w-8 bg-border" />
              </p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight mt-5">
                {title}
              </h1>
              <div className="mt-7 flex items-center justify-center gap-3" aria-hidden="true">
                <span className="h-px w-12 bg-border" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                <span className="h-px w-12 bg-border" />
              </div>
            </header>
          </Reveal>
        )}

      {/* Featured image */}
      {a.image_url && (
        <Reveal delay={0.15}>
          <div className="mt-12 -mx-6 md:mx-0">
            <img
              src={a.image_url}
              alt={imageAlt}
              className="w-full aspect-[16/9] object-cover rounded-2xl shadow-lg ring-1 ring-black/5"
            />
          </div>
        </Reveal>
      )}

      {/* Body — capped measure for comfortable editorial reading */}
      <Reveal delay={0.2}>
        <div className="max-w-2xl mx-auto">
          <div className="prose-mitra mt-12 whitespace-pre-line">{body}</div>
        </div>
      </Reveal>

      {/* Mission pull-quote (CMS-configured) */}
      {mission && (
        <Reveal delay={0.3}>
          <blockquote className="mt-14 rounded-2xl border border-border/60 bg-card p-6 md:p-10 shadow-sm relative overflow-hidden text-center">
            <span
              aria-hidden="true"
              className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-16 rounded-full bg-gradient-to-r from-saffron/60 to-saffron/20"
            />
            <p className="font-serif text-xl md:text-2xl leading-relaxed whitespace-pre-line">
              {mission}
            </p>
          </blockquote>
        </Reveal>
      )}

      {/* Editorial note (CMS-configured) */}
      {(noteTitle || noteText) && (
        <Reveal delay={0.4}>
          <div className="mt-14 rounded-2xl border border-border/60 bg-secondary/20 p-6 md:p-8">
            {noteTitle && (
              <div className="flex items-center gap-2 mb-2">
                <HeartHandshake className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0" />
                <p className="font-serif text-base text-foreground">{noteTitle}</p>
              </div>
            )}
            {noteText && (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {noteText}
              </p>
            )}
          </div>
        </Reveal>
      )}

      {/* Explore — the three paths of the journal */}
      <Reveal delay={0.45}>
        <section className="mt-16">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium mb-3">
              {lang === "bn" ? "অন্বেষণ করুন" : "Explore"}
            </p>
            <div className="mx-auto h-0.5 w-12 rounded-full bg-gradient-to-r from-saffron/60 to-saffron/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {exploreItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-2xl border border-border/40 bg-card p-6 shadow-sm hover:border-foreground/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-[var(--color-saffron)]/70" />
                </div>
                <h3 className="text-sm font-medium group-hover:text-[var(--color-saffron)] transition-colors">
                  {lang === "bn" ? item.titleBn : item.titleEn}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed flex-1">
                  {lang === "bn" ? item.descBn : item.descEn}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground/60 group-hover:text-[var(--color-saffron)] transition-colors">
                  {lang === "bn" ? "যান" : "Explore"}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Newsletter CTA */}
      <Reveal delay={0.5}>
        <section className="mt-16 rounded-2xl border border-border/40 bg-gradient-to-br from-secondary/20 via-background to-background p-8 md:p-10 shadow-sm">
          <NewsletterSignup
            title={lang === "bn" ? "যোগাযোগে থাকুন" : "Stay in the conversation"}
            text={
              lang === "bn"
                ? "ধীরে। মাঝে মাঝে। কখনো কোলাহল নয়।"
                : "Slow. Occasional. Never noisy."
            }
          />
        </section>
      </Reveal>
      </article>
    </>
  );
}
