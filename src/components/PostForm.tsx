import { useState, useRef, useEffect, type KeyboardEvent, type DragEvent } from "react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Editor } from "@/components/Editor";
import { POST_CATEGORIES, slugify, uploadCoverImage, type PostCategory, type PostInput, type Post, type PostStatus } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";

interface PostFormProps {
  initial?: Post;
  submitting: boolean;
  onSubmit: (input: PostInput) => void;
}

const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

type Tab = "en" | "bn";

export function PostForm({ initial, submitting, onSubmit }: PostFormProps) {
  // English fields
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? initial?.title ?? "");
  const [excerptEn, setExcerptEn] = useState(initial?.excerpt_en ?? initial?.excerpt ?? "");
  const [contentEn, setContentEn] = useState(initial?.content_en ?? initial?.content ?? "");

  // Bangla fields
  const [titleBn, setTitleBn] = useState(initial?.title_bn ?? "");
  const [excerptBn, setExcerptBn] = useState(initial?.excerpt_bn ?? "");
  const [contentBn, setContentBn] = useState(initial?.content_bn ?? "");

  // Shared
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [category, setCategory] = useState<PostCategory>(initial?.category ?? "Buddhist Psychology");
  const [authorName, setAuthorName] = useState(initial?.author_name ?? "");
  const [authorFallback, setAuthorFallback] = useState("Bodhi Mitra");
  const [authorImage, setAuthorImage] = useState<string | null>(initial?.author_image ?? null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name =
        profile?.display_name?.trim() ||
        (profile?.email ? profile.email.split("@")[0] : "") ||
        (user.email ? user.email.split("@")[0] : "") ||
        "Bodhi Mitra";
      if (!initial?.author_name) setAuthorFallback(name);
      const avatar = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;
      setProfileAvatar(avatar);
      if (!initial?.author_image && avatar) setAuthorImage(avatar);
    })();
    return () => { cancelled = true; };
  }, [initial?.author_name, initial?.author_image]);

  const [coverImage, setCoverImage] = useState<string | null>(initial?.cover_image ?? null);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<Tab>("en");
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onTitleEnChange = (v: string) => {
    setTitleEn(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || !ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG, WEBP, GIF, or AVIF image.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error("Image is too large. Max 8 MB.");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadCoverImage(file);
      setCoverImage(url);
      toast.success("Cover uploaded");
    } catch (e) {
      const msg = (e as Error).message || "Upload failed";
      console.error("[cover upload]", e);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTags([...tags, t]);
    setTagDraft("");
  };

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSubmit = (status: PostStatus) => {
    if (!titleEn.trim() || !slug.trim() || !contentEn.trim()) {
      toast.error("English title, slug, and content are required");
      setTab("en");
      return;
    }
    if (!titleBn.trim() || !contentBn.trim()) {
      toast.error("Bangla title and content are required");
      setTab("bn");
      return;
    }
    const finalTags = tagDraft.trim()
      ? Array.from(new Set([...tags, tagDraft.trim().replace(/^#/, "")]))
      : tags;
    onSubmit({
      title_en: titleEn.trim(),
      title_bn: titleBn.trim(),
      content_en: contentEn,
      content_bn: contentBn,
      excerpt_en: excerptEn.trim() || null,
      excerpt_bn: excerptBn.trim() || null,
      slug: slug.trim(),
      cover_image: coverImage,
      category,
      author_name: authorName.trim() || authorFallback,
      author_image: authorImage,
      status,
      tags: finalTags,
    });

  };

  const labelCls = "block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2";
  const inputCls = "w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-foreground/60";
  const bnStyle = { fontFamily: "var(--font-bn)", letterSpacing: 0 };

  const currentStatus: PostStatus = initial?.status ?? "draft";

  const tabBtn = (k: Tab, label: string, styled?: boolean) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      className={`px-5 py-2 text-xs uppercase tracking-[0.2em] border-b-2 transition-colors ${
        tab === k
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      style={styled ? bnStyle : undefined}
    >
      {label}
    </button>
  );

  const previewTitle = tab === "en" ? titleEn : titleBn;
  const previewExcerpt = tab === "en" ? excerptEn : excerptBn;
  const previewContent = tab === "en" ? contentEn : contentBn;
  const previewIsHtml = /<\/?[a-z][\s\S]*>/i.test(previewContent);
  const previewStyle = tab === "bn" ? bnStyle : undefined;

  if (preview) {
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
              onClick={() => setTab(tab === "en" ? "bn" : "en")}
              className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:bg-secondary"
            >
              Switch to {tab === "en" ? "বাংলা" : "English"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(false)}
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
              {previewTitle || "Untitled"}
            </h1>
            <p className="mt-6 text-sm text-muted-foreground">
              by {authorName || authorFallback}
            </p>
            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {tags.map((tg) => (
                  <span key={tg} className="text-[0.7rem] uppercase tracking-[0.14em] border border-border/50 bg-secondary/60 text-secondary-foreground px-3 py-1 rounded-full hover:bg-secondary/90 transition-colors">
                    {tg}
                  </span>
                ))}
              </div>
            )}
          </header>

          {coverImage && (
            <div className="mb-10">
              <img src={coverImage} alt={previewTitle} className="w-full aspect-[16/9] object-cover rounded-lg" />
            </div>
          )}

          {previewExcerpt && (
            <p className="font-serif text-xl text-foreground/80 italic text-center mb-8" style={previewStyle}>
              {previewExcerpt}
            </p>
          )}

          {previewContent ? (
            previewIsHtml ? (
              <div className="prose-mitra" style={previewStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent) }} />
            ) : (
              <div className="prose-mitra" style={previewStyle}>
                {previewContent.split("\n\n").filter(Boolean).map((p, i) => (
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

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(currentStatus === "published" ? "published" : "draft"); }} className="space-y-8 max-w-3xl">
      <div className="flex justify-end -mb-4">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:bg-secondary"
        >
          Preview
        </button>
      </div>

      {/* Language tabs for the bilingual fields */}
      <div>
        <div className="flex border-b border-border mb-6">
          {tabBtn("en", "English")}
          {tabBtn("bn", "বাংলা", true)}
        </div>

        {tab === "en" ? (
          <div className="space-y-6">
            <div>
              <label className={labelCls}>Title (English)</label>
              <input
                className={inputCls + " font-serif text-xl"}
                value={titleEn}
                onChange={(e) => onTitleEnChange(e.target.value)}
                placeholder="The quiet mind"
              />
            </div>
            <div>
              <label className={labelCls}>Excerpt (English)</label>
              <textarea
                className={inputCls + " resize-y"}
                rows={2}
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Content (English)</label>
              <Editor value={contentEn} onChange={setContentEn} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className={labelCls}>শিরোনাম (Bangla)</label>
              <input
                className={inputCls + " text-xl"}
                style={bnStyle}
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                placeholder="শান্ত মন"
              />
            </div>
            <div>
              <label className={labelCls}>সারসংক্ষেপ (Bangla)</label>
              <textarea
                className={inputCls + " resize-y"}
                style={bnStyle}
                rows={2}
                value={excerptBn}
                onChange={(e) => setExcerptBn(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>বিষয়বস্তু (Bangla)</label>
              <div style={bnStyle}>
                <Editor value={contentBn} onChange={setContentBn} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelCls}>Slug</label>
          <input className={inputCls} value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} required />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as PostCategory)}>
            {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
        <div>
          <label className={labelCls}>Profile Picture</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
              {authorImage ? (
                <img src={authorImage} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-3xl text-muted-foreground">
                  {(authorName || authorFallback || "?").trim()[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => avatarFileRef.current?.click()}
                className="px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] border border-border hover:bg-secondary disabled:opacity-50"
              >
                {avatarUploading ? "Uploading…" : authorImage ? "Replace" : "Upload"}
              </button>
              {authorImage && (
                <button
                  type="button"
                  onClick={() => setAuthorImage(null)}
                  className="px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 4 * 1024 * 1024) { toast.error("Avatar must be under 4 MB"); return; }
                try {
                  setAvatarUploading(true);
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error("Not signed in");
                  const ext = (f.name.split(".").pop() ?? "jpg").toLowerCase();
                  const path = `${user.id}/${Date.now()}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("avatars")
                    .upload(path, f, { upsert: true, contentType: f.type });
                  if (upErr) throw upErr;
                  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
                  const url = data.publicUrl;
                  setAuthorImage(url);
                  // Persist to profile so it becomes the writer's default avatar
                  await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
                  setProfileAvatar(url);
                  toast.success("Profile picture updated");
                } catch (err) {
                  toast.error((err as Error).message || "Upload failed");
                } finally {
                  setAvatarUploading(false);
                  if (avatarFileRef.current) avatarFileRef.current.value = "";
                }
              }}
            />
          </div>
          {profileAvatar && authorImage !== profileAvatar && (
            <button
              type="button"
              onClick={() => setAuthorImage(profileAvatar)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
            >
              Use profile picture
            </button>
          )}
        </div>

        <div>
          <label className={labelCls}>Writer Name (optional)</label>
          <input
            className={inputCls}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={authorFallback}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Leave blank to use <span className="italic">{authorFallback}</span>.
          </p>
        </div>
      </div>


      <div>
        <label className={labelCls}>Tags</label>
        <div className="border border-border bg-background px-3 py-2.5 flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-sm">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${t}`}>
                ×
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKey}
            onBlur={() => tagDraft && addTag(tagDraft)}
            placeholder={tags.length ? "" : "Type a tag and press Enter…"}
            className="flex-1 min-w-[140px] bg-transparent text-sm focus:outline-none"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Press Enter or comma to add. Backspace removes the last tag.</p>
      </div>

      <div>
        <label className={labelCls}>Cover image</label>

        {coverImage ? (
          <div className="relative group border border-border">
            <img src={coverImage} alt="cover" className="w-full max-h-80 object-cover" />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-foreground border border-border hover:bg-secondary disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                disabled={uploading}
                className="px-4 py-2 text-xs uppercase tracking-[0.2em] bg-background text-destructive border border-border hover:bg-secondary disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Uploading…
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            className={`border-2 border-dashed cursor-pointer text-center px-6 py-12 transition-colors ${
              dragOver ? "border-foreground bg-secondary/60" : "border-border hover:border-foreground/50 hover:bg-secondary/30"
            } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <p className="font-serif text-lg mb-1">
              {uploading ? "Uploading…" : "Drop an image here, or click to choose"}
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF or AVIF — up to 8 MB</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            value={coverUrlDraft}
            onChange={(e) => setCoverUrlDraft(e.target.value)}
            placeholder="…or paste an image URL"
            className={inputCls + " flex-1"}
          />
          <button
            type="button"
            onClick={() => {
              const u = coverUrlDraft.trim();
              if (!u) return;
              try { new URL(u); } catch { toast.error("Invalid URL"); return; }
              setCoverImage(u);
              setCoverUrlDraft("");
              toast.success("Cover set from URL");
            }}
            className="px-4 py-2.5 text-xs uppercase tracking-[0.2em] border border-border hover:bg-secondary"
          >
            Use URL
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
        {initial && (
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mr-2">
            Current: {currentStatus}
          </span>
        )}
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={submitting || uploading}
          className="px-6 py-3 text-xs uppercase tracking-[0.25em] border border-border text-foreground hover:bg-secondary disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("published")}
          disabled={submitting || uploading}
          className="px-8 py-3 text-xs uppercase tracking-[0.25em] bg-foreground text-background hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Saving…" : currentStatus === "published" ? "Update & Keep Published" : "Publish Now"}
        </button>
      </div>
    </form>
  );
}
