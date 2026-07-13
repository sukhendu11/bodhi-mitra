import { useAutoSave } from "@/components/admin/form-engine";
import type { UseFormReturn } from "react-hook-form";
import {
  createDynamicContentItem,
  updateDynamicContentItem,
} from "@/lib/content-modeling";

interface UseContentAutosaveOptions {
  form: UseFormReturn;
  contentTypeId: string;
  itemId?: string;
  delay?: number;
  label?: string;
  enabled?: boolean;
  onSaved?: () => void;
}

/**
 * Autosave hook for dynamic content forms.
 * Thin wrapper around the generic useAutoSave hook with a saveFn
 * that calls the appropriate server function.
 */
export function useContentAutosave({
  form,
  contentTypeId,
  itemId,
  delay = 3000,
  label = "Changes",
  enabled = true,
  onSaved,
}: UseContentAutosaveOptions) {
  const saveFn = async (values: Record<string, unknown>) => {
    if (itemId) {
      await (updateDynamicContentItem as any)({
        data: { contentTypeId, itemId, contentData: values },
      });
    } else {
      await (createDynamicContentItem as any)({
        data: { contentTypeId, contentData: values },
      });
    }
  };

  return useAutoSave({
    form,
    delay,
    label,
    enabled,
    saveFn,
    onSuccess: onSaved,
  });
}
