import { CheckCircle, Clock, XCircle, RotateCcw } from "lucide-react";

export type OrderStatus = "processing" | "paid" | "failed" | "refunded";

const STATUS_STYLE: Record<OrderStatus, string> = {
  processing:
    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300/40",
  paid: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-300/40",
  failed:
    "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300/40",
  refunded:
    "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-300/40",
};

const STATUS_ICON = {
  processing: Clock,
  paid: CheckCircle,
  failed: XCircle,
  refunded: RotateCcw,
} as const;

const BILINGUAL_LABEL: Record<OrderStatus, { en: string; bn: string }> = {
  processing: { en: "Processing", bn: "প্রক্রিয়াধীন" },
  paid: { en: "Paid", bn: "পরিশোধিত" },
  failed: { en: "Failed", bn: "ব্যর্থ" },
  refunded: { en: "Refunded", bn: "ফেরত" },
};

export function OrderStatusBadge({
  status = "paid",
  lang = "en",
  className = "",
}: {
  status?: OrderStatus | string;
  lang?: "en" | "bn";
  className?: string;
}) {
  const safe = (["processing", "paid", "failed", "refunded"].includes(status)
    ? status
    : "paid") as OrderStatus;
  const Icon = STATUS_ICON[safe];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-1 rounded-full border ${STATUS_STYLE[safe]} ${className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {BILINGUAL_LABEL[safe][lang] ?? BILINGUAL_LABEL[safe].en}
    </span>
  );
}