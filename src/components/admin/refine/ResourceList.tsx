/**
 * Generic resource list for the Refine admin — one component powers every
 * resource via the schema-driven registry (src/lib/admin/resources.ts).
 *
 * Uses Refine's useTable (TanStack Table wrapper) + shadcn/ui components.
 * Create/Edit open the shared ResourceFormDialog; delete uses AlertDialog.
 */
import { useState, useMemo, type ReactNode } from "react";
import { useTable } from "@refinedev/react-table";
import { useCan, useDelete, useInvalidate } from "@refinedev/core";
import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useLang, toBanglaDigits } from "@/lib/i18n";
import { getResourceDef, type ResourceColumn } from "@/lib/admin/resources";
import { mockResourceWritable } from "@/lib/admin/data-provider";
import { ResourceFormDialog } from "./ResourceFormDialog";

type Row = Record<string, unknown> & { id: string | number };

interface ResourceListProps {
  resource: string;
  /** Optional — breadcrumb "Dashboard" link back to the dashboard tab. */
  onOpenDashboard?: () => void;
}

/** Sort-state indicator for a sortable column header (DataTable pattern). */
function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3 text-primary" />;
  if (sorted === "desc") return <ArrowDown className="h-3 w-3 text-primary" />;
  return <ArrowUpDown className="h-3 w-3 opacity-40" />;
}

function cellValue(row: Row, col: ResourceColumn): ReactNode {
  if (col.format) return col.format(row);
  const v = row[col.key];
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "";
  return String(v);
}

