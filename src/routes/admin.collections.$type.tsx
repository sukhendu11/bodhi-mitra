import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Loader2,
  Search,
  ChevronLeft,
  FileText,
  ChevronsUpDown,
  ArrowUpDown,
} from "lucide-react";

// Server functions
import {
  getContentTypeById,
  getDynamicContent,
  deleteDynamicContentItem,
  duplicateDynamicContentItem,
} from "@/lib/content-modeling";

export const Route = createFileRoute("/admin/collections/$type")({
  component: DynamicContentListPage,   errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function DynamicContentListPage() {
  const { type: contentTypeId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  // Fetch content type definition
  const { data: contentType, isLoading: loadingDef } = useQuery({
    queryKey: ["content-type", contentTypeId],
    queryFn: () => (getContentTypeById as any)({ data: { id: contentTypeId } }),
  });

  // Fetch content items
  const { data: contentData, isLoading: loadingContent, error } = useQuery({
    queryKey: ["dynamic-content", contentTypeId, page, search],
    queryFn: () =>
      (getDynamicContent as any)({
        data: {
          contentTypeId,
          page: page + 1,
          pageSize: 20,
          search,
        },
      }),
    enabled: !!contentTypeId,
  });

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: (itemId) =>
      (deleteDynamicContentItem as any)({ data: { contentTypeId, itemId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-content", contentTypeId] });
      toast.success("Content deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation<any, Error, string>({
    mutationFn: (itemId) =>
      (duplicateDynamicContentItem as any)({ data: { contentTypeId, itemId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-content", contentTypeId] });
      toast.success("Content duplicated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loadingDef) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contentType) {
    return <ErrorPage error={new Error("Content type not found")} />;
  }

  const { definition: def, fields } = contentType;

  // Build display fields (first 5 non-system fields)
  const displayFields = (fields as any[])
    .filter((f: any) => !f.system_field)
    .slice(0, 5);

  // Build dynamic columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "content_data",
      header: "Title",
      cell: ({ row }) => {
        const data = row.original.content_data || {};
        const title = data.title || data.name || data.heading || `Item ${row.original.id.slice(0, 8)}`;
        return (
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate max-w-[300px]">
              {String(title)}
            </div>
            {row.original.status && (
              <StatusBadge status={row.original.status} />
            )}
          </div>
        );
      },
    },
    ...displayFields.map((field: any) => ({
      accessorKey: `content_data.${field.name}`,
      header: field.label,
      cell: ({ row }: any) => {
        const val = row.original?.content_data?.[field.name];
        if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
        const strVal = String(val);
        return (
          <span className="text-sm truncate max-w-[200px] block">
            {field.field_type === "boolean"
              ? val ? "Yes" : "No"
              : strVal.length > 50
                ? strVal.slice(0, 50) + "..."
                : strVal}
          </span>
        );
      },
    })),
    {
      id: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: "/admin/collections/$type/$id",
                  params: { type: contentTypeId, id: row.original.id },
                })
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {def.can_duplicate && (
              <DropdownMenuItem onClick={() => duplicateMutation.mutate(row.original.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            {def.preview_url && (
              <DropdownMenuItem asChild>
                <a
                  href={def.preview_url.replace("{slug}", row.original.slug || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete content</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(row.original.id)}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: contentData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    pageCount: Math.ceil((contentData?.total || 0) / 20),
    manualPagination: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/admin/content-types" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{def.label_plural || def.label}</h1>
            <p className="text-sm text-muted-foreground">
              {def.description || `Manage ${def.label.toLowerCase()} content`}
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            (navigate as any)({
              to: "/admin/collections/$type/new",
              params: { type: contentTypeId },
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          New {def.label}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${def.label_plural?.toLowerCase() || def.label.toLowerCase()}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      {loadingContent ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contentData?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            No {def.label_plural?.toLowerCase() || def.label.toLowerCase()} yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by creating your first {def.label.toLowerCase()}
          </p>
          <Button
            onClick={() =>
              (navigate as any)({
                to: "/admin/collections/$type/new",
                params: { type: contentTypeId },
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Create {def.label}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <Button
                            variant="ghost"
                            onClick={header.column.getToggleSortingHandler()}
                            className="h-8 px-2 text-xs font-medium"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getIsSorted() && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {contentData && contentData.total > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(contentData.total / 20)}
                {" · "}
                {contentData.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(contentData.total / 20) - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    published: "default",
    draft: "secondary",
    archived: "outline",
    scheduled: "outline",
  };

  return (
    <Badge variant={variants[status] || "outline"} className="text-[10px]">
      {status}
    </Badge>
  );
}
