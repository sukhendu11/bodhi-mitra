import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, type DragEvent } from "react";
import { toast } from "sonner";
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
} from "@/lib/navigation";
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

export const Route = createFileRoute("/admin/navigation")({
  component: AdminNavPage,
});

/* ─── Drag state ─────────────────────────────────────────────────── */

interface DragState {
  dragId: string | null;
  overId: string | null;
  position: "before" | "after" | "inside" | null;
}

/* ─── Page component ─────────────────────────────────────────────── */

function AdminNavPage() {
  const queryClient = useQueryClient();
  const [drag, setDrag] = useState<DragState>({ dragId: null, overId: null, position: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const dragNode = useRef<HTMLElement | null>(null);

  // Add form state
  const [newItem, setNewItem] = useState<NavItemInput>({
    type: "internal",
    label_en: "",
    label_bn: "",
    slug: "/",
    url: "",
    visible: true,
  });
  const [addParentId, setAddParentId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["nav-items"],
    queryFn: fetchAllNavItems,
    staleTime: 10_000,
  });

  const tree = buildNavTree(items);

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

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddParentId(null);
    setNewItem({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true });
  };

  /* ── Drag handlers ──────────────────────────────────────────── */

  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    dragNode.current = e.target as HTMLElement;
    setDrag({ dragId: id, overId: null, position: null });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Slight delay so the drag image shows properly
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    dragNode.current = null;
    const { dragId, overId, position } = drag;

    if (dragId && overId && position && dragId !== overId) {
      // Find the dragged item and target item
      const allItems = [...items];
      const dragged = allItems.find((i) => i.id === dragId);
      const target = allItems.find((i) => i.id === overId);
      if (!dragged || !target) { setDrag({ dragId: null, overId: null, position: null }); return; }

      let newParentId: string | null;
      let newSortOrder: number;

      if (position === "inside") {
        // Drop as child of target
        newParentId = overId;
        const siblings = allItems.filter((i) => i.parent_id === overId);
        newSortOrder = siblings.length > 0 ? Math.max(...siblings.map((i) => i.sort_order)) + 1 : 0;
      } else {
        // Drop before or after target (siblings)
        newParentId = target.parent_id;
        const siblings = allItems
          .filter((i) => i.parent_id === target.parent_id && i.id !== dragId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const targetIdx = siblings.findIndex((i) => i.id === overId);
        if (position === "before") {
          newSortOrder = targetIdx >= 0 ? siblings[targetIdx].sort_order : 0;
        } else {
          newSortOrder = targetIdx >= 0 ? siblings[targetIdx].sort_order + 1 : (siblings.length > 0 ? siblings[siblings.length - 1].sort_order + 1 : 0);
        }
      }

      // Update the dragged item
      updateMutation.mutate({
        id: dragId,
        input: { parent_id: newParentId, sort_order: newSortOrder },
      });
    }

    setDrag({ dragId: null, overId: null, position: null });
  }, [drag, items, updateMutation]);

  const handleDragOver = useCallback((e: DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Determine whether to insert before, after, or inside
    const rect = (e.target as HTMLElement).closest("[data-nav-id]")?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const h = rect.height;
    let position: "before" | "after" | "inside";

    if (y < h * 0.25) {
      position = "before";
    } else if (y > h * 0.75) {
      position = "after";
    } else {
      position = "inside";
    }

    setDrag((prev) => {
      if (prev.overId === id && prev.position === position) return prev;
      return { ...prev, overId: id, position };
    });
  }, []);

  const handleAddChild = (parentId: string) => {
    setAddParentId(parentId);
    setNewItem({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true });
    setShowAddForm(true);
  };

  const handleSubmitNew = () => {
    if (!newItem.label_en.trim()) { toast.error("Label is required"); return; }
    if (newItem.type === "internal" && !newItem.slug?.trim()) { toast.error("Path is required for internal links"); return; }
    if (newItem.type === "external" && !newItem.url?.trim()) { toast.error("URL is required for external links"); return; }

    const parentItems = items.filter((i) => i.parent_id === addParentId);
    const nextOrder = parentItems.length > 0 ? Math.max(...parentItems.map((i) => i.sort_order)) + 1 : 0;

    createMutation.mutate({
      ...newItem,
      parent_id: addParentId,
      sort_order: nextOrder,
    });
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
              Drag items to reorder. Drop on a dropdown item to nest, or between items to rearrange.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setAddParentId(null); setNewItem({ type: "internal", label_en: "", label_bn: "", slug: "/", url: "", visible: true }); setShowAddForm(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Add Item
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <Menu className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No navigation items yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/40">
            {tree.map((node) => (
              <NavTreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                drag={drag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                editingId={editingId}
                onStartEdit={setEditingId}
                onSaveEdit={(id, input) => updateMutation.mutate({ id, input })}
                onDelete={setDeletingId}
                onAddChild={handleAddChild}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={resetAddForm}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">
              {addParentId ? "Add child item" : "Add navigation item"}
            </h3>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Type</label>
                <div className="flex items-center gap-2">
                  {(["internal", "external", "dropdown"] as NavItemType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewItem((f) => ({ ...f, type: t, slug: t === "internal" ? (f.slug || "/") : "", url: t === "external" ? (f.url || "https://") : "" }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        newItem.type === t
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "internal" ? "Internal" : t === "external" ? "External" : "Dropdown"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label EN */}
              <div>
                <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Label (English)</label>
                <Input value={newItem.label_en} onChange={(e) => setNewItem((f) => ({ ...f, label_en: e.target.value }))} placeholder="Navigation label" />
              </div>

              {/* Label BN */}
              <div>
                <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Label (বাংলা)</label>
                <Input value={newItem.label_bn} onChange={(e) => setNewItem((f) => ({ ...f, label_bn: e.target.value }))} placeholder="ন্যাভিগেশন লেবেল" />
              </div>

              {/* Internal: slug */}
              {newItem.type === "internal" && (
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">Route path</label>
                  <Input value={newItem.slug} onChange={(e) => setNewItem((f) => ({ ...f, slug: e.target.value }))} placeholder="/books" />
                </div>
              )}

              {/* External: URL */}
              {newItem.type === "external" && (
                <div>
                  <label className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">URL</label>
                  <Input value={newItem.url} onChange={(e) => setNewItem((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com" />
                </div>
              )}

              {/* Visibility */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItem.visible}
                  onChange={(e) => setNewItem((f) => ({ ...f, visible: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
                />
                <span className="text-[0.6rem] font-medium">Visible</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/60">
              <button onClick={resetAddForm} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmitNew}
                disabled={!newItem.label_en.trim() || createMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {createMutation.isPending ? "Adding…" : "Add Item"}
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
  drag: DragState;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragEnd: (e: DragEvent) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  editingId: string | null;
  onStartEdit: (id: string | null) => void;
  onSaveEdit: (id: string, input: Partial<NavItemInput>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function NavTreeNodeItem({
  node,
  depth,
  drag,
  onDragStart,
  onDragEnd,
  onDragOver,
  editingId,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onAddChild,
}: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [editLabel, setEditLabel] = useState(node.label_en);
  const [editLabelBn, setEditLabelBn] = useState(node.label_bn);
  const [editSlug, setEditSlug] = useState(node.slug);
  const [editUrl, setEditUrl] = useState(node.url);
  const isEditing = editingId === node.id;
  const isBeingDragged = drag.dragId === node.id;
  const isDropTarget = drag.overId === node.id && drag.dragId !== node.id;

  const typeIcon = node.type === "dropdown" ? ChevronRight : node.type === "external" ? ExternalLink : Link2;

  const canAcceptChildren = node.type === "dropdown";

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
    <div>
      <div
        data-nav-id={node.id}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, node.id)}
        className={`group flex items-center gap-2 px-4 py-3 transition-colors cursor-default select-none
          ${isBeingDragged ? "" : ""}
          ${isDropTarget && drag.position === "inside" && canAcceptChildren ? "bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-400/40 ring-inset" : ""}
          ${isDropTarget && drag.position === "before" ? "border-t-2 border-foreground/50" : ""}
          ${isDropTarget && drag.position === "after" ? "border-b-2 border-foreground/50" : ""}
          ${!isBeingDragged ? "hover:bg-secondary/20" : ""}
        `}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        {/* Drag handle */}
        <span className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </span>

        {/* Expand/collapse for dropdowns */}
        {node.children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        {node.children.length === 0 && <span className="w-3.5 shrink-0" />}

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

      {/* Children (if expanded) */}
      {expanded && node.children.length > 0 && (
        <div className="divide-y divide-border/30">
          {node.children.map((child) => (
            <NavTreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              drag={drag}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              editingId={editingId}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
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
