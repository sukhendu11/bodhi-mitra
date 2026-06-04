import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/wisdom")({
  head: () => ({
    meta: [
      { title: "Wisdom — Bodhi Mitra" },
      { name: "description", content: "Reflections on mindfulness, philosophy, and the quiet art of living." },
      { property: "og:title", content: "Wisdom — Bodhi Mitra" },
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
