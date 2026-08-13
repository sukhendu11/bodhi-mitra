/**
 * Mock Admin Panel â€” M5 (ROADMAP.md E5.1â€“E5.3).
 *
 * Offline admin experience for the demo build: dashboard stats from the
 * mock stores, content CRUD for books/posts/videos (reflecting on public
 * pages immediately), an orders view, and a notifications admin. In
 * production mode the /admin route keeps redirecting to Strapi.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Receipt,
  Bell,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  RotateCcw,
  Check,
  CheckCheck,
  Save,
} from "lucide-react";
import { FeatherPenIcon } from "@/components/FeatherPenIcon";
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
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { MockSession } from "@/lib/mock-session";
import {
  MOCK_CMS_EVENT,
  mockClearCms,
  mockDeleteBook,
  mockDeletePost,
  mockDeleteVideo,
} from "@/lib/mock-cms";
import {
  mockFetchAllBooks,
  mockFetchAllPosts,
  mockFetchAllVideos,
} from "@/lib/mock-data";
import { mockGetAllOrders, mockGetAllPurchases } from "@/lib/mock-commerce";
import {
  MOCK_NOTIFICATIONS_EVENT,
  mockGetAllNotifications,
  mockMarkAllRead,
  mockMarkRead,
} from "@/lib/mock-notifications";
import { BookEditorDialog, PostEditorDialog, VideoEditorDialog } from "./MockContentEditors";
import {
  MOCK_SETTINGS_EVENT,
  mockClearSettings,
  mockGetSettings,
  mockUpdateSettings,
} from "@/lib/mock-settings";
import { useSiteSettingsQuery, DEFAULT_CONFIG } from "@/lib/siteSettings";

type TabId = "dashboard" | "books" | "posts" | "videos" | "orders" | "notifications" | "settings";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "posts", label: "Reflections", icon: FeatherPenIcon },
  { id: "videos", label: "Videos", icon: Video },
  { id: "orders", label: "Orders", icon: Receipt },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Site Settings", icon: Settings2 },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function MockAdminPanel({ session }: { session: MockSession | null }) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const queryClient = useQueryClient();

  // Reactivity: re-read mock stores when the admin (or another tab) writes.
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["mock-admin"] });
      void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    };
    window.addEventListener(MOCK_CMS_EVENT, refresh);
    window.addEventListener(MOCK_NOTIFICATIONS_EVENT, refresh);
    window.addEventListener(MOCK_SETTINGS_EVENT, refresh);
    return () => {
      window.removeEventListener(MOCK_CMS_EVENT, refresh);
      window.removeEventListener(MOCK_NOTIFICATIONS_EVENT, refresh);
      window.removeEventListener(MOCK_SETTINGS_EVENT, refresh);
    };
  }, [queryClient]);

  const adminName = session?.user.display_name ?? "Admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-serif text-lg text-foreground truncate">
              â– <span className="hidden sm:inline">Sabbe Satta</span> <span className="text-muted-foreground">/</span> Admin
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Mock mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                mockClearCms();
                toast.success("Demo content reset to defaults.");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset demo data
            </Button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <aside className="shrink-0 md:w-52">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  tab === id
                    ? "bg-secondary/60 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "books" && <BooksTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "videos" && <VideosTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "settings" && <SettingsTab />}
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-4 md:px-8 pb-8 text-xs text-muted-foreground/70">
        Signed in as <span className="text-foreground/80">{adminName}</span>. This panel runs
        entirely offline against mock stores â€” production admin is Strapi.
      </footer>
    </div>
  );
}

/* â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 md:p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-serif text-2xl md:text-3xl text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

function DashboardTab() {
  const { data: books } = useQuery({
    queryKey: ["mock-admin", "books"],
    queryFn: async () => mockFetchAllBooks(),
  });
  const { data: posts } = useQuery({
    queryKey: ["mock-admin", "posts"],
    queryFn: async () => mockFetchAllPosts(),
  });
  const { data: videos } = useQuery({
    queryKey: ["mock-admin", "videos"],
    queryFn: async () => mockFetchAllVideos(),
  });
  const { data: orders } = useQuery({
    queryKey: ["mock-admin", "orders"],
    queryFn: async () => mockGetAllOrders(),
  });
  const { data: purchases } = useQuery({
    queryKey: ["mock-admin", "purchases"],
    queryFn: async () => mockGetAllPurchases(),
  });

  const revenue = (orders ?? []).reduce((s, o) => s + o.total, 0);
  const publishedBooks = (books ?? []).filter((b) => b.status === "published").length;
  const publishedPosts = (posts ?? []).filter((p) => p.status === "published").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live stats from the mock stores â€” edits reflect on the public site instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Books" value={books?.length ?? "â€”"} sub={`${publishedBooks} published`} />
        <StatCard label="Reflections" value={posts?.length ?? "â€”"} sub={`${publishedPosts} published`} />
        <StatCard label="Videos" value={videos?.length ?? "â€”"} />
        <StatCard label="Orders" value={orders?.length ?? "â€”"} />
        <StatCard label="Purchases" value={purchases?.length ?? "â€”"} />
        <StatCard label="Revenue" value={`BDT ${formatCurrency(revenue)}`} sub="sum of order totals" />
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-5">
        <h2 className="font-serif text-lg text-foreground mb-3">Demo accounts</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-secondary/30 p-3">
            <p className="font-medium text-foreground">Demo Reader</p>
            <p className="text-xs text-muted-foreground">demo@sabbe-satta.test Â· demo1234</p>
          </div>
          <div className="rounded-md bg-secondary/30 p-3">
            <p className="font-medium text-foreground">Demo Admin (you)</p>
            <p className="text-xs text-muted-foreground">admin@sabbe-satta.test Â· admin1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Shared CRUD table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function useSearch() {
  const [q, setQ] = useState("");
  return { q, setQ };
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        aria-label="Edit"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <button
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete"
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the mock store. The change is local to this demo build.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete();
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CrudHeader({
  title,
  count,
  search,
  onSearchChange,
  onNew,
}: {
  title: string;
  count: number;
  search: string;
  onSearchChange: (q: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Searchâ€¦"
          className="h-9 w-44 sm:w-56"
        />
        <Button onClick={onNew} className="h-9 gap-1.5 text-sm">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/* â”€â”€â”€ Books tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function BooksTab() {
  const { q, setQ } = useSearch();
  const { data: books = [], refetch } = useQuery({
    queryKey: ["mock-admin", "books"],
    queryFn: async () => mockFetchAllBooks(),
  });
  const [editing, setEditing] = useState<{ open: boolean; book: null | (typeof books)[number] }>({
    open: false,
    book: null,
  });

  const filtered = books.filter(
    (b) =>
      b.title_en.toLowerCase().includes(q.toLowerCase()) ||
      b.author_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <CrudHeader
        title="Books"
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        onNew={() => setEditing({ open: true, book: null })}
      />
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <EmptyState label="No books match. Create one with the New button." />
                </td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{b.title_en}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">{b.title_bn}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.author_name}</td>
                <td className="px-4 py-3">
                  {b.is_free ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                  ) : (
                    `BDT ${formatCurrency(b.price)}`
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      b.status === "published"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => setEditing({ open: true, book: b })}
                    onDelete={() => {
                      mockDeleteBook(b.id);
                      toast.success(`Book "${b.title_en}" deleted.`);
                      void refetch();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BookEditorDialog
        book={editing.book}
        open={editing.open}
        onOpenChange={(open) => {
          setEditing((s) => ({ ...s, open }));
          if (!open) void refetch();
        }}
      />
    </div>
  );
}

/* â”€â”€â”€ Posts tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function PostsTab() {
  const { q, setQ } = useSearch();
  const { data: posts = [], refetch } = useQuery({
    queryKey: ["mock-admin", "posts"],
    queryFn: async () => mockFetchAllPosts(),
  });
  const [editing, setEditing] = useState<{ open: boolean; post: null | (typeof posts)[number] }>({
    open: false,
    post: null,
  });

  const filtered = posts.filter(
    (p) =>
      (p.title_en ?? "").toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <CrudHeader
        title="Reflections"
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        onNew={() => setEditing({ open: true, post: null })}
      />
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <EmptyState label="No reflections match. Create one with the New button." />
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{p.title_en}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {(p.excerpt_en ?? p.excerpt ?? "") || "â€”"}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.author_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      p.status === "published"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => setEditing({ open: true, post: p })}
                    onDelete={() => {
                      mockDeletePost(p.id);
                      toast.success(`Reflection "${p.title_en}" deleted.`);
                      void refetch();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PostEditorDialog
        post={editing.post}
        open={editing.open}
        onOpenChange={(open) => {
          setEditing((s) => ({ ...s, open }));
          if (!open) void refetch();
        }}
      />
    </div>
  );
}

/* â”€â”€â”€ Videos tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function VideosTab() {
  const { q, setQ } = useSearch();
  const { data: videos = [], refetch } = useQuery({
    queryKey: ["mock-admin", "videos"],
    queryFn: async () => mockFetchAllVideos(),
  });
  const [editing, setEditing] = useState<{ open: boolean; video: null | (typeof videos)[number] }>({
    open: false,
    video: null,
  });

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <CrudHeader
        title="Videos"
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        onNew={() => setEditing({ open: true, video: null })}
      />
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  <EmptyState label="No videos match. Create one with the New button." />
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{v.title}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">{v.description}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{v.category}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {Math.floor((v.duration ?? 0) / 60)}:{String((v.duration ?? 0) % 60).padStart(2, "0")}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => setEditing({ open: true, video: v })}
                    onDelete={() => {
                      mockDeleteVideo(v.id);
                      toast.success(`Video "${v.title}" deleted.`);
                      void refetch();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VideoEditorDialog
        video={editing.video}
        open={editing.open}
        onOpenChange={(open) => {
          setEditing((s) => ({ ...s, open }));
          if (!open) void refetch();
        }}
      />
    </div>
  );
}

/* â”€â”€â”€ Orders tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function OrdersTab() {
  const { data: orders = [] } = useQuery({
    queryKey: ["mock-admin", "orders"],
    queryFn: async () => mockGetAllOrders(),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? "s" : ""} Â· all paid in the demo build.
        </p>
      </div>
      {orders.length === 0 && <EmptyState label="No orders yet â€” complete a checkout to see them here." />}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-border/60 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{o.id}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString()} Â· {o.userId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={o.status ?? "paid"} lang="en" />
                <span className="font-serif text-lg text-foreground">BDT {formatCurrency(o.total)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {o.items.map((item) => (
                <span
                  key={item.bookId}
                  className="rounded-md bg-secondary/40 px-2 py-1 text-xs text-muted-foreground"
                >
                  {item.titleEn ?? item.titleBn} · BDT {formatCurrency(item.price)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* â”€â”€â”€ Settings tab (E5.4 â€” branding / theme / maintenance) â”€â”€â”€â”€â”€â”€â”€â”€ */

