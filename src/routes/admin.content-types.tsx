import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Layers,
  Settings2,
  Trash2,
  Pencil,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createContentType, deleteContentType, getContentTypes } from "@/lib/content-modeling";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/content-types")({
  component: ContentTypesPage,
  errorComponent: ({ error }) => (
    <ErrorPage error={error} />
  ),
});

function ContentTypesPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: contentTypes, isLoading, error } = useQuery({
    queryKey: ["content-types"],
    queryFn: () => getContentTypes(),
  });

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: (id) => (deleteContentType as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-types"] });
      toast.success("Content type deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getTypeIcon = (icon: string) => {
    // Map icon strings to display
    switch (icon) {
      case "FileText": return <FileText className="h-5 w-5" />;
      case "Layers": return <Layers className="h-5 w-5" />;
      case "Settings2": return <Settings2 className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define and manage dynamic content types for your site
          </p>
        </div>
        <Link to="/admin/content-types/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Content Type
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {contentTypes && contentTypes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No content types yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first content type to start building dynamic content
            </p>
            <Link to="/admin/content-types/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Content Type
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {contentTypes && contentTypes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contentTypes.map((ct: { id: string; icon: string; label: string; content_type: string; description: string; slug: string; workflow_enabled: boolean; has_seo: boolean }) => (
            <Card key={ct.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getTypeIcon(ct.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{ct.label}</CardTitle>
                      <CardDescription>
                        {ct.content_type === "collection" ? "Collection" : "Singleton"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={ct.content_type === "collection" ? "default" : "secondary"}>
                    {ct.content_type === "collection" ? "Collection" : "Singleton"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {ct.description || "No description"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Slug: {ct.slug}</span>
                  {ct.workflow_enabled && (
                    <>
                      <span>·</span>
                      <span>Workflow</span>
                    </>
                  )}
                  {ct.has_seo && (
                    <>
                      <span>·</span>
                      <span>SEO</span>
                    </>
                  )}
                </div>
              </CardContent>
              <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Link to="/admin/content-types/$id" params={{ id: ct.id }}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete content type</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{ct.label}"? This will also delete all content
                        using this type. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(ct.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
