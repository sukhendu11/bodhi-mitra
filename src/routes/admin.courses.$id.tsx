import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useOne, useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Course, type CourseLesson } from "@/lib/courses";
import { ArrowLeft, Plus, Save, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BilingualField, FormFieldRow, FIELD_LABEL } from "@/components/admin/bilingual-field";

export const Route = createFileRoute("/admin/courses/$id")({
  component: AdminCourseForm,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const courseSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  title_en: z.string().min(1, "English title is required"),
  title_bn: z.string().min(1, "Bengali title is required"),
  description_en: z.string().optional().default(""),
  description_bn: z.string().optional().default(""),
  cover_image: z.string().optional().default(""),
  category: z.string().optional().default(""),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.coerce.number().min(1, "At least 1 week"),
  published: z.boolean(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

function AdminCourseForm() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();

  const { query: courseQuery, result: courseResult } = useOne<Course>({
    resource: "courses",
    id,
    queryOptions: { enabled: !isNew },
  });
  const course = isNew ? null : (courseResult as Course | null);
  const courseLoading = courseQuery?.isLoading ?? false;

  const { query: lessonsQuery, result: lessonsResult } = useList<CourseLesson>({
    resource: "course_lessons",
    filters: [{ field: "course_id", operator: "eq", value: id }],
    sorters: [{ field: "sort_order", order: "asc" }],
    queryOptions: { enabled: !isNew },
  });
  const lessons = lessonsResult?.data ?? [];

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
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
    },
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (course && !initialized) {
      form.reset({
        slug: course.slug,
        title_en: course.title_en,
        title_bn: course.title_bn,
        description_en: course.description_en || "",
        description_bn: course.description_bn || "",
        cover_image: course.cover_image || "",
        category: course.category || "",
        level: (course.level as "beginner" | "intermediate" | "advanced") || "beginner",
        duration_weeks: course.duration_weeks,
        published: course.published,
      });
      setInitialized(true);
    }
  }, [course, initialized, form]);

  useUnsavedChanges(form.formState.isDirty);

  const { mutate: createMutate, mutation: createMutation } = useCreate();
  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();
  const isSaving = (createMutation?.isPending || updateMutation?.isPending) ?? false;

  const handleSave = form.handleSubmit((values) => {
    if (isNew) {
      createMutate(
        { resource: "courses", values },
        {
          onSuccess: (result: any) => {
            toast.success("Course created");
            if (result?.data?.id) navigate({ to: `/admin/courses/${result.data.id}` as any });
          },
          onError: (e: any) => toast.error(e?.message ?? "Create failed"),
        },
      );
    } else {
      updateMutate(
        { resource: "courses", id, values },
        {
          onSuccess: () => {
            toast.success("Course saved");
            form.reset(values);
          },
          onError: (e: any) => toast.error(e?.message ?? "Save failed"),
        },
      );
    }
  });

  const [newLesson, setNewLesson] = useState({ slug: "", title_en: "", title_bn: "" });
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({ slug: "", title_en: "", title_bn: "" });

  const { mutate: createLessonMutate, mutation: createLessonMutation } = useCreate();
  const { mutate: updateLessonMutate, mutation: updateLessonMutation } = useUpdate();
  const { mutate: deleteLessonMutate, mutation: deleteLessonMutation } = useDelete();

  const handleAddLesson = () => {
    createLessonMutate(
      { resource: "course_lessons", values: { ...newLesson, course_id: id, sort_order: lessons.length } },
      {
        onSuccess: () => {
          setNewLesson({ slug: "", title_en: "", title_bn: "" });
          toast.success("Lesson added");
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to add lesson"),
      },
    );
  };

  const handleUpdateLesson = () => {
    if (!editingLesson) return;
    updateLessonMutate(
      { resource: "course_lessons", id: editingLesson, values: editLessonForm },
      {
        onSuccess: () => {
          setEditingLesson(null);
          toast.success("Lesson saved");
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to update lesson"),
      },
    );
  };

  const handleDeleteLesson = (lessonId: string) => {
    deleteLessonMutate(
      { resource: "course_lessons", id: lessonId },
      {
        onSuccess: () => toast.success("Lesson deleted"),
        onError: (e: any) => toast.error(e?.message ?? "Failed to delete lesson"),
      },
    );
  };

  if (!isNew && !course && !courseLoading) throw notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <Link to="/admin/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back to Courses
      </Link>

      <h2 className="text-xl font-semibold tracking-tight">{isNew ? "New Course" : "Edit Course"}</h2>

      <Form {...form}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-5 border border-border/60 p-6">
            <FormFieldRow control={form.control} name="slug" label="Slug" placeholder="course-slug" />

            <BilingualField
              control={form.control}
              nameEn="title_en"
              nameBn="title_bn"
              labelEn="Title (English)"
              labelBn="Title (বাংলা)"
              placeholderEn="Buddhist Psychology"
              placeholderBn="বৌদ্ধ মনোবিজ্ঞান"
            />

            <BilingualField
              control={form.control}
              nameEn="description_en"
              nameBn="description_bn"
              labelEn="Description (English)"
              labelBn="Description (বাংলা)"
              as="textarea"
              textareaRows={3}
            />

            <FormFieldRow control={form.control} name="cover_image" label="Cover Image URL" placeholder="https://..." />
            <FormFieldRow control={form.control} name="category" label="Category" placeholder="buddhist-psychology" />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={FIELD_LABEL}>Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormFieldRow control={form.control} name="duration_weeks" label="Duration (weeks)" placeholder="4" />
            </div>

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-xs font-medium text-muted-foreground cursor-pointer">Published</FormLabel>
                </FormItem>
              )}
            />

            <button type="submit" disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40">
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              <Save className="h-3 w-3" /> {isNew ? "Create Course" : "Save Changes"}
            </button>
          </div>
        </form>
      </Form>

      {!isNew && (
        <div className="border border-border/60 p-6">
          <h3 className="text-sm font-semibold mb-4">Lessons ({lessons.length})</h3>

          <div className="space-y-2 mb-6">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center gap-3 border border-border/40 px-4 py-3">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                {editingLesson === lesson.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input value={editLessonForm.title_en} onChange={(e) => setEditLessonForm({ ...editLessonForm, title_en: e.target.value })}
                      className="flex-1 border border-border bg-background px-2 py-1 text-xs" placeholder="Title (EN)" />
                    <input value={editLessonForm.title_bn} onChange={(e) => setEditLessonForm({ ...editLessonForm, title_bn: e.target.value })}
                      className="flex-1 border border-border bg-background px-2 py-1 text-xs" placeholder="Title (BN)" />
                    <button onClick={handleUpdateLesson}
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
                    <button onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-[0.55rem] uppercase tracking-wider text-destructive hover:text-destructive/80">Delete</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border/40 pt-4">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-medium mb-2">Add Lesson</p>
            <div className="flex items-center gap-2">
              <input value={newLesson.slug} onChange={(e) => setNewLesson({ ...newLesson, slug: e.target.value })}
                placeholder="slug" className="w-24 border border-border bg-background px-2 py-1.5 text-xs" />
              <input value={newLesson.title_en} onChange={(e) => setNewLesson({ ...newLesson, title_en: e.target.value })}
                placeholder="Title (EN)" className="flex-1 border border-border bg-background px-2 py-1.5 text-xs" />
              <input value={newLesson.title_bn} onChange={(e) => setNewLesson({ ...newLesson, title_bn: e.target.value })}
                placeholder="Title (BN)" className="flex-1 border border-border bg-background px-2 py-1.5 text-xs" />
              <button onClick={handleAddLesson} disabled={!newLesson.slug || (createLessonMutation?.isPending ?? false)}
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
