import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllPages,
  createPage,
  updatePage,
  deletePage,
  slugifyPage,
  type Page,
  type PageInput,
} from "@/lib/pages";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  Upload,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/pages")({
  component: AdminPagesPage,
});

function AdminPagesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 50;

  const [form, setForm] = useState<PageInput>({
    slug: "", title_en: "", title_bn: "", header_en: "",
    header_bn: "", body_en: "", body_bn: "", banner_url: "",
    meta_description_en: "", meta_description_bn: "",
    visible: true, sort_order: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pages", page],
    queryFn: () => fetchAllPages(page, pageSize),
    staleTime: 30_000,
  });

  const pages = data?.data ?? [];
  const total = data?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: createPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast.success("Page created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PageInput> }) => updatePage(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast.success("Page updated");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast.success("Page deleted");
      setDeletingId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ slug: "", title_en: "", title_bn: "", header_en: "", header_bn: "",
      body_en: "", body_bn: "", banner_url: "", meta_description_en: "",
      meta_description_bn: "", visible: true, sort_order: 0 });
  };

  const handleEdit = (p: Page) => {
    setForm({
      slug: p.slug, title_en: p.title_en, title_bn: p.title_bn,
      header_en: p.header_en, header_bn: p.header_bn,
      body_en: p.body_en, body_bn: p.body_bn,
      banner_url: p.banner_url,
      meta_description_en: p.meta_description_en,
      meta_description_bn: p.meta_description_bn,
      visible: p.visible, sort_order: p.sort_order,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title_en.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) form.slug = slugifyPage(form.title_en);

    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleImageUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `pages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
    });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, banner_url: pub.publicUrl }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Pages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage static pages — {total} total
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Page
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages…"
          className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      {/* Page list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No pages yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
          {pages
            .filter((p) => !search || p.title_en.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${p.visible ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    title={p.visible ? "Visible" : "Hidden"} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.title_en}</p>
                      {!p.visible && <span className="text-[0.5rem] text-muted-foreground italic">(hidden)</span>}
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground">
                      /{p.slug} · {p.title_bn || "—"} · Order {p.sort_order}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(p)}
                    className="p-2 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeletingId(p.id)}
                    className="p-2 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Page form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="min-h-screen flex items-start justify-center p-4 pt-12">
            <div
              className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-border/60">
                <h3 className="text-sm font-semibold">{editingId ? "Edit Page" : "Add New Page"}</h3>
              </div>
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (EN)</label>
                    <Input value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} placeholder="About" />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (BN)</label>
                    <Input value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} placeholder="পরিচিতি" />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Slug</label>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="about" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Header (EN)</label>
                    <Input value={form.header_en} onChange={(e) => setForm((f) => ({ ...f, header_en: e.target.value }))} placeholder="About Us" />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Header (BN)</label>
                    <Input value={form.header_bn} onChange={(e) => setForm((f) => ({ ...f, header_bn: e.target.value }))} placeholder="আমাদের সম্পর্কে" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Body (EN)</label>
                    <Textarea value={form.body_en} onChange={(e) => setForm((f) => ({ ...f, body_en: e.target.value }))} rows={6} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Body (BN)</label>
                    <Textarea value={form.body_bn} onChange={(e) => setForm((f) => ({ ...f, body_bn: e.target.value }))} rows={6} />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Banner Image</label>
                  {form.banner_url ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border/60 mb-2">
                      <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
                      <button onClick={() => setForm((f) => ({ ...f, banner_url: "" }))}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input value={form.banner_url} onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))} placeholder="https://…" />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                        <Upload className="h-3 w-3" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                      </label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Meta Desc (EN)</label>
                    <Textarea value={form.meta_description_en} onChange={(e) => setForm((f) => ({ ...f, meta_description_en: e.target.value }))} rows={2} />
                  </div>
                  <div>
                    <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Meta Desc (BN)</label>
                    <Textarea value={form.meta_description_bn} onChange={(e) => setForm((f) => ({ ...f, meta_description_bn: e.target.value }))} rows={2} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                    <span className="text-[0.6rem] font-medium">Visible on site</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-[0.55rem] font-medium text-muted-foreground uppercase tracking-[0.05em]">Sort Order</label>
                    <input type="number" min={0} value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-16 px-2 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update Page" : "Create Page"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation (AlertDialog) */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deletingId) deleteMutation.mutate(deletingId); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
