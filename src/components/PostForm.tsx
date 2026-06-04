import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Editor } from "@/components/Editor";
import { CoverUploader } from "@/components/CoverUploader";
import { TagInput } from "@/components/TagInput";
import { PostPreview } from "@/components/PostPreview";
import { POST_CATEGORIES, slugify, type PostCategory, type PostInput, type Post, type PostStatus } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";

interface PostFormProps {
  initial?: Post;
  submitting: boolean;
  onSubmit: (input: PostInput) => void;
}

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
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tab, setTab] = useState<Tab>("en");
  const [preview, setPreview] = useState(false);

  const onTitleEnChange = (v: string) => {
    setTitleEn(v);
    if (!slugTouched) setSlug(slugify(v));
  };

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
      tags,
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

  if (preview) {
    return (
      <PostPreview
        tab={tab}
        onTabChange={setTab}
        onBack={() => setPreview(false)}
        title={tab === "en" ? titleEn : titleBn}
        excerpt={tab === "en" ? excerptEn : excerptBn}
        content={tab === "en" ? contentEn : contentBn}
        category={category}
        authorName={authorName}
        authorFallback={authorFallback}
        tags={tags}
        coverImage={coverImage}
      />
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

      <TagInput tags={tags} onTagsChange={setTags} />

      <CoverUploader coverImage={coverImage} onCoverChange={setCoverImage} />

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
        {initial && (
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mr-2">
            Current: {currentStatus}
          </span>
        )}
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={submitting}
          className="px-6 py-3 text-xs uppercase tracking-[0.25em] border border-border text-foreground hover:bg-secondary disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("published")}
          disabled={submitting}
          className="px-8 py-3 text-xs uppercase tracking-[0.25em] bg-foreground text-background hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Saving…" : currentStatus === "published" ? "Update & Keep Published" : "Publish Now"}
        </button>
      </div>
    </form>
  );
}
