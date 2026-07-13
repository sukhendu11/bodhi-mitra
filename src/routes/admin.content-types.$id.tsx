import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";

// Icons
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  GripVertical,
  Save,
  FileText,
  Eye,
  EyeOff,
  Settings2,
  ChevronLeft,
  ListOrdered,
} from "lucide-react";

// Server functions
import {
  getContentTypeById,
  updateContentType,
  createContentField,
  updateContentField,
  deleteContentField,
  reorderFields,
  getCollections,
} from "@/lib/content-modeling";
import type { ContentField, ContentTypeWithFields } from "@/lib/content-modeling";

// Field type definitions
const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text", icon: "FileText" },
  { value: "textarea", label: "Textarea", icon: "AlignLeft" },
  { value: "richtext", label: "Rich Text", icon: "AlignLeft" },
  { value: "number", label: "Number", icon: "Hash" },
  { value: "boolean", label: "Boolean", icon: "ToggleLeft" },
  { value: "date", label: "Date", icon: "Calendar" },
  { value: "time", label: "Time", icon: "Clock" },
  { value: "datetime", label: "Date/Time", icon: "CalendarClock" },
  { value: "select", label: "Select", icon: "List" },
  { value: "multi_select", label: "Multi Select", icon: "ListChecks" },
  { value: "color", label: "Color", icon: "Palette" },
  { value: "icon", label: "Icon", icon: "Image" },
  { value: "media", label: "Media", icon: "Image" },
  { value: "file", label: "File", icon: "File" },
  { value: "url", label: "URL", icon: "Link" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "json", label: "JSON", icon: "Code" },
  { value: "code", label: "Code", icon: "Code" },
  { value: "relation", label: "Relation", icon: "Link2" },
  { value: "group", label: "Group", icon: "FolderOpen" },
  { value: "repeater", label: "Repeater", icon: "Copy" },
  { value: "block", label: "Block", icon: "Layout" },
  { value: "tab", label: "Tab", icon: "Rows" },
];

const COLUMN_SPAN_OPTIONS = [
  { value: 1, label: "Full width" },
  { value: 2, label: "Half width" },
  { value: 3, label: "Third width" },
];

