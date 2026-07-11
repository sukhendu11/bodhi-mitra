import { useNavigate, useRouterState } from "@tanstack/react-router";
import { PanelRightClose, PanelRight, Info, Keyboard, Zap, ExternalLink, Hash, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── Props ──────────────────────────────────────────────────────── */

interface AdminInspectorProps {
  collapsed: boolean;
  onToggle: () => void;
}

/* ─── Shortcut data ──────────────────────────────────────────────── */

interface ShortcutItem {
  keys: string;
  label: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: "⌘K", label: "Command Palette" },
  { keys: "⌘N", label: "New Post" },
  { keys: "?", label: "Shortcuts Help" },
  { keys: "/", label: "Focus Search" },
];

/* ─── Inspector Panel ────────────────────────────────────────────── */

export function AdminInspector({ collapsed, onToggle }: AdminInspectorProps) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const activeSection = getActiveSection(currentPath);

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col bg-white dark:bg-zinc-950 border-l border-border/60 transition-all duration-300 ease-in-out relative",
        collapsed ? "w-[42px]" : "w-[280px]",
      )}
      style={{ height: "100vh", position: "sticky", top: 0 }}
    >
      {/* Toggle bar */}
      <div className={cn(
        "flex items-center h-14 shrink-0 border-b border-border/40",
        collapsed ? "justify-center px-2" : "justify-between px-3",
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              Inspector
            </span>
          </div>
        )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className={cn(
                  "rounded-lg transition-colors hover:bg-secondary/60 text-muted-foreground/50 hover:text-foreground",
                  collapsed ? "p-2" : "p-1.5",
                )}
                aria-label={collapsed ? "Open inspector" : "Close inspector"}
              >
                {collapsed ? (
                  <PanelRight className="h-4 w-4" />
                ) : (
                  <PanelRightClose className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-[0.55rem]">
              {collapsed ? "Open Inspector" : "Close Inspector"}
            </TooltipContent>
          </Tooltip>
      </div>

      {collapsed ? (
        /* Collapsed: vertical icons */
        <div className="flex flex-col items-center gap-3 py-4">
          <CollapsedIcon icon={Info} label="Page Info" />
          <CollapsedIcon icon={Zap} label="Quick Actions" />
          <CollapsedIcon icon={Keyboard} label="Shortcuts" />
        </div>
      ) : (
        /* Expanded: full content */
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Page Information */}
            <Section title="Page Information" icon={Info}>
              <div className="space-y-2">
                <InfoRow icon={Hash} label="Route" value={currentPath} />
                <InfoRow icon={Layers} label="Section" value={activeSection} />
              </div>
            </Section>

            <Separator />

            {/* Quick Actions */}
            <Section title="Quick Actions" icon={Zap}>
              <div className="space-y-1">
                <QuickActionButton
                  label="New Post"
                  shortcut="⌘N"
                  onClick={() => navigate({ to: "/admin/new" })}
                />
                <QuickActionButton
                  label="Media Library"
                  onClick={() => navigate({ to: "/admin/media" })}
                />
                <QuickActionButton
                  label="View Site"
                  icon={<ExternalLink className="h-3 w-3" />}
                  onClick={() => navigate({ to: "/" })}
                />
              </div>
            </Section>

            <Separator />

            {/* Keyboard Shortcuts */}
            <Section title="Keyboard Shortcuts" icon={Keyboard}>
              <div className="space-y-1.5">
                {shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-[0.6rem] text-muted-foreground">{s.label}</span>
                    <kbd className="inline-flex items-center justify-center h-5 min-w-[1.5rem] px-1 text-[0.5rem] font-mono font-semibold bg-secondary text-secondary-foreground/80 border border-border/60 rounded">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </Section>

            <Separator />

            {/* System Info */}
            <Section title="System" icon={Clock}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.55rem] text-muted-foreground">Version</span>
                  <span className="text-[0.55rem] font-mono text-muted-foreground/70">1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.55rem] text-muted-foreground">Environment</span>
                  <span className="text-[0.55rem] font-mono text-emerald-600 dark:text-emerald-400">
                    {import.meta.env.DEV ? "Development" : "Production"}
                  </span>
                </div>
              </div>
            </Section>

            {/* Bottom spacer */}
            <div className="h-2" />
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function CollapsedIcon({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors">
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[0.55rem]">
          {label}
        </TooltipContent>
      </Tooltip>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            {title}
          </span>
        </div>
        <CollapsibleContent>
          <div className="pl-0.5">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.5rem] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-[0.6rem] font-mono text-foreground/80 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function QuickActionButton({ label, shortcut, icon, onClick }: { label: string; shortcut?: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[0.6rem] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {shortcut && (
        <kbd className="inline-flex items-center justify-center h-4 min-w-[1.25rem] px-1 text-[0.45rem] font-mono text-muted-foreground/40 border border-border/40 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

/* ─── Helper ─────────────────────────────────────────────────────── */

function getActiveSection(path: string): string {
  if (path === "/admin" || path === "/admin/") return "Dashboard";
  if (path.startsWith("/admin/books")) return "Books";
  if (path.startsWith("/admin/videos")) return "Videos";
  if (path.startsWith("/admin/courses")) return "Courses";
  if (path.startsWith("/admin/pages")) return "Pages";
  if (path.startsWith("/admin/media")) return "Media";
  if (path.startsWith("/admin/new")) return "New Post";
  if (path.startsWith("/admin/comments")) return "Moderation";
  if (path.startsWith("/admin/navigation")) return "Navigation";
  if (path.startsWith("/admin/taxonomy")) return "Taxonomy";
  if (path.startsWith("/admin/users")) return "Users";
  if (path.startsWith("/admin/audit")) return "Audit Log";
  if (path.startsWith("/admin/settings")) return "Settings";
  return "Unknown";
}
