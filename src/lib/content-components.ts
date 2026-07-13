import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface ComponentFieldDef {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  rows?: number;
  default_value?: unknown;
  field_options?: Record<string, unknown>;
}

export interface ComponentDef {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields: ComponentFieldDef[];
}

export interface BlockDef {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields: ComponentFieldDef[];
  /** Preview template for the block */
  preview?: string;
}

// ============================================================================
// Registry
// ============================================================================

const componentRegistry = new Map<string, ComponentDef>();
const blockRegistry = new Map<string, BlockDef>();

export function registerComponent(def: ComponentDef): ComponentDef {
  componentRegistry.set(def.name, def);
  return def;
}

export function registerBlock(def: BlockDef): BlockDef {
  blockRegistry.set(def.name, def);
  return def;
}

export function getComponent(name: string): ComponentDef | undefined {
  return componentRegistry.get(name);
}

export function getBlock(name: string): BlockDef | undefined {
  return blockRegistry.get(name);
}

export function getAllComponents(): ComponentDef[] {
  return Array.from(componentRegistry.values());
}

export function getAllBlocks(): BlockDef[] {
  return Array.from(blockRegistry.values());
}

export function clearRegistry(): void {
  componentRegistry.clear();
  blockRegistry.clear();
}

// ============================================================================
// Built-in Block Templates
// ============================================================================

registerBlock({
  id: "block-heading",
  name: "heading",
  label: "Heading",
  description: "A section heading with optional subtitle",
  icon: "Heading",
  fields: [
    { name: "text", label: "Heading Text", type: "text", required: true },
    { name: "subtitle", label: "Subtitle", type: "text" },
    { name: "level", label: "Level", type: "select", options: [
      { label: "H1", value: "h1" },
      { label: "H2", value: "h2" },
      { label: "H3", value: "h3" },
    ], default_value: "h2" },
  ],
  preview: "<h2>Heading Text</h2>",
});

registerBlock({
  id: "block-text",
  name: "text",
  label: "Text",
  description: "A paragraph of text content",
  icon: "Text",
  fields: [
    { name: "content", label: "Content", type: "richtext", required: true },
  ],
  preview: "<p>Text content...</p>",
});

registerBlock({
  id: "block-image",
  name: "image",
  label: "Image",
  description: "An image with caption",
  icon: "Image",
  fields: [
    { name: "src", label: "Image URL", type: "media", required: true },
    { name: "alt", label: "Alt Text", type: "text" },
    { name: "caption", label: "Caption", type: "text" },
    { name: "size", label: "Size", type: "select", options: [
      { label: "Full Width", value: "full" },
      { label: "Contained", value: "contained" },
      { label: "Small", value: "small" },
    ], default_value: "full" },
  ],
  preview: "<img src=\"...\" alt=\"Image\" />",
});

registerBlock({
  id: "block-quote",
  name: "quote",
  label: "Quote",
  description: "A pull quote or blockquote",
  icon: "Quote",
  fields: [
    { name: "text", label: "Quote Text", type: "textarea", required: true },
    { name: "attribution", label: "Attribution", type: "text", placeholder: "Author name" },
    { name: "source", label: "Source", type: "text", placeholder: "Book or article title" },
  ],
  preview: "<blockquote>Quote text</blockquote>",
});

registerBlock({
  id: "block-video",
  name: "video",
  label: "Video",
  description: "Embed a video (YouTube/Vimeo)",
  icon: "Video",
  fields: [
    { name: "url", label: "Video URL", type: "url", required: true },
    { name: "caption", label: "Caption", type: "text" },
    { name: "aspect_ratio", label: "Aspect Ratio", type: "select", options: [
      { label: "16:9", value: "16/9" },
      { label: "4:3", value: "4/3" },
      { label: "1:1", value: "1/1" },
    ], default_value: "16/9" },
  ],
  preview: "<iframe src=\"...\"></iframe>",
});

registerBlock({
  id: "block-divider",
  name: "divider",
  label: "Divider",
  description: "A horizontal divider",
  icon: "Minus",
  fields: [],
  preview: "<hr />",
});

registerBlock({
  id: "block-button",
  name: "button",
  label: "Button",
  description: "A call-to-action button",
  icon: "Pointer",
  fields: [
    { name: "text", label: "Button Text", type: "text", required: true, default_value: "Learn More" },
    { name: "url", label: "Link URL", type: "url", required: true },
    { name: "variant", label: "Variant", type: "select", options: [
      { label: "Primary", value: "primary" },
      { label: "Secondary", value: "secondary" },
      { label: "Outline", value: "outline" },
    ], default_value: "primary" },
  ],
  preview: "<button>Button</button>",
});

registerBlock({
  id: "block-gallery",
  name: "gallery",
  label: "Gallery",
  description: "An image gallery with lightbox",
  icon: "Images",
  fields: [
    {
      name: "images",
      label: "Images",
      type: "repeater",
      field_options: {
        sub_fields: [
          { name: "src", label: "Image URL", type: "media", required: true },
          { name: "alt", label: "Alt Text", type: "text" },
          { name: "caption", label: "Caption", type: "text" },
        ],
      },
    },
    { name: "layout", label: "Layout", type: "select", options: [
      { label: "Grid (2 cols)", value: "grid-2" },
      { label: "Grid (3 cols)", value: "grid-3" },
      { label: "Masonry", value: "masonry" },
    ], default_value: "grid-2" },
  ],
  preview: "<div class=\"gallery\">[...]</div>",
});

// ============================================================================
// Utilities
// ============================================================================

/**
 * Create an empty repeater item from sub-field definitions.
 */
export function createRepeaterItem(subFields: ComponentFieldDef[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of subFields) {
    item[field.name] = field.default_value ?? "";
  }
  return item;
}

/**
 * Resolve nested sub-fields from a field definition.
 * Supports: repeater.sub_fields, block fields from registry
 */
export function resolveSubFields(field: Record<string, unknown>): ComponentFieldDef[] {
  if (field.sub_fields && Array.isArray(field.sub_fields)) {
    return field.sub_fields as ComponentFieldDef[];
  }
  const fieldOptions = (field.field_options as Record<string, unknown>) || {};
  if (fieldOptions.sub_fields && Array.isArray(fieldOptions.sub_fields)) {
    return fieldOptions.sub_fields as ComponentFieldDef[];
  }
  if (field.field_type === "block") {
    const blockName = fieldOptions.block_type as string;
    if (blockName) {
      const block = getBlock(blockName);
      if (block) return block.fields;
    }
    // Return all blocks as options if no specific block type
    return getAllBlocks().flatMap((b) => b.fields);
  }
  return [];
}
