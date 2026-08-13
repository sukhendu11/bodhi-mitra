import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => seoHead({
    title: "Terms of Service",
    description: "Terms of Service for Sabbe Satta — guidelines for using our platform.",
    path: "/terms",
  }),
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useLang();

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Reveal delay={0}>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
          {lang === "bn" ? "সেবার শর্তাবলী" : "Terms of Service"}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {lang === "bn" ? "সেবার শর্তাবলী" : "Terms of Service"}
        </h1>
      </Reveal>

      <Reveal delay={0.2}>
        {/* Body uses the shared editorial prose (1.18rem) like the blog/about
            pages — the old text-sm override made legal copy read smaller than
            every other body surface. Headings inherit the prose h2 (2rem). */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-card p-6 md:p-10 shadow-sm prose-mitra">
          {lang === "bn" ? (
            <>
              <section>
                <h2>১. সেবা বর্ণনা</h2>
                <p>সব্বে সত্তা (sabbesatta.com) একটি ডিজিটাল প্ল্যাটফর্ম যা জ্ঞান, মাইন্ডফুলনেস এবং সমবেদনাময় জীবনযাপনের উপর বিষয়বস্তু প্রদান করে। এই সেবাগুলো অন্তর্ভুক্ত (কিন্তু সীমাবদ্ধ নয়): বই পড়া, নিবন্ধ পড়া, ভিডিও দেখা এবং কেনাকাটা।</p>
              </section>

              <section>
                <h2>২. ব্যবহারের শর্তাবলী</h2>
                <p>প্ল্যাটফর্মটি ব্যবহার করে, আপনি সম্মত হচ্ছেন যে আপনি এই শর্তাবলীর সাথে বাধ্য। আপনি শুধুমাত্র বৈধ উদ্দেশ্যে প্ল্যাটফর্মটি ব্যবহার করবেন।</p>
              </section>

              <section>
                <h2>৩. বৌদ্ধিক সম্পত্তি</h2>
                <p>সমস্ত বিষয়বস্তু (বই, নিবন্ধ, ভিডিও, ডিজাইন) সব্বে সত্তা বা তার লেখকদের বৌদ্ধিক সম্পত্তি। বিনামূল্যের বই ব্যক্তিগত ব্যবহারের জন্য পড়া যেতে পারে। পেইড বই শুধুমাত্র কেনাকাটাকারী ব্যবহারকারীদের জন্য অ্যাক্সেসযোগ্য।</p>
              </section>

              <section>
                <h2>৪. অ্যাকাউন্ট</h2>
                <p>আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখা আপনার দায়িত্ব। আপনি আপনার অ্যাকাউন্টের কার্যকলাপের জন্য দায়ী।</p>
              </section>

              <section>
                <h2>৫. পেমেন্ট ও রিফান্ড</h2>
                <p>পেমেন্ট একটি নিরাপদ পেমেন্ট গেটওয়ের মাধ্যমে প্রক্রিয়া করা হয় (বিকাশ, নগদ এবং প্রধান কার্ড সহ)। পেমেন্ট যাচাইয়ের পরই কেনা বইয়ের অ্যাক্সেস দেওয়া হয়। ৩০ দিনের মধ্যে রিফান্ডের অনুরোধ করা যেতে পারে।</p>
              </section>

              <section>
                <h2>৬. দায়মুক্তি</h2>
                <p>প্ল্যাটফর্মটি "যেমন আছে" ভিত্তিতে প্রদান করা হয়। আমরা কোনো নির্দিষ্ট ফলাফলের গ্যারান্টি দিই না।</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>1. Description of Service</h2>
                <p>Sabbe Satta (sabbesatta.com) is a digital platform providing content on wisdom, mindfulness, and compassionate living. Services include (but are not limited to): reading books, articles, watching videos, and making purchases.</p>
              </section>

              <section>
                <h2>2. Terms of Use</h2>
                <p>By using the platform, you agree to be bound by these terms. You will only use the platform for lawful purposes.</p>
              </section>

              <section>
                <h2>3. Intellectual Property</h2>
                <p>All content (books, articles, videos, designs) is the intellectual property of Sabbe Satta or its authors. Free books may be read for personal use. Paid books are accessible only to purchasers.</p>
              </section>

              <section>
                <h2>4. Accounts</h2>
                <p>You are responsible for maintaining the security of your account. You are responsible for all activity under your account.</p>
              </section>

              <section>
                <h2>5. Payments & Refunds</h2>
                <p>Payments are processed through a secure payment gateway (including bKash, Nagad, and major cards). Access to purchased books is granted only after payment is verified. Refund requests can be made within 30 days of purchase.</p>
              </section>

              <section>
                <h2>6. Disclaimer</h2>
                <p>The platform is provided "as is." We do not guarantee any specific outcomes.</p>
              </section>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
