import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  slate: "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: keyof typeof colorMap;
}

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight">{value}</p>
        <p className="text-[0.55rem] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
