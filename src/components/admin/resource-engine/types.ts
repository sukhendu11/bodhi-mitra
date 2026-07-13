import type { LucideIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { UseFormReturn, Control, FieldValues, Path } from "react-hook-form";
import type { ZodSchema } from "zod";

/* ─── Stat Card ──────────────────────────────────────────────────── */

export interface StatCardDef {
  icon: LucideIcon;
  label: string;
  value: number;
  color: "blue" | "green" | "amber" | "slate" | "purple" | "emerald" | "rose" | "cyan";
}

/* ─── Resource Definition ────────────────────────────────────────── */

export interface ResourceDefinition<TData extends { id: string }, TForm extends FieldValues = any> {
  /** Supabase table name (used as Refine resource name) */
  name: string;

  /** Human-readable label */
  label: string;

  /** Plural label for header (defaults to label + "s") */
  labelPlural?: string;

  /** Description shown below the header */
  description?: string;

  /** Icon for header */
  icon: LucideIcon;

  /** Column definitions for the DataTable */
  columns: ColumnDef<TData, any>[];

  /** Zod schema for form validation */
  schema: ZodSchema<TForm>;

  /** Default form values */
  defaultValues: TForm;

  /** Form content component to render inside the FormDrawer */
  FormContent: React.ComponentType<{
    form: UseFormReturn<TForm>;
    resource: ResourceDefinition<TData, TForm>;
  }>;

  /** (Optional) Stats configuration */
  stats?: {
    /** Function to fetch stats */
    fetch: () => Promise<Record<string, number>>;
    /** Stat cards to display */
    cards: (data: Record<string, number>) => StatCardDef[];
  };

  /** (Optional) Filter options for the filter bar */
  filters?: Array<{
    value: string;
    label: string;
  }>;

  /** (Optional) Mapping from filter value to Refine filter config */
  filterField?: string;

  /** Default sort column */
  defaultSortField?: string;

  /** Default sort order */
  defaultSortOrder?: "asc" | "desc";

  /** Page size for pagination */
  pageSize?: number;

  /** Whether to show search bar (defaults to true) */
  showSearch?: boolean;

  /** (Optional) Custom search mapping for Refine filters */
  searchField?: string;

  /** (Optional) Transform form values before create/update */
  transformInput?: (values: TForm) => Record<string, unknown>;

  /** (Optional) Whether bulk delete is enabled */
  canBulkDelete?: boolean;

  /** (Optional) Custom bulk delete handler */
  onBulkDelete?: (ids: string[]) => Promise<void>;

  /** (Optional) Custom group label for the sidebar */
  group?: string;
}

/* ─── Resource Registry ──────────────────────────────────────────── */

const registry = new Map<string, ResourceDefinition<any, any>>();

export function registerResource<TData extends { id: string }, TForm extends FieldValues>(
  def: ResourceDefinition<TData, TForm>,
): ResourceDefinition<TData, TForm> {
  registry.set(def.name, def);
  return def;
}

export function getResource(name: string): ResourceDefinition<any, any> | undefined {
  return registry.get(name);
}

export function getAllResources(): ResourceDefinition<any, any>[] {
  return Array.from(registry.values());
}