export function ResourceList({ resource, onOpenDashboard }: ResourceListProps) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const def = getResourceDef(resource);
  // RBAC through Refine's accessControlProvider (useCan): the provider
  // delegates to the same matrix as the sidebar, so actions can never drift
  // from what the role may actually do. An action ALSO needs mock-store
  // support (read-only resources like orders/pages lack mock write stores).
  const storeWritable = mockResourceWritable(resource as never);
  // Single-row resources (site settings) are edited, never created/deleted.
  const singleRow = def?.singleRow === true;
  const { data: canCreateData } = useCan({ resource, action: "create" });
  const { data: canEditData } = useCan({ resource, action: "edit" });
  const { data: canDeleteData } = useCan({ resource, action: "delete" });
  const canCreate = (canCreateData?.can ?? false) && storeWritable && !singleRow;
  const canEdit = (canEditData?.can ?? false) && storeWritable;
  const canDelete = (canDeleteData?.can ?? false) && storeWritable && !singleRow;

  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      ...(def?.columns ?? []).map(
        (col): ColumnDef<Row> => ({
          id: col.key,
          // accessorKey drives the wrapper's server-side sorters (manualSorting
          // mode — sorting state syncs to the dataProvider `sorters` param).
          accessorKey: col.key,
          enableSorting: true,
          header: ({ column }) => (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="flex items-center gap-1 font-medium hover:text-foreground"
              aria-label={`${bn ? "সাজান" : "Sort by"} ${bn ? col.labelBn : col.labelEn}`}
            >
              {bn ? col.labelBn : col.labelEn}
              <SortIcon sorted={column.getIsSorted()} />
            </button>
          ),
          cell: ({ row }) => cellValue(row.original, col),
        }),
      ),
      {
        id: "actions",
        enableSorting: false,
        header: "",
        cell: ({ row }) =>
          canEdit || canDelete ? (
            <div className="flex items-center justify-end gap-1.5">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label={bn ? "সম্পাদনা" : "Edit"}
                  onClick={() => setEditing(row.original)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  aria-label={bn ? "মুছুন" : "Delete"}
                  onClick={() => setDeleting(row.original)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : null,
      },
    ],
    [def, bn, canEdit, canDelete],
  );

  // Drive pagination through TanStack Table's own API: the react-table wrapper
  // syncs pageIndex → refineCore.setCurrentPage via an effect, so calling
  // setCurrentPage directly never updates the table's page state.
  const { reactTable, refineCore } = useTable<Row>({
    columns,
    refineCoreProps: {
      resource,
      pagination: { pageSize: 10 },
    },
  });
  const { filters, setFilters } = refineCore;
  const pageCount = reactTable.getPageCount();
  const currentPage = reactTable.getState().pagination.pageIndex + 1;

  const { mutation: deleteMutation } = useDelete();
  const deletingLoading = deleteMutation.isPending;
  // Refine v5 exposes invalidate directly from the hook (not destructured).
  const invalidate = useInvalidate();

  if (!def) return <p className="p-6 text-muted-foreground">Unknown resource: {resource}</p>;

  const searchValue = String(
    (filters ?? []).find((f) => "field" in f && f.field === "q")?.value ?? "",
  );

  const refresh = () =>
    invalidate({
      resource,
      // Refine v5 invalidate keys: the resource's list + the resource-level
      // queries (site_settings is single-row — list + resourceAll cover it).
      invalidates: ["list", "resourceAll"],
    });

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(
      { resource, id: deleting.id },
      {
        onSuccess: () => {
          setDeleting(null);
          toast.success(bn ? "আইটেমটি মুছে ফেলা হয়েছে" : "Item deleted");
        },
        onError: (err) => {
          toast.error(
            bn ? "মুছতে ব্যর্থ হয়েছে — আবার চেষ্টা করুন" : "Delete failed — try again",
            { description: err instanceof Error ? err.message : undefined },
          );
        },
      },
    );
  };

  return (
    <div>
      {/* Breadcrumb — ListView header pattern (Dashboard / resource) */}
      <nav aria-label="Breadcrumb" className="px-6 pt-5 text-xs text-muted-foreground">
        {onOpenDashboard ? (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hover:text-foreground"
          >
            {bn ? "ড্যাশবোর্ড" : "Dashboard"}
          </button>
        ) : (
          <span>{bn ? "ড্যাশবোর্ড" : "Dashboard"}</span>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{bn ? def.labelBn : def.labelEn}</span>
      </nav>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-2">
        <div>
          <h2 className="font-serif text-xl text-foreground">{bn ? def.labelBn : def.labelEn}</h2>
          <p className="text-xs text-muted-foreground">
            {bn ? "কন্টেন্ট পরিচালনা করুন" : "Manage content"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={searchValue}
            onChange={(e) =>
              setFilters?.([{ field: "q", operator: "contains", value: e.target.value }])
            }
            placeholder={bn ? "অনুসন্ধান…" : "Search…"}
            className="h-8 w-44 rounded-md border border-border/60 bg-background px-2.5 text-sm outline-none focus:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={bn ? "রিফ্রেশ" : "Refresh"}
            onClick={refresh}
            className="h-8 w-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {bn ? "নতুন" : "New"}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto px-2">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {reactTable.getHeaderGroups()[0]?.headers.map((header) => (
              <th key={header.id} className="px-4 py-2.5 font-medium">
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reactTable.getRowModel().rows.map((row) => (
              <tr
                key={row.original.id}
                className="border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {reactTable.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  {bn ? "কোনো আইটেম পাওয়া যায়নি" : "No items found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(pageCount ?? 1) > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground">
          <span>
            {bn ? "পৃষ্ঠা" : "Page"} {toBanglaDigits(currentPage ?? 1)} {bn ? "এর" : "of"}{" "}
            {toBanglaDigits(pageCount ?? 1)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!reactTable.getCanPreviousPage()}
              onClick={() => reactTable.previousPage()}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!reactTable.getCanNextPage()}
              onClick={() => reactTable.nextPage()}
            >
              →
            </Button>
          </div>
        </div>
      )}

      {/* Edit / Create dialog */}
      {editing !== null && (
        <ResourceFormDialog
          resource={resource}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? "আইটেমটি মুছবেন?" : "Delete this item?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {bn ? "এই ক্রিয়াটি ফেরানো যাবে না।" : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoading}>
              {bn ? "বাতিল" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingLoading}
              onClick={confirmDelete}
            >
              {bn ? "মুছুন" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
