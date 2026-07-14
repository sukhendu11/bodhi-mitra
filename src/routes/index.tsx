import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero.jpg";
import { PostGrid } from "@/components/PostGrid";
import { SearchBar } from "@/components/SearchBar";
import type { PostCategory } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { fetchSiteSettings, useSiteSettings } from "@/lib/siteSettings";
import { Reveal } from "@/components/Reveal";
import { generateWebSiteSchema, generateOrganizationSchema } from "@/lib/structured-data";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRecentlyAdded } from "@/lib/trending";
import { BookOpen, FileText, GraduationCap, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: () => fetchSiteSettings(),
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const tagline =
      loaderData?.hero?.title_en?.replace(/\n/g, " ") ||
      "Where Ancient Wisdom Meets Modern Psychology";
    const metaDesc =
      seo?.meta_desc_en ||
      "Reflections on Buddhist psychology, mindfulness, and mental health by practicing psychiatrists.";
    const siteName = loaderData?.branding?.site_name_en || "Bodhi Mitra";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bodhimitra.com";

    const websiteSchema = generateWebSiteSchema(baseUrl, siteName, metaDesc);
    const orgSchema = generateOrganizationSchema(baseUrl, siteName, loaderData?.social || {});

    return {
      meta: [
        { title: `${siteName} — ${tagline}` },
        { name: "description", content: metaDesc },
        { property: "og:title", content: siteName },
        { property: "og:description", content: tagline },
        { property: "og:url", content: baseUrl },
        { property: "og:site_name", content: siteName },
      ],
      scripts: [
        { type: "application/ld+json", JSON: websiteSchema },
        { type: "application/ld+json", JSON: orgSchema },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { t, lang } = useLang();
  const settings = useSiteSettings();
  const hero = settings.hero;
  const [active, setActive] = useState<PostCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const doGetRecentlyAdded = useServerFn(getRecentlyAdded);
  const { data: recentItems } = useQuery({
    queryKey: ["recently-added"],
    queryFn: () => (doGetRecentlyAdded as any)({ data: { limit: 6 } }),
    staleTime: 300_000,
  });

  const typeIcons: Record<string, typeof FileText> = {
    post: FileText,
    book: BookOpen,
    course: GraduationCap,
  };

  const filters: { label: string; value: PostCategory | "All" }[] = [
    { label: "All", value: "All" },
    { label: "Buddhism", value: "Buddhist Psychology" },
    { label: "Mind", value: "Wisdom" },
    { label: "Books", value: "Books" },
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
            <img src={hero.image_url || heroImg} alt={heroTitle || "Hero background"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/10 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 py-32 md:py-44 text-center">
            <Reveal delay={0}>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
                {heroEyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] text-foreground whitespace-pre-line">
                {heroTitle}
              </h1>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                {heroDesc}
              </p>
            </Reveal>
            {hero.cta_label && hero.cta_url && (
              <Reveal delay={0.45}>
                {isExternal ? (
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
                )}
              </Reveal>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal delay={0.1} className="flex flex-wrap items-center justify-between gap-6 mb-14">
          <h2 className="font-serif text-3xl">{t("recent_reflections")}</h2>
          <div className="relative flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActive(f.value)}
                className={`relative py-3 md:py-1 transition-colors duration-200 ${
                  active === f.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {active === f.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground scale-x-100" />
                )}
              </button>
            ))}
          </div>
        </Reveal>
        <div className="mb-10 max-w-md">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <PostGrid category={active === "All" ? undefined : active} searchQuery={searchQuery} />
      </section>

      {/* Recently Added */}
      {recentItems && recentItems.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16 border-t border-border/40">
          <Reveal delay={0.1}>
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="h-5 w-5 text-muted-foreground/60" />
              <h2 className="font-serif text-2xl">Recently Added</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recentItems.map((item: any) => {
              const Icon = typeIcons[item.type] || FileText;
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.url}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border/40 hover:border-foreground/20 hover:bg-secondary/20 transition-all group"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[0.5rem] uppercase tracking-wider text-muted-foreground/60">{item.type}</span>
                    <h3 className="text-sm font-medium group-hover:text-foreground transition-colors line-clamp-1">{item.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
