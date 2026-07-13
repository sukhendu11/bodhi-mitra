import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMinRole } from "./permissions";

// ============================================================================
// Forward declaration for recursive schema
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentFieldInput = Record<string, any>;

// ============================================================================
// Zod Schemas for Content Modeling
// ============================================================================

export const fieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const validationRulesSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  custom: z.string().optional(),
});

export const showIfSchema = z.object({
  field: z.string().optional(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in"]).optional(),
  value: z.any().optional(),
});
// Type helper for recursive schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodAnyObject = z.ZodObject<any, any, any>;

export const contentFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/, "Must be a valid field name (snake_case)"),
  label: z.string().min(1).max(200),
  label_bn: z.string().max(200).default(""),
  field_type: z.enum([
    "text", "textarea", "richtext", "number", "boolean", "date", "time",
    "datetime", "select", "multi_select", "color", "icon", "media", "file",
    "url", "email", "json", "code", "relation", "group", "repeater", "block", "tab",
  ]),
  required: z.boolean().default(false),
  unique_field: z.boolean().default(false),
  validation_rules: validationRulesSchema.default({}),
  field_options: z.object({
    options: z.array(fieldOptionSchema).optional(),
    relation_type: z.string().optional(),
    relation_content_type: z.string().optional(),
    relation_display_field: z.string().optional(),
    icon_set: z.string().optional(),
    media_bucket: z.string().optional(),
    media_types: z.array(z.string()).optional(),
    rows: z.number().optional(),
    step: z.number().optional(),
    placeholder: z.string().optional(),
    placeholder_bn: z.string().optional(),
  }).default({}),
  placeholder: z.string().default(""),
  placeholder_bn: z.string().default(""),
  description: z.string().default(""),
  description_bn: z.string().default(""),
  default_value: z.any().nullable().default(null),
  group_name: z.string().default(""),
  tab_name: z.string().default(""),
  sort_order: z.number().default(0),
  column_span: z.number().min(1).max(3).default(1),
  show_if: showIfSchema.default({}),
  system_field: z.boolean().default(false),
  seo_field: z.boolean().default(false),
  sub_fields: z.array(z.lazy((): ZodAnyObject => contentFieldSchema as ZodAnyObject)).default([]),
});

export const contentTypeDefinitionSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/, "Must be a valid content type name (snake_case)"),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Must be a valid slug (lowercase, hyphens)"),
  label: z.string().min(1).max(200),
  label_plural: z.string().max(200).optional(),
  description: z.string().default(""),
  icon: z.string().default("FileText"),
  content_type: z.enum(["collection", "singleton"]).default("collection"),
  workflow_enabled: z.boolean().default(false),
  workflow_statuses: z.array(z.string()).default(["draft", "published"]),
  workflow_default_status: z.string().default("draft"),
  workflow_transitions: z.record(z.array(z.string())).default({ draft: ["published"], published: ["draft"] }),
  has_slug: z.boolean().default(true),
  has_seo: z.boolean().default(false),
  has_tags: z.boolean().default(false),
  has_revisions: z.boolean().default(false),
  has_categories: z.boolean().default(false),
  has_authors: z.boolean().default(false),
  has_sort_order: z.boolean().default(false),
  has_rich_content: z.boolean().default(false),
  can_duplicate: z.boolean().default(true),
  can_archive: z.boolean().default(true),
  can_schedule: z.boolean().default(false),
  preview_url: z.string().default(""),
  custom_table: z.string().optional(),
  collection_id: z.string().uuid().optional().nullable(),
});

// ============================================================================
// Types
// ============================================================================

export type FieldOption = z.infer<typeof fieldOptionSchema>;
export type ValidationRules = z.infer<typeof validationRulesSchema>;
export type ShowIf = z.infer<typeof showIfSchema>;
export type ContentField = z.infer<typeof contentFieldSchema>;
export type ContentTypeDefinition = z.infer<typeof contentTypeDefinitionSchema>;

export interface ContentTypeWithFields {
  definition: ContentTypeDefinition & { id: string; created_at: string; updated_at: string };
  fields: (ContentField & { id: string; content_type_id: string; created_at: string; updated_at: string })[];
}

// ============================================================================
// Server Functions — Content Type CRUD
// ============================================================================

