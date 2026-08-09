import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => seoHead({
    title: "Privacy Policy",
    description: "Privacy Policy for Sabbe Satta — how we collect, use, and protect your data.",
    path: "/privacy",
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useLang();

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Reveal delay={0}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
          {lang === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy"}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {lang === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy"}
        </h1>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-12 rounded-2xl border border-border/60 bg-card p-6 md:p-10 shadow-sm prose-mitra space-y-8 text-sm text-muted-foreground leading-relaxed">
          {lang === "bn" ? (
            <>
              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">তথ্য সংগ্রহ</h2>
                <p>আমরা শুধুমাত্র সেই তথ্য সংগ্রহ করি যা আপনি সরাসরি প্রদান করেন: ইমেইল ঠিকানা, প্রদর্শন নাম এবং পেমেন্ট তথ্য (একটি নিরাপদ পেমেন্ট গেটওয়ের মাধ্যমে প্রক্রিয়াকৃত, আমাদের সার্ভারে সংরক্ষিত নয়)।</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">তথ্যের ব্যবহার</h2>
                <p>আমরা আপনার তথ্য ব্যবহার করি: আপনার অ্যাকাউন্ট পরিচালনা করতে, কেনাকাটা সম্পন্ন করতে, এবং আপনাকে প্ল্যাটফর্ম সম্পর্কে গুরুত্বপূর্ণ আপডেট পাঠাতে। আমরা আপনার তথ্য তৃতীয় পক্ষের সাথে শেয়ার করি না।</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">নিরাপত্তা</h2>
                <p>আমরা আপনার তথ্য রক্ষা করতে শিল্প-মানের নিরাপত্তা ব্যবহার করি। তবে ইন্টারনেটে কোনো পদ্ধতি ১০০% নিরাপদ নয়।</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">কুকিজ</h2>
                <p>আমরা প্ল্যাটফর্মের কার্যক্ষমতা উন্নত করতে কুকিজ ব্যবহার করি। আপনি আপনার ব্রাউজার সেটিংস থেকে কুকিজ নিষিদ্ধ করতে পারেন।</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">আপনার অধিকার</h2>
                <p>আপনি আপনার তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলতে অনুরোধ করতে পারেন। এই অনুরোধগুলো পাঠাতে hello@sabbesatta.com-এ যোগাযোগ করুন।</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">Information We Collect</h2>
                <p>We only collect information you provide directly: email address, display name, and payment information (processed through a secure payment gateway, not stored on our servers).</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">How We Use Information</h2>
                <p>We use your information to: manage your account, process purchases, and send important platform updates. We do not share your information with third parties.</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">Security</h2>
                <p>We use industry-standard security measures to protect your information. However, no method of transmission over the Internet is 100% secure.</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">Cookies</h2>
                <p>We use cookies to improve platform functionality. You can disable cookies in your browser settings.</p>
              </section>

              <section>
                <h2 className="font-serif text-lg text-foreground mb-3">Your Rights</h2>
                <p>You can request to view, correct, or delete your information. Contact us at hello@sabbesatta.com to make such requests.</p>
              </section>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
