import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTable, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit3, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";
import { FormDrawer } from "@/components/admin/form-drawer";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { StatCard } from "@/components/admin/stat-card";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { ResourceDefinition } from "./types";

/* ─── Props ──────────────────────────────────────────────────────── */

interface ResourceListPageProps<TData extends { id: string }> {
  resource: ResourceDefinition<TData, any>;
}

/* ─── Generic Resource List Page ─────────────────────────────────── */

export function ResourceListPage<TData extends { id: string }>({
  resource: def,
}: ResourceListPageProps<TData>) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const mode: "create" | "edit" = editingId ? "edit" : "create";
  const labelLower = def.label.toLowerCase();
  const emptyLabel = (def.labelPlural || `${def.label}s`).toLowerCase();

  /* ── Refine hooks ──────────────────────────────────────────────── */

  const { tableQuery, currentPage, setCurrentPage } = useTable<TData>({
    resource: def.name,
    pagination: { currentPage: 1, pageSize: def.pageSize ?? 20 },
    sorters: def.defaultSortField
      ? { initial: [{ field: def.defaultSortField, order: def.defaultSortOrder ?? "desc" }] }
      : { initial: [{ field: "created_at", order: "desc" }] },
    filters: {
      permanent: [
        ...(filter !== "all" && def.filterField
          ? [{ field: def.filterField, operator: "eq" as const, value: filter }]
          : []),
        ...(search && def.searchField
          ? [{ field: def.searchField, operator: "contains" as const, value: search }]
          : []),
      ],
    },
  });

  const items: TData[] = (tableQuery?.data?.data ?? tableQuery?.data ?? []) as TData[];
  const isLoading = tableQuery?.isLoading ?? false;

  const createFeature = useCreate();
  const updateFeature = useUpdate();
  const deleteFeature = useDelete();
  const isCreating = createFeature.mutation?.isPending ?? false;
  const isUpdating = updateFeature.mutation?.isPending ?? false;
  const isDeleting = deleteFeature.mutation?.isPending ?? false;

  /* ── Stats ─────────────────────────────────────────────────────── */

  const { data: statsData } = useQuery({
    queryKey: [`${def.name}-stats`],
    queryFn: () => def.stats?.fetch() ?? Promise.resolve({}),
    enabled: !!def.stats?.fetch,
    staleTime: 30_000,
  });

  /* ── Form ──────────────────────────────────────────────────────── */

  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(def.schema as any) as any,
    defaultValues: def.defaultValues as any,
  });

  const resetForm = useCallback(() => {
    form.reset(def.defaultValues as any);
  }, [form, def.defaultValues]);

  const openEdit = useCallback(
    (item: TData) => {
      form.reset(item as any);
      setEditingId(item.id);
      setShowForm(true);
    },
    [form],
  );

  const handleSubmit = useCallback(() => {
    form.handleSubmit(
      (values) => {
        const input = def.transformInput ? def.transformInput(values as any) : (values as any);

        if (mode === "edit") {
          updateFeature.mutate(
            { resource: def.name, id: editingId!, values: input },
            {
              onSuccess: () => {
                toast.success(`${def.label} updated`);
                setShowForm(false);
                setEditingId(null);
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Update failed"),
            },
          );
        } else {
          createFeature.mutate(
            { resource: def.name, values: input },
            {
              onSuccess: () => {
                toast.success(`${def.label} created`);
                setShowForm(false);
                resetForm();
              },
              onError: (e: any) => toast.error(e?.message ?? "Create failed"),
            },
          );
        }
      },
      (errors) => {
        const firstMsg = Object.values(errors).find((e) => (e as any)?.message);
        toast.error((firstMsg as any)?.message || "Please fix the form errors");
      },
    )();
  }, [form, def, mode, editingId, createFeature, updateFeature, resetForm]);

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteFeature.mutate(
      { resource: def.name, id: deletingId },
      {
        onSuccess: () => {
          toast.success(`${def.label} deleted`);
          setDeletingId(null);
        },
        onError: (e: any) => {
          toast.error(e?.message ?? "Delete failed");
          setDeletingId(null);
        },
      },
    );
  }, [deletingId, deleteFeature, def.name, def.label]);

  useUnsavedChanges(showForm && form.formState.isDirty);

  /* ── Auto-append action column ─────────────────────────────────── */

  const allColumns = useMemo((): ColumnDef<TData, any>[] => {
    const actionsCol: ColumnDef<TData, any> = {
      id: "resource-actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(row.original)}
            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Edit"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    };
    return [...def.columns, actionsCol];
  }, [def.columns, openEdit]);

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <def.icon className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">{def.labelPlural || `${def.label}s`}</h2>
            {def.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {def.label}
        </button>
      </div>

      {/* Stats */}
      {def.stats && statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {def.stats.cards(statsData).map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      {def.filters && def.filters.length > 0 && (
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-border/60 rounded-lg p-1 w-fit">
          {def.filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <def.icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No {emptyLabel} found.</p>
        </div>
      ) : (
        <DataTable
          columns={allColumns}
          data={items}
          searchPlaceholder={`Search ${emptyLabel}…`}
          pageSize={def.pageSize ?? 15}
        />
      )}

      {/* Form Drawer */}
      <FormDrawer
        open={showForm}
        onClose={() => {
          resetForm();
          setShowForm(false);
          setEditingId(null);
        }}
        title={mode === "edit" ? `Edit ${def.label}` : `Add New ${def.label}`}
        description={mode === "edit" ? `Update ${labelLower} details.` : `Add a new ${labelLower} to the collection.`}
        isPending={isCreating || isUpdating}
        submitLabel={mode === "edit" ? `Update ${def.label}` : `Create ${def.label}`}
        size="full"
        onSubmit={handleSubmit}
      >
        <def.FormContent form={form} resource={def} />
      </FormDrawer>

      {/* Confirm Delete */}
      <ConfirmDelete
        open={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        isPending={isDeleting}
        title={`Delete ${labelLower}`}
        description={`Are you sure you want to delete this ${labelLower}? This action cannot be undone.`}
      />
    </div>
  );
}
