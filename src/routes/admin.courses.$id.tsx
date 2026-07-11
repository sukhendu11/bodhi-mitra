import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllCourses, createCourse, updateCourse, fetchLessonsByCourse, createLesson, updateLesson, deleteLesson, type Course, type CourseLesson } from "@/lib/courses";
import { ArrowLeft, Plus, Save, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/courses/$id")({
  component: AdminCourseForm,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function AdminCourseForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const doFetch = useServerFn(fetchAllCourses);
  const doCreate = useServerFn(createCourse);
  const doUpdate = useServerFn(updateCourse);
  const doFetchLessons = useServerFn(fetchLessonsByCourse);
  const doCreateLesson = useServerFn(createLesson);
  const doUpdateLesson = useServerFn(updateLesson);
  const doDeleteLesson = useServerFn(deleteLesson);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => (doFetch as any)(),
    staleTime: 30_000,
  });

  const course = isNew ? null : courses.find((c: Course) => c.id === id) ?? null;

  const { data: lessons = [], refetch: refetchLessons } = useQuery({
    queryKey: ["admin-course-lessons", id],
    queryFn: () => (doFetchLessons as any)({ data: { courseId: id } }),
    enabled: !isNew,
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    slug: "",
    title_en: "",
    title_bn: "",
    description_en: "",
    description_bn: "",
    cover_image: "",
    category: "",
    level: "beginner",
    duration_weeks: 4,
    published: false,
  });

  const [newLesson, setNewLesson] = useState({ slug: "", title_en: "", title_bn: "" });
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({ slug: "", title_en: "", title_bn: "" });

  useEffect(() => {
    if (course) {
      setForm({
        slug: course.slug,
        title_en: course.title_en,
        title_bn: course.title_bn,
        description_en: course.description_en,
        description_bn: course.description_bn,
        cover_image: course.cover_image || "",
        category: course.category || "",
        level: course.level || "beginner",
        duration_weeks: course.duration_weeks,
        published: course.published,
      });
    }
  }, [course]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return (doCreate as any)({ data: form });
      } else {
        return (doUpdate as any)({ data: { ...form, id } });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["published-courses"] });
      queryClient.invalidateQueries({ queryKey: ["course"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      toast.success(isNew ? "Course created" : "Course saved");
      if (isNew && result?.id) navigate({ to: `/admin/courses/${result.id}` as any });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLessonMutation = useMutation({
    mutationFn: () => (doCreateLesson as any)({ data: { ...newLesson, course_id: id, sort_order: lessons.length } }),
    onSuccess: () => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["course"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      setNewLesson({ slug: "", title_en: "", title_bn: "" });
      toast.success("Lesson added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLessonMutation = useMutation({
    mutationFn: () => (doUpdateLesson as any)({ data: { ...editLessonForm, id: editingLesson } }),
    onSuccess: () => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["course"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      setEditingLesson(null);
      toast.success("Lesson saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => (doDeleteLesson as any)({ data: { id: lessonId } }),
    onSuccess: () => {
      refetchLessons();
      queryClient.invalidateQueries({ queryKey: ["course"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      toast.success("Lesson deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && !course && courses.length > 0) throw notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <Link to="/admin/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back to Courses
      </Link>

      <h2 className="text-xl font-semibold tracking-tight">{isNew ? "New Course" : "Edit Course"}</h2>

      {/* Course fields */}
      <div className="space-y-4 border border-border/60 p-6">
        <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
        <Field label="Title (English)" value={form.title_en} onChange={(v) => setForm({ ...form, title_en: v })} />
        <Field label="Title (বাংলা)" value={form.title_bn} onChange={(v) => setForm({ ...form, title_bn: v })} />
        <TextAreaField label="Description (English)" value={form.description_en} onChange={(v) => setForm({ ...form, description_en: v })} />
        <TextAreaField label="Description (বাংলা)" value={form.description_bn} onChange={(v) => setForm({ ...form, description_bn: v })} />
        <Field label="Cover Image URL" value={form.cover_image} onChange={(v) => setForm({ ...form, cover_image: v })} />
        <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium">Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/40">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <Field label="Duration (weeks)" value={String(form.duration_weeks)} onChange={(v) => setForm({ ...form, duration_weeks: parseInt(v) || 4 })} type="number" />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="rounded border-border" />
          <span className="text-xs font-medium text-muted-foreground">Published</span>
        </label>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40">
          {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          <Save className="h-3 w-3" /> {isNew ? "Create Course" : "Save Changes"}
        </button>
      </div>

      {/* Lessons section */}
      {!isNew && (
        <div className="border border-border/60 p-6">
          <h3 className="text-sm font-semibold mb-4">Lessons ({lessons.length})</h3>

          <div className="space-y-2 mb-6">
            {lessons.map((lesson: CourseLesson) => (
              <div key={lesson.id} className="flex items-center gap-3 border border-border/40 px-4 py-3">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                {editingLesson === lesson.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input value={editLessonForm.title_en} onChange={(e) => setEditLessonForm({ ...editLessonForm, title_en: e.target.value })}
                      className="flex-1 border border-border bg-background px-2 py-1 text-xs" placeholder="Title (EN)" />
                    <input value={editLessonForm.title_bn} onChange={(e) => setEditLessonForm({ ...editLessonForm, title_bn: e.target.value })}
                      className="flex-1 border border-border bg-background px-2 py-1 text-xs" placeholder="Title (BN)" />
                    <button onClick={() => updateLessonMutation.mutate()}
                      className="px-2 py-1 text-xs font-medium bg-foreground text-background">Save</button>
                    <button onClick={() => setEditingLesson(null)}
                      className="px-2 py-1 text-xs border border-border text-muted-foreground">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground w-5">{lesson.sort_order + 1}.</span>
                    <span className="text-sm flex-1 truncate">{lesson.title_en || lesson.title_bn || "Untitled"}</span>
                    <button onClick={() => { setEditingLesson(lesson.id); setEditLessonForm({ slug: lesson.slug, title_en: lesson.title_en, title_bn: lesson.title_bn }); }}
                      className="text-[0.55rem] uppercase tracking-wider text-muted-foreground hover:text-foreground">Edit</button>
                    <button onClick={() => deleteLessonMutation.mutate(lesson.id)}
                      className="text-[0.55rem] uppercase tracking-wider text-destructive hover:text-destructive/80">Delete</button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add lesson form */}
          <div className="border-t border-border/40 pt-4">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium mb-2">Add Lesson</p>
            <div className="flex items-center gap-2">
              <input value={newLesson.slug} onChange={(e) => setNewLesson({ ...newLesson, slug: e.target.value })}
                placeholder="slug" className="w-24 border border-border bg-background px-2 py-1.5 text-xs" />
              <input value={newLesson.title_en} onChange={(e) => setNewLesson({ ...newLesson, title_en: e.target.value })}
                placeholder="Title (EN)" className="flex-1 border border-border bg-background px-2 py-1.5 text-xs" />
              <input value={newLesson.title_bn} onChange={(e) => setNewLesson({ ...newLesson, title_bn: e.target.value })}
                placeholder="Title (BN)" className="flex-1 border border-border bg-background px-2 py-1.5 text-xs" />
              <button onClick={() => addLessonMutation.mutate()} disabled={!newLesson.slug || addLessonMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-40">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/40" />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground/40 resize-y" />
    </div>
  );
}
