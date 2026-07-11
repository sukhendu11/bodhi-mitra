import { AlertCircle } from "lucide-react";

/* ─── Props ──────────────────────────────────────────────────────── */

interface ValidationSummaryProps {
  errors: Record<string, any>;
  className?: string;
}

/* ─── Validation Summary ──────────────────────────────────────────── */

/**
 * Displays a collapsible error summary banner at the top of the form.
 * Extracts all error messages from the form state and shows them as a list.
 */
export function ValidationSummary({ errors, className }: ValidationSummaryProps) {
  const errorMessages: string[] = [];

  // Recursively extract error messages
  function extractErrors(obj: Record<string, any>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      if (value?.message && typeof value.message === "string") {
        errorMessages.push(value.message);
      } else if (value && typeof value === "object") {
        extractErrors(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  extractErrors(errors);

  if (errorMessages.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-destructive/30 bg-destructive/5 p-4 ${className ?? ""}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-destructive">
            {errorMessages.length === 1
              ? "1 form error"
              : `${errorMessages.length} form errors`}
          </p>
          <ul className="mt-2 space-y-1">
            {errorMessages.map((msg, i) => (
              <li key={i} className="text-[0.65rem] text-destructive/90 leading-relaxed">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
