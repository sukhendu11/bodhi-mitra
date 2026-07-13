import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";
import { Loader2, Save, ChevronLeft } from "lucide-react";
import { createContentType, contentTypeDefinitionSchema, getCollections } from "@/lib/content-modeling";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

export const Route = createFileRoute("/admin/content-types/new")({
  component: NewContentTypePage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const ICON_OPTIONS = [
  { value: "FileText", label: "File Text" },
  { value: "Layers", label: "Layers" },
  { value: "Settings2", label: "Settings" },
  { value: "BookOpen", label: "Book Open" },
  { value: "Video", label: "Video" },
  { value: "PlayCircle", label: "Play Circle" },
  { value: "MessageSquare", label: "Message Square" },
  { value: "Users", label: "Users" },
  { value: "ShoppingBag", label: "Shopping Bag" },
  { value: "Image", label: "Image" },
  { value: "File", label: "File" },
  { value: "Calendar", label: "Calendar" },
];

function NewContentTypePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation<any, Error, z.infer<typeof contentTypeDefinitionSchema>>({
    mutationFn: (data) =>
      (createContentType as any)({ data }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      toast.success("Content type created");
      navigate({ to: "/admin/content-types/$id", params: { id: result.id } });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: () => getCollections(),
  });

  const form = useForm({
    resolver: zodResolver(contentTypeDefinitionSchema),
    defaultValues: {
      name: "",
      slug: "",
      label: "",
      label_plural: "",
      description: "",
      icon: "FileText",
      content_type: "collection" as const,
      workflow_enabled: false,
      workflow_statuses: ["draft", "published"],
      workflow_default_status: "draft",
      workflow_transitions: { draft: ["published"], published: ["draft"] },
      has_slug: true,
      has_seo: false,
      has_tags: false,
      has_revisions: false,
      has_categories: false,
      has_authors: false,
      has_sort_order: false,
      has_rich_content: false,
      can_duplicate: true,
      can_archive: true,
      can_schedule: false,
      preview_url: "",
    },
  });

  const watchedLabel = form.watch("label");
  const watchedName = form.watch("name");
  const watchedContentType = form.watch("content_type");

  // Auto-generate name and slug from label
  const updateNameAndSlug = (label: string) => {
    const currentName = form.getValues("name");
    const currentSlug = form.getValues("slug");
    // Only auto-generate if not manually set
    if (!currentName || currentName === watchedName) {
      const generated = label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      form.setValue("name", generated);
    }
    if (!currentSlug || currentSlug === watchedLabel.toLowerCase().replace(/\s+/g, "-")) {
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      form.setValue("slug", slug);
    }
  };

  const onSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/admin/content-types" })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Content Type</h1>
          <p className="text-sm text-muted-foreground">
            Create a new dynamic content type for your site
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the identity of this content type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Article"
                        onChange={(e) => {
                          field.onChange(e);
                          updateNameAndSlug(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., article" className="font-mono text-sm" />
                      </FormControl>
                      <FormDescription>
                        Used internally. Snake case.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., article" className="font-mono text-sm" />
                      </FormControl>
                      <FormDescription>
                        Used in URLs. Lowercase with hyphens.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Brief description of this content type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="collection">Collection</SelectItem>
                          <SelectItem value="singleton">Singleton</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchedContentType === "collection"
                          ? "Multiple items (e.g., Articles, Books)"
                          : "Single item (e.g., About Page, Site Settings)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Enable features for this content type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workflow_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Workflow</FormLabel>
                        <p className="text-xs text-muted-foreground">Draft/Publish workflow</p>
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
                        <p className="text-xs text-muted-foreground">Category organization</p>
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
                  name="can_duplicate"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Duplicate</FormLabel>
                        <p className="text-xs text-muted-foreground">Allow duplication</p>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Content Type
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
