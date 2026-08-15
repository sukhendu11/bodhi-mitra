/**
 * Refine admin app shell — P2 custom admin (AD-029).
 *
 * Wraps the admin in Refine's provider (dataProvider seam: mock-first,
 * Supabase-swappable). TanStack Router remains the app shell — Refine routing
 * is optional in v5, so resources render in tabs managed by local state
 * (same pattern as the verified MockAdminPanel).
 *
 * Rendered by `/admin` in real mode AND mock mode (Refine is the mock-mode
 * default since 2026-08-15; the legacy MockAdminPanel remains reachable via
 * the `?admin=mock` preview seam until its features are fully covered).
 */
import { Refine } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  Receipt,
  Video,
  Feather,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, toBanglaDigits, formatMoney } from "@/lib/i18n";
import { getAdminDataProvider } from "@/lib/admin/data-provider";
import { ADMIN_RESOURCE_DEFS } from "@/lib/admin/resources";
import { canViewResource, useAdminRole } from "@/lib/admin/rbac";
import { getAdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { ResourceList } from "./ResourceList";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-serif text-2xl text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

function DashboardTab() {
  const { lang } = useLang();
  const bn = lang === "bn";
  const role = useAdminRole();

  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: getAdminDashboardStats,
  });

  // Only show resources the signed-in role may view (RBAC, P2).
  const visibleDefs = ADMIN_RESOURCE_DEFS.filter((def) => canViewResource(role, def.name));
  const s = stats ?? null;
  // Bengali digits only in BN mode — never in EN (was unconditional).
  const dash = (v: number | undefined) =>
    v === undefined ? "—" : bn ? toBanglaDigits(String(v)) : String(v);
  const money = (v: number | undefined) =>
    v === undefined ? "—" : formatMoney(v, bn ? "bn" : "en");

  return (
    <div className="px-6 pt-5">
      <h2 className="font-serif text-xl text-foreground">
        {bn ? "ড্যাশবোর্ড" : "Dashboard"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {bn
          ? "সব রিসোর্স বাম প্যানেল থেকে পরিচালনা করুন।"
          : "Manage every resource from the sidebar. Real-mode CRUD runs through Supabase; mock mode uses the offline stores."}
      </p>

      {/* Analytics — stat cards (M5 dashboard parity) */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={bn ? "বই" : "Books"} value={dash(s?.books)} sub={`${dash(s?.publishedBooks)} ${bn ? "প্রকাশিত" : "published"}`} icon={BookOpen} />
        <StatCard label={bn ? "প্রতিফলন" : "Reflections"} value={dash(s?.posts)} sub={`${dash(s?.publishedPosts)} ${bn ? "প্রকাশিত" : "published"}`} icon={Feather} />
        <StatCard label={bn ? "ভিডিও" : "Videos"} value={dash(s?.videos)} icon={Video} />
        <StatCard label={bn ? "অর্ডার" : "Orders"} value={dash(s?.orders)} sub={`${dash(s?.paidOrders)} ${bn ? "পরিশোধিত" : "paid"}`} icon={Receipt} />
        <StatCard label={bn ? "ক্রয়" : "Purchases"} value={dash(s?.purchases)} icon={ShoppingBag} />
        <StatCard label={bn ? "আয়" : "Revenue"} value={money(s?.revenue)} sub={bn ? "পরিশোধিত অর্ডার" : "paid orders only"} icon={Wallet} />
      </div>

      {/* Resource index — clickable quick links (RBAC-filtered) */}
      <h3 className="mt-8 font-serif text-base text-foreground">
        {bn ? "রিসোর্স" : "Resources"}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleDefs.map((def) => {
          const Icon = def.icon;
          return (
            <div
              key={def.name}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{bn ? def.labelBn : def.labelEn}</p>
                <p className="truncate text-xs text-muted-foreground">{def.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefineAdminBody() {
  const { lang } = useLang();
  const bn = lang === "bn";
  const role = useAdminRole();
  // RBAC (P2): only resources the role may view appear in the sidebar.
  const visibleDefs = ADMIN_RESOURCE_DEFS.filter((def) => canViewResource(role, def.name));
  const [active, setActive] = useState<string>("dashboard");

  const tabs: { id: string; labelEn: string; labelBn: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", labelEn: "Dashboard", labelBn: "ড্যাশবোর্ড", icon: LayoutDashboard },
    ...visibleDefs.map((def) => ({
      id: def.name,
      labelEn: def.labelEn,
      labelBn: def.labelBn,
      icon: def.icon,
    })),
  ];

  // If the active tab is no longer visible (role change / mock reset),
  // render the dashboard instead of a hidden resource (no state write
  // during render — the sidebar click handler still drives real switches).
  const effectiveActive = active !== "dashboard" && !tabs.some((t) => t.id === active)
    ? "dashboard"
    : active;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border/60 bg-card/40 md:flex">
        <div className="px-4 py-4">
          <p className="font-serif text-base text-foreground">
            ❖ <span className="hidden lg:inline">{bn ? "সব্বে সত্তা" : "Sabbe Satta"}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {bn ? "অ্যাডমিন" : "Admin"}
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = effectiveActive === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{bn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border/60 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {bn ? "সাইটে ফিরুন" : "Back to site"}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Mobile resource selector */}
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  effectiveActive === tab.id
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {bn ? tab.labelBn : tab.labelEn}
              </button>
            ))}
          </div>
        </div>

        {effectiveActive === "dashboard" ? (
          <DashboardTab />
        ) : (
          <ResourceList key={effectiveActive} resource={effectiveActive} />
        )}
      </div>
    </div>
  );
}

export function RefineAdminApp() {
  return (
    <Refine dataProvider={{ default: getAdminDataProvider() }}>
      <RefineAdminBody />
    </Refine>
  );
}
