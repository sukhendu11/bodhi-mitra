import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/buddhist-psychology")({
  head: () => ({
    meta: [
      { title: "Buddhist Psychology — Bodhi Mitra" },
      { name: "description", content: "Essays bridging the Buddha's wisdom with the science of mental health." },
      { property: "og:title", content: "Buddhist Psychology — Bodhi Mitra" },
      { property: "og:description", content: "Essays bridging the Buddha's wisdom with the science of mental health." },
    ],
  }),
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
