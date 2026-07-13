import { useState, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminSection } from "@/lib/admin-routes";
import { supabase } from "@/integrations/supabase/client";
import {
  Wifi,
  WifiOff,
  Database,
  User,
  Clock,
  Activity,
  HardDrive,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── Props ──────────────────────────────────────────────────────── */

interface StatusBarProps {
  userEmail?: string | null;
  userRole?: string | null | undefined;
}

/* ─── Status indicators ──────────────────────────────────────────── */

type IndicatorStatus = "connected" | "disconnected" | "checking";

interface StatusIndicator {
  label: string;
  status: IndicatorStatus;
  icon: typeof Wifi;
}

/* ─── Status Bar ─────────────────────────────────────────────────── */

export function AdminStatusBar({ userEmail, userRole }: StatusBarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Network status
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Database status
  const [dbStatus, setDbStatus] = useState<IndicatorStatus>("checking");

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Ping Supabase every 60s
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    const ping = async () => {
      try {
        setDbStatus("checking");
        const { error } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
        if (cancelled) return;
        setDbStatus(error ? "disconnected" : "connected");
      } catch {
        if (!cancelled) setDbStatus("disconnected");
      }
    };

    ping();
    interval = setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Current time (updates every 30s)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const routeLabel = getAdminSection(currentPath);
  const displayUser = userEmail?.split("@")[0] ?? "Signed out";

  return (
    <footer className="h-7 shrink-0 border-t border-border/40 bg-white dark:bg-zinc-950 flex items-center px-3 gap-3 text-[0.45rem] text-muted-foreground/50">
      {/* Left: Route context + user */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Activity className="h-2.5 w-2.5 text-muted-foreground/30" />
        <span className="truncate max-w-[140px]">{routeLabel}</span>
        <span className="text-muted-foreground/20">|</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 cursor-default">
              <User className="h-2.5 w-2.5 text-muted-foreground/30" />
              <span className="truncate max-w-[80px]">{displayUser}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[0.5rem]">
            {userEmail ?? "Not signed in"} · {userRole ?? "No role"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Center: Environment */}
      <div className="hidden sm:flex items-center gap-1.5">
        <HardDrive className="h-2.5 w-2.5 text-muted-foreground/30" />
        <span>{import.meta.env.DEV ? "Development" : "Production"}</span>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-2">
        {/* Database status */}          <StatusDot
            status={dbStatus}
            icon={Database}
            label="Supabase"
          />

        {/* Network status */}
        <StatusDot
          status={online ? "connected" : "disconnected"}
          icon={online ? Wifi : WifiOff}
          label={online ? "Network" : "Offline"}
        />

        <span className="text-muted-foreground/20 mx-0.5">|</span>

        {/* Clock */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 cursor-default">
              <Clock className="h-2.5 w-2.5 text-muted-foreground/30" />
              <span className="font-mono tabular-nums">
                {now.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[0.5rem]">
            {now.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </TooltipContent>
        </Tooltip>
      </div>
    </footer>
  );
}

/* ─── Status Dot ─────────────────────────────────────────────────── */

function StatusDot({
  status,
  icon: Icon,
  label,
}: {
  status: IndicatorStatus;
  icon: LucideIcon;
  label: string;
}) {
  const color =
    status === "connected"
      ? "text-emerald-500"
      : status === "disconnected"
        ? "text-red-500"
        : "text-amber-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 cursor-default">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              status === "connected" && "bg-emerald-500",
              status === "disconnected" && "bg-red-500",
              status === "checking" && "bg-amber-500 animate-pulse",
            )}
          />
          <Icon className={cn("h-2.5 w-2.5", color)} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[0.5rem]">
        {label}: {status}
      </TooltipContent>
    </Tooltip>
  );
}


