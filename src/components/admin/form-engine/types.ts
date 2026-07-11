import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import type { ZodSchema } from "zod";

/* ─── Field Definition ───────────────────────────────────────────── */

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "switch"
  | "color"
  | "bilingual"
  | "bilingual-textarea"
  | "url"
  | "email";

export interface FormFieldDef<TForm extends FieldValues = any> {
  /** Field name for single-value fields (text, textarea, number, select, etc.) */
  name?: FieldPath<TForm>;
  /** English field name (bilingual only) */
  nameEn?: FieldPath<TForm>;
  /** Bengali field name (bilingual only) */
  nameBn?: FieldPath<TForm>;
  /** Field type */
  type: FormFieldType;
  /** Label (or labelEn for bilingual fields) */
  label?: string;
  /** English label (bilingual only) */
  labelEn?: string;
  /** Bengali label (bilingual only) */
  labelBn?: string;
  /** Placeholder (or placeholderEn for bilingual fields) */
  placeholder?: string;
  /** English placeholder (bilingual only) */
  placeholderEn?: string;
  /** Bengali placeholder (bilingual only) */
  placeholderBn?: string;
  /** Description shown below the field */
  description?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Options for select fields */
  options?: { label: string; value: string }[];
  /** Rows for textarea fields */
  rows?: number;
  /** Min value for number fields */
  min?: number;
  /** Max value for number fields */
  max?: number;
  /** Step for number fields */
  step?: number;
  /** (Optional) Custom render override — if provided, all other props are ignored */
  render?: (form: UseFormReturn<TForm>) => React.ReactNode;
  /** (Optional) Conditional visibility */
  showIf?: (values: TForm) => boolean;
}

/* ─── Form Group ──────────────────────────────────────────────────── */

export interface FormGroup<TForm extends FieldValues = any> {
  /** Optional group title */
  title?: string;
  /** Optional group description */
  description?: string;
  /** Number of columns for this group (default 1). Supports 1, 2, or 3. */
  columns?: 1 | 2 | 3;
  /** Fields in this group */
  fields: FormFieldDef<TForm>[];
}

/* ─── Form Engine Config ──────────────────────────────────────────── */

export interface FormEngineConfig<TForm extends FieldValues = any> {
  /** Zod schema for validation */
  schema: ZodSchema<TForm>;
  /** Default form values */
  defaultValues: TForm;
  /** Form field groups */
  groups: FormGroup<TForm>[];
  /** (Optional) Autosave configuration */
  autosave?: {
    /** Debounce delay in ms (default 2000) */
    delay?: number;
    /** Refine resource name */
    resource: string;
    /** Resource ID for updates (omit for creates) */
    id?: string;
  };
}
