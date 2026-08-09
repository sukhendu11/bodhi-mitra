import { Link } from "@tanstack/react-router";
import type { Post } from "@/lib/posts";
import { useLang, pickLocalized } from "@/lib/i18n";
import { localizeCategoryName } from "@/lib/taxonomy";
import { LetterAvatar } from "@/components/LetterAvatar";

export function PostCard({ post }: { post: Post }) {
  const { lang, t } = useLang();
  const title = pickLocalized(post.title_en ?? post.title, post.title_bn, lang, "Untitled");
  const excerpt = pickLocalized(post.excerpt_en ?? post.excerpt, post.excerpt_bn, lang, "");

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const date = new Date(post.created_at).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className="group block bg-card border border-border/40 overflow-hidden rounded-xl hover:border-foreground/20 hover:shadow-md hover:-translate-y-1 transition-all duration-500"
    >
      {post.cover_image ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted rounded-t-xl">
          <img
            src={post.cover_image}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-secondary/60 flex items-center justify-center rounded-t-xl">
          <span className="font-serif text-3xl text-muted-foreground/40">◯</span>
        </div>
      )}
      <div className="p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {localizeCategoryName(post.category, lang)}
      </p>
      <h3 className="font-serif text-lg leading-snug group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>
      {excerpt && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{excerpt}</p>
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-xs uppercase tracking-[0.08em] font-medium border border-border/40 bg-secondary/50 text-muted-foreground px-2.5 py-0.5 rounded-full hover:bg-secondary/80 hover:border-foreground/20 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {post.author_name ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/80">
          <LetterAvatar name={post.author_name} src={post.author_image} size={24} />
          <span>
            {t("by")} <span className="italic">{post.author_name}</span> · {date}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground/80">{date}</p>
      )}
      </div>
    </Link>
  );
}
