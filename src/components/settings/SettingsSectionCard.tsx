import type { LucideIcon } from "lucide-react";

/**
 * Shared Settings section card — the rounded-2xl bordered panel used by every
 * section on the /settings page (the page's established card treatment).
 */
export function SettingsSectionCard({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: LucideIcon;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-center gap-2 text-sm text-foreground mb-6">
        <Icon className="h-4 w-4 shrink-0" />
        <h2 id={`${id}-title`} className="text-xl font-semibold">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