export const Route = createFileRoute("/admin/content-types/$id")({
  component: ContentTypeEditorPage,   errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ContentTypeEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("fields");
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<(ContentField & { id: string }) | null>(null);

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections(),
  });

  const { data: contentTypeData, isLoading, error } = useQuery({
    queryKey: ["content-type", id],
    queryFn: () => (getContentTypeById as any)({ data: { id } }),
  });

  const updateMutation = useMutation<any, Error, Record<string, unknown>>({
    mutationFn: (updateData) =>
      (updateContentType as any)({ data: { id, data: updateData } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-type", id] });
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      toast.success("Content type updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addFieldMutation = useMutation<any, Error, ContentField>({
    mutationFn: (field) =>
      (createContentField as any)({ data: { content_type_id: id, field } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-type", id] });
      toast.success("Field added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateFieldMutation = useMutation<any, Error, { fieldId: string; fieldData: Partial<ContentField> }>({
    mutationFn: ({ fieldId, fieldData }) =>
      (updateContentField as any)({ data: { id: fieldId, field: fieldData } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-type", id] });
      toast.success("Field updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFieldMutation = useMutation<any, Error, string>({
    mutationFn: (fieldId) =>
      (deleteContentField as any)({ data: { id: fieldId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-type", id] });
      toast.success("Field deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderMutation = useMutation<any, Error, string[]>({
    mutationFn: (fieldIds) =>
      (reorderFields as any)({ data: { fieldIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-type", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contentTypeData) {
    return <ErrorPage error={new Error(error?.message || "Content type not found")} />;
  }

  const { definition: def, fields } = contentTypeData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/admin/content-types" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{def.label}</h1>
            <p className="text-sm text-muted-foreground">
              {def.content_type === "collection" ? "Collection" : "Singleton"}
              {" · "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{def.slug}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {fields.length} {fields.length === 1 ? "field" : "fields"}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="fields">
            <ListOrdered className="h-4 w-4 mr-2" />
            Fields
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Field Definitions</h2>
              <p className="text-sm text-muted-foreground">
                Define the fields for this content type
              </p>
            </div>
            <Button onClick={() => setShowFieldEditor(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>

          <Separator />

          {fields.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No fields defined</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add fields to define the structure of this content type
                </p>
                <Button onClick={() => setShowFieldEditor(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Field
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(fields as any[]).map((field: any, index: number) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  total={fields.length}
                  onMoveUp={() => {
                    const ids = (fields as any[]).map((f: any) => f.id);
                    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                    reorderMutation.mutate(ids);
                  }}
                  onMoveDown={() => {
                    const ids = (fields as any[]).map((f: any) => f.id);
                    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                    reorderMutation.mutate(ids);
                  }}
                  onEdit={() => {
                    setEditingField(field);
                    setShowFieldEditor(true);
                  }}
                  onDelete={() => deleteFieldMutation.mutate(field.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <ContentTypeSettingsForm
            definition={def}
            onSave={(settings) => updateMutation.mutate(settings)}
            isPending={updateMutation.isPending}
            collections={collections}
          />
        </TabsContent>
      </Tabs>

      {/* Field Editor Dialog */}
      {showFieldEditor && (
        <FieldEditorDialog
          field={editingField}
          contentTypeId={id}
          onSave={(field) => {
            if (editingField) {
              updateFieldMutation.mutate({ fieldId: editingField.id, fieldData: field });
            } else {
              addFieldMutation.mutate(field);
            }
            setShowFieldEditor(false);
            setEditingField(null);
          }}
          onClose={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Field Card Component
// ============================================================================

function FieldCard({
  field,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  field: ContentField & { id: string };
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fieldTypeLabel = FIELD_TYPE_OPTIONS.find((o) => o.value === field.field_type)?.label || field.field_type;

  return (
    <Card className="group">
      <CardContent className="flex items-center gap-4 py-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{field.label}</span>
            {field.required && (
              <span className="text-destructive text-xs">*</span>
            )}
            {field.system_field && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">system</Badge>
            )}
            {field.seo_field && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">seo</Badge>
            )}
            {field.unique_field && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">unique</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <code className="text-[10px] bg-muted px-1 rounded">{field.name}</code>
            <span>·</span>
            <span>{fieldTypeLabel}</span>
            {field.group_name && (
              <>
                <span>·</span>
                <span>Group: {field.group_name}</span>
              </>
            )}
            {field.tab_name && (
              <>
                <span>·</span>
                <span>Tab: {field.tab_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          {!field.system_field && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Field Editor Dialog
// ============================================================================

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function FieldEditorDialog({
  field,
  contentTypeId,
  onSave,
  onClose,
}: {
  field: (ContentField & { id: string }) | null;
  contentTypeId: string;
  onSave: (field: ContentField) => void;
  onClose: () => void;
}) {
  const isEditing = !!field;
  const [fieldType, setFieldType] = useState<string>(field?.field_type || "text");
  const [fieldName, setFieldName] = useState(field?.name || "");
  const [fieldLabel, setFieldLabel] = useState(field?.label || "");
  const [fieldLabelBn, setFieldLabelBn] = useState(field?.label_bn || "");
  const [fieldRequired, setFieldRequired] = useState(field?.required || false);
  const [fieldUnique, setFieldUnique] = useState(field?.unique_field || false);
  const [fieldDescription, setFieldDescription] = useState(field?.description || "");
  const [fieldGroupName, setFieldGroupName] = useState(field?.group_name || "");
  const [fieldTabName, setFieldTabName] = useState(field?.tab_name || "");
  const [fieldColumnSpan, setFieldColumnSpan] = useState(field?.column_span || 1);
  const [fieldPlaceholder, setFieldPlaceholder] = useState(field?.placeholder || "");
  const [fieldDefaultValue, setFieldDefaultValue] = useState(
    field?.default_value !== null && field?.default_value !== undefined
      ? String(field.default_value)
      : ""
  );
  const [fieldSeo, setFieldSeo] = useState(field?.seo_field || false);

  // Select/multi_select options
  const [selectOptions, setSelectOptions] = useState<string[]>(
    () => {
      const opts = (field?.field_options as any)?.options;
      return opts ? opts.map((o: any) => o.value) : [];
    }
  );
  const [newOption, setNewOption] = useState("");

  // Auto-generate field name from label
  useEffect(() => {
    if (!isEditing && fieldLabel) {
      const generated = fieldLabel
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .replace(/^_|_$/g, "");
      setFieldName(generated);
    }
  }, [fieldLabel, isEditing]);

  const handleSave = () => {
    const fieldData: ContentField = {
      name: fieldName || fieldLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      label: fieldLabel,
      label_bn: fieldLabelBn,
      field_type: fieldType as ContentField["field_type"],
      required: fieldRequired,
      unique_field: fieldUnique,
      validation_rules: {},
      field_options: fieldType === "select" || fieldType === "multi_select"
        ? { options: selectOptions.map((v) => ({ label: v, value: v })) }
        : {},
      placeholder: fieldPlaceholder,
      placeholder_bn: "",
      description: fieldDescription,
      description_bn: "",
      default_value: fieldDefaultValue || null,
      group_name: fieldGroupName,
      tab_name: fieldTabName,
      sort_order: field?.sort_order || 0,
      column_span: fieldColumnSpan as 1 | 2 | 3,
      show_if: {},
      system_field: false,
      seo_field: fieldSeo,
      sub_fields: [],
    };
    onSave(fieldData);
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? "Edit Field" : "Add Field"}</SheetTitle>
          <SheetDescription>
            Configure the field properties for this content type
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Field Type */}
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select value={fieldType} onValueChange={(v: string) => setFieldType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="fieldLabel">Label *</Label>
            <Input
              id="fieldLabel"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="e.g., Author Name"
            />
          </div>

          {/* Label (Bangla) */}
          <div className="space-y-2">
            <Label htmlFor="fieldLabelBn">Label (Bangla)</Label>
            <Input
              id="fieldLabelBn"
              value={fieldLabelBn}
              onChange={(e) => setFieldLabelBn(e.target.value)}
              placeholder="e.g., লেখকের নাম"
            />
          </div>

          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="fieldName">Field Name</Label>
            <Input
              id="fieldName"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g., author_name"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used in code and API. Auto-generated from label.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="fieldDesc">Description</Label>
            <Textarea
              id="fieldDesc"
              value={fieldDescription}
              onChange={(e) => setFieldDescription(e.target.value)}
              placeholder="Help text shown below the field"
              rows={2}
            />
          </div>

          {/* Placeholder */}
          <div className="space-y-2">
            <Label htmlFor="fieldPlaceholder">Placeholder</Label>
            <Input
              id="fieldPlaceholder"
              value={fieldPlaceholder}
              onChange={(e) => setFieldPlaceholder(e.target.value)}
              placeholder="e.g., Enter author name..."
            />
          </div>

          {/* Default Value */}
          <div className="space-y-2">
            <Label htmlFor="fieldDefault">Default Value</Label>
            <Input
              id="fieldDefault"
              value={fieldDefaultValue}
              onChange={(e) => setFieldDefaultValue(e.target.value)}
              placeholder="Optional default value"
            />
          </div>

          {/* Select Options (for select/multi_select types) */}
          {(fieldType === "select" || fieldType === "multi_select") && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add option..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newOption.trim()) {
                      e.preventDefault();
                      setSelectOptions([...selectOptions, newOption.trim()]);
                      setNewOption("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newOption.trim()) {
                      setSelectOptions([...selectOptions, newOption.trim()]);
                      setNewOption("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {selectOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectOptions.map((opt, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {opt}
                      <button
                        onClick={() => setSelectOptions(selectOptions.filter((_, j) => j !== i))}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Layout Settings */}
          <Separator />
          <h3 className="text-sm font-medium">Layout</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fieldGroup">Group Name</Label>
              <Input
                id="fieldGroup"
                value={fieldGroupName}
                onChange={(e) => setFieldGroupName(e.target.value)}
                placeholder="e.g., Basic Info"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldTab">Tab Name</Label>
              <Input
                id="fieldTab"
                value={fieldTabName}
                onChange={(e) => setFieldTabName(e.target.value)}
                placeholder="e.g., Content"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Column Span</Label>
            <Select
              value={String(fieldColumnSpan)}
              onValueChange={(v) => setFieldColumnSpan(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_SPAN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggles */}
          <Separator />
          <h3 className="text-sm font-medium">Validation & Options</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="fieldRequired">Required</Label>
                <p className="text-xs text-muted-foreground">
                  Field must have a value
                </p>
              </div>
              <Switch
                id="fieldRequired"
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="fieldUnique">Unique</Label>
                <p className="text-xs text-muted-foreground">
                  No duplicate values allowed
                </p>
              </div>
              <Switch
                id="fieldUnique"
                checked={fieldUnique}
                onCheckedChange={setFieldUnique}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="fieldSeo">SEO Field</Label>
                <p className="text-xs text-muted-foreground">
                  Used for SEO metadata
                </p>
              </div>
              <Switch
                id="fieldSeo"
                checked={fieldSeo}
                onCheckedChange={setFieldSeo}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!fieldLabel}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Update Field" : "Add Field"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Content Type Settings Form
// ============================================================================

function ContentTypeSettingsForm({
  definition,
  onSave,
  isPending,
  collections,
}: {
  definition: ContentTypeWithFields["definition"];
  onSave: (data: Record<string, unknown>) => void;
  isPending: boolean;
  collections?: any[];
}) {
  const form = useForm({
    defaultValues: {
      label: definition.label,
      label_plural: definition.label_plural || "",
      description: definition.description || "",
      icon: definition.icon,
      workflow_enabled: definition.workflow_enabled,
      workflow_default_status: definition.workflow_default_status,
      has_slug: definition.has_slug,
      has_seo: definition.has_seo,
      has_tags: definition.has_tags,
      has_revisions: definition.has_revisions,
      has_categories: definition.has_categories,
      has_authors: definition.has_authors,
      has_sort_order: definition.has_sort_order,
      has_rich_content: definition.has_rich_content,
      can_duplicate: definition.can_duplicate,
      can_archive: definition.can_archive,
      can_schedule: definition.can_schedule,
      preview_url: definition.preview_url || "",
      collection_id: definition.collection_id || "",
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    onSave(data as unknown as Record<string, unknown>);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic configuration for this content type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Article" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label_plural"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (Plural)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Articles" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />              <FormField
              control={form.control}
              name="preview_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preview URL Pattern</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="/books/{slug}" />
                  </FormControl>
                  <FormDescription>
                    URL template for previewing content. Use {`{slug}`} as placeholder.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="collection_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a collection..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collections?.map((col: any) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Group this content type into a logical collection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              Enable or disable features for this content type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workflow_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Workflow</FormLabel>
                      <p className="text-xs text-muted-foreground">Draft/Publish/Archive</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_slug"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Slug</FormLabel>
                      <p className="text-xs text-muted-foreground">URL-friendly identifier</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_seo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>SEO</FormLabel>
                      <p className="text-xs text-muted-foreground">Meta tags & descriptions</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_tags"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Tags</FormLabel>
                      <p className="text-xs text-muted-foreground">Tag-based classification</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_revisions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Revisions</FormLabel>
                      <p className="text-xs text-muted-foreground">Version history</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_categories"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Categories</FormLabel>
                      <p className="text-xs text-muted-foreground">Category-based organization</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_authors"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Authors</FormLabel>
                      <p className="text-xs text-muted-foreground">Author attribution</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_sort_order"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Sort Order</FormLabel>
                      <p className="text-xs text-muted-foreground">Manual ordering</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_duplicate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Duplicate</FormLabel>
                      <p className="text-xs text-muted-foreground">Allow content duplication</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_archive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Archive</FormLabel>
                      <p className="text-xs text-muted-foreground">Archive instead of delete</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="can_schedule"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Schedule</FormLabel>
                      <p className="text-xs text-muted-foreground">Scheduled publishing</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
