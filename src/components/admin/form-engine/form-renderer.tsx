import type { FieldValues, UseFormReturn } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ValidationSummary } from "./validation-summary";
import type { FormGroup } from "./types";
import { renderGroupFields } from "./field-renderer";
import { useFormKeyboard } from "./use-form-keyboard";

/* ─── Props ──────────────────────────────────────────────────────── */

interface FormRendererProps<TForm extends FieldValues> {
  form: UseFormReturn<TForm>;
  /** Field groups to render */
  groups?: FormGroup<TForm>[];
  /** Children can be provided instead of/in addition to groups */
  children?: React.ReactNode;
  /** Show validation summary at the top (default true) */
  showValidationSummary?: boolean;
  /** Custom class name for the form wrapper's inner container */
  className?: string;
  /** Callback when submit is attempted but validation fails */
  onValidationError?: (errors: Record<string, any>) => void;
  /** Called on Ctrl+S (or Cmd+S on Mac) for save */
  onSave?: () => void;
  /** Called on Escape for cancel/close */
  onCancel?: () => void;
}

/* ─── Form Renderer ──────────────────────────────────────────────── */

export function FormRenderer<TForm extends FieldValues>({
  form,
  groups,
  children,
  showValidationSummary = true,
  className,
  onValidationError,
  onSave,
  onCancel,
}: FormRendererProps<TForm>) {
  const formErrors = form.formState.errors;
  const hasErrors = Object.keys(formErrors).length > 0;

  useFormKeyboard({ onSave, onCancel });

  return (
    <Form {...form}>
      {/* Validation Summary */}
      {showValidationSummary && hasErrors && <ValidationSummary errors={formErrors} />}

      <div className={className ?? "space-y-6"}>
        {/* Render field groups */}
        {groups?.map((group, gi) => (
          <div key={group.title || gi}>
            {group.title && (
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-3">
                {group.title}
              </h4>
            )}
            {group.description && (
              <p className="text-[0.65rem] text-muted-foreground mb-3 -mt-1">{group.description}</p>
            )}
            {renderGroupFields(group, form)}
          </div>
        ))}

        {/* Render children after groups */}
        {children}
      </div>
    </Form>
  );
}

/* ─── Inline Field Renderers ─────────────────────────────────────── */

/**
 * Render a single FormField with the standard admin styling.
 * Convenience component for fields that need custom rendering outside
 * the generic field definitions (e.g., conditional fields, custom UIs).
 */
export function AdminTextField<TForm extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  type = "text",
  disabled,
}: {
  form: UseFormReturn<TForm>;
  name: keyof TForm;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "url" | "email";
  disabled?: boolean;
}) {
  const inputExtra: Record<string, any> = {};
  if (type === "number") inputExtra.type = "number";

  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]">
            {label}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              {...inputExtra}
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormControl>
          {fieldState.error && <FormMessage className="text-[0.65rem]" />}
        </FormItem>
      )}
    />
  );
}
