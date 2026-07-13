import { useEffect, useRef, useCallback, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useUpdate, useCreate } from "@refinedev/core";
import { toast } from "sonner";

/* ─── Options ────────────────────────────────────────────────────── */

interface AutoSaveOptions<TForm extends FieldValues> {
  form: UseFormReturn<TForm>;
  /** Refine resource name (required when saveFn is not provided) */
  resource?: string;
  /** Resource ID for updates (omit for creates) */
  id?: string;
  /** Debounce delay in ms (default 2000) */
  delay?: number;
  /** Human-readable label for toast messages */
  label?: string;
  /** Transform values before saving */
  transform?: (values: TForm) => Record<string, any>;
  /** Called on successful save */
  onSuccess?: () => void;
  /** Called on save error */
  onError?: (error: any) => void;
  /** Whether autosave is enabled (default: when form is dirty) */
  enabled?: boolean;
  /**
   * Custom save function. When provided, bypasses Refine hooks (resource/id are not needed).
   * Useful for dynamic content that uses server functions instead of Refine data provider.
   */
  saveFn?: (values: TForm) => Promise<void>;
}

/* ─── Hook ───────────────────────────────────────────────────────── */

export function useAutoSave<TForm extends FieldValues>({
  form,
  resource,
  id,
  delay = 2000,
  label = "Changes",
  transform,
  onSuccess,
  onError,
  enabled,
  saveFn,
}: AutoSaveOptions<TForm>) {
  const { mutate: createMutate } = useCreate();
  const { mutate: updateMutate } = useUpdate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastValuesRef = useRef<string>("");

  const isEnabled = enabled !== undefined ? enabled : form.formState.isDirty;

  const save = useCallback(async () => {
    const values = form.getValues();
    const serialized = JSON.stringify(values);

    // Skip if nothing changed since last save
    if (serialized === lastValuesRef.current) return;
    lastValuesRef.current = serialized;

    const input = transform ? transform(values) : (values as any);
    setIsSaving(true);

    // Custom save function path (bypasses Refine hooks)
    if (saveFn) {
      try {
        await saveFn(values);
        setIsSaving(false);
        toast.success(`${label} saved`);
        onSuccess?.();
      } catch (e: any) {
        setIsSaving(false);
        toast.error(`Save failed: ${e?.message ?? "Error"}`);
        onError?.(e);
      }
      return;
    }

    // Default Refine hooks path (only reached when saveFn is not provided, so resource is always defined)
    const refResource = resource as string;
    if (id) {
      updateMutate(
        { resource: refResource, id, values: input },
        {
          onSuccess: () => {
            setIsSaving(false);
            toast.success(`${label} auto-saved`);
            onSuccess?.();
          },
          onError: (e: any) => {
            setIsSaving(false);
            toast.error(`Auto-save failed: ${e?.message ?? "Error"}`);
            onError?.(e);
          },
        },
      );
    } else {
      createMutate(
        { resource: refResource, values: input },
        {
          onSuccess: (result: any) => {
            setIsSaving(false);
            toast.success(`${label} created`);
            onSuccess?.();
            return result?.data?.id;
          },
          onError: (e: any) => {
            setIsSaving(false);
            toast.error(`Save failed: ${e?.message ?? "Error"}`);
            onError?.(e);
          },
        },
      );
    }
  }, [form, resource, id, transform, label, createMutate, updateMutate, onSuccess, onError, saveFn]);

  // Debounce save on form changes
  useEffect(() => {
    if (!isEnabled || !form.formState.isDirty) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isEnabled, form.formState.isDirty, form.formState.submitCount, delay, save]);

  // Flush pending save immediately
  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    save();
  }, [save]);

  return { save, flush, isSaving };
}
