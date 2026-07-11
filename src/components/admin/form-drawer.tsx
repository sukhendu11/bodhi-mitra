import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormActions } from "@/components/admin/form-actions";

interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  isPending: boolean;
  submitLabel: string;
  submittingLabel?: string;
  onSubmit: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeMap: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-[600px]",
};

export function FormDrawer({
  open,
  onClose,
  title,
  description,
  children,
  isPending,
  submitLabel,
  submittingLabel,
  onSubmit,
  size = "md",
}: FormDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className={sizeMap[size] ?? sizeMap.md}>
        <SheetHeader className="mb-6">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex flex-col h-[calc(100vh-8rem)]">
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-6">
              {children}
            </div>
          </ScrollArea>
          <div className="border-t border-border/60 -mx-6 px-6 pt-4 mt-auto">
            <FormActions
              onCancel={onClose}
              isPending={isPending}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
            />
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
