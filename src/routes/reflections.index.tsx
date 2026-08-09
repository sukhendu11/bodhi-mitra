import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reflections/")({
  head: () => {
    const head = seoHead({
      title: "Reflections",
      description: "Reflections, meditations, and inquiries into Buddhist psychology, wisdom, and the art of living.",
      path: "/reflections",
    });
    return head;
  },
  component: ReflectionsHub,
});

import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { fetchPageBySlug } from "@/lib/pages";
import { fetchCategories } from "@/lib/taxonomy";
import { fetchPostCounts } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { PostGrid } from "@/components/PostGrid";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { EditorialHeader } from "@/components/EditorialHeader";
import { Reveal } from "@/components/Reveal";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { Link } from "@tanstack/react-router";

const CAT_COLORS: Record<string, string> = {
  meditation: "#8B5CF6",
  mindfulness: "#10B981",
  "mental-health": "#F59E0B",
  philosophy: "#3B82F6",
  "buddhist-psychology": "#EC4899",
};

function getCatColor(slug: string, fallbackColor?: string): string {
  return CAT_COLORS[slug] || fallbackColor || "#888";
}

function ReflectionsHub() {
  const { lang } = useLang();
  const [activeCategory, setActiveCategory] = useState<string>("__all__");
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const postGridRef = useRef<HTMLDivElement>(null);

  const scrollToGrid = useCallback(() => {
    postGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["public-page", "blog"],
    queryFn: () => fetchPageBySlug("blog"),
    staleTime: 60_000,
  });

  const { data: counts } = useQuery({
    queryKey: ["post-counts"],
    queryFn: () => fetchPostCounts(),
    staleTime: 60_000,
  });

  const { data: categories = [], isError: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
    staleTime: 60_000,
  });

  const visibleCategories = categories.filter((c) => c.visible !== false);
  const topCategories = visibleCategories.filter((c) => !c.parent_id);

  const activeCat = topCategories.find((c) => c.name_en === activeCategory);
  const searchAccentColor =
    activeCategory !== "__all__" && activeCat ? getCatColor(activeCat.slug, activeCat.color) : undefined;

  if (categoriesError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 text-center">
        <p className="text-sm text-muted-foreground">{lang === "bn" ? "ক্যাটাগরি লোড করা যায়নি। পরে আবার চেষ্টা করুন।" : "Failed to load categories. Please try again later."}</p>
      </div>
    );
  }

  const heading = pickLocalized(
    page?.header_en || "Reflections & Inquiries",
    page?.header_bn || "প্রতিফলন ও অনুসন্ধান",
    lang,
    "Reflections & Inquiries",
  );
  const description = pickLocalized(
    page?.body_en || "Meditations, essays, and conversations on the intersection of Buddhist wisdom and modern life.",
    page?.body_bn || "বৌদ্ধ জ্ঞান ও আধুনিক জীবনের সংযোগস্থলে ধ্যান, প্রবন্ধ এবং কথোপকথন।",
    lang,
    "",
  );

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="h-8 w-48 skeleton-shimmer rounded mb-6" />
        <div className="h-4 w-96 max-w-full skeleton-shimmer rounded mb-4" />
        <div className="h-4 w-64 skeleton-shimmer rounded mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
              <PostCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page && page.visible === false) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center text-muted-foreground">
        <p>{lang === "bn" ? "এই পৃষ্ঠাটি বর্তমানে লুকানো আছে।" : "This page is currently hidden."}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-background to-background pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <PublicBreadcrumbs />

        {page?.banner_url && (
          <Reveal delay={0}>
            <div className="mb-12 -mx-6 md:mx-0 overflow-hidden rounded-xl shadow-lg">
              <img src={page.banner_url} alt={heading} className="w-full aspect-[21/9] object-cover" />
            </div>
          </Reveal>
        )}

        <Reveal delay={0.05}>
          <div className="mb-16">
            <EditorialHeader
              title={heading}
              description={description || undefined}
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => { setActiveCategory("__all__"); setActiveSubCategory(null); }}
              className={`relative px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] rounded-full transition-all duration-300 ${
                activeCategory === "__all__" ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {pickLocalized("All", "সব", lang, "All")}
            </button>
            {topCategories.map((cat) => {
              const isActive = activeCategory === cat.name_en;
              const count = counts?.[cat.name_en as any] as number | undefined;
              const color = getCatColor(cat.slug, cat.color);
              return (
                <button
                  key={cat.slug}
                  onClick={() => { setActiveCategory(cat.name_en); setActiveSubCategory(null); }}
                  className={`relative px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] rounded-full transition-all duration-300 ${
                    isActive ? "text-background shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  {pickLocalized(cat.name_en, cat.name_bn, lang, cat.name_en)}
                  {count !== undefined && <span className="ml-1.5 opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mb-14 max-w-md mx-auto">
            <SearchBar value={searchQuery} onChange={(val) => { setSearchQuery(val); if (val) { setActiveCategory("__all__"); setActiveSubCategory(null); } }} accentColor={searchAccentColor} />
          </div>
        </Reveal>

        {activeCategory === "__all__" ? (
          <>
            {topCategories.map((cat, idx) => {
              const catName = pickLocalized(cat.name_en, cat.name_bn, lang, cat.name_en);
              const catDesc = pickLocalized(cat.description_en || cat.name_en, cat.description_bn || cat.name_bn || cat.name_en, lang, cat.name_en);
              const color = getCatColor(cat.slug, cat.color);
              const subCategories = visibleCategories.filter((c) => c.parent_id === cat.id);

              return (
                <Reveal key={cat.slug} delay={0.2 + idx * 0.05}>
                  <section className="mb-20">
                    <div className="rounded-xl p-6 md:p-8 mb-8 border border-transparent transition-colors duration-500"
                      style={{ background: `linear-gradient(160deg, ${color}0D 0%, ${color}05 40%, transparent 70%)`, borderColor: `${color}15` }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to="/reflections/$slug" params={{ slug: cat.slug }} className="group inline-block">
                            <h2 className="font-serif text-2xl md:text-3xl relative inline-block">
                              {catName}
                              <span className="absolute -bottom-1.5 left-0 h-[2px] w-full rounded-full opacity-20 group-hover:opacity-60 transition-opacity duration-500"
                                style={{ background: `linear-gradient(to right, ${color}, ${color}40, transparent)` }} />
                            </h2>
                          </Link>
                          {catDesc && catDesc !== catName && <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">{catDesc}</p>}
                        </div>
                        <Link
                          to="/reflections/$slug"
                          params={{ slug: cat.slug }}
                          aria-label={`${catName} ${lang === "bn" ? "দেখুন" : "view"}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
                        >
                          →
                        </Link>
                      </div>
                    </div>

                    {subCategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mb-6 ml-4">
                        {subCategories.map((sub) => {
                          const isSubActive = activeSubCategory === sub.name_en;
                          return (
                            <button key={sub.id}
                              onClick={() => { setActiveSubCategory(isSubActive ? null : sub.name_en); if (!isSubActive) scrollToGrid(); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-all duration-200 hover:-translate-y-px hover:shadow-sm cursor-pointer"
                              style={{ borderColor: isSubActive ? color : `${color}25`, color: isSubActive ? "var(--color-background)" : color, backgroundColor: isSubActive ? color : `${color}0A` }}>
                              {pickLocalized(sub.name_en, sub.name_bn, lang, sub.name_en)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div ref={postGridRef}>
                      <PostGrid category={activeSubCategory || cat.name_en} pageSize={activeSubCategory ? 9 : 3} searchQuery={searchQuery || undefined} />
                    </div>
                  </section>
                </Reveal>
              );
            })}
          </>
        ) : (
          <Reveal delay={0.2}>
            <PostGrid category={activeCategory} searchQuery={searchQuery || undefined} />
          </Reveal>
        )}
      </div>
    </div>
  );
}
