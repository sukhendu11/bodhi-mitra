import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllCourses, deleteCourse, type Course } from "@/lib/courses";
import { Plus, Edit3, Trash2, Eye, EyeOff, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const doFetch = useServerFn(fetchAllCourses);
  const doDelete = useServerFn(deleteCourse);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => (doFetch as any)(),
    staleTime: 30_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => (doDelete as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["published-courses"] });
      queryClient.invalidateQueries({ queryKey: ["course"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      toast.success("Course deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Courses</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage your course catalog.</p>
        </div>
        <Link to="/admin/courses/$id" params={{ id: "new" }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium bg-foreground text-background hover:opacity-90 transition-opacity">
          <Plus className="h-3 w-3" /> New Course
        </Link>
      </div>

      <div className="border border-border/60 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">No courses yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {courses.map((course: Course) => (
              <div key={course.id} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
                  {course.published ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground/50" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{course.title_en || course.title_bn || "Untitled"}</p>
                  <p className="text-[0.6rem] text-muted-foreground">/{course.slug}</p>
                </div>
                <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground border border-border/40 px-2 py-0.5">
                  {course.published ? "Published" : "Draft"}
                </span>
                <Link to={`/admin/courses/${course.id}` as any}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                </Link>
                <button onClick={() => setDeletingId(course.id)}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course</AlertDialogTitle>
            <AlertDialogDescription>This will delete the course and all its lessons. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) del.mutate(deletingId); }}
              className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
