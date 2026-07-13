import React from "react";
import type { FormFieldDef, FormGroup, FormFieldType } from "@/components/admin/form-engine/types";
import type { UseFormReturn } from "react-hook-form";
import {
  RepeaterFieldRenderer,
  GroupFieldRenderer,
  BlockFieldRenderer,
  TabFieldRenderer,
} from "@/components/admin/dynamic-field-renderers";

// ============================================================================
// Field Type Mapping
// ============================================================================

/**
 * Maps DB field_type strings to FormEngine FormFieldType.
 */
const FIELD_TYPE_MAP: Record<string, FormFieldType> = {
  text: "text",
  textarea: "textarea",
  richtext: "richtext",
  number: "number",
  boolean: "switch",
  date: "date",
  time: "time",
  datetime: "datetime",
  select: "select",
  multi_select: "multi_select",
  color: "color",
  icon: "icon",
  media: "media",
  file: "file",
  url: "url",
  email: "email",
  json: "json",
  code: "code",
  relation: "relation",
  group: "group",
  repeater: "repeater",
  block: "block",
  tab: "tab",
};

// ============================================================================
// Complex Field Renderers (injected via FormFieldDef.render prop)
// ============================================================================

function makeRepeaterRenderer(field: any) {
  return (form: UseFormReturn) => <RepeaterFieldRenderer field={field} form={form} />;
}

function makeGroupRenderer(field: any) {
  return (form: UseFormReturn) => <GroupFieldRenderer field={field} form={form} />;
}

function makeBlockRenderer(field: any) {
  return (form: UseFormReturn) => <BlockFieldRenderer field={field} form={form} />;
}

function makeTabRenderer(field: any) {
  return (form: UseFormReturn) => <TabFieldRenderer field={field} form={form} />;
}

// ============================================================================
// Conversion
// ============================================================================

/**
 * Convert a single DB field definition to a FormEngine FormFieldDef.
 */
export function toFormFieldDef(dbField: any): FormFieldDef {
  const fieldType = FIELD_TYPE_MAP[dbField.field_type] || "text";

  // Check if this field needs a custom render
  const isComplexType = ["repeater", "group", "block", "tab"].includes(dbField.field_type);

  const def: FormFieldDef = {
    name: dbField.name,
    type: fieldType,
    label: dbField.label,
    placeholder: dbField.placeholder || "",
    description: dbField.description || "",
    required: dbField.required || false,
    rows: dbField.field_options?.rows || (fieldType === "textarea" ? 4 : undefined),
    options: dbField.field_options?.options || undefined,
  };

  // Complex types get custom render overrides
  if (isComplexType) {
    const renderers: Record<string, (field: any) => (form: UseFormReturn) => React.ReactNode> = {
      repeater: makeRepeaterRenderer,
      group: makeGroupRenderer,
      block: makeBlockRenderer,
      tab: makeTabRenderer,
    };
    def.render = renderers[dbField.field_type](dbField);
  }

  return def;
}

/**
 * Convert an array of DB field definitions to FormEngine FormGroup[],
 * grouped by the `group_name` property.
 */
export function toFormGroups(dbFields: any[]): FormGroup[] {
  const groups: Record<string, any[]> = {};

  for (const field of dbFields) {
    const groupName = field.group_name || "";
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(field);
  }

  return Object.entries(groups).map(([groupName, fields]) => ({
    title: groupName || undefined,
    columns: 1,
    fields: fields.map(toFormFieldDef),
  }));
}

/**
 * Build Zod-like default values from field definitions.
 */
export function buildDefaultValues(dbFields: any[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of dbFields) {
    if (field.default_value !== null && field.default_value !== undefined) {
      defaults[field.name] = field.default_value;
    } else {
      defaults[field.name] = "";
    }
  }
  return defaults;
}
