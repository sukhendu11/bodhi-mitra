import { fetchSiteSettings } from "@/lib/siteSettings";
import { fetchPageBySlug } from "@/lib/pages";
import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/buddhist-psychology")({
  loader: async () => {
    const [settings, page] = await Promise.all([
      fetchSiteSettings(),
      fetchPageBySlug("buddhist-psychology"),
    ]);
    return { settings, page };
  },
  head: ({ loaderData }) => {
    const { settings, page } = loaderData;
    const siteName = settings?.branding?.site_name_en || "Bodhi Mitra";
    const metaDesc = page?.meta_description_en || "Essays bridging the Buddha's wisdom with the science of mental health.";
    const pageTitle = page?.title_en || "Buddhist Psychology";
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
      category="Buddhist Psychology"
      slug="buddhist-psychology"
      titleEn="Buddhist Psychology"
      titleBn="বৌদ্ধ মনোবিজ্ঞান"
      defaultDescriptionEn="Where the Buddha's two-and-a-half-millennia of inquiry into the mind meets the evidence base of modern psychiatry."
      defaultDescriptionBn="যেখানে বুদ্ধের আড়াই হাজার বছরের মনস্তাত্ত্বিক অনুসন্ধান আধুনিক মনোরোগবিদ্যার প্রমাণের সাথে মিলিত হয়।"
    />
  ),
});
