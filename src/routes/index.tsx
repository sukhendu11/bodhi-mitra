import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero.jpg";
import { PostGrid } from "@/components/PostGrid";
import type { PostCategory } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bodhi Mitra — Where Ancient Wisdom Meets Modern Psychology" },
      { name: "description", content: "Reflections on Buddhist psychology, mindfulness, and mental health by practicing psychiatrists." },
      { property: "og:title", content: "Bodhi Mitra" },
      { property: "og:description", content: "Where ancient wisdom meets modern psychology." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, lang } = useLang();
  const settings = useSiteSettings();
  const hero = settings.hero;
  const [active, setActive] = useState<PostCategory | "All">("All");

  const filters: { labelKey: "filter_all" | "nav_buddhist_psychology" | "nav_wisdom" | "nav_books"; value: PostCategory | "All" }[] = [
    { labelKey: "filter_all", value: "All" },
    { labelKey: "nav_buddhist_psychology", value: "Buddhist Psychology" },
    { labelKey: "nav_wisdom", value: "Wisdom" },
    { labelKey: "nav_books", value: "Books" },
  ];

  const heroTitle = pickLocalized(hero.title_en, hero.title_bn, lang);
  const heroDesc = pickLocalized(hero.desc_en, hero.desc_bn, lang);
  const heroEyebrow = pickLocalized(hero.eyebrow_en, hero.eyebrow_bn, lang);
  const isExternal = /^https?:\/\//i.test(hero.cta_url);

  return (
    <>
      {hero.visible && (
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 opacity-90">
            <img src={heroImg} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/10 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 py-32 md:py-44 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
              {heroEyebrow}
            </p>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] text-foreground whitespace-pre-line">
              {heroTitle}
            </h1>
            <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
              {heroDesc}
            </p>
            {hero.cta_label && hero.cta_url && (
              isExternal ? (
                <a
                  href={hero.cta_url}
                  className="mt-10 inline-block border-b border-foreground/50 pb-1 text-sm tracking-wide hover:border-foreground"
                >
                  {hero.cta_label} →
                </a>
              ) : (
                <Link
                  to={hero.cta_url}
                  className="mt-10 inline-block border-b border-foreground/50 pb-1 text-sm tracking-wide hover:border-foreground"
                >
                  {hero.cta_label} →
                </Link>
              )
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-14">
          <h2 className="font-serif text-3xl">{t("recent_reflections")}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActive(f.value)}
                className={`pb-1 border-b transition-colors ${
                  active === f.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <PostGrid category={active === "All" ? undefined : active} />
      </section>
    </>
  );
}
