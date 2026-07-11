import { createFileRoute } from "@tanstack/react-router";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { slugifyTaxonomy, type Category, type Tag, type CategoryInput, type TagInput } from "@/lib/taxonomy";
import { categorySchema, tagSchema, type CategoryFormValues, type TagFormValues } from "@/lib/schemas";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { FormRenderer } from "@/components/admin/form-engine";
import {
  Tags,
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  X,
} from "lucide-react";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/taxonomy")({
  component: TaxonomyPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function TaxonomyPage() {
  const [activeTab, setActiveTab] = useState("categories");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderTree className="h-5 w-5 text-muted-foreground/60" />
        <div>
          <h2 className="text-lg font-semibold">Taxonomy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage categories and tags for all content types
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/60 px-1 pt-1">
            <TabsList className="flex h-auto bg-transparent gap-0.5">
              <TabsTrigger
                value="categories"
                className="data-[state=active]:bg-foreground/5 data-[state=active]:shadow-none rounded-md px-4 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <FolderTree className="h-3.5 w-3.5" /> Categories
              </TabsTrigger>
              <TabsTrigger
                value="tags"
                className="data-[state=active]:bg-foreground/5 data-[state=active]:shadow-none rounded-md px-4 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <Tags className="h-3.5 w-3.5" /> Tags
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="categories" className="mt-0">
              <CategoryManager />
            </TabsContent>
            <TabsContent value="tags" className="mt-0">
              <TagManager />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/* ─── Category Form Groups ───────────────────────────────────────── */

const CATEGORY_FORM_GROUPS = [
  {
    columns: 2 as const,
    fields: [
      { type: "text" as const, name: "name_en" as const, label: "Name (EN)", placeholder: "Buddhist Psychology" as const },
      { type: "text" as const, name: "name_bn" as const, label: "Name (BN)", placeholder: "বৌদ্ধ মনোবিজ্ঞান" as const },
    ],
  },
  {
    fields: [
      { type: "text" as const, name: "slug" as const, label: "Slug", placeholder: "buddhist-psychology" as const },
    ],
  },
  {
    columns: 2 as const,
    fields: [
      { type: "textarea" as const, name: "description_en" as const, label: "Description (EN)", rows: 2 },
      { type: "textarea" as const, name: "description_bn" as const, label: "Description (BN)", rows: 2 },
    ],
  },
  {
    columns: 3 as any,
    fields: [
      { type: "color" as const, name: "color" as const, label: "Color" },
      { type: "number" as const, name: "sort_order" as const, label: "Sort Order", min: 0 },
      { type: "checkbox" as const, name: "visible" as const, label: "Visible" },
    ],
  },
];

/* ─── Category Manager ─────────────────────────────────────────────── */

const defaultCategoryValues: CategoryFormValues = {
  slug: "",
  name_en: "",
  name_bn: "",
  description_en: "",
  description_bn: "",
  icon: "",
  color: "#d35400",
  sort_order: 0,
  visible: true,
};

function CategoryManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const isFormOpen = showNew || editingId !== null;

  const form = useForm<CategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { ...defaultCategoryValues },
  });

  useUnsavedChanges(isFormOpen && form.formState.isDirty);

  const { query: categoriesQuery, result: categoriesResult } = useList<Category>({
    resource: "categories",
    sorters: [{ field: "sort_order", order: "asc" }],
  });
  const categories = categoriesResult?.data ?? [];
  const isLoading = categoriesQuery?.isLoading ?? false;

  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const isSaving = (createMutation?.isPending || updateMutation?.isPending) ?? false;
  const isDeleting = deleteMutation?.isPending ?? false;

  const resetForm = () => {
    setShowNew(false);
    setEditingId(null);
    form.reset({ ...defaultCategoryValues });
  };

  const openEdit = (cat: Category) => {
    form.reset({
      slug: cat.slug,
      name_en: cat.name_en,
      name_bn: cat.name_bn,
      description_en: cat.description_en,
      description_bn: cat.description_bn,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
      visible: cat.visible,
    });
    setEditingId(cat.id);
  };

  const handleSave = () => {
    form.handleSubmit(
      (values) => {
        if (!values.slug.trim()) values.slug = slugifyTaxonomy(values.name_en);

        const input: CategoryInput = values;

        if (editingId) {
          updateMutate(
            { resource: "categories", id: editingId, values: input },
            {
              onSuccess: () => {
                toast.success("Category updated");
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Update failed"),
            },
          );
        } else {
          createMutate(
            { resource: "categories", values: input },
            {
              onSuccess: () => {
                toast.success("Category created");
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Create failed"),
            },
          );
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
  };

  if (isLoading) {
    return <div className="h-32 bg-secondary/20 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {!isFormOpen && (
        <Button size="sm" onClick={() => { setShowNew(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
        </Button>
      )}

      {isFormOpen && (
        <div className="border border-border/60 rounded-lg p-4 space-y-4 bg-secondary/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{editingId ? "Edit Category" : "New Category"}</p>
            <button onClick={resetForm}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <FormRenderer form={form} groups={CATEGORY_FORM_GROUPS} showValidationSummary={false} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm}
              className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No categories yet.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-border/60 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: cat.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{cat.name_en}</p>
                  <p className="text-[0.55rem] text-muted-foreground">
                    /{cat.slug} · {cat.name_bn || "—"} · {cat.visible ? "Visible" : "Hidden"} · Order {cat.sort_order}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(cat)}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeletingCat(cat)}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDelete
        open={!!deletingCat}
        onConfirm={() => {
          if (!deletingCat) return;
          deleteMutate(
            { resource: "categories", id: deletingCat.id },
            {
              onSuccess: () => { toast.success("Category deleted"); setDeletingCat(null); },
              onError: (e: any) => { toast.error(e?.message ?? "Delete failed"); setDeletingCat(null); },
            },
          );
        }}
        onCancel={() => setDeletingCat(null)}
        isPending={isDeleting}
        title="Delete category"
        description={`Delete "${deletingCat?.name_en}"? This cannot be undone.`}
      />
    </div>
  );
}

/* ─── Tag Form Groups ────────────────────────────────────────────── */

const TAG_FORM_GROUPS = [
  {
    columns: 2 as const,
    fields: [
      { type: "text" as const, name: "name_en" as const, label: "Name (EN)", placeholder: "Mindfulness" as const },
      { type: "text" as const, name: "name_bn" as const, label: "Name (BN)", placeholder: "মাইন্ডফুলনেস" as const },
    ],
  },
  {
    columns: 2 as const,
    fields: [
      { type: "text" as const, name: "slug" as const, label: "Slug", placeholder: "mindfulness" as const },
      { type: "color" as const, name: "color" as const, label: "Color" },
    ],
  },
];

/* ─── Tag Manager ─────────────────────────────────────────────────── */

const defaultTagValues: TagFormValues = {
  slug: "",
  name_en: "",
  name_bn: "",
  color: "#666",
};

function TagManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  const isFormOpen = showNew || editingId !== null;

  const form = useForm<TagFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tagSchema) as any,
    defaultValues: { ...defaultTagValues },
  });

  useUnsavedChanges(isFormOpen && form.formState.isDirty);

  const { query: tagsQuery, result: tagsResult } = useList<Tag>({
    resource: "tags",
    sorters: [{ field: "name_en", order: "asc" }],
  });
  const tags = tagsResult?.data ?? [];
  const isLoading = tagsQuery?.isLoading ?? false;

  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const isSaving = (createMutation?.isPending || updateMutation?.isPending) ?? false;
  const isDeleting = deleteMutation?.isPending ?? false;

  const resetForm = () => {
    setShowNew(false);
    setEditingId(null);
    form.reset({ ...defaultTagValues });
  };

  const handleSave = () => {
    form.handleSubmit(
      (values) => {
        if (!values.slug.trim()) values.slug = slugifyTaxonomy(values.name_en);

        const input: TagInput = values;

        if (editingId) {
          updateMutate(
            { resource: "tags", id: editingId, values: input },
            {
              onSuccess: () => {
                toast.success("Tag updated");
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Update failed"),
            },
          );
        } else {
          createMutate(
            { resource: "tags", values: input },
            {
              onSuccess: () => {
                toast.success("Tag created");
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Create failed"),
            },
          );
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
  };

  if (isLoading) {
    return <div className="h-32 bg-secondary/20 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      {!isFormOpen && (
        <Button size="sm" onClick={() => { setShowNew(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Tag
        </Button>
      )}

      {isFormOpen && (
        <div className="border border-border/60 rounded-lg p-4 space-y-3 bg-secondary/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{editingId ? "Edit Tag" : "New Tag"}</p>
            <button onClick={resetForm}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <FormRenderer form={form} groups={TAG_FORM_GROUPS} showValidationSummary={false} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm}
              className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            return (
              <div
                key={tag.id}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-white dark:bg-zinc-900 hover:border-foreground/30 transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-[0.6rem] font-medium">{tag.name_en}</span>
                <button onClick={() => {
                  form.reset({
                    slug: tag.slug,
                    name_en: tag.name_en,
                    name_bn: tag.name_bn,
                    color: tag.color,
                  });
                  setEditingId(tag.id);
                }}
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <Edit3 className="h-3 w-3" />
                </button>
                <button onClick={() => setDeletingTag(tag)}
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDelete
        open={!!deletingTag}
        onConfirm={() => {
          if (!deletingTag) return;
          deleteMutate(
            { resource: "tags", id: deletingTag.id },
            {
              onSuccess: () => { toast.success("Tag deleted"); setDeletingTag(null); },
              onError: (e: any) => { toast.error(e?.message ?? "Delete failed"); setDeletingTag(null); },
            },
          );
        }}
        onCancel={() => setDeletingTag(null)}
        isPending={isDeleting}
        title="Delete tag"
        description={`Delete "${deletingTag?.name_en}"? This cannot be undone.`}
      />
    </div>
  );
}
