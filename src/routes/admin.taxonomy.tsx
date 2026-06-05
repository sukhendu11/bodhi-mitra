import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllCategories,
  fetchAllTags,
  createCategory,
  updateCategory,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
  slugifyTaxonomy,
  type Category,
  type CategoryInput,
  type Tag,
  type TagInput,
} from "@/lib/taxonomy";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tags,
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin/taxonomy")({
  component: TaxonomyPage,
});

function TaxonomyPage() {
  const queryClient = useQueryClient();
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

/* ─── Category Manager ─────────────────────────────────────────────── */

function CategoryManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<CategoryInput>({
    slug: "", name_en: "", name_bn: "", description_en: "",
    description_bn: "", icon: "", color: "#d35400", sort_order: 0, visible: true,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAllCategories,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) => updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowNew(false);
    setForm({ slug: "", name_en: "", name_bn: "", description_en: "", description_bn: "", icon: "", color: "#d35400", sort_order: 0, visible: true });
  };

  const handleEdit = (cat: Category) => {
    setForm({
      slug: cat.slug, name_en: cat.name_en, name_bn: cat.name_bn,
      description_en: cat.description_en, description_bn: cat.description_bn,
      icon: cat.icon, color: cat.color, sort_order: cat.sort_order, visible: cat.visible,
    });
    setEditingId(cat.id);
  };

  const handleSave = () => {
    if (!form.name_en.trim()) { toast.error("Name is required"); return; }
    if (!form.slug.trim()) form.slug = slugifyTaxonomy(form.name_en);

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="h-32 bg-secondary/20 animate-pulse rounded-lg" />;
  }

  const cats = categories ?? [];

  return (
    <div className="space-y-4">
      {/* New category button */}
      {!showNew && !editingId && (
        <Button size="sm" onClick={() => { resetForm(); setShowNew(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
        </Button>
      )}

      {/* Form */}
      {(showNew || editingId) && (
        <div className="border border-border/60 rounded-lg p-4 space-y-4 bg-secondary/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{editingId ? "Edit Category" : "New Category"}</p>
            <button onClick={() => { setEditingId(null); setShowNew(false); }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Name (EN)</label>
              <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Buddhist Psychology" />
            </div>
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Name (BN)</label>
              <Input value={form.name_bn} onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))} placeholder="বৌদ্ধ মনোবিজ্ঞান" />
            </div>
          </div>

          <div>
            <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Slug</label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="buddhist-psychology" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Description (EN)</label>
              <Textarea value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Description (BN)</label>
              <Textarea value={form.description_bn} onChange={(e) => setForm((f) => ({ ...f, description_bn: e.target.value }))} rows={2} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border/60 cursor-pointer bg-background" />
            </div>
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Sort Order</label>
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                <span className="text-[0.6rem] font-medium">Visible</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => { setEditingId(null); setShowNew(false); }}
              className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <Button size="sm" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {/* Category list */}
      {cats.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No categories yet.</p>
      ) : (
        <div className="space-y-2">
          {cats.map((cat) => {
            const isEditing = editingId === cat.id;
            return (
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
                  <button onClick={() => handleEdit(cat)}
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${cat.name_en}"?`)) deleteMutation.mutate(cat.id); }}
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Tag Manager ─────────────────────────────────────────────────── */

function TagManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<TagInput>({
    slug: "", name_en: "", name_bn: "", color: "#666",
  });

  const { data: tags, isLoading } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: fetchAllTags,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Tag created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TagInput> }) => updateTag(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Tag updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Tag deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowNew(false);
    setForm({ slug: "", name_en: "", name_bn: "", color: "#666" });
  };

  const handleSave = () => {
    if (!form.name_en.trim()) { toast.error("Name is required"); return; }
    if (!form.slug.trim()) form.slug = slugifyTaxonomy(form.name_en);

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="h-32 bg-secondary/20 animate-pulse rounded-lg" />;
  }

  const tagList = tags ?? [];

  return (
    <div className="space-y-4">
      {/* New tag quick-add */}
      {!showNew && !editingId && (
        <Button size="sm" onClick={() => { resetForm(); setShowNew(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Tag
        </Button>
      )}

      {/* Form */}
      {(showNew || editingId) && (
        <div className="border border-border/60 rounded-lg p-4 space-y-3 bg-secondary/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{editingId ? "Edit Tag" : "New Tag"}</p>
            <button onClick={() => { setEditingId(null); setShowNew(false); }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Name (EN)</label>
              <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Mindfulness" />
            </div>
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Name (BN)</label>
              <Input value={form.name_bn} onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))} placeholder="মাইন্ডফুলনেস" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="mindfulness" />
            </div>
            <div>
              <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1 uppercase">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border/60 cursor-pointer bg-background" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => { setEditingId(null); setShowNew(false); }}
              className="px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <Button size="sm" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {/* Tag list */}
      {tagList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tagList.map((tag) => {
            const isEditing = editingId === tag.id;
            if (isEditing) return null; // handled above
            return (
              <div
                key={tag.id}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-white dark:bg-zinc-900 hover:border-foreground/30 transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-[0.6rem] font-medium">{tag.name_en}</span>
                <button onClick={() => {
                  setForm({ slug: tag.slug, name_en: tag.name_en, name_bn: tag.name_bn, color: tag.color });
                  setEditingId(tag.id);
                }}
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <Edit3 className="h-3 w-3" />
                </button>
                <button onClick={() => { if (confirm(`Delete "${tag.name_en}"?`)) deleteMutation.mutate(tag.id); }}
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
