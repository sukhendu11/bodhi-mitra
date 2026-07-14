import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchNewsletterSubscribers,
  getNewsletterStats,
  deleteNewsletterSubscriber,
  type NewsletterSubscriber,
} from "@/lib/admin-newsletter";
import { Section } from "@/components/SettingsFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Mail, Users, UserCheck, UserX, TrendingUp, Trash2, Download } from "lucide-react";

export function SettingsNewsletterTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteItem, setDeleteItem] = useState<NewsletterSubscriber | null>(null);

  const doFetch = useServerFn(fetchNewsletterSubscribers);
  const doStats = useServerFn(getNewsletterStats);
  const doDelete = useServerFn(deleteNewsletterSubscriber);

  const { data: stats } = useQuery({
    queryKey: ["newsletter-stats"],
    queryFn: () => doStats(),
  });

  const { data: subscribersData, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers", page, search],
    queryFn: () => doFetch({ data: { page, pageSize: 25, search } } as any),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-stats"] });
      toast.success("Subscriber deleted");
      setDeleteItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const subscribers = subscribersData?.data ?? [];
  const total = subscribersData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  function exportCSV() {
    if (!subscribers.length) return;
    const csv = "Email,Subscribed,Active\n" + subscribers.map((s) => `${s.email},${s.created_at},${s.active}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Stats */}
      <Section title="Newsletter Stats" desc="Overview of your subscriber base.">
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total" value={stats?.total ?? 0} color="text-blue-600" />
          <StatCard icon={UserCheck} label="Active" value={stats?.active ?? 0} color="text-green-600" />
          <StatCard icon={UserX} label="Unsubscribed" value={stats?.unsubscribed ?? 0} color="text-zinc-500" />
          <StatCard icon={TrendingUp} label="New This Week" value={stats?.newThisWeek ?? 0} color="text-amber-600" />
        </div>
      </Section>

      {/* Subscriber List */}
      <Section title="Subscribers" desc="Manage newsletter subscribers.">
        <div className="flex items-center gap-3 mb-4">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email…"
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!subscribers.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-secondary/40 animate-pulse rounded" />
            ))}
          </div>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "No subscribers match this search." : "No subscribers yet."}
          </p>
        ) : (
          <div className="space-y-1">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sub.email}</p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      {sub.active ? "Active" : "Unsubscribed"} · {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteItem(sub)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <code>{deleteItem?.email}</code> from the newsletter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/40">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
