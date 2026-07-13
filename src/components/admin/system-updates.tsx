import {
  Package,
  Database,
  ArrowUpRight,
  Activity,
  Shield,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

/* ─── Version ────────────────────────────────────────────────────── */

const APP_VERSION = "3.0.0";

/* ─── System Updates ─────────────────────────────────────────────── */

export function SystemUpdates() {
  const stats = [
    {
      icon: Package,
      label: "App Version",
      value: `v${APP_VERSION}`,
      detail: import.meta.env.DEV ? "Development" : "Production",
    },
    {
      icon: Database,
      label: "Migrations",
      value: "40+ applied",
      detail: "Latest: Jul 12, 2026",
    },
    {
      icon: Shield,
      label: "Role-based Access",
      value: "Active",
      detail: "Super Admin · Admin · Editor · Author",
    },
    {
      icon: Activity,
      label: "System Status",
      value: "All systems nominal",
      detail: "Supabase · Stripe · Resend",
    },
  ];

  const links = [
    { to: "/admin/audit", label: "Audit Log", icon: Clock },
    { to: "/admin/settings", label: "Settings", icon: ExternalLink },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground/60" />
          System
        </h3>
      </div>
      <div className="p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <stat.icon className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                  {stat.label}
                </span>
              </div>
              <p className="text-xs font-medium">{stat.value}</p>
              <p className="text-[0.55rem] text-muted-foreground">{stat.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to as any}
              className="inline-flex items-center gap-1 text-[0.55rem] text-muted-foreground hover:text-foreground transition-colors"
            >
              <link.icon className="h-3 w-3" />
              {link.label}
              <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
