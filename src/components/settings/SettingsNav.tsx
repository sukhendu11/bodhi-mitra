import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Settings groups — user-goal buckets that order the flat section list.
 * Each group renders a small header label above its items in the sidebar
 * (and as a leading chip in the mobile scroll row).
 */
export type SettingsGroup = "account" | "reading" | "privacy";

export const SETTINGS_GROUP_LABELS: Record<
  SettingsGroup,
  { label: string; labelBn: string }
> = {
  account: { label: "Account", labelBn: "অ্যাকাউন্ট" },
  reading: { label: "Reading & Appearance", labelBn: "পঠন ও চেহারা" },
  privacy: { label: "Privacy & Help", labelBn: "গোপনীয়তা ও সহায়তা" },
};

export interface SettingsSectionDef {
  id: string;
  label: string;
  labelBn: string;
  icon: LucideIcon;
  group: SettingsGroup;
}

/**
 * Settings section navigation — GitHub-style sticky left sidebar on desktop,
 * horizontal scroll chips on mobile. `activeId` is scroll-spied by the parent.
 * Sections are grouped by user goal (Account / Reading & Appearance /
 * Privacy & Help); a group header renders when the group changes.
 */
export function SettingsNav({
  sections,
  activeId,
  onSelect,
  bn,
}: {
  sections: SettingsSectionDef[];
  activeId: string;
  onSelect: (id: string) => void;
  bn: boolean;
}) {
  const scrollTo = (id: string) => {
    onSelect(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const groupLabel = (g: SettingsGroup) =>
    bn ? SETTINGS_GROUP_LABELS[g].labelBn : SETTINGS_GROUP_LABELS[g].label;

  const showsGroupHeader = (i: number) =>
    i === 0 || sections[i - 1].group !== sections[i].group;

  return (
    <>
      {/* Desktop — sticky left column */}
      <nav
        aria-label="Settings sections"
        className="hidden lg:block lg:col-start-1"
      >
        <div className="sticky top-28 flex flex-col gap-1">
          {sections.map((s, i) => {
            const active = s.id === activeId;
            return (
              <Fragment key={s.id}>
                {showsGroupHeader(i) && (
                  <p className="mt-4 mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 first:mt-0">
                    {groupLabel(s.group)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 text-left cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {bn ? s.labelBn : s.label}
                </button>
              </Fragment>
            );
          })}
        </div>
      </nav>

      {/* Mobile — horizontal scroll chips */}
      <div className="lg:hidden -mx-6 px-6 mb-8">
        <div
          className="flex gap-2 overflow-x-auto pb-2 thumbnail-scroll"
          role="tablist"
          aria-label="Settings sections"
        >
          {sections.map((s, i) => {
            const active = s.id === activeId;
            return (
              <Fragment key={s.id}>
                {showsGroupHeader(i) && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-flex items-center px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60"
                  >
                    {groupLabel(s.group)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card",
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {bn ? s.labelBn : s.label}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}
