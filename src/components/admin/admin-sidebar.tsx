import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMemo } from "react";

/* ─── Nav types ─────────────────────────────────────────────────── */

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

export interface NavSection {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/* ─── Props ──────────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  sections: NavSection[];
}

/* ─── Sidebar ────────────────────────────────────────────────────── */

export function AdminSidebar({ collapsed, onToggle, sections }: SidebarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const visibleSections = useMemo(
    () => sections.filter((s) => s.items.length > 0),
    [sections],
  );

  const isActive = (to: string, exact: boolean) =>
    exact ? currentPath === to : currentPath.startsWith(to + (to === "/admin" ? "" : "/")) || currentPath === to;

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col bg-zinc-900 text-zinc-300 transition-all duration-300 ease-in-out z-20",
        collapsed ? "md:w-16" : "md:w-60",
      )}
      style={{ height: "100vh", position: "sticky", top: 0 }}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center h-14 shrink-0 border-b border-zinc-800/80",
        collapsed ? "justify-center px-0" : "px-4",
      )}>
        {!collapsed ? (
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-400 transition-colors">
              <span className="text-[0.5rem] font-bold text-white">BM</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight leading-tight text-white">Bodhi Mitra</h1>
              <p className="text-[0.55rem] text-zinc-500 leading-tight">CMS Dashboard</p>
            </div>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/admin" className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center hover:bg-orange-400 transition-colors">
                <span className="text-[0.5rem] font-bold text-white">BM</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[0.55rem]">Bodhi Mitra CMS</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-5 scrollbar-thin">
        {visibleSections.map((section) => {
          const SectionIcon = section.icon;
          const sectionActive = section.items.some((item) => isActive(item.to, item.exact));
          return (
            <div key={section.label}>
              {/* Section header */}
              <div className={cn(
                "flex items-center gap-2 mb-1.5",
                collapsed ? "justify-center" : "px-2",
              )}>
                <SectionIcon className={cn(
                  "h-3 w-3 shrink-0 transition-colors",
                  sectionActive ? "text-orange-400" : "text-zinc-600",
                )} />
                {!collapsed && (
                  <p className={cn(
                    "text-[0.55rem] uppercase tracking-[0.12em] font-semibold",
                    sectionActive ? "text-zinc-400" : "text-zinc-600",
                  )}>
                    {section.label}
                  </p>
                )}
              </div>

              {/* Nav items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.to, item.exact);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.exact }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm transition-all duration-150 relative group",
                        collapsed ? "justify-center px-0 py-2.5 mx-auto w-10" : "px-3 py-2",
                        active
                          ? "bg-orange-500/15 text-orange-400 font-medium"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-full" />
                      )}
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        active ? "text-orange-400" : "text-zinc-500 group-hover:scale-110",
                      )} />
                      {!collapsed && <span className="text-xs">{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="text-[0.55rem]">
                          {item.label}
                          {active && " • Active"}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-zinc-800/80 px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors",
                collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
              )}
            >
              {collapsed ? (
                <PanelLeft className="h-3.5 w-3.5" />
              ) : (
                <><PanelLeftClose className="h-3.5 w-3.5" /> Collapse</>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[0.55rem]">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
        {!collapsed && (
          <p className="text-[0.45rem] text-zinc-700 text-center tracking-wide mt-1">
            ⌘K Search &bull; ? Shortcuts
          </p>
        )}
      </div>
    </aside>
  );
}
