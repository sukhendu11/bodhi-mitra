/**
 * Generic create/edit dialog for the Refine admin.
 *
 * One component powers every resource via the schema-driven registry. Uses
 * Refine's `useForm` headless (redirect: false — TanStack Router is the shell,
 * Refine routing is optional in v5) with shadcn/ui form controls.
 */
import { useState } from "react";
import { useForm } from "@refinedev/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getResourceDef, type ResourceField } from "@/lib/admin/resources";
import { mockResourceWritable } from "@/lib/admin/data-provider";
import {
  canCreateResource,
  canUpdateResource,
  useAdminRole,
} from "@/lib/admin/rbac";

type Row = Record<string, unknown> & { id: string | number };

interface ResourceFormDialogProps {
  resource: string;
  /** undefined = create mode; a row = edit mode. */
  initial?: Row;
  onClose: () => void;
}

/** Tag chips + add input — own component so the useState hook stays legal. */
function TagsInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const tags = Array.isArray(value) ? (value as string[]) : [];
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-xs"
          >
            {t}
            <button
              type="button"
              aria-label={bn ? "সরান" : "Remove"}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          id={id}
          value={input}
          placeholder={bn ? "ট্যাগ যোগ করুন" : "Add tag"}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-7 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          disabled={disabled || !input.trim()}
          onClick={add}
        >
          {bn ? "যোগ" : "Add"}
        </Button>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ResourceField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";
  // `id` pairs with the Label's htmlFor so clicking the label focuses the
  // control (and the field is addressable for a11y/automation).
  const id = `field-${field.key}`;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          disabled={disabled || field.readOnly}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="text-sm"
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={(value as number | string) ?? ""}
          disabled={disabled || field.readOnly}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="text-sm"
        />
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Switch
            id={id}
            checked={Boolean(value)}
            disabled={disabled || field.readOnly}
            onCheckedChange={onChange}
          />
          <span className="text-xs text-muted-foreground">
            {field.readOnly && (bn ? "পঠনযোগ্য" : "read-only")}
          </span>
        </div>
      );
    case "select":
      return (
        <select
          id={id}
          value={(value as string) ?? ""}
          disabled={disabled || field.readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-border/60 bg-background px-2.5 text-sm outline-none focus:border-primary/50 disabled:opacity-50"
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "tags":
      return <TagsInput id={id} value={value} onChange={onChange} disabled={disabled || field.readOnly} />;
    default:
      return (
        <Input
          id={id}
          type={field.type === "url" ? "url" : "text"}
          value={(value as string) ?? ""}
          disabled={disabled || field.readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      );
  }
}

export function ResourceFormDialog({ resource, initial, onClose }: ResourceFormDialogProps) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const def = getResourceDef(resource);
  const isEdit = Boolean(initial);
  const role = useAdminRole();
  // RBAC (P2): create/edit needs both the role permission and mock-store
  // support. Read-only resources render disabled with a hint.
  const roleWritable = isEdit
    ? canUpdateResource(role, resource as never)
    : canCreateResource(role, resource as never);
  const writable = roleWritable && mockResourceWritable(resource as never);

  const { onFinish, formLoading } = useForm<Row>({
    resource,
    action: isEdit ? "edit" : "create",
    id: isEdit ? initial?.id : undefined,
    redirect: false,
  });

  // Local form state — Refine's useForm exposes onFinish; we manage values
  // locally so the generic field registry drives the dialog.
  const [values, setValues] = useState<Record<string, unknown>>(
    () =>
      (initial
        ? Object.fromEntries(def?.fields.map((f) => [f.key, initial[f.key]]) ?? [])
        : {}) as Record<string, unknown>,
  );

  if (!def) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bn ? "ত্রুটি" : "Error"}</DialogTitle>
            <DialogDescription>Unknown resource: {resource}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const submit = async () => {
    try {
      const result = await onFinish(values);
      // onFinish resolves with the saved record — close on success.
      if (result) onClose();
    } catch (err) {
      // Refine surfaces the error via its notification provider / thrown error;
      // leave the dialog open so the user can correct the form.
      console.error("[admin] create/update failed:", err);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? (bn ? "সম্পাদনা" : "Edit") : bn ? "নতুন" : "New"}{" "}
            {bn ? def.labelBn : def.labelEn}
          </DialogTitle>
          <DialogDescription>
            {writable
              ? bn
                ? "সার্ভার ফাংশনের মাধ্যমে সংরক্ষণ হবে"
                : "Saved via the Refine data provider"
              : bn
                ? "এই রিসোর্সটি মক মোডে পঠনযোগ্য"
                : "Read-only in mock mode"}
          </DialogDescription>
        </DialogHeader>

        {/* noValidate: content fields legitimately hold relative paths (e.g.
            pdf_url="/pdfs/….pdf") which fail HTML5 URL validation and would
            silently block submission — values are handled programmatically. */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          {def.fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`field-${f.key}`} className="text-xs">
                {bn ? f.labelBn : f.labelEn}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              <FieldControl
                field={f}
                value={values[f.key]}
                disabled={!writable}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            </div>
          ))}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={formLoading}>
              {bn ? "বাতিল" : "Cancel"}
            </Button>
            <Button type="submit" disabled={formLoading || !writable}>
              {formLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {formLoading ? (bn ? "সংরক্ষণ হচ্ছে…" : "Saving…") : bn ? "সংরক্ষণ" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
