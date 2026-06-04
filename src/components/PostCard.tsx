import { Link } from "@tanstack/react-router";
import type { Post } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { LetterAvatar } from "@/components/LetterAvatar";


export function PostCard({ post }: { post: Post }) {
  const { lang, t } = useLang();
  const title = pickLocalized(post.title_en ?? post.title, post.title_bn, lang, "Untitled");
  const excerpt = pickLocalized(post.excerpt_en ?? post.excerpt, post.excerpt_bn, lang, "");

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const date = new Date(post.created_at).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className="group block hover:-translate-y-1 hover:shadow-md transition-all duration-300 rounded-xl"
    >
      {post.cover_image ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted mb-5 rounded-lg">
          <img
            src={post.cover_image}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-secondary/60 mb-5 flex items-center justify-center rounded-lg">
          <span className="font-serif text-3xl text-muted-foreground/40">◯</span>
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {post.category}
      </p>
      <h3 className="font-serif text-2xl leading-snug group-hover:text-primary transition-colors">
        {title}
      </h3>
      {excerpt && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {excerpt}
        </p>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[0.65rem] uppercase tracking-[0.12em] border border-border/50 bg-secondary/60 text-secondary-foreground px-2.5 py-0.5 rounded-full hover:bg-secondary/90 transition-colors">
              {t}
            </span>
          ))}
        </div>
      )}
      {post.author_name ? (
        <div className="mt-4 flex items-center gap-2.5 text-xs text-muted-foreground/80">
          <LetterAvatar name={post.author_name} src={post.author_image} size={28} />
          <span>
            {t("by")} <span className="italic">{post.author_name}</span> · {date}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground/80">{date}</p>
      )}

    </Link>
  );
}
