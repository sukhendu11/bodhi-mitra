/**
 * Reusable form footer with Cancel and Submit buttons.
 * Used across admin modals (pages, books, videos, etc.).
 */

interface FormActionsProps {
  /** Cancel / reset handler */
  onCancel: () => void;
  /** Whether the submit action is pending */
  isPending: boolean;
  /** Label for the submit button — e.g. "Create Book", "Update Page" */
  submitLabel: string;
  /** Override for the submitting state label (defaults to "Saving…") */
  submittingLabel?: string;
  /** If true, the submit button shows its loading/saving state */
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
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {saving ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
