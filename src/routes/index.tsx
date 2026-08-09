import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import heroImg from "@/assets/hero.jpg";
import { PostGrid } from "@/components/PostGrid";
import { SearchBar } from "@/components/SearchBar";
import type { PostCategory } from "@/lib/posts";
import type { Book } from "@/lib/books";
import { useLang, pickLocalized, formatMoney, localizeCartResult } from "@/lib/i18n";
import { fetchSiteSettings, useSiteSettings } from "@/lib/siteSettings";
import { Reveal } from "@/components/Reveal";
import { generateWebSiteSchema, generateOrganizationSchema } from "@/lib/structured-data";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookCard } from "@/components/BookCard";
import { BookOpen, ArrowRight, Play, ShoppingCart, Loader2, PenLine } from "lucide-react";
import { BrandCtaButton } from "@/components/BrandCtaButton";
import { fetchPublishedBooks } from "@/lib/books";
import { fetchPublishedVideos } from "@/lib/videos";
import { fetchPostCounts } from "@/lib/posts";
import { useAuthSession } from "@/hooks/useAuth";
import { checkOwnership } from "@/lib/books-purchases";
import { getPdfReaderUrl, purchaseBookAction } from "@/lib/books-reader";
import { addToCart } from "@/lib/cart";
import type { MockCartBookSnapshot } from "@/lib/mock-cart";
import { AuthModal } from "@/components/AuthModal";
import { lazy } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoCard } from "@/components/VideoCard";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { seoHead } from "@/lib/seo";
import { callFn } from "@/lib/call-fn";

const PdfViewer = lazy(() =>
  import("@/components/PdfViewer").then((m) => ({ default: m.PdfViewer })),
);


