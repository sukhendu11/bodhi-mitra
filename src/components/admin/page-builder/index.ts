// ============================================================================
// Page Builder — Barrel Exports
// ============================================================================

export { PageBuilder } from "./PageBuilder";
export { BuilderCanvas } from "./BuilderCanvas";
export { BuilderSidebar } from "./BuilderSidebar";
export { BuilderToolbar } from "./BuilderToolbar";
export { ComponentPalette } from "./ComponentPalette";
export { StylePanel } from "./StylePanel";
export { ResponsivePreview } from "./ResponsivePreview";
export { ComponentRenderer, BuilderPreview } from "./DefaultComponents";

export type { BuilderComponentNode, BuilderComponentType } from "@/lib/page-builder/types";
export { createDefaultPage, SECTION_TEMPLATES, COMPONENT_DEFS, generateId } from "@/lib/page-builder/defaults";
export {
  serializeTree,
  deserializeTree,
  findNodeById,
  flattenTree,
  deepClone,
} from "@/lib/page-builder/utils";
