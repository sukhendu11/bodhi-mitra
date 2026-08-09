import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { fetchSiteSettings } from "@/lib/siteSettings";
import { fetchCategories } from "@/lib/taxonomy";
import { PostGrid } from "@/components/PostGrid";
import { SearchBar } from "@/components/SearchBar";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { useLang, pickLocalized } from "@/lib/i18n";
import { ErrorPage } from "@/components/error-page";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { Reveal } from "@/components/Reveal";
import { seoHead } from "@/lib/seo";

const CAT_COLORS: Record<string, string> = {
  meditation: "#8B5CF6",
  mindfulness: "#10B981",
  "mental-health": "#F59E0B",
  philosophy: "#3B82F6",
  "buddhist-psychology": "#EC4899",
};

export const Route = createFileRoute("/reflections/$slug")({
  loader: async ({ params }) => {
    const [settings, categories] = await Promise.all([
      fetchSiteSettings().catch(() => null),
      fetchCategories().catch(() => []),
    ]);
    const category = categories.find((c) => c.slug === params.slug) ?? null;
    const siteUrl = settings?.seo?.site_url || "https://sabbesatta.com";
    const siteName = settings?.branding?.site_name_en || "Sabbe Satta";
    return { settings, categories, category, siteName, siteUrl };
  },
  head: (ctx: Record<string, unknown>) => {
    const ld = ctx.loaderData as {
      category: { name_en?: string; name_bn?: string; description_en?: string; description_bn?: string } | null;
      siteName: string;
      siteUrl: string;
    } | undefined;
    const p = ctx.params as { slug: string };
    const category = ld?.category;
    const name = ld?.siteName ?? "Sabbe Satta";

    if (!category) return { meta: [{ title: "Not Found — " + name }] };

    const catTitle = category.name_en || category.name_bn || "Reflections";
    const desc = category.description_en || category.description_bn || `Explore ${catTitle} reflections.`;
    const pageUrl = `/reflections/${p.slug}`;
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Reflections", url: "/reflections" },
      { name: catTitle, url: pageUrl },
    ]);

    const head = seoHead({
      title: catTitle,
      description: desc,
      path: pageUrl,
      siteName: name,
      siteUrl: ld?.siteUrl,
    });

    return {
      ...head,
      scripts: [{ type: "application/ld+json", JSON: breadcrumbSchema }],
    };
  },
  component: CategoryPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function CategoryPage() {
  const { lang } = useLang();
  const { category, categories } = Route.useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");

  if (!category) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="font-serif text-3xl">{lang === "bn" ? "ক্যাটাগরি পাওয়া যায়নি" : "Category not found"}</h1>
        <p className="mt-4 text-muted-foreground">{lang === "bn" ? "আপনি যে ক্যাটাগরিটি খুঁজছেন তা বিদ্যমান নেই।" : "The category you&apos;re looking for doesn&apos;t exist."}</p>
        <Link to="/reflections" className="mt-8 inline-block text-sm underline hover:text-foreground/80 transition-colors">
          {lang === "bn" ? "প্রতিফলনে ফিরুন" : "Back to Reflections"}
        </Link>
      </div>
    );
  }

  const visibleCategories = categories.filter((c) => c.visible !== false);
  const color = CAT_COLORS[category.slug] || category.color || "#888";

  // Collect all descendant category names recursively
  const collectDescendants = (parentId: string): string[] => {
    const children = visibleCategories.filter((c) => c.parent_id === parentId);
    const names: string[] = [];
    for (const child of children) {
      names.push(child.name_en);
      names.push(...collectDescendants(child.id));
    }
    return names;
  };
  const subCategoryNames = collectDescendants(category.id);
  const allCategoryNames = [category.name_en, ...subCategoryNames];

  // Direct children for navigation
  const directSubs = visibleCategories.filter((c) => c.parent_id === category.id);

  // Sibling categories for "next/prev" navigation
  const parentCategory = category.parent_id
    ? visibleCategories.find((c) => c.id === category.parent_id)
    : null;
  const siblingCategories = parentCategory
    ? visibleCategories.filter((c) => c.parent_id === parentCategory.id && c.id !== category.id)
    : visibleCategories.filter((c) => !c.parent_id && c.id !== category.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <PublicBreadcrumbs />

      {/* Category header */}
      <Reveal delay={0}>
        <header className="mb-12 text-center">
          <h1 className="font-serif text-3xl md:text-4xl leading-tight">
            {pickLocalized(category.name_en, category.name_bn, lang, category.name_en)}
          </h1>
          {category.description_en && (
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {pickLocalized(category.description_en, category.description_bn, lang, "")}
            </p>
          )}
          {/* Color accent line */}
          <div
            className="mt-6 h-0.5 w-12 rounded-full mx-auto"
            style={{ backgroundColor: color }}
          />
        </header>
      </Reveal>

      {/* Child category navigation */}
      {directSubs.length > 0 && (
        <Reveal delay={0.05}>
          <nav className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3 font-medium">
              {lang === "bn" ? "উপ-বিভাগ" : "In this section"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {directSubs.map((sub) => (
                <Link
                  key={sub.id}
                  to="/reflections/$slug"
                  params={{ slug: sub.slug }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                  style={{
                    borderColor: `${color}30`,
                    color: color,
                    backgroundColor: `${color}0A`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${color}18`;
                    e.currentTarget.style.borderColor = `${color}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${color}0A`;
                    e.currentTarget.style.borderColor = `${color}30`;
                  }}
                >
                  {pickLocalized(sub.name_en, sub.name_bn, lang, sub.name_en)}
                </Link>
              ))}
            </div>
          </nav>
        </Reveal>
      )}

      {/* Search */}
      <Reveal delay={0.1}>
        <div className="mb-8 max-w-sm mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} accentColor={color} />
        </div>
      </Reveal>

      {/* Post grid */}
      <Reveal delay={0.15}>
        <PostGrid
          categories={allCategoryNames}
          searchQuery={searchQuery || undefined}
        />
      </Reveal>

      {/* Navigation to other categories */}
      {siblingCategories.length > 0 && (
        <Reveal delay={0.2}>
          <nav className="mt-16 pt-8 border-t border-border/40 text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4 font-medium">
              {lang === "bn" ? "আরও অন্বেষণ করুন" : "More to explore"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {siblingCategories.map((sib) => {
                const sibColor = CAT_COLORS[sib.slug] || sib.color || "#888";
                return (
                  <Link
                    key={sib.id}
                    to="/reflections/$slug"
                    params={{ slug: sib.slug }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    style={{
                      borderColor: `${sibColor}30`,
                      color: sibColor,
                      backgroundColor: `${sibColor}0A`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${sibColor}18`;
                      e.currentTarget.style.borderColor = `${sibColor}50`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${sibColor}0A`;
                      e.currentTarget.style.borderColor = `${sibColor}30`;
                    }}
                  >
                    {pickLocalized(sib.name_en, sib.name_bn, lang, sib.name_en)}
                  </Link>
                );
              })}
              <Link
                to="/reflections"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                {lang === "bn" ? "সব দেখুন" : "View all"}
              </Link>
            </div>
          </nav>
        </Reveal>
      )}
    </div>
  );
}
