import type { Control, FieldPath, FieldValues, FieldPathValue } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shared label class used across all admin forms.
 * Extracted to avoid repeating this long Tailwind string ~40 times.
 */
export const FIELD_LABEL =
  "block text-[0.55rem] font-medium text-muted-foreground mb-1.5 uppercase tracking-[0.05em]";

interface BilingualFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  nameEn: FieldPath<TFieldValues>;
  nameBn: FieldPath<TFieldValues>;
  labelEn: string;
  labelBn: string;
  placeholderEn?: string;
  placeholderBn?: string;
  /** Defaults to "input". Use "textarea" for longer text fields. */
  as?: "input" | "textarea";
  textareaRows?: number;
}

/**
 * Renders a side-by-side grid of two FormField components for English and
 * Bengali versions of the same logical field (e.g. title, description, body).
 *
 * Each field shows a styled label, an Input/Textarea, and an optional
 * validation error message.
 */
export function BilingualField<TFieldValues extends FieldValues = FieldValues>({
  control,
  nameEn,
  nameBn,
  labelEn,
  labelBn,
  placeholderEn,
  placeholderBn,
  as = "input",
  textareaRows = 4,
}: BilingualFieldProps<TFieldValues>) {
  const InputComponent = as === "textarea" ? Textarea : Input;
  const inputProps = as === "textarea" ? { rows: textareaRows } : {};

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={control}
        name={nameEn}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>{labelEn}</FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputProps}
                placeholder={placeholderEn}
              />
            </FormControl>
            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={nameBn}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>{labelBn}</FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputProps}
                placeholder={placeholderBn}
              />
            </FormControl>
            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
          </FormItem>
        )}
      />
    </div>
  );
}

interface FormFieldRowProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  /** Defaults to "input". Use "textarea" for longer text fields. */
  as?: "input" | "textarea";
  textareaRows?: number;
  disabled?: boolean;
}

/**
 * A single field row for the admin form style — label above, field below,
 * with validation message support.
 */
export function FormFieldRow<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label,
  placeholder,
  as = "input",
  textareaRows = 4,
  disabled,
}: FormFieldRowProps<TFieldValues>) {
  const InputComponent = as === "textarea" ? Textarea : Input;
  const inputProps = as === "textarea" ? { rows: textareaRows } : {};

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className={FIELD_LABEL}>{label}</FormLabel>
          <FormControl>
            <InputComponent
              {...field}
              value={field.value ?? ""}
              {...inputProps}
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
