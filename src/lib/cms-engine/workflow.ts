import type { ContentTypeDefinition, WorkflowDef } from "./content-type";
import { getValidNextStatuses, getStatusLabel, getStatusColor, isValidTransition } from "./content-type";

/* ─── Workflow Helpers ────────────────────────────────────────────── */

export interface WorkflowAction {
  from: string;
  to: string;
  label: string;
  /** CSS color class for the action button */
  variant?: "default" | "destructive" | "outline";
}

/**
 * Get available workflow actions for a given content type and current status.
 * Returns a list of valid transitions with display labels.
 */
export function getWorkflowActions(
  def: ContentTypeDefinition,
  currentStatus: string,
): WorkflowAction[] {
  const nextStatuses = getValidNextStatuses(def, currentStatus);
  return nextStatuses.map((to) => ({
    from: currentStatus,
    to,
    label: getStatusLabel(def, to),
    variant: to === "published" ? "default" : to === "archived" ? "destructive" : "outline",
  }));
}

/**
 * Check if a content item can be viewed publicly.
 * Only published content is publicly viewable.
 */
export function isPubliclyVisible(def: ContentTypeDefinition, status: string): boolean {
  if (!def.workflow) return true;
  return status === "published";
}

/**
 * Get the default status for a content type.
 */
export function getDefaultStatus(def: ContentTypeDefinition): string {
  return def.workflow?.defaultStatus ?? def.workflow?.statuses[0] ?? "draft";
}

/**
 * Get all available statuses for a content type.
 */
export function getAvailableStatuses(def: ContentTypeDefinition): string[] {
  return def.workflow?.statuses ?? [];
}

/* ─── Status Configuration ────────────────────────────────────────── */

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
  /** Whether this status represents a publicly visible state */
  public: boolean;
}

/**
 * Build a rich status configuration from a workflow definition.
 * Useful for rendering status badges and filters in the admin UI.
 */
export function buildStatusConfig(workflow?: WorkflowDef): StatusConfig[] {
  if (!workflow) {
    return [
      { value: "draft", label: "Draft", color: "amber", public: false },
      { value: "published", label: "Published", color: "green", public: true },
    ];
  }

  return workflow.statuses.map((status) => ({
    value: status,
    label: workflow.labels?.[status] ?? status,
    color: workflow.colors?.[status] ?? "slate",
    public: status === "published",
  }));
}

/* ─── Workflow Validation ─────────────────────────────────────────── */

export interface WorkflowValidation {
  valid: boolean;
  message?: string;
}

/**
 * Validate a status transition for a given content type.
 */
export function validateTransition(
  def: ContentTypeDefinition,
  from: string,
  to: string,
): WorkflowValidation {
  if (!def.workflow) {
    return { valid: true }; // No workflow = no restrictions
  }

  if (!def.workflow.statuses.includes(from)) {
    return { valid: false, message: `"${from}" is not a valid status for "${def.label}"` };
  }

  if (!def.workflow.statuses.includes(to)) {
    return { valid: false, message: `"${to}" is not a valid status for "${def.label}"` };
  }

  if (from === to) {
    return { valid: false, message: `Content is already "${getStatusLabel(def, from)}"` };
  }

  if (!isValidTransition(def, from, to)) {
    return {
      valid: false,
      message: `Cannot move from "${getStatusLabel(def, from)}" to "${getStatusLabel(def, to)}"`,
    };
  }

  return { valid: true };
}
