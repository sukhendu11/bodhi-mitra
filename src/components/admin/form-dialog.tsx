import type { ReactNode } from "react";
import { FormActions } from "@/components/admin/form-actions";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isPending: boolean;
  submitLabel: string;
  submittingLabel?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  onSubmit: () => void;
}

const sizeMap: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

export function FormDialog({
  open,
  onClose,
  title,
  children,
  isPending,
  submitLabel,
  submittingLabel,
  size = "xl",
  onSubmit,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-screen flex items-start justify-center p-4 pt-12">
        <div
          className={`w-full ${sizeMap[size] ?? sizeMap.xl} bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-border/60">
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
            <FormActions
              onCancel={onClose}
              isPending={isPending}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
