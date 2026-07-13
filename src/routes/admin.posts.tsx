import { useState, useEffect, lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileText, Eye, ImagePlus } from "lucide-react";
import { postSchema, type PostFormValues } from "@/lib/schemas";
import { type Post, POST_CATEGORIES, slugify } from "@/lib/posts";
import { ResourceListPage, registerResource } from "@/components/admin/resource-engine";
import { StatusBadge, DateCell } from "@/components/admin/data-table";
import { FormRenderer } from "@/components/admin/form-engine";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { MediaPicker } from "@/components/admin/media-engine";
import { BlockEditor } from "@/components/admin/block-editor";
import { supabase } from "@/integrations/supabase/client";
import { ErrorPage } from "@/components/error-page";
const TagInput = lazy(() => import("@/components/TagInput").then((m) => ({ default: m.TagInput })));
const PostPreview = lazy(() =>
  import("@/components/PostPreview").then((m) => ({ default: m.PostPreview })),
);

/* ─── Column Definitions ─────────────────────────────────────────── */

const columnHelper = createColumnHelper<Post>();

const columns = [
  columnHelper.accessor("title_en", {
    header: "Post",
    enableSorting: true,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex items-start gap-3 min-w-0">
          {p.cover_image ? (
            <img
            src={p.cover_image}
            alt={p.title_en || p.title || "Post cover"}
              className="w-9 h-9 rounded-lg object-cover border border-border/40 shrink-0 mt-0.5"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="h-4 w-4 text-muted-foreground/50" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium line-clamp-1">
              {p.title_en || p.title || p.title_bn || "Untitled"}
            </span>
            <p className="text-[0.6rem] text-muted-foreground mt-0.5">
              {p.category} · {p.title_bn ? `বাংলা: ${p.title_bn}` : "—"}
              {p.tags?.length ? ` · ${p.tags.slice(0, 2).join(", ")}` : ""}
            </p>
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("author_name", {
    header: "Author",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-xs">{getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    enableSorting: true,
    cell: ({ getValue }) => <DateCell date={getValue()} />,
  }),
  columnHelper.display({
    id: "view",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const p = row.original;
      if (p.status !== "published") return null;
      return (
        <Link
          to="/posts/$slug"
          params={{ slug: p.slug }}
          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors inline-flex"
          title="View on site"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
      );
    },
  }),
];

/* ─── Post Form Content (Form Engine + MediaPicker + Editor + TagInput) ── */

const POST_FORM_GROUPS = [
  {
    title: "Content",
    columns: 2 as const,
    fields: [
      {
        type: "bilingual" as const,
        nameEn: "title_en" as const,
        nameBn: "title_bn" as const,
        labelEn: "Title (English)",
        labelBn: "Title (বাংলা)",
        placeholderEn: "Post title",
        placeholderBn: "পোস্ট শিরোনাম",
      },
    ],
  },
  {
    title: "Metadata",
    columns: 2 as const,
    fields: [
      { type: "text" as const, name: "slug" as const, label: "Slug", placeholder: "post-slug" },
      {
        type: "select" as const,
        name: "category" as const,
        label: "Category",
        options: POST_CATEGORIES.map((c) => ({ label: c, value: c })),
      },
    ],
  },
  {
    columns: 2 as const,
    fields: [
      {
        type: "bilingual-textarea" as const,
        nameEn: "excerpt_en" as const,
        nameBn: "excerpt_bn" as const,
        labelEn: "Excerpt (EN)",
        labelBn: "Excerpt (BN)",
        rows: 2,
      },
    ],
  },
  {
    title: "SEO",
    columns: 2 as const,
    fields: [
      {
        type: "textarea" as const,
        name: "meta_description_en" as const,
        label: "Meta Description (EN)",
        rows: 2,
      },
      {
        type: "textarea" as const,
        name: "meta_description_bn" as const,
        label: "Meta Description (BN)",
        rows: 2,
      },
    ],
  },
  {
    title: "Publishing",
    columns: 2 as const,
    fields: [
      {
        type: "text" as const,
        name: "author_name" as const,
        label: "Author Name",
        placeholder: "Author",
      },
      {
        type: "select" as const,
        name: "status" as const,
        label: "Status",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
      },
    ],
  },
];

function PostFormContent({
  form,
  resource,
}: {
  form: ReturnType<typeof useForm<PostFormValues>>;
  resource: any;
}) {
  const [contentLang, setContentLang] = useState<"en" | "bn">("en");
  const [preview, setPreview] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [authorFallback, setAuthorFallback] = useState("Bodhi Mitra");
  const coverImage = form.watch("cover_image");
  const slug = form.watch("slug");
  const titleEn = form.watch("title_en");
  const tags = form.watch("tags");

  // Auto-generate slug from title
  const [slugTouched, setSlugTouched] = useState(!!form.formState.defaultValues?.slug);

  const onTitleEnChange = (v: string) => {
    form.setValue("title_en", v, { shouldDirty: true });
    if (!slugTouched) {
      form.setValue("slug", slugify(v), { shouldDirty: true });
    }
  };

  // Fetch author from profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name =
        profile?.display_name?.trim() ||
        (profile?.email ? profile.email.split("@")[0] : "") ||
        (user.email ? user.email.split("@")[0] : "") ||
        "Bodhi Mitra";
      setAuthorFallback(name);
      if (!form.getValues("author_name")) {
        form.setValue("author_name", name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preview mode — render PostPreview instead
  if (preview) {
    return (
      <Suspense
        fallback={<div className="text-center py-12 text-muted-foreground">Loading preview…</div>}
      >
        <PostPreview
          tab={contentLang}
          onTabChange={setContentLang}
          onBack={() => setPreview(false)}
          title={contentLang === "en" ? form.watch("title_en") : form.watch("title_bn")}
          excerpt={contentLang === "en" ? form.watch("excerpt_en") : form.watch("excerpt_bn")}
          content={contentLang === "en" ? form.watch("content_en") : form.watch("content_bn")}
          category={form.watch("category") as any}
          authorName={form.watch("author_name") || authorFallback}
          authorFallback={authorFallback}
          tags={form.watch("tags")}
          coverImage={form.watch("cover_image")}
        />
      </Suspense>
    );
  }

  const labelCls =
    "block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]";
  const bnStyle = { fontFamily: "var(--font-bn)", letterSpacing: 0 };

  return (
    <FormRenderer form={form} groups={POST_FORM_GROUPS}>
      {/* Preview button */}
      <div className="flex justify-end -mb-4">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="px-4 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
        >
          Preview
        </button>
      </div>

      {/* Content editors — language tabs */}
      <div>
        <div className="flex items-center gap-0.5 border-b border-border/60 mb-4">
          {(["en", "bn"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setContentLang(lang)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                contentLang === lang
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={lang === "bn" ? bnStyle : undefined}
            >
              {lang === "en" ? "English Content" : "বাংলা বিষয়বস্তু"}
            </button>
          ))}
        </div>

        {contentLang === "en" ? (
          <div className="space-y-4">
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
                        <BlockEditor value={ef.value ?? ""} onChange={ef.onChange} />
                      )}
                    />
                  </FormControl>
                  {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="space-y-4">
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
                          <BlockEditor value={ef.value ?? ""} onChange={ef.onChange} />
                        )}
                      />
                    </div>
                  </FormControl>
                  {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                </FormItem>
              )}
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <Suspense
          fallback={
            <div className="h-12 bg-secondary/40 animate-pulse rounded-lg border border-border/60" />
          }
        >
          <TagInput tags={tags || []} onTagsChange={(newTags) => form.setValue("tags", newTags)} />
        </Suspense>
      </div>

      {/* Cover Image via MediaPicker */}
      <div>
        <label className={labelCls}>Featured Image</label>
        {coverImage ? (
          <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-border/60 mb-2">
            <img src={coverImage} alt="Cover" className="w-full h-48 object-cover" />
            <button
              onClick={() => form.setValue("cover_image", "")}
              className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setCoverPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {coverImage ? "Replace" : "Browse Media Library"}
        </button>
      </div>

      <MediaPicker
        open={coverPickerOpen}
        options={{
          title: "Select Featured Image",
          bucket: "blog-images",
          allowedFileTypes: ["image/*"],
        }}
        onSelect={(result) => {
          form.setValue("cover_image", result.url);
          setCoverPickerOpen(false);
        }}
        onClose={() => setCoverPickerOpen(false)}
      />

      {/* Author fallback hint */}
      <p className="text-[0.55rem] text-muted-foreground -mt-4">
        Author defaults to <span className="italic">{authorFallback}</span> if left blank.
      </p>
    </FormRenderer>
  );
}

/* ─── Resource Registration ──────────────────────────────────────── */

const postResource = registerResource<Post, PostFormValues>({
  name: "posts",
  label: "Post",
  labelPlural: "Posts",
  description: "Bilingual journal entries with categories, tags, and featured images",
  icon: FileText,
  columns,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: postSchema as any,
  defaultValues: {
    title_en: "",
    title_bn: "",
    content_en: "",
    content_bn: "",
    excerpt_en: "",
    excerpt_bn: "",
    slug: "",
    cover_image: "",
    category: "Buddhist Psychology",
    author_name: "",
    author_image: "",
    status: "draft",
    tags: [],
    meta_description_en: "",
    meta_description_bn: "",
  },
  FormContent: PostFormContent as any,
  filterField: "status",
  searchField: "title_en",
  defaultSortField: "created_at",
  defaultSortOrder: "desc",
  pageSize: 20,
  filters: [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
  ],
});

/* ─── Route ──────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin/posts")({
  component: AdminPostsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminPostsPage() {
  return <ResourceListPage resource={postResource} />;
}
