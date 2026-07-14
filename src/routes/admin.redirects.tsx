import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  fetchRedirects,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  type Redirect,
} from "@/lib/redirects";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorPage } from "@/components/error-page";
import { createColumnHelper } from "@tanstack/react-table";
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
  MousePointerClick,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/redirects" as any)({
  component: AdminRedirectsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const columnHelper = createColumnHelper<Redirect>();

function AdminRedirectsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Redirect | null>(null);
  const [deleteItem, setDeleteItem] = useState<Redirect | null>(null);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState(301);
  const [note, setNote] = useState("");

  const doFetch = useServerFn(fetchRedirects);
  const doCreate = useServerFn(createRedirect);
  const doUpdate = useServerFn(updateRedirect);
  const doDelete = useServerFn(deleteRedirect);

  const { data: redirects = [], isLoading } = useQuery({
    queryKey: ["admin-redirects"],
    queryFn: () => doFetch(),
  });

  const createMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => doCreate({ data: { from_path: fromPath, to_path: toPath, status_code: statusCode, note } } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-redirects"] });
      toast.success("Redirect created");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editingItem) return Promise.resolve(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return doUpdate({ data: { id: editingItem.id, from_path: fromPath, to_path: toPath, status_code: statusCode, note } } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-redirects"] });
      toast.success("Redirect updated");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      doUpdate({ data: { id, is_active } } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-redirects"] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!deleteItem) return Promise.resolve(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return doDelete({ data: { id: deleteItem.id } } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-redirects"] });
      toast.success("Redirect deleted");
      setDeleteItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setShowForm(false);
    setEditingItem(null);
    setFromPath("");
    setToPath("");
    setStatusCode(301);
    setNote("");
  }

  function openEdit(item: Redirect) {
    setEditingItem(item);
    setFromPath(item.from_path);
    setToPath(item.to_path);
    setStatusCode(item.status_code);
    setNote(item.note);
    setShowForm(true);
  }

  const activeCount = redirects.filter((r) => r.is_active).length;
  const totalHits = redirects.reduce((sum, r) => sum + r.hit_count, 0);

  const columns = [
    columnHelper.accessor("from_path", {
      header: "From",
      cell: (info) => (
        <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">{info.getValue()}</code>
      ),
    }),
    columnHelper.accessor("to_path", {
      header: "To",
      cell: (info) => (
        <span className="flex items-center gap-1.5 text-xs">
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          <code className="bg-secondary/50 px-1.5 py-0.5 rounded">{info.getValue()}</code>
        </span>
      ),
    }),
    columnHelper.accessor("status_code", {
      header: "Status",
      cell: (info) => (
        <span className={`text-[0.55rem] font-mono px-1.5 py-0.5 rounded ${
          info.getValue() === 301 ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
          : info.getValue() === 302 ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("hit_count", {
      header: "Hits",
      cell: (info) => <span className="text-xs font-mono">{info.getValue()}</span>,
    }),
    columnHelper.accessor("is_active", {
      header: "Active",
      cell: (info) => (
        <button
          onClick={() => toggleMut.mutate({ id: info.row.original.id, is_active: !info.getValue() })}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {info.getValue() ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-zinc-400" />
          )}
        </button>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(info.row.original)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteItem(info.row.original)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Redirects</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage URL redirects — {activeCount} active
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Redirect
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Link2} label="Total Redirects" value={redirects.length} color="text-blue-600" />
        <StatCard icon={MousePointerClick} label="Total Hits" value={totalHits} color="text-green-600" />
        <StatCard icon={ArrowRightLeft} label="Active" value={activeCount} color="text-amber-600" />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        <DataTable
          columns={columns}
          data={redirects}
          searchPlaceholder="Search redirects…"
          pageSize={25}
        />
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Redirect" : "New Redirect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">From Path</Label>
              <Input
                value={fromPath}
                onChange={(e) => setFromPath(e.target.value)}
                placeholder="/old-page"
              />
              <p className="text-[0.6rem] text-muted-foreground">The URL path to redirect from (e.g., /old-page)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">To Path</Label>
              <Input
                value={toPath}
                onChange={(e) => setToPath(e.target.value)}
                placeholder="/new-page"
              />
              <p className="text-[0.6rem] text-muted-foreground">The URL path to redirect to (e.g., /new-page)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status Code</Label>
              <div className="flex gap-2">
                {[301, 302, 307, 308].map((code) => (
                  <button
                    key={code}
                    onClick={() => setStatusCode(code)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                      statusCode === code
                        ? "border-foreground/40 bg-foreground/5"
                        : "border-border/60 hover:border-foreground/20"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <p className="text-[0.6rem] text-muted-foreground">
                {statusCode === 301 && "Permanent redirect — browser caches this"}
                {statusCode === 302 && "Temporary redirect — browser checks again next time"}
                {statusCode === 307 && "Temporary redirect — preserves HTTP method"}
                {statusCode === 308 && "Permanent redirect — preserves HTTP method"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this redirect exists"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => editingItem ? updateMut.mutate() : createMut.mutate()}
              disabled={!fromPath || !toPath || createMut.isPending || updateMut.isPending}
            >
              {editingItem ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the redirect from <code>{deleteItem?.from_path}</code> to <code>{deleteItem?.to_path}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
