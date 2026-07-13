import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";
import {
  getContentTypeById,
  getDynamicContentItem,
  createDynamicContentItem,
  updateDynamicContentItem,
} from "@/lib/content-modeling";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  Save,
  Loader2,
} from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { useState, useEffect, useCallback } from "react";
import { validateContentFields } from "@/lib/content-validation";
import { BlockEditorSaveContext } from "@/components/admin/form-engine/field-renderer";
import { useContentAutosave } from "@/hooks/useContentAutosave";
import { renderGroupFields } from "@/components/admin/form-engine";
import { toFormGroups } from "@/lib/dynamic-form-bridge";

// ============================================================================

export const Route = createFileRoute("/admin/collections/$type/$id")({
  component: DynamicContentEditorPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function DynamicContentEditorPage() {
  const { type: contentTypeId, id: itemId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = itemId === "new";

  // Fetch content type definition
  const { data: contentType, isLoading: loadingDef } = useQuery({
    queryKey: ["content-type", contentTypeId],
    queryFn: () => (getContentTypeById as any)({ data: { id: contentTypeId } }),
  });

  // Fetch existing item (for edit mode)
  const { data: existingItem, isLoading: loadingItem } = useQuery({
    queryKey: ["dynamic-content-item", contentTypeId, itemId],
    queryFn: () =>
      (getDynamicContentItem as any)({ data: { contentTypeId, itemId } }),
    enabled: !isNew,
  });

  const createMutation = useMutation<any, Error, Record<string, unknown>>({
    mutationFn: (contentData) =>
      (createDynamicContentItem as any)({ data: { contentTypeId, contentData } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-content", contentTypeId] });
      toast.success("Content created");
      navigate({ to: "/admin/collections/$type", params: { type: contentTypeId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation<any, Error, Record<string, unknown>>({
    mutationFn: (contentData) =>
      (updateDynamicContentItem as any)({ data: { contentTypeId, itemId, contentData } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dynamic-content", contentTypeId] });
      queryClient.invalidateQueries({ queryKey: ["dynamic-content-item", contentTypeId] });
      toast.success("Content updated");
      navigate({ to: "/admin/collections/$type", params: { type: contentTypeId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const form = useForm();

  /* ── Autosave ────────────────────────────────────────────────── */

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const { isSaving } = useContentAutosave({
    form,
    contentTypeId,
    itemId: isNew ? undefined : itemId,
    delay: 3000,
    label: "Content",
    enabled: !isNew,
    onSaved: useCallback(() => setLastSavedAt(new Date()), []),
  });

  // Populate form when data loads
  useEffect(() => {
    if (!isNew && existingItem?.content_data) {
      const data = existingItem.content_data as Record<string, unknown>;
      Object.entries(data).forEach(([key, value]) => {
        form.setValue(key, value);
      });
    }
  }, [existingItem, isNew, form]);

  // Display loading state
  if (loadingDef || (!isNew && loadingItem)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contentType) {
    return <ErrorPage error={new Error("Content type not found")} />;
  }

  const { definition: def, fields } = contentType;

  const handleSave = form.handleSubmit(async (data) => {
    const contentData = data as Record<string, unknown>;

    // Validate before save
    if (fields.length > 0) {
      const validation = await validateContentFields(fields, contentData);
      if (!validation.valid) {
        validation.errors.forEach((err) => {
          form.setError(err.field, { type: "manual", message: err.message });
        });
        toast.error("Please fix validation errors before saving");
        return;
      }
    }

    if (isNew) {
      createMutation.mutate(contentData);
    } else {
      updateMutation.mutate(contentData);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate({ to: "/admin/collections/$type", params: { type: contentTypeId } })
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNew ? `New ${def.label}` : `Edit ${def.label}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {def.description || `Fill in the fields for this ${def.label.toLowerCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dynamic Form - rendered via FormEngine + dynamic-form-bridge */}
      <BlockEditorSaveContext.Provider value={{ isSaving, lastSavedAt }}>
        <div className="space-y-6">
          {renderFieldGroups(fields, form)}
        </div>
      </BlockEditorSaveContext.Provider>

      {/* Bottom Save */}
      <div className="flex justify-end sticky bottom-0 bg-background py-4 border-t">
        <Button onClick={handleSave} size="lg" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Create" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Dynamic Field Rendering (delegates to FormEngine via dynamic-form-bridge)
// ============================================================================

function renderFieldGroups(
  fields: any[],
  form: UseFormReturn,
) {
  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No fields defined for this content type.</p>
        </CardContent>
      </Card>
    );
  }

  const formGroups = toFormGroups(fields);

  return formGroups.map((group) => (
    <Card key={group.title || "default"}>
      {group.title && (
        <CardHeader>
          <CardTitle className="text-lg">{group.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {renderGroupFields(group, form)}
      </CardContent>
    </Card>
  ));
}
