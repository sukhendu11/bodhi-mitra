import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type Coupon,
} from "@/lib/coupons";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorPage } from "@/components/error-page";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Tag,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  DollarSign,
  Ticket,
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

export const Route = createFileRoute("/admin/coupons" as any)({
  component: AdminCouponsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const columnHelper = createColumnHelper<Coupon>();

function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Coupon | null>(null);
  const [deleteItem, setDeleteItem] = useState<Coupon | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [minPurchase, setMinPurchase] = useState("");

  const doFetch = useServerFn(fetchCoupons);
  const doCreate = useServerFn(createCoupon);
  const doUpdate = useServerFn(updateCoupon);
  const doDelete = useServerFn(deleteCoupon);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => doFetch(),
  });

  const createMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => doCreate({ data: { code, description, discount_type: discountType, discount_value: discountValue, max_redemptions: maxRedemptions ? Number(maxRedemptions) : null, expires_at: expiresAt || null, min_purchase_amount: minPurchase ? Number(minPurchase) : 0 } } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon created");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editingItem) return Promise.resolve(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return doUpdate({ data: { id: editingItem.id, code, description, discount_type: discountType, discount_value: discountValue, max_redemptions: maxRedemptions ? Number(maxRedemptions) : null, expires_at: expiresAt || null, min_purchase_amount: minPurchase ? Number(minPurchase) : 0 } } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon updated");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      doUpdate({ data: { id, is_active } } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!deleteItem) return Promise.resolve(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return doDelete({ data: { id: deleteItem.id } } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
      setDeleteItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setShowForm(false);
    setEditingItem(null);
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMaxRedemptions("");
    setExpiresAt("");
    setMinPurchase("");
  }

  function openEdit(item: Coupon) {
    setEditingItem(item);
    setCode(item.code);
    setDescription(item.description);
    setDiscountType(item.discount_type);
    setDiscountValue(item.discount_value);
    setMaxRedemptions(item.max_redemptions?.toString() || "");
    setExpiresAt(item.expires_at ? item.expires_at.split("T")[0] : "");
    setMinPurchase(item.min_purchase_amount?.toString() || "");
    setShowForm(true);
  }

  const activeCount = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.current_redemptions, 0);

  const columns = [
    columnHelper.accessor("code", {
      header: "Code",
      cell: (info) => (
        <code className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{info.getValue()}</code>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue() || "—"}</span>,
    }),
    columnHelper.accessor("discount_type", {
      header: "Type",
      cell: (info) => (
        <span className="flex items-center gap-1 text-xs">
          {info.getValue() === "percentage" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
          {info.getValue() === "percentage" ? "Percentage" : "Fixed"}
        </span>
      ),
    }),
    columnHelper.accessor("discount_value", {
      header: "Value",
      cell: (info) => (
        <span className="text-xs font-medium">
          {info.row.original.discount_type === "percentage" ? `${info.getValue()}%` : `$${info.getValue().toFixed(2)}`}
        </span>
      ),
    }),
    columnHelper.accessor("current_redemptions", {
      header: "Used",
      cell: (info) => (
        <span className="text-xs font-mono">
          {info.getValue()}{info.row.original.max_redemptions ? ` / ${info.row.original.max_redemptions}` : ""}
        </span>
      ),
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
          <Ticket className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Coupons</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage discount codes — {activeCount} active
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Coupon
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Ticket} label="Total Coupons" value={coupons.length} color="text-purple-600" />
        <StatCard icon={Tag} label="Total Redemptions" value={totalRedemptions} color="text-green-600" />
        <StatCard icon={Percent} label="Active" value={activeCount} color="text-amber-600" />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        <DataTable
          columns={columns}
          data={coupons}
          searchPlaceholder="Search coupons…"
          pageSize={25}
        />
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Coupon" : "New Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SAVE20"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="20% off all books"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discount Type</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDiscountType("percentage")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    discountType === "percentage"
                      ? "border-foreground/40 bg-foreground/5"
                      : "border-border/60 hover:border-foreground/20"
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  onClick={() => setDiscountType("fixed_amount")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    discountType === "fixed_amount"
                      ? "border-foreground/40 bg-foreground/5"
                      : "border-border/60 hover:border-foreground/20"
                  }`}
                >
                  Fixed Amount ($)
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Discount Value {discountType === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max Uses</Label>
                <Input
                  type="number"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="Unlimited"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Expires</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min Purchase ($)</Label>
              <Input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => editingItem ? updateMut.mutate() : createMut.mutate()}
              disabled={!code || !discountValue || createMut.isPending || updateMut.isPending}
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
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove coupon <code>{deleteItem?.code}</code>.
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
