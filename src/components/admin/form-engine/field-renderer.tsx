import type { FieldValues, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type React from "react";
import { createContext, useContext } from "react";
import { Switch } from "@/components/ui/switch";
import { FIELD_LABEL } from "@/components/admin/bilingual-field";
import { BlockEditor } from "@/components/admin/block-editor";
import type { FormFieldDef, FormGroup } from "./types";

/* ─── BlockEditor Save Status Context ────────────────────────────── */

interface BlockEditorSaveStatus {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

const BlockEditorSaveContext = createContext<BlockEditorSaveStatus>({
  isSaving: false,
  lastSavedAt: null,
});

/**
 * Provider for threading save status to BlockEditor instances rendered
 * by the FormEngine. Used by pages that integrate useAutoSave.
 */
export { BlockEditorSaveContext };
export type { BlockEditorSaveStatus };

/**
 * Wrapper component that consumes BlockEditorSaveContext and passes
 * isSaving/lastSavedAt to BlockEditor. Extracted as a component to
 * satisfy React's Rules of Hooks (useContext cannot be called inside
 * a render prop function).
 */
function BlockEditorWithSaveStatus({
  value,
  onChange,
  placeholder,
  minHeight,
  maxHeight,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}) {
  const saveStatus = useContext(BlockEditorSaveContext);
  return (
    <BlockEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      maxHeight={maxHeight}
      isSaving={saveStatus.isSaving}
      lastSavedAt={saveStatus.lastSavedAt}
    />
  );
}

/* ─── Auto-resize Textarea ─────────────────────────────────────────── */

function AutoResizeTextarea({ value, onChange, rows, ...props }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);
      // Defer resize to after state update
      requestAnimationFrame(resize);
    },
    [onChange, resize],
  );

  return <Textarea ref={textareaRef} value={value} onChange={handleChange} {...props} />;
}

/* ─── Props ──────────────────────────────────────────────────────── */

interface RenderFieldProps<TForm extends FieldValues> {
  def: FormFieldDef<TForm>;
  form: UseFormReturn<TForm>;
}

/* ─── Field Renderer ─────────────────────────────────────────────── */

export function RenderField<TForm extends FieldValues>({ def, form }: RenderFieldProps<TForm>) {
  // Conditional visibility
  if (def.showIf && !def.showIf(form.getValues())) {
    return null;
  }

  // Custom render override
  if (def.render) {
    return <>{def.render(form)}</>;
  }

  // Bilingual fields render side-by-side
  if (def.type === "bilingual" || def.type === "bilingual-textarea") {
    return renderBilingual(
      def as FormFieldDef<TForm> & { nameEn: keyof TForm; nameBn: keyof TForm },
      form,
    );
  }

  // Standard single-value fields
  return renderStandardField(def, form);
}

/* ─── Accessibility ──────────────────────────────────────────────── */

/**
 * Generates a unique field description ID for aria-describedby linkage.
 */
