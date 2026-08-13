import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getYoutubeId, formatDuration, fetchYouTubeOEmbed } from "@/lib/videos";
import { useLang, pickLocalized, toBanglaDigits, formatDate } from "@/lib/i18n";
import { Play, Clock } from "lucide-react";
import type { Video, YouTubeMetadata } from "@/lib/videos";

interface VideoCardProps {
  video: Video;
  onPlay?: (ytId: string, title: string) => void;
}

/** Shared pill styling for the "Watch on YouTube" control. */
const WATCH_ON_YOUTUBE_CLS =
  "ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground bg-muted/40 hover:bg-muted/60 border border-border/40 hover:border-border rounded-full hover:scale-105 active:scale-95 transition-all duration-200";

/** Small YouTube glyph used inside the pill. */
const YOUTUBE_ICON = (
  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export function VideoCard({ video, onPlay }: VideoCardProps) {
  const { lang } = useLang();
  const [ytMeta, setYtMeta] = useState<YouTubeMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  const ytId = getYoutubeId(video.youtube_url);

  useEffect(() => {
    if (!ytId) {
      setMetaLoading(false);
      return;
    }
    let cancelled = false;
    fetchYouTubeOEmbed(video.youtube_url).then((data) => {
      if (!cancelled) {
        setYtMeta(data);
        setMetaLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [video.youtube_url, ytId]);

  const localizedTitle = pickLocalized(video.title_en, video.title_bn, lang, video.title);
  const displayTitle = ytMeta?.title || localizedTitle;
  const displayThumbnail =
    ytMeta?.thumbnail_url ||
    video.thumbnail_url ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
  const displayAuthor = ytMeta?.author_name || "";

  const date = formatDate(video.created_at, lang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function handleClick() {
    if (onPlay && ytId) onPlay(ytId, displayTitle);
  }

  const content = (
    <>
      {/* Thumbnail */}
      <div className="aspect-video rounded-t-xl bg-secondary/30 relative overflow-hidden">
        {metaLoading ? (
          <div className="w-full h-full skeleton-shimmer" />
        ) : (
          <>
            <img
              src={displayThumbnail}
              alt={displayTitle}
              className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
              } group-hover:scale-[1.05]`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </>
        )}

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-neutral-600/40 backdrop-blur-md flex items-center justify-center ring-1 ring-white/25 transition-all duration-500 group-hover:bg-red-600/70 active:scale-95">
            <Play
              className="w-5 h-5 text-white ml-0.5"
              fill="currentColor"
            />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration ? (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-1.5 py-0.5 rounded-md tracking-tight flex items-center gap-1 transition-all duration-300 group-hover:bg-saffron/90 group-hover:text-white">
            <Clock className="h-2.5 w-2.5" />
            {lang === "bn" ? toBanglaDigits(formatDuration(video.duration)) : formatDuration(video.duration)}
          </div>
        ) : null}

        {/* Top gradient overlay for depth */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="px-3.5 pb-4 pt-3 space-y-2">
        {metaLoading ? (
          <div className="space-y-2.5">
            <div className="h-2.5 skeleton-shimmer rounded w-1/4" />
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-3 skeleton-shimmer rounded w-2/3" />
          </div>
        ) : (
          <>
            {/* Channel name */}
            {displayAuthor ? (
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-[0.08em] flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                  <Play className="w-1.5 h-1.5 text-white" fill="currentColor" />
                </span>
                {displayAuthor}
              </p>
            ) : null}

            {/* Title — text-lg card-title size per the type scale (was 16px). */}
            <h3 className="text-lg font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary/80 transition-colors duration-300">
              {displayTitle}
            </h3>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-muted-foreground/35">{date}</span>
              {onPlay ? (
                /* Card is a <button> (videos page) — a real anchor is valid here. */
<a
                href={video.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={WATCH_ON_YOUTUBE_CLS}
              >
                {YOUTUBE_ICON}
                {lang === "bn" ? "ইউটিউবে দেখুন" : "Watch on YouTube"}
              </a>
              ) : (
                /* Card is a <Link> (homepage) — a nested <a> would break hydration,
                   so render an accessible role="link" span that opens YouTube in a new tab. */
                <span
                  role="link"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(video.youtube_url, "_blank", "noopener,noreferrer");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(video.youtube_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className={`${WATCH_ON_YOUTUBE_CLS} cursor-pointer`}
                >
                  {YOUTUBE_ICON}
                  {lang === "bn" ? "ইউটিউবে দেখুন" : "Watch on YouTube"}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

  if (onPlay) {
    return (
      <button
        onClick={handleClick}
        className="group text-left block w-full bg-card border border-border/40 rounded-xl overflow-hidden hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to="/videos"
        className="group block bg-card border border-border/40 rounded-xl overflow-hidden hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500"
    >
      {content}
    </Link>
  );
}