export const createContentType = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const input = data as z.infer<typeof contentTypeDefinitionSchema>;
    const { data: result, error } = await supabase
      .from("content_type_definitions")
      .insert({
        name: input.name,
        slug: input.slug,
        label: input.label,
        label_plural: input.label_plural || input.label + "s",
        description: input.description,
        icon: input.icon,
        content_type: input.content_type,
        workflow_enabled: input.workflow_enabled,
        workflow_statuses: JSON.stringify(input.workflow_statuses),
        workflow_default_status: input.workflow_default_status,
        workflow_transitions: JSON.stringify(input.workflow_transitions),
        has_slug: input.has_slug,
        has_seo: input.has_seo,
        has_tags: input.has_tags,
        has_revisions: input.has_revisions,
        has_categories: input.has_categories,
        has_authors: input.has_authors,
        has_sort_order: input.has_sort_order,
        has_rich_content: input.has_rich_content,
        can_duplicate: input.can_duplicate,
        can_archive: input.can_archive,
        can_schedule: input.can_schedule,
        preview_url: input.preview_url,
        custom_table: input.custom_table || null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create content type: ${error.message}`);
    return result;
  });

export const updateContentType = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, ...updates } = data as { id: string; [key: string]: unknown };
    const updateData: Record<string, unknown> = { ...updates };
    if (updateData.workflow_statuses) updateData.workflow_statuses = JSON.stringify(updateData.workflow_statuses);
    if (updateData.workflow_transitions) updateData.workflow_transitions = JSON.stringify(updateData.workflow_transitions);
    const { data: result, error } = await supabase
      .from("content_type_definitions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update content type: ${error.message}`);
    return result;
  });

export const deleteContentType = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };
    const { error } = await supabase.from("content_type_definitions").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete content type: ${error.message}`);
    return { success: true };
  });

export const getContentTypes = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("content_type_definitions")
      .select("*")
      .order("label", { ascending: true });
    if (error) throw new Error(`Failed to fetch content types: ${error.message}`);
    return data || [];
  });

export const getContentTypeById = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };
    const { data: def, error: defError } = await supabase
      .from("content_type_definitions")
      .select("*")
      .eq("id", id)
      .single();
    if (defError) throw new Error(`Content type not found: ${defError.message}`);
    const { data: fields, error: fieldsError } = await supabase
      .from("content_type_fields")
      .select("*")
      .eq("content_type_id", id)
      .order("sort_order", { ascending: true });
    if (fieldsError) throw new Error(`Failed to fetch fields: ${fieldsError.message}`);
    return { definition: def, fields: fields || [] } as ContentTypeWithFields;
  });

export const getAllContentTypesPublic = createServerFn({ method: "GET" })
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("content_type_definitions")
      .select("*")
      .order("label", { ascending: true });
    if (error) throw new Error(`Failed to fetch content types: ${error.message}`);
    return data || [];
  });

// ============================================================================
// Server Functions — Field CRUD
// ============================================================================

export const createContentField = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { content_type_id, field } = data as { content_type_id: string; field: z.infer<typeof contentFieldSchema> };
    const { data: result, error } = await supabase
      .from("content_type_fields")
      .insert({
        content_type_id,
        name: field.name,
        label: field.label,
        label_bn: field.label_bn,
        field_type: field.field_type,
        required: field.required,
        unique_field: field.unique_field,
        validation_rules: JSON.stringify(field.validation_rules),
        field_options: JSON.stringify(field.field_options),
        placeholder: field.placeholder,
        placeholder_bn: field.placeholder_bn,
        description: field.description,
        description_bn: field.description_bn,
        default_value: field.default_value !== null ? JSON.stringify(field.default_value) : null,
        group_name: field.group_name,
        tab_name: field.tab_name,
        sort_order: field.sort_order,
        column_span: field.column_span,
        show_if: JSON.stringify(field.show_if),
        system_field: field.system_field,
        seo_field: field.seo_field,
        sub_fields: JSON.stringify(field.sub_fields || []),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create field: ${error.message}`);
    return result;
  });

export const updateContentField = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { id, field } = data as { id: string; field: Record<string, unknown> };
    const updateData: Record<string, unknown> = { ...field };
    if (updateData.validation_rules) updateData.validation_rules = JSON.stringify(updateData.validation_rules);
    if (updateData.field_options) updateData.field_options = JSON.stringify(updateData.field_options);
    if (updateData.show_if) updateData.show_if = JSON.stringify(updateData.show_if);
    if (updateData.sub_fields) updateData.sub_fields = JSON.stringify(updateData.sub_fields);
    if (updateData.default_value !== undefined) {
      updateData.default_value = updateData.default_value !== null ? JSON.stringify(updateData.default_value) : null;
    }
    const { data: result, error } = await supabase
      .from("content_type_fields")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update field: ${error.message}`);
    return result;
  });

export const deleteContentField = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { id } = data as { id: string };
    const { error } = await supabase.from("content_type_fields").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete field: ${error.message}`);
    return { success: true };
  });