export const Route = createFileRoute("/")({
  loader: () => fetchSiteSettings(),
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const tagline =
      loaderData?.branding?.tagline_en ||
      loaderData?.hero?.title_en?.replace(/\n/g, " ") ||
      "Where ancient wisdom meets modern psychology.";
    const metaDesc =
      seo?.meta_desc_en ||
      "Reflections on Buddhist psychology, mindfulness, and mental health by practicing psychiatrists.";
    const siteName = loaderData?.branding?.site_name_en || "Sabbe Satta";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : (loaderData?.seo?.site_url || "https://sabbesatta.com");

    const websiteSchema = generateWebSiteSchema(baseUrl, siteName, metaDesc);
    const orgSchema = generateOrganizationSchema(baseUrl, siteName, loaderData?.social || {});

    const head = seoHead({
      title: siteName,
      description: metaDesc,
      path: "/",
      siteName,
      siteUrl: baseUrl,
      ogImage: seo?.og_image_url || undefined,
    });

    return {
      ...head,
      meta: [
        ...head.meta,
        { property: "og:site_name", content: siteName },
      ],
      scripts: [
        { type: "application/ld+json", JSON: websiteSchema },
        { type: "application/ld+json", JSON: orgSchema },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { t, lang } = useLang();
  const settings = useSiteSettings();
  const hero = settings.hero;
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<PostCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  // Book card handlers
  const [pdfLoading, setPdfLoading] = useState(false);
  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [pdfReaderUrl, setPdfReaderUrl] = useState<string | null>(null);
  const [pdfExpired, setPdfExpired] = useState(false);
  const [purchaseBook, setPurchaseBook] = useState<Book | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const pendingBookRef = useRef<Book | null>(null);

  const doGetPdfReaderUrl = useServerFn(getPdfReaderUrl);
  const doPurchase = useServerFn(purchaseBookAction);
  const doAddToCart = useServerFn(addToCart);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        setPendingAction(() => action);
        setAuthModalOpen(true);
      }
    },
    [user],
  );

  const openPdfReader = useCallback(
    async (book: Book) => {
      if (!book.pdf_url) {
        toast.error(lang === "bn" ? "এই বইয়ের জন্য কোনো PDF নেই।" : "No PDF available for this book.");
        return;
      }
      setPdfLoading(true);
      setPdfExpired(false);
      if (import.meta.env.DEV) {
        // Dev mode: serve local/public PDFs directly (mock/public PDF)
        setReaderBook(book);
        setPdfReaderUrl(book.pdf_url);
        setPdfLoading(false);
        return;
      }
      try {
        const result = await callFn(doGetPdfReaderUrl, { bookId: book.id, bucketPath: book.pdf_url });
        setReaderBook(book);
        setPdfReaderUrl(result.signedUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : lang === "bn" ? "রিডার খোলা ব্যর্থ হয়েছে।" : "Failed to open reader.");
      } finally {
        setPdfLoading(false);
      }
    },
    [doGetPdfReaderUrl],
  );

  /* Free books open the reader for anyone (no auth gate); paid books
     require sign-in + ownership. */
  const handleEyeClick = useCallback(
    async (book: Book) => {
      if (book.is_free) {
        await openPdfReader(book);
        return;
      }
      if (!user) {
        pendingBookRef.current = book;
        setAuthModalOpen(true);
        return;
      }
      if (await checkOwnership(user.id, book.id)) {
        await openPdfReader(book);
      } else {
        setPurchaseBook(book);
      }
    },
    [user, openPdfReader],
  );

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    const book = pendingBookRef.current;
    pendingBookRef.current = null;
    if (book) {
      setTimeout(async () => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        if (book.is_free || (await checkOwnership(currentUser.id, book.id))) {
          await openPdfReader(book);
        } else {
          setPurchaseBook(book);
        }
      }, 500);
      return;
    }
    if (pendingAction) {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 500);
    }
  }, [pendingAction, openPdfReader]);

  const handlePurchaseConfirm = useCallback(async () => {
    if (!purchaseBook || !user) return;
    setPurchaseLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await callFn(doPurchase, { bookId: purchaseBook.id, bookSlug: purchaseBook.slug, userId: user.id }) as any;
      setPurchaseLoading(false);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.alreadyOwned) {
        toast.info(lang === "bn" ? "আপনি ইতিমধ্যে এই বইটির মালিক।" : "You already own this book.");
      } else {
        toast.success(lang === "bn" ? "বইটি কেনা হয়েছে! আপনি এখন এটি পড়তে পারেন।" : "Book purchased! You can now read it.");
      }
      queryClient.invalidateQueries({ queryKey: ["book-owned", purchaseBook.id] });
      // Mark owned instantly — the card's Lock → Eye flips without a round-trip.
      queryClient.setQueryData(["book-owned", purchaseBook.id, user.id], true);
      const purchased = purchaseBook;
      setPurchaseBook(null);
      await openPdfReader(purchased);
    } catch (err) {
      setPurchaseLoading(false);
      toast.error(err instanceof Error ? err.message : lang === "bn" ? "ক্রয় ব্যর্থ হয়েছে।" : "Purchase failed.");
    }
  }, [purchaseBook, user, doPurchase, queryClient, openPdfReader]);

  const cartMutation = useMutation({
    mutationFn: (payload: { bookId: string; book: MockCartBookSnapshot }) =>
      callFn(doAddToCart, { bookId: payload.bookId, book: payload.book }),
    onSuccess: (result: any) => {
      if (result.alreadyInCart) {
        toast.info(localizeCartResult(lang, result));
      } else {
        toast.success(localizeCartResult(lang, result));
      }
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const { data: booksData } = useQuery({
    queryKey: ["featured-books"],
    queryFn: () => fetchPublishedBooks(1, 6, { featured: true }),
    staleTime: 300_000,
  });

  const { data: videosData } = useQuery({
    queryKey: ["home-videos"],
    queryFn: () => fetchPublishedVideos(1, 6),
    staleTime: 300_000,
  });

  const { data: postCounts } = useQuery({
    queryKey: ["post-counts"],
    queryFn: () => fetchPostCounts(),
    staleTime: 300_000,
  });

  const featuredBooks = booksData?.data ?? [];
  const homeVideos = videosData?.data ?? [];

  const filters: { label: string; value: PostCategory | "All" }[] = lang === "bn"
    ? [
        { label: "সব", value: "All" },
        { label: "ধ্যান", value: "Meditation" },
        { label: "মাইন্ডফুলনেস", value: "Mindfulness" },
        { label: "মানসিক স্বাস্থ্য", value: "Mental Health" },
        { label: "দর্শন", value: "Philosophy" },
        { label: "বৌদ্ধ মনোবিজ্ঞান", value: "Buddhist Psychology" },
      ]
    : [
        { label: "All", value: "All" },
        { label: "Meditation", value: "Meditation" },
        { label: "Mindfulness", value: "Mindfulness" },
        { label: "Mental Health", value: "Mental Health" },
        { label: "Philosophy", value: "Philosophy" },
        { label: "Buddhist Psychology", value: "Buddhist Psychology" },
      ];

  const heroTitle = pickLocalized(hero.title_en, hero.title_bn, lang);
  const heroDesc = pickLocalized(hero.desc_en, hero.desc_bn, lang);
  const heroEyebrow = pickLocalized(hero.eyebrow_en, hero.eyebrow_bn, lang);
  const isExternal = /^https?:\/\//i.test(hero.cta_url);

  return (
    <>
      {/* Hero */}
      {hero.visible && (
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 opacity-90">
            <img src={hero.image_url || heroImg} alt={heroTitle || "Hero background"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/10 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 py-32 md:py-44 text-center">
            <Reveal delay={0}>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground dark:text-white/70 mb-6">
                {heroEyebrow}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground dark:text-white whitespace-pre-line">
                {heroTitle}
              </h1>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="mt-8 max-w-xl mx-auto text-sm md:text-base text-muted-foreground dark:text-white/80 leading-relaxed whitespace-pre-line">
                {heroDesc}
              </p>
            </Reveal>
            {hero.cta_label && hero.cta_url && (
              <Reveal delay={0.45}>
                {isExternal ? (
                  <a href={hero.cta_url} className="mt-10 inline-block border-b border-foreground/50 dark:border-white/50 dark:text-white pb-1 text-sm tracking-wide hover:border-foreground dark:hover:border-white transition-all duration-300">
                    {hero.cta_label} →
                  </a>
                ) : (
                  <Link to={hero.cta_url} className="mt-10 inline-block border-b border-foreground/50 dark:border-white/50 dark:text-white pb-1 text-sm tracking-wide hover:border-foreground dark:hover:border-white transition-all duration-300">
                    {hero.cta_label} →
                  </Link>
                )}
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Philosophy Quote */}
      <Reveal delay={0.1}>
        <section className="mx-auto max-w-3xl px-6 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="h-px w-12 bg-border" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span className="h-px w-12 bg-border" />
          </div>
          <blockquote className="font-serif text-xl md:text-2xl leading-relaxed italic text-foreground/80">
            {lang === "bn"
              ? "মনই সবকিছু। আপনি যা ভাবেন তাই হয়ে যান।"
              : "The mind is everything. What you think, you become."}
          </blockquote>
          <p className="mt-6 text-sm text-muted-foreground tracking-wide">— {lang === "bn" ? "বুদ্ধ" : "Buddha"}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-border" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span className="h-px w-12 bg-border" />
          </div>
        </section>
      </Reveal>

      {/* Recent Reflections */}
      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-border/40">
        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-muted-foreground/60" />
              <h2 className="font-serif text-xl md:text-2xl">{t("recent_reflections")}</h2>
            </div>
            {/* Category pills — same visual language as the Reflections hub */}
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActive(f.value)}
                  className={`relative px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] rounded-full transition-all duration-300 ${
                    active === f.value
                      ? "bg-foreground text-background shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {f.label}
                  {f.value !== "All" && postCounts?.[f.value] !== undefined && (
                    <span className="ml-1.5 opacity-60">({postCounts[f.value]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="mb-8 max-w-md">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <PostGrid category={active === "All" ? undefined : active} searchQuery={searchQuery} />
      </section>

      {/* Featured Books */}
      {featuredBooks.length > 0 && (
        <Reveal delay={0.15}>
          <section className="py-16 border-t border-border/40 bg-secondary/10 dark:bg-secondary/20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                  <h2 className="font-serif text-xl md:text-2xl">{lang === "bn" ? "বৈশিষ্ট্যযুক্ত বই" : "Featured Books"}</h2>
                </div>
                <Link to="/books" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300">
                  {lang === "bn" ? "সব দেখুন" : "View all"} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="book-grid">
                {featuredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    lang={lang}
                    userId={user?.id}
                    onEyeClick={handleEyeClick}
                    requireAuth={requireAuth}
                    pdfLoading={pdfLoading}
                    onAddToCart={(book) => cartMutation.mutate({ bookId: book.id, book })}
                    isCartAdding={cartMutation.isPending}
                  />
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* Videos */}
      {homeVideos.length > 0 && (
        <Reveal delay={0.2}>
          <section className="mx-auto max-w-6xl px-6 py-16 border-t border-border/40">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-muted-foreground/60" />
                <h2 className="font-serif text-xl md:text-2xl">{lang === "bn" ? "ভিডিও" : "Videos"}</h2>
              </div>
              <Link to="/videos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {lang === "bn" ? "সব দেখুন" : "View all"} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10">
              {homeVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* Newsletter CTA */}
      <Reveal delay={0.25}>
        <section className="relative overflow-hidden border-t border-border/40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3 dark:from-primary/10 dark:via-background dark:to-primary/6 pointer-events-none" />
          <div className="relative mx-auto max-w-xl px-6 py-20 md:py-24 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-5 font-medium">
              {lang === "bn" ? "যোগাযোগে থাকুন" : "Stay connected"}
            </p>
            <h2 className="font-serif text-2xl md:text-3xl leading-tight mb-4">
              {lang === "bn" ? "নতুন প্রতিফলন পান" : "Receive new reflections"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
              {lang === "bn"
                ? "ইমেলে নতুন প্রতিফলন পান — ধীর, কখনও কখনও, কখনও শব্দময় নয়।"
                : "Receive new reflections by email — slow, occasional, never noisy."}
            </p>
            <div className="max-w-sm mx-auto">
              <NewsletterSignup />
            </div>
          </div>
        </section>
      </Reveal>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} onSuccess={handleAuthSuccess} />

      {/* PDF Reader Dialog */}
      <Dialog open={!!readerBook && !!pdfReaderUrl} onOpenChange={(open) => { if (!open) { setReaderBook(null); setPdfReaderUrl(null); } }}>
        <DialogContent hideClose className="max-w-5xl h-[85vh] p-0 gap-0">
          <DialogTitle className="sr-only">
            {readerBook ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "Book reader") : "Book reader"}
          </DialogTitle>
          <div className="flex-1 overflow-hidden">
            {pdfReaderUrl && (
              <PdfViewer
                url={pdfReaderUrl}
                title={
                  readerBook
                    ? pickLocalized(readerBook.title_en, readerBook.title_bn, lang, "")
                    : ""
                }
                onClose={() => { setReaderBook(null); setPdfReaderUrl(null); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={!!purchaseBook} onOpenChange={(open) => { if (!open) setPurchaseBook(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "বই কিনুন" : "Purchase Book"}</DialogTitle>
          </DialogHeader>
          {purchaseBook && (
            <div className="space-y-4">
              <div className="flex gap-3">
                {purchaseBook.cover_image && (
                  <img src={purchaseBook.cover_image} alt={purchaseBook.title_en} className="w-16 h-24 object-cover rounded-lg" />
                )}
                <div>
                  <p className="font-serif font-medium">{purchaseBook.title_en}</p>
                  <p className="text-sm text-muted-foreground">{purchaseBook.author_name}</p>
                  <p className="text-sm font-medium mt-1">{formatMoney(Number(purchaseBook.price), lang)}</p>
                </div>
              </div>
              <BrandCtaButton
                onClick={handlePurchaseConfirm}
                disabled={purchaseLoading}
                className="w-full px-4 py-2.5"
              >
                {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {purchaseLoading ? "Processing..." : "Purchase & Read"}
              </BrandCtaButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
