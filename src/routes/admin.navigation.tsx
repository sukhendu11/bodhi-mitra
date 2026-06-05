import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchAllNavItems,
  createNavItem,
  updateNavItem,
  deleteNavItem,
  buildNavTree,
  clearNavCache,
  type NavItem,
  type NavItemInput,
  type NavItemType,
  type NavTreeNode,
  type NavLocation,
} from "@/lib/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  Menu,
  Plus,
  PlusCircle,
  ExternalLink,
  Link2,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { navItemSchema, type NavItemFormValues } from "@/lib/schemas";

export const Route = createFileRoute("/admin/navigation")({
  component: AdminNavPage,
});

/* ─── Page component ─────────────────────────────────────────────── */

function AdminNavPage() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<NavLocation>("header");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // For tracking expanded state per node
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Add form state
  const addForm = useForm<NavItemFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(navItemSchema) as any,
    defaultValues: {
      type: "internal",
      label_en: "",
      label_bn: "",
      slug: "/",
      url: "",
      visible: true,
      location: "header",
    },
  });
  const [addParentId, setAddParentId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["nav-items", location],
    queryFn: () => fetchAllNavItems(location),
    staleTime: 10_000,
  });

  const tree = buildNavTree(items);

  // Auto-expand all dropdown nodes when data loads
  useEffect(() => {
    const collectDropdownIds = (nodes: NavTreeNode[]): string[] => {
      const ids: string[] = [];
      for (const n of nodes) {
        if (n.children.length > 0) {
          ids.push(n.id);
          ids.push(...collectDropdownIds(n.children));
        }
      }
      return ids;
    };
    setExpandedIds(new Set(collectDropdownIds(tree)));
  }, [items.length]);

  const invalidateNav = () => {
    queryClient.invalidateQueries({ queryKey: ["nav-items"] });
    queryClient.invalidateQueries({ queryKey: ["layout-nav"] });
    clearNavCache();
  };

  const createMutation = useMutation({
    mutationFn: createNavItem,
    onSuccess: () => {
      invalidateNav();
      toast.success("Item created");
      resetAddForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NavItemInput> }) => updateNavItem(id, input),
    onSuccess: () => {
      invalidateNav();
      toast.success("Item updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNavItem,
    onSuccess: () => {
      invalidateNav();
      toast.success("Item deleted");
      setDeletingId(null);
    },
    onError: (e: Error) => { toast.error(e.message); setDeletingId(null); },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number; parent_id: string | null }[]) => {
      for (const u of updates) {
        await updateNavItem(u.id, { sort_order: u.sort_order, parent_id: u.parent_id });
      }
    },
    onSuccess: () => {
      invalidateNav();
      toast.success("Order updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddParentId(null);
    addForm.reset({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true, location });
  };

  /* ── dnd-kit handlers ─────────────────────────────────────────── */

  const [activeId, setActiveId] = useState<string | null>(null);
  const [nestTargetId, setNestTargetId] = useState<string | null>(null);
  const [showNestPicker, setShowNestPicker] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Reorder siblings at the same level using arrayMove
      const flatItems = [...items];
      const dragged = flatItems.find((i) => i.id === active.id);
      const target = flatItems.find((i) => i.id === over.id);
      if (!dragged || !target) return;

      // If same parent, just reorder
      if (dragged.parent_id === target.parent_id) {
        const siblings = flatItems
          .filter((i) => i.parent_id === dragged.parent_id)
          .sort((a, b) => a.sort_order - b.sort_order);

        const oldIndex = siblings.findIndex((i) => i.id === active.id);
        const newIndex = siblings.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(siblings, oldIndex, newIndex);
        const updates = reordered.map((item, idx) => ({
          id: item.id,
          sort_order: idx,
          parent_id: item.parent_id,
        }));
        batchUpdateMutation.mutate(updates);
      }
    },
    [items, batchUpdateMutation],
  );

  const handleExpandToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddChild = (parentId: string) => {
    setAddParentId(parentId);
    addForm.reset({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true, location });
    setShowAddForm(true);
  };

  const handleSubmitNew = () => {
    addForm.handleSubmit(
      (values) => {
        const parentItems = items.filter((i) => i.parent_id === addParentId);
        const nextOrder = parentItems.length > 0 ? Math.max(...parentItems.map((i) => i.sort_order)) + 1 : 0;

        createMutation.mutate({
          type: values.type,
          label_en: values.label_en,
          label_bn: values.label_bn || "",
          slug: values.type === "internal" ? values.slug || "/" : "",
          url: values.type === "external" ? values.url || "" : "",
          visible: values.visible,
          location,
          parent_id: addParentId,
          sort_order: nextOrder,
        });
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => e?.message);
        toast.error(firstMsg?.message || "Please fix the form errors");
      },
    )();
  };

  const handleLocationChange = (loc: NavLocation) => {
    setLocation(loc);
    resetAddForm();
  };

  /* ── Cross-level nesting handlers ───────────────────────────── */

  const handleMoveToRoot = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const rootItems = items.filter((i) => i.parent_id === null);
      const nextOrder = rootItems.length > 0 ? Math.max(...rootItems.map((i) => i.sort_order)) + 1 : 0;
      updateMutation.mutate({ id, input: { parent_id: null, sort_order: nextOrder } });
    },
    [items, updateMutation],
  );

  const handleNestUnder = useCallback((id: string) => {
    setNestTargetId(id);
    setShowNestPicker(true);
  }, []);

  const handleConfirmNest = useCallback(
    (targetId: string, newParentId: string) => {
      const siblings = items.filter((i) => i.parent_id === newParentId);
      const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((i) => i.sort_order)) + 1 : 0;
      updateMutation.mutate({ id: targetId, input: { parent_id: newParentId, sort_order: nextOrder } });
      setShowNestPicker(false);
      setNestTargetId(null);
    },
    [items, updateMutation],
  );

  const dropdownItems = items
    .filter((i) => i.type === "dropdown")
    .map((i) => ({ id: i.id, label: i.label_en }));

  const itemIsRootLevel = (nodeId: string) => {
    const item = items.find((i) => i.id === nodeId);
    return !item?.parent_id;
  };

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Navigation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag items to reorder. Manage header and footer menus separately.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setAddParentId(null); addForm.reset({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true, location }); setShowAddForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Item
        </button>
      </div>

      {/* Location tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 w-fit">
        {(["header", "footer"] as NavLocation[]).map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocationChange(loc)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              location === loc
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {loc === "header" ? "Header Menu" : "Footer Menu"}
          </button>
        ))}
      </div>

      {/* Loading / Empty / Tree */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Menu className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No {location} menu items yet.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-border/40">
                {tree.map((node) => (
                  <NavTreeNodeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    editingId={editingId}
                    expandedIds={expandedIds}
                    isActive={activeId === node.id}
                    onStartEdit={setEditingId}
                    onSaveEdit={(id, input) => updateMutation.mutate({ id, input })}
                    onDelete={setDeletingId}
                    onAddChild={handleAddChild}
                    onExpandToggle={handleExpandToggle}
                    onMoveToRoot={handleMoveToRoot}
                    onNestUnder={handleNestUnder}
                    isRootLevel={itemIsRootLevel(node.id)}
                    allDropdownItems={dropdownItems}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={resetAddForm}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">
              {addParentId ? "Add child item" : `Add ${location} menu item`}
            </h3>

            <Form {...addForm}>
              <div className="space-y-4">
                {/* Type */}
                <FormField control={addForm.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Type</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        {(["internal", "external", "dropdown"] as NavItemType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              field.onChange(t);
                              if (t === "internal") addForm.setValue("slug", "/");
                              if (t === "external") addForm.setValue("url", "https://");
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              field.value === t
                                ? "bg-foreground text-background border-foreground"
                                : "border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t === "internal" ? "Internal" : t === "external" ? "External" : "Dropdown"}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-[0.65rem]" />
                  </FormItem>
                )} />

                {/* Label EN */}
                <FormField control={addForm.control} name="label_en" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Label (English)</FormLabel>
                    <FormControl><Input {...field} placeholder="Navigation label" /></FormControl>
                    {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                  </FormItem>
                )} />

                {/* Label BN */}
                <FormField control={addForm.control} name="label_bn" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Label (বাংলা)</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="ন্যাভিগেশন লেবেল" /></FormControl>
                  </FormItem>
                )} />

                {/* Conditional: slug for internal OR url for external */}
                {addForm.watch("type") === "internal" && (
                  <FormField control={addForm.control} name="slug" render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Route path</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="/books" /></FormControl>
                      {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                    </FormItem>
                  )} />
                )}

                {addForm.watch("type") === "external" && (
                  <FormField control={addForm.control} name="url" render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">URL</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://example.com" /></FormControl>
                      {fieldState.error && <FormMessage className="text-[0.65rem]" />}
                    </FormItem>
                  )} />
                )}

                {/* Visibility */}
                <FormField control={addForm.control} name="visible" render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
                      />
                      <span className="text-[0.6rem] font-medium">Visible</span>
                    </label>
                  </FormItem>
                )} />
              </div>
            </Form>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/60">
              <button type="button" onClick={resetAddForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitNew}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {createMutation.isPending ? "Adding…" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nest picker modal */}
      {showNestPicker && nestTargetId && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => { setShowNestPicker(false); setNestTargetId(null); }}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Nest under dropdown</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select a dropdown item to move this item under:
            </p>
            {dropdownItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No dropdown items available.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {dropdownItems.filter((d) => d.id !== nestTargetId).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleConfirmNest(nestTargetId, d.id)}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary/60 transition-colors border border-border/40 hover:border-border"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => { setShowNestPicker(false); setNestTargetId(null); }}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setDeletingId(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete navigation item</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure? This will also delete all nested children. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId!)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tree node item ─────────────────────────────────────────────── */

interface TreeNodeItemProps {
  node: NavTreeNode;
  depth: number;
  editingId: string | null;
  expandedIds: Set<string>;
  isActive: boolean;
  onStartEdit: (id: string | null) => void;
  onSaveEdit: (id: string, input: Partial<NavItemInput>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onExpandToggle: (id: string) => void;
  onMoveToRoot?: (id: string) => void;
  onNestUnder?: (id: string) => void;
  isRootLevel?: boolean;
  allDropdownItems?: { id: string; label: string }[];
}

function NavTreeNodeItem({
  node,
  depth,
  editingId,
  expandedIds,
  isActive,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onAddChild,
  onExpandToggle,
  onMoveToRoot,
  onNestUnder,
  isRootLevel,
  allDropdownItems,
}: TreeNodeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editLabel, setEditLabel] = useState(node.label_en);
  const [editLabelBn, setEditLabelBn] = useState(node.label_bn);
  const [editSlug, setEditSlug] = useState(node.slug);
  const [editUrl, setEditUrl] = useState(node.url);
  const isEditing = editingId === node.id;
  const expanded = expandedIds.has(node.id);
  const canAcceptChildren = node.type === "dropdown";

  const hasChildren = node.children.length > 0;

  const handleStartEdit = () => {
    setEditLabel(node.label_en);
    setEditLabelBn(node.label_bn);
    setEditSlug(node.slug);
    setEditUrl(node.url);
    onStartEdit(node.id);
  };

  const handleSave = () => {
    if (!editLabel.trim()) return;
    const patch: Partial<NavItemInput> = { label_en: editLabel, label_bn: editLabelBn };
    if (node.type === "internal") patch.slug = editSlug;
    if (node.type === "external") patch.url = editUrl;
    onSaveEdit(node.id, patch);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group flex items-center gap-2 px-4 py-3 transition-colors select-none
          ${isActive ? "bg-secondary/30" : ""}
          ${!isDragging && !isActive ? "hover:bg-secondary/20" : ""}
        `}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        {/* Expand/collapse for dropdowns */}
        {hasChildren && (
          <button onClick={() => onExpandToggle(node.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        {!hasChildren && <span className="w-3.5 shrink-0" />}

        {/* Type icon */}
        <span className="shrink-0 text-muted-foreground/40">
          <TypeIcon type={node.type} />
        </span>

        {/* Label + metadata */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 text-xs px-2 py-0"
                  placeholder="Label (EN)"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onStartEdit(null); }}
                />
                <Input
                  value={editLabelBn}
                  onChange={(e) => setEditLabelBn(e.target.value)}
                  className="h-7 text-xs px-2 py-0 w-32"
                  placeholder="Label (BN)"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onStartEdit(null); }}
                />
                <button onClick={handleSave} className="px-2 py-1 text-[0.55rem] font-medium bg-foreground text-background rounded hover:opacity-90 transition-opacity">
                  Save
                </button>
                <button onClick={() => onStartEdit(null)} className="px-2 py-1 text-[0.55rem] font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2">
                {node.type === "internal" && (
                  <Input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="h-7 text-xs px-2 py-0 w-48"
                    placeholder="/route-path"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onStartEdit(null); }}
                  />
                )}
                {node.type === "external" && (
                  <Input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="h-7 text-xs px-2 py-0 w-64"
                    placeholder="https://example.com"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onStartEdit(null); }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{node.label_en}</span>
              {node.label_bn && (
                <span className="text-[0.55rem] text-muted-foreground/60 truncate hidden sm:inline">{node.label_bn}</span>
              )}
              {node.location === "footer" && (
                <span className="text-[0.5rem] uppercase tracking-wider text-muted-foreground/40 px-1.5 py-0.5 rounded-full border border-border/40">
                  Footer
                </span>
              )}
              {!node.visible && (
                <span className="text-[0.5rem] uppercase tracking-wider text-muted-foreground/40 px-1.5 py-0.5 rounded-full border border-border/40">
                  Hidden
                </span>
              )}
            </div>
          )}
        </div>

        {/* URL / slug hint */}
        {!isEditing && (
          <span className="hidden md:inline text-[0.55rem] text-muted-foreground/40 font-mono truncate max-w-[120px]">
            {node.type === "external" ? node.url : node.type === "dropdown" ? "▾ dropdown" : node.slug}
          </span>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canAcceptChildren && (
              <button
                onClick={() => onAddChild(node.id)}
                className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Add child item"
              >
                <PlusCircle className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Move to root — only for nested items */}
            {!isRootLevel && onMoveToRoot && (
              <button
                onClick={() => onMoveToRoot(node.id)}
                className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Move to root level"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
            {/* Nest under dropdown — only for root-level non-dropdown items */}
            {isRootLevel && node.type !== "dropdown" && onNestUnder && allDropdownItems && allDropdownItems.length > 0 && (
              <button
                onClick={() => onNestUnder(node.id)}
                className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Nest under a dropdown"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </button>
            )}
            <button
              onClick={handleStartEdit}
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Edit"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="divide-y divide-border/30">
          {node.children.map((child) => (
            <NavTreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              editingId={editingId}
              expandedIds={expandedIds}
              isActive={false}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onExpandToggle={onExpandToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: NavItemType }) {
  const cls = "h-3 w-3";
  if (type === "internal") return <Link2 className={cls} />;
  if (type === "external") return <ExternalLink className={cls} />;
  return <Menu className={cls} />;
}
