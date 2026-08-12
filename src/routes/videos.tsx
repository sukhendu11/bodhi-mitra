import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedVideos } from "@/lib/videos";
import { fetchSiteSettings } from "@/lib/siteSettings";
import { fetchPageBySlug } from "@/lib/pages";
import { useState, useMemo, useCallback } from "react";
import { Video as VideoIcon } from "lucide-react";
import { useLang, pickLocalized } from "@/lib/i18n";
import { SearchBar } from "@/components/SearchBar";
import { EditorialHeader } from "@/components/EditorialHeader";
import { Reveal } from "@/components/Reveal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoCard } from "@/components/VideoCard";
import { BackLink } from "@/components/BackLink";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/videos")({
  loader: async () => {
    const [settings, page] = await Promise.all([
      fetchSiteSettings(),
      fetchPageBySlug("videos").catch(() => null),
    ]);
    return { settings, page };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings;
    const page = loaderData?.page;
    const metaDesc =
      page?.meta_description_en ||
      "Curated video collection on Buddhist psychology, mindfulness, and the examined life.";
    const pageTitle = page?.title_en || "Videos";
    return seoHead({
      title: pageTitle,
      description: metaDesc,
      path: "/videos",
      siteName: settings?.branding?.site_name_en,
      siteUrl: settings?.seo?.site_url,
    });
  },
  component: VideosPage,
});

function VideosPage() {
  const { lang } = useLang();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<{ id: string; title: string } | null>(null);

  const { data: pageData } = useQuery({
    queryKey: ["public-page", "videos"],
    queryFn: () => fetchPageBySlug("videos"),
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-videos"],
    queryFn: () => fetchPublishedVideos(1, 100),
    staleTime: 60_000,
  });

  const allVideos = data?.data ?? [];

  // Hooks must be declared unconditionally — these were previously AFTER the
  // isError early-return, a Rules-of-Hooks violation that crashed React when
  // the query flipped between error/retry states ("Rendered more hooks than
  // during the previous render").
  const videos = useMemo(() => {
    if (!searchQuery.trim()) return allVideos;
    const q = searchQuery.toLowerCase();
    return allVideos.filter((v) =>
      [v.title, v.title_en, v.title_bn, v.description, v.description_en, v.description_bn]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [allVideos, searchQuery]);

  const handlePlay = useCallback((ytId: string, title: string) => {
    setActiveVideo({ id: ytId, title });
  }, []);

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 text-center">
        <p className="text-sm text-muted-foreground">{lang === "bn" ? "ভিডিও লোড করা যায়নি। পরে আবার চেষ্টা করুন।" : "Failed to load videos. Please try again later."}</p>
      </div>
    );
  }

  const header = pickLocalized(
    pageData?.header_en || "Videos",
    pageData?.header_bn || "ভিডিও",
    lang,
    "Videos",
  );
  const description = pickLocalized(
    pageData?.body_en ||
      "Curated talks, guided meditations, and reflections on the dharma path.",
    pageData?.body_bn || "নির্বাচিত আলোচনা, নির্দেশিত ধ্যান, এবং ধর্ম পথের প্রতিফলন।",
    lang,
    "",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      <BackLink to="/" label={lang === "bn" ? "হোম" : "Home"} />

      {/* Page header — shared editorial treatment (matches Books/Reflections) */}
      <div className="mb-12">
        <EditorialHeader
          title={header}
          description={description || undefined}
        />
      </div>

      {/* Search */}
      <Reveal delay={0.1}>
        <div className="mb-10 max-w-md mx-auto">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={lang === "bn" ? "ভিডিও অনুসন্ধান..." : "Search videos..."}
          />
        </div>
      </Reveal>

      {/* Video grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 75}ms` }}>
              <div className="aspect-video rounded-xl skeleton-shimmer" />
              <div className="mt-4 px-0.5 space-y-2">
                <div className="h-3 skeleton-shimmer rounded w-1/4" />
                <div className="h-4 skeleton-shimmer rounded w-4/5" />
                <div className="h-3 skeleton-shimmer rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-4">
            <VideoIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {searchQuery
              ? lang === "bn"
                ? "কোন ভিডিও পাওয়া যায়নি।"
                : "No videos match your search."
              : lang === "bn"
                ? "কোন ভিডিও প্রকাশিত হয়নি।"
                : "No videos published yet."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary hover:underline mt-2"
            >
              {lang === "bn" ? "অনুসন্ধান মুছুন" : "Clear search"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onPlay={handlePlay} />
          ))}
        </div>
      )}

      {/* Video player popup */}
      <Dialog
        open={!!activeVideo}
        onOpenChange={(open) => {
          if (!open) setActiveVideo(null);
        }}
      >
        <DialogContent className="max-w-4xl p-0 gap-0 bg-zinc-950 overflow-hidden rounded-xl shadow-2xl border-0 [&>button]:hidden">
          {activeVideo && (
            <div className="relative">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors"
                aria-label="Close player"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="px-3 py-3 bg-zinc-950 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium line-clamp-1">
                    {activeVideo.title}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
