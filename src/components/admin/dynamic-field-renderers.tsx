import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { BlockBuilder, type BlockItem } from "@/components/admin/block-builder";
import { createRepeaterItem, resolveSubFields } from "@/lib/content-components";
import type { ComponentFieldDef } from "@/lib/content-components";

// ============================================================================
// Repeater Field Renderer
// ============================================================================

interface RepeaterFieldRendererProps {
  field: any;
  form: UseFormReturn;
}

export function RepeaterFieldRenderer({ field, form }: RepeaterFieldRendererProps) {
  const subFields = resolveSubFields(field);
  const items: Record<string, unknown>[] = form.watch(field.name) || [];
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  const addItem = () => {
    const newItem = createRepeaterItem(subFields);
    form.setValue(field.name, [...items, newItem]);
    setExpandedItems((prev) => new Set(prev).add(items.length));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    form.setValue(field.name, newItems);
  };

  const updateItem = (index: number, fieldName: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [fieldName]: value };
    form.setValue(field.name, newItems);
  };

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {items.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No items yet. Click "Add Item" to get started.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <RepeaterItem
            key={index}
            index={index}
            item={item}
            subFields={subFields}
            isExpanded={expandedItems.has(index)}
            onToggle={() => toggleItem(index)}
            onUpdate={(fieldName, value) => updateItem(index, fieldName, value)}
            onRemove={() => removeItem(index)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Item
      </Button>

      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Repeater Item
// ============================================================================

function RepeaterItem({
  index,
  item,
  subFields,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  index: number;
  item: Record<string, unknown>;
  subFields: ComponentFieldDef[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const titleField = subFields.find((f) => f.name === "title" || f.name === "name" || f.name === "label");
  const displayTitle = titleField
    ? String(item[titleField.name] || `Item ${index + 1}`)
    : `Item ${index + 1}`;

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium flex-1 truncate">{displayTitle}</span>
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onRemove} className="text-destructive hover:text-destructive/80">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      {isExpanded && subFields.length > 0 && (
        <CardContent className="pb-3 px-3 pt-0 space-y-2">
          {subFields.map((subField) => (
            <SubFieldEditor
              key={subField.name}
              field={subField}
              value={item[subField.name]}
              onChange={(v) => onUpdate(subField.name, v)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Sub-Field Editor
// ============================================================================

function SubFieldEditor({
  field,
  value,
  onChange,
}: {
  field: ComponentFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strValue = String(value ?? "");

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Textarea
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows || 3}
            placeholder={field.placeholder}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <select
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    case "media":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Input
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "Enter URL..."}
          />
        </div>
      );
    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Input
            type={field.type === "number" ? "number" : "text"}
            value={strValue}
            onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

// ============================================================================
// Group Field Renderer
// ============================================================================

export function GroupFieldRenderer({ field, form }: RepeaterFieldRendererProps) {
  return (
    <div className="space-y-3 border-l-2 border-muted pl-4">
      <Label className="text-sm font-medium">{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      <RepeaterFieldRenderer field={field} form={form} />
    </div>
  );
}

// ============================================================================
// Block Field Renderer (uses BlockBuilder)
// ============================================================================

export function BlockFieldRenderer({ field, form }: RepeaterFieldRendererProps) {
  const value: BlockItem[] = form.watch(field.name) || [];

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <BlockBuilder
        value={Array.isArray(value) ? value : []}
        onChange={(blocks) => form.setValue(field.name, blocks)}
      />
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Tab Field Renderer
// ============================================================================

export function TabFieldRenderer({ field, form }: RepeaterFieldRendererProps) {
  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <RepeaterFieldRenderer field={field} form={form} />
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
