import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type React from "react";
import { Switch } from "@/components/ui/switch";
import { FIELD_LABEL } from "@/components/admin/bilingual-field";
import type { FormFieldDef, FormGroup } from "./types";

/* ─── Props ──────────────────────────────────────────────────────── */

interface RenderFieldProps<TForm extends FieldValues> {
  def: FormFieldDef<TForm>;
  form: UseFormReturn<TForm>;
}

/* ─── Field Renderer ─────────────────────────────────────────────── */

export function RenderField<TForm extends FieldValues>({
  def,
  form,
}: RenderFieldProps<TForm>) {
  // Custom render override
  if (def.render) {
    return <>{def.render(form)}</>;
  }

  // Bilingual fields render side-by-side
  if (def.type === "bilingual" || def.type === "bilingual-textarea") {
    return renderBilingual(def as FormFieldDef<TForm> & { nameEn: keyof TForm; nameBn: keyof TForm }, form);
  }

  // Standard single-value fields
  return renderStandardField(def, form);
}

/* ─── Single-value Standard Field ──────────────────────────────────── */

function renderStandardField<TForm extends FieldValues>(
  def: FormFieldDef<TForm>,
  form: UseFormReturn<TForm>,
) {
  if (!def.name) return null;
  const InputComponent = def.type === "textarea" ? Textarea : Input;
  const inputExtraProps: Record<string, any> = {};
  if (def.type === "textarea" && def.rows) inputExtraProps.rows = def.rows;
  if (def.type === "number") {
    inputExtraProps.type = "number";
    if (def.min !== undefined) inputExtraProps.min = def.min;
    if (def.max !== undefined) inputExtraProps.max = def.max;
    if (def.step !== undefined) inputExtraProps.step = def.step;
  }
  if (def.type === "url") inputExtraProps.type = "url";
  if (def.type === "email") inputExtraProps.type = "email";

  return (
    <FormField
      control={form.control}
      name={def.name}
      render={({ field, fieldState }) => {
        // Select
        if (def.type === "select" && def.options) {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>{def.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={def.placeholder || `Select ${def.label?.toLowerCase()}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {def.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Checkbox
        if (def.type === "checkbox") {
          return (
            <FormItem>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
                />
                <span className="text-[0.6rem] font-medium">{def.label}</span>
              </label>
            </FormItem>
          );
        }

        // Switch
        if (def.type === "switch") {
          return (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="text-xs font-medium text-muted-foreground cursor-pointer">
                {def.label}
              </FormLabel>
            </FormItem>
          );
        }

        // Color
        if (def.type === "color") {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>{def.label}</FormLabel>
              <FormControl>
                <input
                  type="color"
                  value={field.value || "#000000"}
                  onChange={field.onChange}
                  className="w-full h-9 rounded-lg border border-border/60 cursor-pointer bg-background"
                />
              </FormControl>
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Text, Textarea, Number, URL, Email
        return (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>{def.label}</FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputExtraProps}
                placeholder={def.placeholder}
                disabled={def.disabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  if (def.type === "number") {
                    field.onChange(def.step && def.step < 1 ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0);
                  } else {
                    field.onChange(e.target.value);
                  }
                }}
              />
            </FormControl>
            {def.description && (
              <p className="text-[0.55rem] text-muted-foreground mt-1">{def.description}</p>
            )}
            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
          </FormItem>
        );
      }}
    />
  );
}

/* ─── Bilingual Field ────────────────────────────────────────────── */

function renderBilingual<TForm extends FieldValues>(
  def: FormFieldDef<TForm> & { nameEn: keyof TForm; nameBn: keyof TForm },
  form: UseFormReturn<TForm>,
) {
  const InputComponent = def.type === "bilingual-textarea" ? Textarea : Input;
  const inputExtraProps: Record<string, any> = {};
  if (def.type === "bilingual-textarea" && def.rows) inputExtraProps.rows = def.rows;

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name={def.nameEn as any}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>{def.labelEn || def.label || "English"}</FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputExtraProps}
                placeholder={def.placeholderEn || def.placeholder}
              />
            </FormControl>
            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={def.nameBn as any}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>{def.labelBn || "Bengali"}</FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputExtraProps}
                placeholder={def.placeholderBn}
              />
            </FormControl>
            {fieldState.error && <FormMessage className="text-[0.65rem]" />}
          </FormItem>
        )}
      />
    </div>
  );
}

/* ─── Field Renderer Map ─────────────────────────────────────────── */

/**
 * Renders all fields from a group definition, respecting column layout.
 * Used by FormRenderer internally.
 */
export function renderGroupFields<TForm extends FieldValues>(
  group: FormGroup<TForm>,
  form: UseFormReturn<TForm>,
): React.ReactNode {
  let gridClass = "space-y-4";
  if (group.columns === 2) gridClass = "grid grid-cols-2 gap-4";
  else if (group.columns === 3) gridClass = "grid grid-cols-3 gap-4";

  return (
    <div className={gridClass}>
      {group.fields.map((fieldDef, idx) => (
        <div
          key={fieldDef.name as string || fieldDef.nameEn as string || idx}
          className={
            fieldDef.type === "bilingual" || fieldDef.type === "bilingual-textarea"
              ? "col-span-2"
              : ""
          }
        >
          <RenderField def={fieldDef} form={form} />
        </div>
      ))}
    </div>
  );
}
