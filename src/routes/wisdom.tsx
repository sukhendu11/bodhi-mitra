import { getSiteName } from "@/lib/siteSettings";
import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/wisdom")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Wisdom — ${loaderData}` },
      { name: "description", content: "Reflections on mindfulness, philosophy, and the quiet art of living." },
      { property: "og:title", content: `Wisdom — ${loaderData}` },
      { property: "og:description", content: "Reflections on mindfulness, philosophy, and the quiet art of living." },
    ],
  }),
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
