import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedVideos, getYoutubeId, type Video } from "@/lib/videos";
import { useState } from "react";
import { Video as VideoIcon } from "lucide-react";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Videos — Bodhi Mitra" },
      { name: "description", content: "Curated video collection on Buddhist psychology, mindfulness, and the examined life." },
      { property: "og:title", content: "Videos — Bodhi Mitra" },
      { property: "og:description", content: "Curated video collection on Buddhist psychology, mindfulness, and the examined life." },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["public-videos", page],
    queryFn: () => fetchPublishedVideos(page, pageSize),
    staleTime: 60_000,
  });

  const videos = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
      {/* Page header */}
      <div className="mb-12 text-center">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">
          Videos
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Curated talks, guided meditations, and reflections on the dharma path.
        </p>
      </div>

      {/* Video grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-secondary/10 rounded-xl border border-border/60 animate-pulse">
              <div className="aspect-video rounded-t-xl bg-secondary/30" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-secondary/30 rounded w-3/4" />
                <div className="h-3 bg-secondary/20 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <VideoIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">No videos published yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const ytId = getYoutubeId(video.youtube_url);
              const thumbnail = video.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "");

              return (
                <a
                  key={video.id}
                  href={video.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-secondary/20 relative overflow-hidden">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg group-hover:scale-110">
                        <svg className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Duration placeholder badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[0.5rem] text-white/90 font-medium">
                      YouTube
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-foreground/80 transition-colors">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span className="text-[0.6rem] text-muted-foreground">Watch on YouTube</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-10">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
