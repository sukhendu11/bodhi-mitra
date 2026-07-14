import { useState, useMemo, Fragment, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Columns3,
  CheckSquare,
  X,
  Trash2,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  filters?: ReactNode;
  onBulkDelete?: (ids: string[]) => void;
  isBulkDeleting?: boolean;
  renderSubRow?: (row: TData) => ReactNode;
  /** Enable CSV export button */
  enableExport?: boolean;
  /** Custom export filename */
  exportFilename?: string;
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  searchPlaceholder = "Search…",
  pageSize = 15,
  filters,
  onBulkDelete,
  isBulkDeleting,
  renderSubRow,
  enableExport = false,
  exportFilename = "export",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const selectionCol = onBulkDelete
    ? ({
        id: "select",
        header: ({ table: t }) => (
          <Checkbox
            checked={t.getIsAllRowsSelected()}
            onCheckedChange={(v) => t.toggleAllRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.id}`}
          />
        ),
        size: 36,
        enableSorting: false,
      } as ColumnDef<TData, any>)
    : null;

  const expandCol = renderSubRow
    ? ({
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() =>
              setExpandedRowId(expandedRowId === row.original.id ? null : row.original.id)
            }
            className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors"
            aria-label={expandedRowId === row.original.id ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expandedRowId === row.original.id && "rotate-90",
              )}
            />
          </button>
        ),
        size: 36,
        enableSorting: false,
      } as ColumnDef<TData, any>)
    : null;

  const allColumns = useMemo(() => {
    const cols = [...columns];
    if (expandCol) cols.unshift(expandCol);
    if (selectionCol) cols.unshift(selectionCol);
    return cols;
  }, [columns, !!onBulkDelete, !!renderSubRow, expandedRowId]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: !!onBulkDelete,
    initialState: {
      pagination: { pageSize },
    },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const selectedCount = Object.keys(rowSelection).length;

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection);
  }, [rowSelection]);

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds);
      setRowSelection({});
    }
  };

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows;
    if (rows.length === 0) return;

    // Get visible columns
    const visibleCols = table.getAllColumns().filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "expand");

    // Build CSV header
    const headers = visibleCols.map((col) => {
      const header = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
      return `"${header.replace(/"/g, '""')}"`;
    });

    // Build CSV rows
    const csvRows = rows.map((row) => {
      return visibleCols
        .map((col) => {
          const value = row.getValue(col.id);
          const str = value === null || value === undefined ? "" : String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filters + column visibility */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          {filters}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => {
                const header =
                  typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    className="text-xs capitalize"
                  >
                    {header}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        {enableExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && onBulkDelete && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-foreground/5 rounded-lg border border-border/60">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setRowSelection({})}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-3 w-3" />
              {isBulkDeleting ? "Deleting…" : `Delete (${selectedCount})`}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border/40">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[0.6rem] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60 px-4 py-3 select-none"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 ${
                          header.column.getCanSort()
                            ? "cursor-pointer hover:text-foreground transition-colors"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUp className="h-3 w-3" />,
                          desc: <ChevronDown className="h-3 w-3" />,
                        }[header.column.getIsSorted() as string] ??
                          (header.column.getCanSort() ? (
                            <ChevronsUpDown className="h-3 w-3 opacity-30" />
                          ) : null)}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isExpanded = renderSubRow && expandedRowId === row.original.id;
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "border-border/40 transition-colors",
                        row.getIsSelected() ? "bg-foreground/5" : "hover:bg-secondary/20",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3 text-xs">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${row.id}-sub`} className="border-border/40">
                        <TableCell
                          colSpan={allColumns.length}
                          className="px-6 py-4 bg-secondary/10 border-t border-border/30"
                        >
                          {renderSubRow!(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)} of{" "}
            {totalRows}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-7 px-2 text-xs"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 px-2.5 text-xs"
            >
              ← Prev
            </Button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(pageIndex - 2, pageCount - 5));
              const pageNum = start + i;
              return (
                <Button
                  key={pageNum}
                  variant={pageIndex === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageNum)}
                  className="h-7 w-7 p-0 text-xs"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 px-2.5 text-xs"
            >
              Next →
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="h-7 px-2 text-xs"
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Status Badge Helper */

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published:
      "border-green-300/50 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/50",
    draft:
      "border-amber-300/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
    archived:
      "border-slate-300/50 bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50",
  };
  return (
    <span
      className={`inline-block text-[0.55rem] font-medium uppercase tracking-[0.08em] px-2.5 py-0.5 rounded-full border ${
        styles[status] || styles.draft
      }`}
    >
      {status}
    </span>
  );
}

/* Date Format Helper */

export function DateCell({ date }: { date: string }) {
  if (!date) return <span className="text-muted-foreground/50">—</span>;
  return (
    <span className="text-muted-foreground">
      {new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  );
}