function fieldDescriptionId(name: string): string {
  return `field-desc-${name.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/**
 * Renders the optional description text with proper aria linkage.
 */
function FieldDescription({ name, description }: { name: string; description?: string }) {
  if (!description) return null;
  return (
    <p id={fieldDescriptionId(name)} className="text-[0.55rem] text-muted-foreground mt-1">
      {description}
    </p>
  );
}

/**
 * Renders a required indicator asterisk next to labels.
 */
function RequiredIndicator() {
  return <span className="text-destructive ml-0.5" aria-hidden="true">*</span>;
}

/* ─── Single-value Standard Field ──────────────────────────────────── */

function renderStandardField<TForm extends FieldValues>(
  def: FormFieldDef<TForm>,
  form: UseFormReturn<TForm>,
) {
  if (!def.name) return null;
  const fieldName = def.name as string;
  const InputComponent = def.type === "textarea" ? AutoResizeTextarea : Input;
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
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger aria-required={def.required || undefined}>
                    <SelectValue
                      placeholder={def.placeholder || `Select ${def.label?.toLowerCase()}`}
                    />
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
              <FieldDescription name={fieldName} description={def.description} />
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
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                  className="w-3.5 h-3.5 rounded border-border/60 text-foreground focus:ring-foreground/30"
                />
                <span className="text-[0.6rem] font-medium">{def.label}</span>
              </label>
              <FieldDescription name={fieldName} description={def.description} />
            </FormItem>
          );
        }

        // Switch
        if (def.type === "switch") {
          return (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  aria-label={def.label || fieldName}
                />
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
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.value || "#000000"}
                    onChange={field.onChange}
                    aria-label={`${def.label || fieldName} color picker`}
                    className="w-10 h-9 rounded-lg border border-border/60 cursor-pointer bg-background"
                  />
                  <Input
                    value={field.value || ""}
                    onChange={field.onChange}
                    aria-label={def.label || fieldName}
                    aria-required={def.required || undefined}
                    className="font-mono text-xs flex-1"
                    placeholder="#000000"
                  />
                </div>
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Date fields
        if (def.type === "date" || def.type === "time" || def.type === "datetime") {
          const typeMap = { date: "date", time: "time", datetime: "datetime-local" } as const;
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>{def.label}</FormLabel>
              <FormControl>
                <Input
                  type={typeMap[def.type as keyof typeof typeMap] || "text"}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  aria-required={def.required || undefined}
                  aria-describedby={def.description ? fieldDescriptionId(fieldName) : undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Multi Select (checkbox group)
        if (def.type === "multi_select" && def.options) {
          const values: string[] = Array.isArray(field.value) ? field.value : [];
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>{def.label}</FormLabel>
              <div className="space-y-1.5 border rounded-lg p-3" role="group" aria-label={def.label || fieldName}>
                {def.options.map((opt) => {
                  const isSelected = values.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            field.onChange(values.filter((v) => v !== opt.value));
                          } else {
                            field.onChange([...values, opt.value]);
                          }
                        }}
                        aria-label={`${def.label || fieldName}: ${opt.label}`}
                        className="h-3.5 w-3.5 rounded border-border/60"
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // JSON (validated textarea)
        if (def.type === "json") {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <Textarea
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  rows={def.rows || 8}
                  className="font-mono text-xs"
                  placeholder={def.placeholder || "Enter JSON..."}
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                  aria-describedby={def.description ? fieldDescriptionId(fieldName) : undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Code (monospace textarea)
        if (def.type === "code") {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <Textarea
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  rows={def.rows || 8}
                  className="font-mono text-xs"
                  placeholder={def.placeholder || "Enter code..."}
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                  aria-describedby={def.description ? fieldDescriptionId(fieldName) : undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Icon (text with preview) / Media / File / Relation (text inputs)
        if (def.type === "icon" || def.type === "media" || def.type === "file" || def.type === "relation") {
          const typeLabels: Record<string, string> = {
            icon: "Enter icon name",
            media: "Enter media URL",
            file: "Enter file URL",
            relation: "Enter related item ID",
          };
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder={def.placeholder || typeLabels[def.type as keyof typeof typeLabels]}
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                  aria-describedby={def.description ? fieldDescriptionId(fieldName) : undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Repeater (repeating sub-field groups) - uses BlockBuilder for advanced, or simple list
        if (def.type === "repeater" || def.type === "group") {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <Textarea
                  value={typeof field.value === "string" ? field.value : JSON.stringify(field.value || [], null, 2)}
                  onChange={(e) => {
                    try {
                      field.onChange(JSON.parse(e.target.value));
                    } catch {
                      field.onChange(e.target.value);
                    }
                  }}
                  rows={def.rows || 4}
                  className="font-mono text-xs"
                  placeholder={def.placeholder || `Enter ${def.label?.toLowerCase()} data (JSON)...`}
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Block (content block builder) - JSON textarea, use custom render for BlockBuilder
        if (def.type === "block" || def.type === "tab") {
          return (
            <FormItem>
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <Textarea
                  value={typeof field.value === "string" ? field.value : JSON.stringify(field.value || [], null, 2)}
                  onChange={(e) => {
                    try {
                      field.onChange(JSON.parse(e.target.value));
                    } catch {
                      field.onChange(e.target.value);
                    }
                  }}
                  rows={def.rows || 6}
                  className="font-mono text-xs"
                  placeholder={def.placeholder || `Enter ${def.label?.toLowerCase()} data (JSON)...`}
                  aria-label={def.label || fieldName}
                  aria-required={def.required || undefined}
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Richtext — uses BlockEditor for rich text editing
        if (def.type === "richtext") {
          return (
            <FormItem className="space-y-2">
              <FormLabel className={FIELD_LABEL}>
                {def.label}
                {def.required && <RequiredIndicator />}
              </FormLabel>
              <FormControl>
                <BlockEditorWithSaveStatus
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder={def.placeholder || "Start writing…"}
                  minHeight="200px"
                  maxHeight="600px"
                />
              </FormControl>
              <FieldDescription name={fieldName} description={def.description} />
              {fieldState.error && <FormMessage className="text-[0.65rem]" />}
            </FormItem>
          );
        }

        // Text, Textarea, Number, URL, Email
        const inputAriaProps: Record<string, any> = {};
        if (def.required) inputAriaProps["aria-required"] = true;
        if (def.description) {
          inputAriaProps["aria-describedby"] = fieldDescriptionId(fieldName);
        }

        return (
          <FormItem>
            <FormLabel className={FIELD_LABEL}>
              {def.label}
              {def.required && <RequiredIndicator />}
            </FormLabel>
            <FormControl>
              <InputComponent
                {...field}
                value={field.value ?? ""}
                {...inputExtraProps}
                {...inputAriaProps}
                placeholder={def.placeholder}
                disabled={def.disabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  if (def.type === "number") {
                    field.onChange(
                      def.step && def.step < 1
                        ? parseFloat(e.target.value) || 0
                        : parseInt(e.target.value) || 0,
                    );
                  } else {
                    field.onChange(e.target.value);
                  }
                }}
              />
            </FormControl>
            <FieldDescription name={fieldName} description={def.description} />
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
  const InputComponent = def.type === "bilingual-textarea" ? AutoResizeTextarea : Input;
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
          key={(fieldDef.name as string) || (fieldDef.nameEn as string) || idx}
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
