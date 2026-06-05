import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Editor } from "@/components/Editor";
import { CoverUploader } from "@/components/CoverUploader";
import { TagInput } from "@/components/TagInput";
import { PostPreview } from "@/components/PostPreview";
import { POST_CATEGORIES, slugify, type PostCategory, type PostInput, type Post, type PostStatus } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { postSchema, type PostFormValues } from "@/lib/schemas";

interface PostFormProps {
  initial?: Post;
  submitting: boolean;
  onSubmit: (input: PostInput) => void;
}

type Tab = "en" | "bn";

export function PostForm({ initial, submitting, onSubmit }: PostFormProps) {
  const form = useForm<PostFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(postSchema) as any,
    defaultValues: {
      title_en: initial?.title_en ?? initial?.title ?? "",
      title_bn: initial?.title_bn ?? "",
      content_en: initial?.content_en ?? initial?.content ?? "",
      content_bn: initial?.content_bn ?? "",
      excerpt_en: initial?.excerpt_en ?? initial?.excerpt ?? "",
      excerpt_bn: initial?.excerpt_bn ?? "",
      slug: initial?.slug ?? "",
      cover_image: initial?.cover_image ?? "",
      category: (initial?.category as PostFormValues["category"]) ?? "Buddhist Psychology",
      author_name: initial?.author_name ?? "",
      author_image: initial?.author_image ?? "",
      status: initial?.status ?? "draft",
      tags: initial?.tags ?? [],
    },
  });

  // Track whether the slug has been manually touched
  const [slugTouched, setSlugTouched] = useState(!!initial);

  // Author fallback and profile avatar from authenticated user
  const [authorFallback, setAuthorFallback] = useState("Bodhi Mitra");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const currentAuthorImage = form.watch("author_image");

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
      if (!initial?.author_image && avatar) form.setValue("author_image", avatar);
    })();
    return () => { cancelled = true; };
  }, [initial?.author_name, initial?.author_image, form]);

  const [tab, setTab] = useState<Tab>("en");
  const [preview, setPreview] = useState(false);

  const onTitleEnChange = (v: string) => {
    form.setValue("title_en", v, { shouldDirty: true });
    if (!slugTouched) {
      form.setValue("slug", slugify(v), { shouldDirty: true });
    }
  };

  const handleSubmit = (status: PostStatus) => {
    form.setValue("status", status);
    form.handleSubmit(
      (values) => {
        onSubmit({
          title_en: values.title_en.trim(),
          title_bn: values.title_bn.trim(),
          content_en: values.content_en,
          content_bn: values.content_bn,
          excerpt_en: values.excerpt_en?.trim() || null,
          excerpt_bn: values.excerpt_bn?.trim() || null,
          slug: values.slug.trim(),
          cover_image: values.cover_image || null,
          category: values.category,
          author_name: values.author_name?.trim() || authorFallback,
          author_image: values.author_image || null,
          status: values.status,
          tags: values.tags,
        });
      },
      (errors) => {
        // Focus the first error tab
        if (errors.title_en || errors.content_en || errors.excerpt_en) {
          setTab("en");
        } else if (errors.title_bn || errors.content_bn || errors.excerpt_bn) {
          setTab("bn");
        }
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
  };

  const labelCls = "block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2";
  const inputCls = "w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-foreground/60";
  const inputErrorCls = "w-full border border-destructive bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-destructive";
  const bnStyle = { fontFamily: "var(--font-bn)", letterSpacing: 0 };

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
    const previewTitle = tab === "en" ? form.watch("title_en") : form.watch("title_bn");
    const previewExcerpt = tab === "en" ? form.watch("excerpt_en") : form.watch("excerpt_bn");
    const previewContent = tab === "en" ? form.watch("content_en") : form.watch("content_bn");
    return (
      <PostPreview
        tab={tab}
        onTabChange={setTab}
        onBack={() => setPreview(false)}
        title={previewTitle || ""}
        excerpt={previewExcerpt || ""}
        content={previewContent || ""}
        category={form.watch("category")}
        authorName={form.watch("author_name")}
        authorFallback={authorFallback}
        tags={form.watch("tags")}
        coverImage={form.watch("cover_image")}
      />
    );
  }

  const watchedStatus = form.watch("status");
  const watchedSlug = form.watch("slug");
  const watchedTitleEn = form.watch("title_en");
  const watchedTitleBn = form.watch("title_bn");
  const watchedContentEn = form.watch("content_en");
  const watchedContentBn = form.watch("content_bn");
  const watchedCoverImage = form.watch("cover_image");
  const watchedAuthorName = form.watch("author_name");
  const watchedAuthorImage = form.watch("author_image");
  const watchedTags = form.watch("tags");

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(watchedStatus === "published" ? "published" : "draft"); }} className="space-y-8 max-w-3xl">
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
              <FormField
                control={form.control}
                name="title_en"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Title (English)</FormLabel>
                    <FormControl>
                      <input
                        className={`${fieldState.error ? inputErrorCls : inputCls} font-serif text-xl`}
                        value={field.value}
                        onChange={(e) => onTitleEnChange(e.target.value)}
                        placeholder="The quiet mind"
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="excerpt_en"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Excerpt (English)</FormLabel>
                    <FormControl>
                      <textarea
                        className={`${fieldState.error ? inputErrorCls : inputCls} resize-y`}
                        rows={2}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content_en"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Content (English)</FormLabel>
                    <FormControl>
                      <Controller
                        name="content_en"
                        control={form.control}
                        render={({ field: ef }) => (
                          <Editor value={ef.value ?? ""} onChange={ef.onChange} />
                        )}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage className="text-[0.7rem]" />}
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title_bn"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>শিরোনাম (Bangla)</FormLabel>
                    <FormControl>
                      <input
                        className={`${fieldState.error ? inputErrorCls : inputCls} text-xl`}
                        style={bnStyle}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="শান্ত মন"
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="excerpt_bn"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>সারসংক্ষেপ (Bangla)</FormLabel>
                    <FormControl>
                      <textarea
                        className={`${fieldState.error ? inputErrorCls : inputCls} resize-y`}
                        style={bnStyle}
                        rows={2}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-[0.7rem]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content_bn"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>বিষয়বস্তু (Bangla)</FormLabel>
                    <FormControl>
                      <div style={bnStyle}>
                        <Controller
                          name="content_bn"
                          control={form.control}
                          render={({ field: ef }) => (
                            <Editor value={ef.value ?? ""} onChange={ef.onChange} />
                          )}
                        />
                      </div>
                    </FormControl>
                    {fieldState.error && <FormMessage className="text-[0.7rem]" />}
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="slug"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={labelCls}>Slug</FormLabel>
                <FormControl>
                  <input
                    className={fieldState.error ? inputErrorCls : inputCls}
                    value={field.value}
                    onChange={(e) => { field.onChange(e); setSlugTouched(true); }}
                    required
                  />
                </FormControl>
                <FormMessage className="text-[0.7rem]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Category</FormLabel>
                <FormControl>
                  <select className={inputCls} value={field.value} onChange={field.onChange}>
                    {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
          <div>
            <label className={labelCls}>Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                {currentAuthorImage ? (
                  <img src={currentAuthorImage} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-3xl text-muted-foreground">
                    {(watchedAuthorName || authorFallback || "?").trim()[0]?.toUpperCase() ?? "?"}
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
                  {avatarUploading ? "Uploading…" : currentAuthorImage ? "Replace" : "Upload"}
                </button>
                {currentAuthorImage && (
                  <button
                    type="button"
                    onClick={() => form.setValue("author_image", "")}
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
                    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
                    form.setValue("author_image", pub.publicUrl);
                    await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
                    setProfileAvatar(pub.publicUrl);
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
            {profileAvatar && currentAuthorImage !== profileAvatar && (
              <button
                type="button"
                onClick={() => form.setValue("author_image", profileAvatar)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Use profile picture
              </button>
            )}
          </div>

          <FormField
            control={form.control}
            name="author_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Writer Name (optional)</FormLabel>
                <FormControl>
                  <input
                    className={inputCls}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={authorFallback}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground mt-2">
                  Leave blank to use <span className="italic">{authorFallback}</span>.
                </p>
              </FormItem>
            )}
          />
        </div>

        <TagInput tags={watchedTags} onTagsChange={(tags) => form.setValue("tags", tags)} />

        <CoverUploader coverImage={watchedCoverImage} onCoverChange={(url) => form.setValue("cover_image", url || "")} />

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
          {initial && (
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mr-2">
              Current: {initial.status}
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
            {submitting ? "Saving…" : initial?.status === "published" ? "Update & Keep Published" : "Publish Now"}
          </button>
        </div>
      </form>
    </Form>
  );
}
