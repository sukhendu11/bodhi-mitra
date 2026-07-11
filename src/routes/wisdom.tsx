import { fetchSiteSettings } from "@/lib/siteSettings";
import { fetchPageBySlug } from "@/lib/pages";
import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/wisdom")({
  loader: async () => {
    const [settings, page] = await Promise.all([
      fetchSiteSettings(),
      fetchPageBySlug("wisdom"),
    ]);
    return { settings, page };
  },
  head: ({ loaderData }) => {
    const { settings, page } = loaderData;
    const siteName = settings?.branding?.site_name_en || "Bodhi Mitra";
    const metaDesc = page?.meta_description_en || "Reflections on mindfulness, philosophy, and the quiet art of living.";
    const pageTitle = page?.title_en || "Wisdom";
    return {
      meta: [
        { title: `${pageTitle} — ${siteName}` },
        { name: "description", content: metaDesc },
        { property: "og:title", content: `${pageTitle} — ${siteName}` },
        { property: "og:description", content: metaDesc },
      ],
    };
  },
  component: () => (
    <CategoryPage
      category="Wisdom"
      slug="wisdom"
      titleEn="Wisdom"
      titleBn="প্রজ্ঞা"
      defaultDescriptionEn="Short meditations on attention, equanimity, and the texture of an examined life."
      defaultDescriptionBn="মনোযোগ, সমতা এবং পরীক্ষিত জীবনের গঠন নিয়ে সংক্ষিপ্ত ধ্যান।"
    />
  ),
});
