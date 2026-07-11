import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
}

export function FormActions({
  onCancel,
  isPending,
  submitLabel,
  submittingLabel = "Saving…",
  isSubmitting,
}: FormActionsProps) {
  const saving = isSubmitting ?? isPending;

  return (
    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={isPending} size="sm">
        {saving ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}
