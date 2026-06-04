import DOMPurify from "dompurify";
import type { PostCategory } from "@/lib/posts";

interface PostPreviewProps {
  tab: "en" | "bn";
  onTabChange: (tab: "en" | "bn") => void;
  onBack: () => void;
  title: string;
  excerpt: string;
  content: string;
  category: PostCategory;
  authorName: string;
  authorFallback: string;
  tags: string[];
  coverImage: string | null;
}

export function PostPreview({
  tab, onTabChange, onBack,
  title, excerpt, content,
  category, authorName, authorFallback,
  tags, coverImage,
}: PostPreviewProps) {
  const previewStyle = tab === "bn" ? { fontFamily: "var(--font-bn)", letterSpacing: 0 } : undefined;
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</span>
          <span className="text-xs uppercase tracking-[0.2em] text-foreground/70">· {tab === "en" ? "English" : "বাংলা"}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTabChange(tab === "en" ? "bn" : "en")}
            className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:bg-secondary"
          >
            Switch to {tab === "en" ? "বাংলা" : "English"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90"
          >
            Back to Edit
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-2xl py-10">
        <header className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">{category}</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.15]" style={previewStyle}>
            {title || "Untitled"}
          </h1>
          <p className="mt-6 text-sm text-muted-foreground">
            by {authorName || authorFallback}
          </p>
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {tags.map((tg) => (
                <span key={tg} className="text-[0.7rem] uppercase tracking-[0.14em] border border-border/50 bg-secondary/60 text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90">
                  {tg}
                </span>
              ))}
            </div>
          )}
        </header>

        {coverImage && (
          <div className="mb-10">
            <img src={coverImage} alt={title} className="w-full aspect-[16/9] object-cover rounded-lg" />
          </div>
        )}

        {excerpt && (
          <p className="font-serif text-xl text-foreground/80 italic text-center mb-8" style={previewStyle}>
            {excerpt}
          </p>
        )}

        {content ? (
          isHtml ? (
            <div className="prose-mitra" style={previewStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
          ) : (
            <div className="prose-mitra" style={previewStyle}>
              {content.split("\n\n").filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )
        ) : (
          <p className="text-center text-sm text-muted-foreground italic">No content yet.</p>
        )}
      </article>
    </div>
  );
}
