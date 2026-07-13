import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        compact ? "py-8" : "py-16"
      } px-6 text-center`}
    >
      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/80 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground/60 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="text-xs gap-1.5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
