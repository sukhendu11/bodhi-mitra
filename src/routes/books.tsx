import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/books")({
  head: () => ({
    meta: [
      { title: "Books — Bodhi Mitra" },
      { name: "description", content: "Reviews and reading recommendations on contemplative practice and the mind." },
      { property: "og:title", content: "Books — Bodhi Mitra" },
      { property: "og:description", content: "Reviews and reading recommendations on contemplative practice and the mind." },
    ],
  }),
  component: () => (
    <CategoryPage
      category="Books"
      slug="books"
      titleEn="Books"
      titleBn="বই"
      defaultDescriptionEn="A small shelf of companions — books we return to, and the ones we recommend without hesitation."
      defaultDescriptionBn="সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই, এবং যেগুলো নির্দ্বিধায় সুপারিশ করি।"
    />
  ),
});