const THEME_PRESETS = [
  {
    name: "Warm Saffron",
    accent: "#d35400",
    hover: "#e67e22",
    heading: "Cormorant Garamond, serif",
    body: "Inter, sans-serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
  {
    name: "Cool Indigo",
    accent: "#4f46e5",
    hover: "#6366f1",
    heading: "Cormorant Garamond, serif",
    body: "Inter, sans-serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
  {
    name: "Forest Green",
    accent: "#166534",
    hover: "#16a34a",
    heading: "Cormorant Garamond, serif",
    body: "Inter, sans-serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
  {
    name: "Minimal Gray",
    accent: "#404040",
    hover: "#525252",
    heading: "Cormorant Garamond, serif",
    body: "Inter, sans-serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
  {
    name: "Elegant Serif",
    accent: "#92400e",
    hover: "#b45309",
    heading: "Playfair Display, serif",
    body: "Source Serif 4, serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
  {
    name: "Modern Clean",
    accent: "#0e7490",
    hover: "#0891b2",
    heading: "Manrope, sans-serif",
    body: "Inter, sans-serif",
    bn: "Noto Sans Bengali, sans-serif",
  },
];

const FONT_CHOICES = [
  "Cormorant Garamond, serif",
  "Playfair Display, serif",
  "Source Serif 4, serif",
  "Lora, serif",
  "Inter, sans-serif",
  "Manrope, sans-serif",
  "Noto Sans Bengali, sans-serif",
];

function SettingsField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SettingsSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-5">
      <h2 className="font-serif text-lg text-foreground">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground mb-4">{desc}</p>}
      {!desc && <div className="h-4" />}
      {children}
    </section>
  );
}

function SettingsTab() {
  const { data: config } = useSiteSettingsQuery();
  const current = config ?? DEFAULT_CONFIG;
  const [form, setForm] = useState({
    site_name_en: current.branding.site_name_en,
    site_name_bn: current.branding.site_name_bn,
    tagline_en: current.branding.tagline_en,
    tagline_bn: current.branding.tagline_bn,
    accent_color: current.theme.accent_color,
    accent_hover: current.theme.accent_hover,
    font_heading: current.theme.font_heading,
    font_body: current.theme.font_body,
    font_bn: current.theme.font_bn,
    font_size_base: String(current.theme.font_size_base),
    radius_scale: String(current.theme.radius_scale),
    custom_css: current.theme.custom_css,
    maintenance_enabled: current.maintenance.enabled,
    maintenance_title_en: current.maintenance.title_en,
    maintenance_title_bn: current.maintenance.title_bn,
    maintenance_message_en: current.maintenance.message_en,
    maintenance_message_bn: current.maintenance.message_bn,
  });
  const [saved, setSaved] = useState(false);

  // Shared updater â€” edits mark the form dirty ("Save changes" reappears).
  const setField = (partial: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...partial }));
    setSaved(false);
  };

  // Re-sync the form when the query refetches (e.g. after Reset demo data).
  // Intentionally does NOT clear `saved` â€” that would wipe the "Saved âœ“"
  // confirmation the instant the save-triggered refetch resolves.
  useEffect(() => {
    const cfg = config ?? DEFAULT_CONFIG;
    setForm((prev) => ({
      ...prev,
      site_name_en: cfg.branding.site_name_en,
      site_name_bn: cfg.branding.site_name_bn,
      tagline_en: cfg.branding.tagline_en,
      tagline_bn: cfg.branding.tagline_bn,
      accent_color: cfg.theme.accent_color,
      accent_hover: cfg.theme.accent_hover,
      font_heading: cfg.theme.font_heading,
      font_body: cfg.theme.font_body,
      font_bn: cfg.theme.font_bn,
      font_size_base: String(cfg.theme.font_size_base),
      radius_scale: String(cfg.theme.radius_scale),
      custom_css: cfg.theme.custom_css,
      maintenance_enabled: cfg.maintenance.enabled,
      maintenance_title_en: cfg.maintenance.title_en,
      maintenance_title_bn: cfg.maintenance.title_bn,
      maintenance_message_en: cfg.maintenance.message_en,
      maintenance_message_bn: cfg.maintenance.message_bn,
    }));
  }, [config]);

  const applyPreset = (p: (typeof THEME_PRESETS)[number]) => {
    setField({
      accent_color: p.accent,
      accent_hover: p.hover,
      font_heading: p.heading,
      font_body: p.body,
      font_bn: p.bn,
    });
  };

  const save = () => {
    mockUpdateSettings({
      branding: {
        site_name_en: form.site_name_en.trim(),
        site_name_bn: form.site_name_bn.trim(),
        tagline_en: form.tagline_en.trim(),
        tagline_bn: form.tagline_bn.trim(),
      },
      theme: {
        accent_color: form.accent_color.trim() || DEFAULT_CONFIG.theme.accent_color,
        accent_hover: form.accent_hover.trim() || DEFAULT_CONFIG.theme.accent_hover,
        font_heading: form.font_heading,
        font_body: form.font_body,
        font_bn: form.font_bn,
        font_size_base: Math.max(12, Math.min(22, Number(form.font_size_base) || 16)),
        radius_scale: Math.max(0.5, Math.min(2, Number(form.radius_scale) || 1)),
        custom_css: form.custom_css,
      },
      maintenance: {
        enabled: form.maintenance_enabled,
        title_en: form.maintenance_title_en.trim(),
        title_bn: form.maintenance_title_bn.trim(),
        message_en: form.maintenance_message_en.trim(),
        message_bn: form.maintenance_message_bn.trim(),
      },
    });
    setSaved(true);
    toast.success("Site settings saved — changes apply site-wide instantly.");
  };

  const reset = () => {
    mockClearSettings();
    setSaved(false);
    toast.success("Site settings restored to defaults.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">Site Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Branding, theme and maintenance â€” applied live by SiteSettingsProvider.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={save}>
            <Save className="h-4 w-4" />
            {saved ? "Saved âœ“" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Branding */}
      <SettingsSection title="Branding" desc="Site name, tagline â€” shown in the header, footer and metadata.">
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingsField label="Site name (EN)">
            <Input value={form.site_name_en} onChange={(e) => setField({ site_name_en: e.target.value })} className="h-9" />
          </SettingsField>
          <SettingsField label="Site name (BN)">
            <Input value={form.site_name_bn} onChange={(e) => setField({ site_name_bn: e.target.value })} className="h-9" />
          </SettingsField>
          <SettingsField label="Tagline (EN)">
            <Input value={form.tagline_en} onChange={(e) => setField({ tagline_en: e.target.value })} className="h-9" />
          </SettingsField>
          <SettingsField label="Tagline (BN)">
            <Input value={form.tagline_bn} onChange={(e) => setField({ tagline_bn: e.target.value })} className="h-9" />
          </SettingsField>
        </div>
      </SettingsSection>

      {/* Theme */}
      <SettingsSection title="Theme" desc="Presets set the accent + fonts together; fine-tune below. Applied live via CSS variables.">
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-left hover:border-foreground/30 hover:bg-accent/40 transition-colors cursor-pointer"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: p.accent }}
                aria-hidden
              />
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingsField label="Accent color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => setField({ accent_color: e.target.value })}
                className="h-9 w-11 shrink-0 rounded-md border border-border/60 bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-200"
                aria-label="Accent color picker"
              />
              <Input value={form.accent_color} onChange={(e) => setField({ accent_color: e.target.value })} className="h-9 font-mono text-xs" />
            </div>
          </SettingsField>
          <SettingsField label="Accent hover">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_hover}
                onChange={(e) => setField({ accent_hover: e.target.value })}
                className="h-9 w-11 shrink-0 rounded-md border border-border/60 bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-200"
                aria-label="Accent hover color picker"
              />
              <Input value={form.accent_hover} onChange={(e) => setField({ accent_hover: e.target.value })} className="h-9 font-mono text-xs" />
            </div>
          </SettingsField>
          <SettingsField label="Heading font">
            <select
              value={form.font_heading}
              onChange={(e) => setField({ font_heading: e.target.value })}
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {FONT_CHOICES.map((f) => (
                <option key={f} value={f}>{f.split(",")[0]}</option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Body font">
            <select
              value={form.font_body}
              onChange={(e) => setField({ font_body: e.target.value })}
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {FONT_CHOICES.map((f) => (
                <option key={f} value={f}>{f.split(",")[0]}</option>
              ))}
            </select>
          </SettingsField>
          <SettingsField label="Bangla font">
            <select
              value={form.font_bn}
              onChange={(e) => setField({ font_bn: e.target.value })}
              className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {FONT_CHOICES.map((f) => (
                <option key={f} value={f}>{f.split(",")[0]}</option>
              ))}
            </select>
          </SettingsField>
          <div className="grid grid-cols-2 gap-4">
            <SettingsField label="Base font size">
              <Input
                type="number"
                min={12}
                max={22}
                value={form.font_size_base}
                onChange={(e) => setField({ font_size_base: e.target.value })}
                className="h-9"
              />
            </SettingsField>
            <SettingsField label="Radius scale">
              <Input
                type="number"
                step={0.25}
                min={0.5}
                max={2}
                value={form.radius_scale}
                onChange={(e) => setField({ radius_scale: e.target.value })}
                className="h-9"
              />
            </SettingsField>
          </div>
          <SettingsField label="Custom CSS" className="sm:col-span-2">
            <Textarea
              value={form.custom_css}
              onChange={(e) => setField({ custom_css: e.target.value })}
              rows={3}
              placeholder="body { letter-spacing: 0.01em; } /* injected into <style id=site-custom-css> */"
              className="font-mono text-xs"
            />
          </SettingsField>
        </div>
      </SettingsSection>

      {/* Maintenance */}
      <SettingsSection title="Maintenance" desc="Show a bilingual maintenance notice instead of the site when enabled.">
        <div className="flex items-center gap-3 mb-4">
          <Switch
            checked={form.maintenance_enabled}
            onCheckedChange={(v) => setField({ maintenance_enabled: v })}
          />
          <span className="text-sm text-muted-foreground">
            {form.maintenance_enabled ? "Maintenance mode is ON" : "Maintenance mode is OFF"}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingsField label="Title (EN)">
            <Input value={form.maintenance_title_en} onChange={(e) => setField({ maintenance_title_en: e.target.value })} className="h-9" />
          </SettingsField>
          <SettingsField label="Title (BN)">
            <Input value={form.maintenance_title_bn} onChange={(e) => setField({ maintenance_title_bn: e.target.value })} className="h-9" />
          </SettingsField>
          <SettingsField label="Message (EN)" className="sm:col-span-2">
            <Textarea value={form.maintenance_message_en} onChange={(e) => setField({ maintenance_message_en: e.target.value })} rows={2} />
          </SettingsField>
          <SettingsField label="Message (BN)" className="sm:col-span-2">
            <Textarea value={form.maintenance_message_bn} onChange={(e) => setField({ maintenance_message_bn: e.target.value })} rows={2} />
          </SettingsField>
        </div>
      </SettingsSection>

      <p className="text-xs text-muted-foreground/70">
        Stored overrides: {mockGetSettings() ? "active" : "none (defaults)"}. The header brand name,
        footer tagline, fonts, accent color and book-grid CSS update on the public site immediately
        after saving.
      </p>
    </div>
  );
}

/* â”€â”€â”€ Notifications tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function NotificationsTab() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["mock-admin", "notifications"],
    queryFn: async () => mockGetAllNotifications(),
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread} unread Â· {notifications.length} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-sm"
          onClick={async () => {
            const userIds = [...new Set(notifications.map((n) => n.userId))];
            await Promise.all(userIds.map((id) => mockMarkAllRead(id)));
            toast.success("All notifications marked as read.");
          }}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {notifications.length === 0 && <EmptyState label="No notifications yet." />}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 rounded-lg border bg-card p-4 transition-colors ${
              n.read ? "border-border/40" : "border-primary/30 bg-primary/[0.03]"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {n.type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground/70">Â· {timeAgo(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{n.message}</p>
              {n.link && (
                <a
                  href={n.link}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {n.link}
                </a>
              )}
            </div>
            {!n.read && (
              <button
                onClick={async () => {
                  await mockMarkRead(n.userId, n.id);
                  toast.success("Marked as read.");
                }}
                aria-label="Mark as read"
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
