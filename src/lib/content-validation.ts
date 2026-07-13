import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { z } from "zod";

// ============================================================================
// Validation Rules Types
// ============================================================================

export interface ValidationRule {
  type: "min_length" | "max_length" | "min" | "max" | "pattern" | "email" | "url" | "custom";
  value?: number | string;
  message?: string;
}

export interface FieldCondition {
  logic: "and" | "or";
  conditions: SingleCondition[];
}

export interface SingleCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "in" | "not_in" | "empty" | "not_empty";
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

// ============================================================================
// Field Condition Schema (still needed for evaluateFieldCondition)
// ============================================================================

export const singleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "not_contains", "in", "not_in", "empty", "not_empty"]),
  value: z.any().optional(),
});

export const fieldConditionSchema = z.object({
  logic: z.enum(["and", "or"]).default("and"),
  conditions: z.array(singleConditionSchema).default([]),
});

export type SingleConditionType = z.infer<typeof singleConditionSchema>;
export type FieldConditionType = z.infer<typeof fieldConditionSchema>;

// ============================================================================
// Dynamic Zod Schema Builder
// ============================================================================

/**
 * Build a Zod schema from an array of validation rules.
 * Uses Zod's `.min()`, `.max()`, `.regex()`, `.email()`, `.url()` directly
 * instead of manual string comparisons.
 */
export function buildFieldSchema(rules: ValidationRule[]): z.ZodType<string | number> {
  let schema: z.ZodTypeAny = z.string();

  for (const rule of rules) {
    switch (rule.type) {
      case "min_length":
        schema = (schema as z.ZodString).min(
          rule.value as number,
          rule.message || `Minimum ${rule.value} characters required`,
        );
        break;

      case "max_length":
        schema = (schema as z.ZodString).max(
          rule.value as number,
          rule.message || `Maximum ${rule.value} characters allowed`,
        );
        break;

      case "min":
        // Switch to number schema for numeric comparisons
        schema = z.number().min(
          rule.value as number,
          rule.message || `Minimum value is ${rule.value}`,
        );
        break;

      case "max":
        // Switch to number schema for numeric comparisons
        schema = z.number().max(
          rule.value as number,
          rule.message || `Maximum value is ${rule.value}`,
        );
        break;

      case "pattern":
        schema = (schema as z.ZodString).regex(
          new RegExp(rule.value as string),
          rule.message || "Invalid format",
        );
        break;

      case "email":
        schema = (schema as z.ZodString).email(rule.message || "Invalid email address");
        break;

      case "url":
        schema = (schema as z.ZodString).url(rule.message || "Invalid URL");
        break;

      case "custom":
        // Custom rules are evaluated server-side; no Zod equivalent
        break;
    }
  }

  return schema as z.ZodType<string | number>;
}

// ============================================================================
// Validation Execution (using Zod)
// ============================================================================

/**
 * Validate a single field value against its validation rules.
 * Uses Zod `.safeParse()` instead of manual string comparisons.
 */
export function validateFieldValue(
  value: unknown,
  rules: ValidationRule[],
): string | null {
  if (!rules || rules.length === 0) return null;

  const schema = buildFieldSchema(rules);
  const result = schema.safeParse(value);

  if (!result.success) {
    // Return the first error message
    return result.error.errors[0]?.message || "Invalid value";
  }

  return null;
}

/**
 * Evaluate a field condition against the current form data.
 * Supports AND/OR logic with nested conditions.
 */
export function evaluateFieldCondition(
  condition: FieldConditionType | null | undefined,
  formData: Record<string, unknown>,
): boolean {
  if (!condition || !condition.conditions || condition.conditions.length === 0) {
    return true;
  }

  const results = condition.conditions.map((c) =>
    evaluateSingleCondition(c, formData),
  );

  return condition.logic === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}

function evaluateSingleCondition(
  condition: SingleConditionType,
  formData: Record<string, unknown>,
): boolean {
  const fieldValue = formData[condition.field];

  switch (condition.operator) {
    case "eq":
      return fieldValue === condition.value;
    case "neq":
      return fieldValue !== condition.value;
    case "gt":
      return Number(fieldValue) > Number(condition.value);
    case "gte":
      return Number(fieldValue) >= Number(condition.value);
    case "lt":
      return Number(fieldValue) < Number(condition.value);
    case "lte":
      return Number(fieldValue) <= Number(condition.value);
    case "contains":
      return String(fieldValue).includes(String(condition.value));
    case "not_contains":
      return !String(fieldValue).includes(String(condition.value));
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case "empty":
      return fieldValue === undefined || fieldValue === null || fieldValue === "";
    case "not_empty":
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    default:
      return true;
  }
}

// ============================================================================
// Server-Side Validation
// ============================================================================

/**
 * Check if a field value is unique across all items of a content type.
 */
export const checkFieldUniqueness = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { contentTypeId, fieldName, fieldValue, excludeItemId } = data as {
      contentTypeId: string;
      fieldName: string;
      fieldValue: unknown;
      excludeItemId?: string;
    };

    // Query dynamic_content_items for duplicates
    let query = supabase
      .from("dynamic_content_items")
      .select("id", { count: "exact", head: true })
      .eq("content_type_id", contentTypeId)
      .filter("content_data->>" + fieldName, "eq", String(fieldValue));

    if (excludeItemId) {
      query = query.neq("id", excludeItemId);
    }

    const { count, error } = await query;
    if (error) throw new Error(`Failed to check uniqueness: ${error.message}`);

    return { isUnique: count === 0 };
  });

/**
 * Validate content data against field definitions.
 * Accepts fields directly for reusability (avoids extra DB round-trip).
 * Uses Zod `.safeParse()` for rule-based validation.
 */
export async function validateContentFields(
  fields: any[],
  contentData: Record<string, unknown>,
  options?: { itemId?: string; supabase?: any },
): Promise<{ valid: boolean; errors: { field: string; message: string }[] }> {
  const errors: { field: string; message: string }[] = [];

  for (const field of fields) {
    const value = contentData[field.name];

    // Required validation
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({ field: field.name, message: `${field.label} is required` });
      continue;
    }

    // Skip if no value (optional fields)
    if (value === undefined || value === null || value === "") continue;

    // Unique validation
    if (field.unique_field && options?.supabase) {
      const result = await (checkFieldUniqueness as any)({
        data: {
          contentTypeId: field.content_type_id,
          fieldName: field.name,
          fieldValue: value,
          excludeItemId: options.itemId,
        },
      });
      if (!result.isUnique) {
        errors.push({
          field: field.name,
          message: `${field.label} must be unique. This value is already in use.`,
        });
      }
    }

    // Validation rules — now uses Zod under the hood
    const rules = field.validation_rules as ValidationRule[] | null;
    if (rules && rules.length > 0) {
      const fieldError = validateFieldValue(value, rules);
      if (fieldError) {
        errors.push({ field: field.name, message: fieldError });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
