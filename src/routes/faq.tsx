import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { seoHead } from "@/lib/seo";
import { generateFaqSchema } from "@/lib/structured-data";

interface FAQItem {
  q_en: string;
  q_bn: string;
  a_en: string;
  a_bn: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    q_en: "What is Sabbe Satta?",
    q_bn: "সব্বে সত্তা কী?",
    a_en: "Sabbe Satta is a digital platform for wisdom, mindfulness, learning, and compassionate living. We publish bilingual (English and Bangla) books, articles, and guided meditations rooted in Buddhist psychology and contemplative traditions.",
    a_bn: "সব্বে সত্তা হলো জ্ঞান, মাইন্ডফুলনেস, শেখা এবং সমবেদনাময় জীবনযাপনের একটি ডিজিটাল প্ল্যাটফর্ম। আমরা বৌদ্ধ মনোবিজ্ঞান এবং ধ্যানমূলক ঐতিহ্যের ওপর ভিত্তি করে দ্বিভাষিক (ইংরেজি এবং বাংলা) বই, নিবন্ধ এবং নির্দেশিত ধ্যান প্রকাশ করি।",
  },
  {
    q_en: "Is the content free?",
    q_bn: "বিষয়বস্তু কি বিনামূল্যে?",
    a_en: "Many of our books and all of our articles are completely free. Some premium books require a one-time purchase. We believe wisdom should be accessible to everyone, regardless of financial means.",
    a_bn: "আমাদের অনেক বই এবং সমস্ত নিবন্ধ সম্পূর্ণ বিনামূল্যে। কিছু প্রিমিয়াম বইয়ের জন্য একবার করে কেনাকাটা প্রয়োজন। আমরা বিশ্বাস করি যে জ্ঞান সকলের জন্য অ্যাক্সেসযোগ্য হওয়া উচিত।",
  },
  {
    q_en: "How do I read a book?",
    q_bn: "আমি কীভাবে একটি বই পড়ব?",
    a_en: "Free books can be read instantly by clicking 'Read Now' on the book page. Premium books require purchase first — after payment, you'll be redirected to our reader with your book ready to read.",
    a_bn: "বিনামূল্যের বই বইয়ের পৃষ্ঠায় 'Read Now' ক্লিক করে তাৎক্ষণিকভাবে পড়া যায়। প্রিমিয়াম বইয়ের জন্য প্রথমে কেনাকাটা প্রয়োজন — পেমেন্টের পর, আপনাকে আমাদের রিডারে পুনঃনির্দেশিত করা হবে।",
  },
  {
    q_en: "Can I read on mobile?",
    q_bn: "আমি কি মোবাইলে পড়তে পারব?",
    a_en: "Yes! Our reader works on any device with a web browser — phones, tablets, and desktops. The reading experience adapts to your screen size with responsive design.",
    a_bn: "হ্যাঁ! আমাদের রিডার যেকোনো ওয়েব ব্রাউজার সহ ডিভাইসে কাজ করে — ফোন, ট্যাবলেট এবং ডেস্কটপ। রিডিং অভিজ্ঞতা আপনার স্ক্রিন সাইজ অনুযায়ী সাড়া দেয়।",
  },
  {
    q_en: "How do I purchase a book?",
    q_bn: "আমি কীভাবে একটি বই কিনব?",
    a_en: "Click 'Buy' on any premium book page. You'll be taken to our secure checkout, and after your payment is verified you'll have instant access to the book in your library.",
    a_bn: "যেকোনো প্রিমিয়াম বইয়ের পৃষ্ঠায় 'Buy' ক্লিক করুন। আপনাকে আমাদের নিরাপদ চেকআউটে নেওয়া হবে এবং পেমেন্ট যাচাইয়ের পর আপনি আপনার লাইব্রেরিতে বইয়ে তাৎক্ষণিক অ্যাক্সেস পাবেন।",
  },
  {
    q_en: "What payment methods do you accept?",
    q_bn: "আপনারা কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?",
    a_en: "We accept bKash, Nagad, and major credit or debit cards. All transactions are secure and verified before access is granted.",
    a_bn: "আমরা বিকাশ, নগদ এবং প্রধান ক্রেডিট বা ডেবিট কার্ড গ্রহণ করি। অ্যাক্সেস দেওয়ার আগে সমস্ত লেনদেন নিরাপদে যাচাই করা হয়।",
  },
  {
    q_en: "Can I request a refund?",
    q_bn: "আমি কি রিফান্ডের অনুরোধ করতে পারব?",
    a_en: "Yes, we offer refunds within 30 days of purchase if you're not satisfied. Contact us at support@sabbesatta.com and we'll process your request promptly.",
    a_bn: "হ্যাঁ, আপনি সন্তুষ্ট না হলে কেনাকাটার ৩০ দিনের মধ্যে আমরা রিফান্ড প্রদান করি। support@sabbesatta.com-এ আমাদের সাথে যোগাযোগ করুন এবং আমরা আপনার অনুরোধ দ্রুত প্রক্রিয়া করব।",
  },
  {
    q_en: "How can I support Sabbe Satta?",
    q_bn: "আমি কীভাবে সব্বে সত্তাকে সমর্থন করতে পারব?",
    a_en: "You can support us by purchasing books, making a donation, sharing our content with others, or subscribing to our newsletter. Every bit helps us create more free wisdom resources.",
    a_bn: "আপনি বই কিনে, দান করে, আমাদের বিষয়বস্তু অন্যদের সাথে শেয়ার করে, বা আমাদের নিউজলেটারে সাবস্ক্রাইব করে আমাদের সমর্থন করতে পারেন।",
  },
];

