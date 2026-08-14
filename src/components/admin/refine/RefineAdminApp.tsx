/**
 * Refine admin app shell — P2 custom admin (AD-029).
 *
 * Wraps the admin in Refine's provider (dataProvider seam: mock-first,
 * Supabase-swappable). TanStack Router remains the app shell — Refine routing
 * is optional in v5, so resources render in tabs managed by local state
 * (same pattern as the verified MockAdminPanel).
 *
 * Rendered by `/admin` in real mode (and mock mode via the `?admin=refine`
 * preview seam). Mock mode default stays MockAdminPanel per the Mock Data
 * Removal Strategy.
 */
import { Refine } from "@refinedev/core";
import { useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { getAdminDataProvider } from "@/lib/admin/data-provider";
import { ADMIN_RESOURCE_DEFS } from "@/lib/admin/resources";
import { ResourceList } from "./ResourceList";

function DashboardTab() {
  const { lang } = useLang();
  const bn = lang === "bn";
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
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_RESOURCE_DEFS.map((def) => {
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
  const [active, setActive] = useState<string>("dashboard");

  const tabs: { id: string; labelEn: string; labelBn: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", labelEn: "Dashboard", labelBn: "ড্যাশবোর্ড", icon: LayoutDashboard },
    ...ADMIN_RESOURCE_DEFS.map((def) => ({
      id: def.name,
      labelEn: def.labelEn,
      labelBn: def.labelBn,
      icon: def.icon,
    })),
  ];

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
            const isActive = active === tab.id;
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
                  active === tab.id
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {bn ? tab.labelBn : tab.labelEn}
              </button>
            ))}
          </div>
        </div>

        {active === "dashboard" ? (
          <DashboardTab />
        ) : (
          <ResourceList key={active} resource={active} />
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