export const reorderFields = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { fieldIds } = data as { fieldIds: string[] };
    for (let i = 0; i < fieldIds.length; i++) {
      const { error } = await supabase
        .from("content_type_fields")
        .update({ sort_order: i })
        .eq("id", fieldIds[i]);
      if (error) throw new Error(`Failed to reorder field: ${error.message}`);
    }
    return { success: true };
  });

// ============================================================================
// Dynamic Content CRUD — Generic functions for any content type
// ============================================================================

export const getDynamicContent = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, page = 1, pageSize = 20, search = "", status } = data as {
      contentTypeId: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    };

    const from = (page - 1) * pageSize;
    let query = supabase
      .from("dynamic_content_items")
      .select("*", { count: "exact" })
      .eq("content_type_id", contentTypeId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (search) query = query.textSearch("content_data", search);
    if (status && status !== "all") query = query.eq("status", status);

    const { data: items, error, count } = await query;
    if (error) throw new Error(`Failed to fetch content: ${error.message}`);
    return { items: items || [], total: count || 0 };
  });

export const getDynamicContentItem = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, itemId } = data as { contentTypeId: string; itemId: string };
    const { data: item, error } = await supabase
      .from("dynamic_content_items")
      .select("*")
      .eq("id", itemId)
      .eq("content_type_id", contentTypeId)
      .single();
    if (error) throw new Error(`Content item not found: ${error.message}`);
    return item;
  });

export const createDynamicContentItem = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, contentData } = data as { contentTypeId: string; contentData: Record<string, unknown> };
    const { data: result, error } = await supabase
      .from("dynamic_content_items")
      .insert({ content_type_id: contentTypeId, content_data: contentData, status: "draft" })
      .select()
      .single();
    if (error) throw new Error(`Failed to create content: ${error.message}`);
    return result;
  });

export const updateDynamicContentItem = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, itemId, contentData } = data as {
      contentTypeId: string;
      itemId: string;
      contentData: Record<string, unknown>;
    };
    const { data: result, error } = await supabase
      .from("dynamic_content_items")
      .update({ content_data: contentData })
      .eq("id", itemId)
      .eq("content_type_id", contentTypeId)
      .select()
      .single();
    if (error) throw new Error(`Failed to update content: ${error.message}`);
    return result;
  });

export const deleteDynamicContentItem = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, itemId } = data as { contentTypeId: string; itemId: string };
    const { error } = await supabase
      .from("dynamic_content_items")
      .delete()
      .eq("id", itemId)
      .eq("content_type_id", contentTypeId);
    if (error) throw new Error(`Failed to delete content: ${error.message}`);
    return { success: true };
  });

// ============================================================================
// Server Functions — Collection CRUD
// ============================================================================

export const getCollections = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context }: any) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("content_collections")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Failed to fetch collections: ${error.message}`);
    return data || [];
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { name, slug, label, description, icon, color } = data as Record<string, string>;
    const { data: result, error } = await supabase
      .from("content_collections")
      .insert({ name, slug, label, description: description || "", icon: icon || "Folder", color: color || "#6b7280" })
      .select()
      .single();
    if (error) throw new Error(`Failed to create collection: ${error.message}`);
    return result;
  });

export const updateCollection = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id, ...updates } = data as Record<string, unknown>;
    const { data: result, error } = await supabase
      .from("content_collections")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update collection: ${error.message}`);
    return result;
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: any) => {
    const { supabase } = context;
    const { id } = data as { id: string };
    const { error } = await supabase.from("content_collections").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete collection: ${error.message}`);
    return { success: true };
  });

export const duplicateDynamicContentItem = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  .handler(async ({ context, data }: { context: any; data: unknown }) => {
    const { supabase } = context;
    const { contentTypeId, itemId } = data as { contentTypeId: string; itemId: string };
    const { data: original } = await supabase
      .from("dynamic_content_items")
      .select("*")
      .eq("id", itemId)
      .eq("content_type_id", contentTypeId)
      .single();
    if (!original) throw new Error("Original content not found");
    const { data: result, error } = await supabase
      .from("dynamic_content_items")
      .insert({
        content_type_id: contentTypeId,
        content_data: { ...(original.content_data as Record<string, unknown>), title: `${(original.content_data as Record<string, unknown>)?.title || "Untitled"} (Copy)` },
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to duplicate content: ${error.message}`);
    return result;
  });