const FAQ_QUESTIONS = FAQ_DATA.map((item) => ({
  question: item.q_en,
  answer: item.a_en,
}));

const FAQ_SCHEMA = generateFaqSchema(FAQ_QUESTIONS);

export const Route = createFileRoute("/faq")({
  head: () => {
    const head = seoHead({
      title: "FAQ",
      description: "Frequently asked questions about Sabbe Satta — our books, reading, and community.",
      path: "/faq",
    });
    return {
      ...head,
      scripts: [{ type: "application/ld+json", JSON: FAQ_SCHEMA }],
    };
  },
  component: FAQPage,
});

function FAQPage() {
  const { lang } = useLang();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Reveal delay={0}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
          {lang === "bn" ? "সচরাচর জিজ্ঞাসা" : "Frequently Asked Questions"}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {lang === "bn" ? "প্রশ্নোত্তর" : "FAQ"}
        </h1>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-14 space-y-0 divide-y divide-border/60">
          {FAQ_DATA.map((item, i) => {
            const q = lang === "bn" ? item.q_bn : item.q_en;
            const a = lang === "bn" ? item.a_bn : item.a_en;
            const isOpen = openIndex === i;

            return (
              <div key={i} className="py-4">
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 text-left py-2 group cursor-pointer"
                >
                  <span className="font-serif text-lg text-foreground group-hover:text-foreground/80 transition-colors">
                    {q}
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      isOpen
                        ? "border-foreground/30 bg-foreground text-background rotate-180"
                        : "border-border/60 text-muted-foreground group-hover:border-foreground/30 group-hover:text-foreground",
                    )}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="pb-4 text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                      {a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* Contact CTA */}
      <Reveal delay={0.3}>
        <div className="mt-16 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {lang === "bn"
              ? "আপনার প্রশ্নের উত্তর পাননি?"
              : "Didn't find your answer?"}
          </p>
          <a
            href="mailto:hello@sabbesatta.com"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground border-b border-foreground/40 pb-0.5 hover:border-foreground transition-colors"
          >
            {lang === "bn" ? "আমাদের ইমেইল করুন" : "Email us at hello@sabbesatta.com"}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </Reveal>
    </div>
  );
}
