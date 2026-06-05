import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import {
  fetchAllPages,
  createPage,
  updatePage,
  deletePage,
  slugifyPage,
  getEmptySection,
  type Page,
  type PageInput,
  type PageSection,
  type SectionType,
} from "@/lib/pages";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Upload,
  XCircle,
  GripVertical,
  Type,
  ImageIcon,
  Quote,
  Video,
  MousePointerClick,
  Layout,
} from "lucide-react";
import { pageSchema, type PageFormValues } from "@/lib/schemas";
import { DataTable, StatusBadge, DateCell } from "@/components/admin/data-table";

export const Route = createFileRoute("/admin/pages")({
  component: AdminPagesPage,
});

/* ─── Section Type Config ─────────────────────────────────────────── */

const SECTION_CONFIG: Record<SectionType, { label: string; icon: typeof Type; fields: { key: string; label: string; type: "text" | "textarea" | "url" }[] }> = {
  hero: {
    label: "Hero",
    icon: Layout,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "button_text", label: "Button Text", type: "text" },
      { key: "button_url", label: "Button URL", type: "url" },
    ],
  },
  text: {
    label: "Text",
    icon: Type,
    fields: [{ key: "body", label: "Body Content", type: "textarea" }],
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    fields: [
      { key: "src", label: "Image URL", type: "url" },
      { key: "alt", label: "Alt Text", type: "text" },
      { key: "caption", label: "Caption", type: "text" },
    ],
  },
  quote: {
    label: "Quote",
    icon: Quote,
    fields: [
      { key: "text", label: "Quote Text", type: "textarea" },
      { key: "attribution", label: "Attribution", type: "text" },
    ],
  },
  video: {
    label: "Video",
    icon: Video,
    fields: [
      { key: "url", label: "Video URL (YouTube)", type: "url" },
      { key: "caption", label: "Caption", type: "text" },
    ],
  },
  cta: {
    label: "CTA",
    icon: MousePointerClick,
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "button_text", label: "Button Text", type: "text" },
      { key: "button_url", label: "Button URL", type: "url" },
    ],
  },
};

/* ─── Admin Pages ─────────────────────────────────────────────────── */

function AdminPagesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "sections">("content");
  const pageSize = 50;

  const form = useForm<PageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageSchema) as any,
    defaultValues: {
      slug: "", title_en: "", title_bn: "", header_en: "",
      header_bn: "", body_en: "", body_bn: "", banner_url: "",
      meta_description_en: "", meta_description_bn: "",
      visible: true, sort_order: 0,
    },
  });
  const [sections, setSections] = useState<PageSection[]>([]);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pages", page],
    queryFn: () => fetchAllPages(page, pageSize),
    staleTime: 30_000,
  });

  const pages = data?.data ?? [];
  const total = data?.total ?? 0;

  const columnHelper = createColumnHelper<Page>();

  const pageColumns = useMemo(
    () => [
      columnHelper.accessor("title_en", {
        header: "Title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${row.original.visible ? "bg-green-500" : "bg-muted-foreground/30"}`} />
              <span className="text-sm font-medium truncate">{row.original.title_en}</span>
              {!row.original.visible && <span className="text-[0.5rem] text-muted-foreground italic">(hidden)</span>}
            </div>
            <p className="text-[0.6rem] text-muted-foreground mt-0.5">
              /{row.original.slug} · {row.original.title_bn || "—"}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("title_bn", {
        header: "Bangla",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("sort_order", {
        header: "Order",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
      }),
      columnHelper.accessor("sections", {
        header: "Sections",
        enableSorting: false,
        cell: ({ getValue }) => {
          const secs = getValue();
          if (!secs || secs.length === 0) return <span className="text-muted-foreground/50">—</span>;
          return (
            <span className="text-[0.5rem] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded-full">
              {secs.length} section{secs.length > 1 ? "s" : ""}
            </span>
          );
        },
      }),
      columnHelper.accessor("visible", {
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => (
          getValue() ? <StatusBadge status="published" /> : <StatusBadge status="draft" />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setDeletingId(row.original.id)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      }),
    ],
    [],
  );

  const createMutation = useMutation({
    mutationFn: (input: PageInput) => createPage({ ...input, sections }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast.success("Page created");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PageInput> }) =>
      updatePage(id, { ...input, sections }),
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
    setActiveTab("content");
    form.reset({
      slug: "", title_en: "", title_bn: "", header_en: "",
      header_bn: "", body_en: "", body_bn: "", banner_url: "",
      meta_description_en: "", meta_description_bn: "",
      visible: true, sort_order: 0,
    });
    setSections([]);
  };

  const handleEdit = (p: Page) => {
    form.reset({
      slug: p.slug, title_en: p.title_en, title_bn: p.title_bn,
      header_en: p.header_en, header_bn: p.header_bn,
      body_en: p.body_en, body_bn: p.body_bn,
      banner_url: p.banner_url,
      meta_description_en: p.meta_description_en,
      meta_description_bn: p.meta_description_bn,
      visible: p.visible, sort_order: p.sort_order,
    });
    setSections(p.sections ?? []);
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    form.handleSubmit(
      (values) => {
        if (!values.slug.trim()) values.slug = slugifyPage(values.title_en);

        const sortedSections = sections
          .map((s, i) => ({ ...s, sort_order: i }))
          .map(({ id, type, sort_order, content_en, content_bn }) => ({
            id, type, sort_order, content_en, content_bn,
          }));

        if (editingId) {
          updateMutation.mutate({ id: editingId, input: { ...values, sections: sortedSections } });
        } else {
          createMutation.mutate({ ...values, sections: sortedSections });
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
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
    form.setValue("banner_url", pub.publicUrl);
  };

  /* ── Section drag handler ─────────────────────────────────────── */

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [],
  );

  const addSection = (type: SectionType) => {
    const newSection = getEmptySection(type);
    newSection.sort_order = sections.length;
    setSections((prev) => [...prev, newSection]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSectionContent = (id: string, locale: "content_en" | "content_bn", key: string, value: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [locale]: { ...s[locale], [key]: value } } : s,
      ),
    );
  };

  /* ── Section type picker state ─────────────────────────────────── */

  const [showSectionPicker, setShowSectionPicker] = useState(false);

  const bannerUrl = form.watch("banner_url");
  const visible = form.watch("visible");

  /* ── Render ───────────────────────────────────────────────────── */

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

      {/* Search — handled by DataTable's built-in global search */}

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
        <DataTable
          columns={pageColumns}
          data={search ? pages.filter((p) => p.title_en.toLowerCase().includes(search.toLowerCase())) : pages}
          searchPlaceholder="Search pages…"
          pageSize={50}
        />
      )}

      {/* Page form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="min-h-screen flex items-start justify-center p-4 pt-12">
            <div
              className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tabs */}
              <div className="flex border-b border-border/60">
                <button
                  onClick={() => setActiveTab("content")}
                  className={`px-6 py-3 text-xs font-medium transition-colors border-b-2 ${
                    activeTab === "content"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setActiveTab("sections")}
                  className={`px-6 py-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === "sections"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layout className="h-3 w-3" />
                  Sections
                  {sections.length > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-foreground/10 text-[0.5rem] font-semibold flex items-center justify-center">
                      {sections.length}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === "content" ? (
                <>
                  <div className="px-6 py-5 border-b border-border/60">
                    <h3 className="text-sm font-semibold">{editingId ? "Edit Page" : "Add New Page"}</h3>
                  </div>
                  <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                      <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="title_en" render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (EN)</FormLabel>
                              <FormControl><Input {...field} placeholder="About" /></FormControl>
                              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="title_bn" render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Title (BN)</FormLabel>
                              <FormControl><Input {...field} placeholder="পরিচিতি" /></FormControl>
                              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="slug" render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Slug</FormLabel>
                            <FormControl><Input {...field} placeholder="about" /></FormControl>
                            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="header_en" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Header (EN)</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="About Us" /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="header_bn" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Header (BN)</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ""} placeholder="আমাদের সম্পর্কে" /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="body_en" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Body (EN)</FormLabel>
                              <FormControl><Textarea {...field} value={field.value ?? ""} rows={6} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="body_bn" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Body (BN)</FormLabel>
                              <FormControl><Textarea {...field} value={field.value ?? ""} rows={6} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div>
                          <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Banner Image</label>
                          {bannerUrl ? (
                            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border/60 mb-2">
                              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                              <button onClick={() => form.setValue("banner_url", "")}
                                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Input value={bannerUrl} onChange={(e) => form.setValue("banner_url", e.target.value)} placeholder="https://…" />
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors">
                                <Upload className="h-3 w-3" /> Upload
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="meta_description_en" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Meta Desc (EN)</FormLabel>
                              <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="meta_description_bn" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Meta Desc (BN)</FormLabel>
                              <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={visible} onChange={(e) => form.setValue("visible", e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30" />
                            <span className="text-[0.6rem] font-medium">Visible on site</span>
                          </label>
                          <FormField control={form.control} name="sort_order" render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <label className="text-[0.55rem] font-medium text-muted-foreground uppercase tracking-[0.05em]">Sort Order</label>
                              <input type="number" min={0} value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40" />
                            </div>
                          )} />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
                        <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                        <Button size="sm" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update Page" : "Create Page"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </>
              ) : (
                <>
                  <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Page Sections</h3>
                    <button
                      onClick={() => setShowSectionPicker(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.55rem] font-medium border border-border/60 rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Section
                    </button>
                  </div>

                  <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                    {sections.length === 0 ? (
                      <div className="text-center py-12">
                        <Layout className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">No sections yet. Add a section to build your page layout.</p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={sections.map((s) => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {sections.map((section, index) => (
                              <SortableSectionCard
                                key={section.id}
                                section={section}
                                index={index}
                                onRemove={removeSection}
                                onUpdateContent={updateSectionContent}
                                total={sections.length}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
                    <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    <Button size="sm" type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingId ? "Update Page" : "Create Page"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section type picker modal */}
      {showSectionPicker && (
        <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowSectionPicker(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">Add Section</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(SECTION_CONFIG) as [SectionType, typeof SECTION_CONFIG[SectionType]][]).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => { addSection(type); setShowSectionPicker(false); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:border-foreground/30 hover:bg-secondary/20 transition-all group"
                  >
                    <Icon className="h-6 w-6 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors" />
                    <span className="text-xs font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSectionPicker(false)} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
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

/* ─── Sortable Section Card ────────────────────────────────────────── */

function SortableSectionCard({
  section,
  index,
  onRemove,
  onUpdateContent,
  total,
}: {
  section: PageSection;
  index: number;
  onRemove: (id: string) => void;
  onUpdateContent: (id: string, locale: "content_en" | "content_bn", key: string, value: string) => void;
  total: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto" as any,
  };

  const config = SECTION_CONFIG[section.type];
  const Icon = config.icon;

  const [lang, setLang] = useState<"en" | "bn">("en");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-zinc-800/50 rounded-xl border ${
        isDragging ? "border-foreground/40 shadow-lg ring-2 ring-foreground/10" : "border-border/60"
      } overflow-hidden transition-shadow`}
    >
      {/* Card header (drag handle + type + remove) */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/20 border-b border-border/40">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-xs font-medium">{config.label}</span>
        <span className="text-[0.5rem] text-muted-foreground/50">· Section {index + 1} of {total}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "bn" : "en")}
            className={`text-[0.5rem] font-medium px-2 py-0.5 rounded-full border transition-colors ${
              lang === "en"
                ? "border-foreground/30 text-foreground bg-foreground/5"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "en" ? "EN" : "বাংলা"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(section.id)}
            className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove section"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card body — dynamic fields */}
      <div className="px-4 py-3 space-y-3">
        {config.fields.map((field) => {
          const content = section[lang === "en" ? "content_en" : "content_bn"];
          const value = content[field.key] ?? "";
          const locale = lang === "en" ? "content_en" : "content_bn";

          if (field.type === "textarea") {
            return (
              <div key={field.key}>
                <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                  {field.label} ({lang === "en" ? "EN" : "BN"})
                </label>
                <textarea
                  value={value}
                  onChange={(e) => onUpdateContent(section.id, locale, field.key, e.target.value)}
                  rows={3}
                  className="w-full text-xs border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-foreground/40 transition-colors resize-y"
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                  style={lang === "bn" ? { fontFamily: "var(--font-bn)" } : undefined}
                />
              </div>
            );
          }

          return (
            <div key={field.key}>
              <label className="block text-[0.5rem] font-medium text-muted-foreground mb-1 uppercase tracking-[0.05em]">
                {field.label} ({lang === "en" ? "EN" : "BN"})
              </label>
              <input
                type={field.type === "url" ? "url" : "text"}
                value={value}
                onChange={(e) => onUpdateContent(section.id, locale, field.key, e.target.value)}
                className="w-full text-xs border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-foreground/40 transition-colors"
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                style={lang === "bn" ? { fontFamily: "var(--font-bn)" } : undefined}
              />
              {field.key === "src" && value && (
                <img
                  src={value}
                  alt="Preview"
                  className="mt-2 w-full h-24 object-cover rounded-lg border border-border/40"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
