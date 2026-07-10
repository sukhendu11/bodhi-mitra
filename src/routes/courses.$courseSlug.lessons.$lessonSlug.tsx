import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchCourseBySlug, fetchLessonBySlug, fetchLessons, toggleLessonProgress, getLessonProgress, type CourseLesson } from "@/lib/courses";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/useAuth";
import { CheckCircle, Circle, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/courses/$courseSlug/lessons/$lessonSlug")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Lesson — ${loaderData}` },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { courseSlug, lessonSlug } = Route.useParams();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const doCourse = useServerFn(fetchCourseBySlug);
  const doLesson = useServerFn(fetchLessonBySlug);
  const doLessons = useServerFn(fetchLessons);
  const doToggle = useServerFn(toggleLessonProgress);
  const doProgress = useServerFn(getLessonProgress);

  const { data: course } = useQuery({
    queryKey: ["course", courseSlug],
    queryFn: () => (doCourse as any)({ data: { slug: courseSlug } }),
    staleTime: 60_000,
  });

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", courseSlug, lessonSlug],
    queryFn: () => (doLesson as any)({ data: { courseSlug, lessonSlug } }),
    staleTime: 60_000,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["course-lessons", course?.id],
    queryFn: () => (doLessons as any)({ data: { courseId: course?.id } }),
    enabled: !!course?.id,
    staleTime: 60_000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", course?.id, user?.id],
    queryFn: () => (doProgress as any)({ data: { courseId: course?.id } }),
    enabled: !!course?.id && !!user,
    staleTime: 30_000,
  });

  const completedLessonIds = new Set(progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id));

  const mutation = useMutation({
    mutationFn: () => (doToggle as any)({
      data: { lessonId: lesson?.id, courseId: course?.id, completed: !completedLessonIds.has(lesson?.id) },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", course?.id] });
    },
  });

  const currentIndex = lessons.findIndex((l: CourseLesson) => l.id === lesson?.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  if (isLoading) return <div className="mx-auto max-w-4xl px-6 py-20"><div className="h-64 bg-secondary/20 animate-pulse" /></div>;
  if (!course || !lesson) throw notFound();

  const title = pickLocalized(lesson.title_en, lesson.title_bn, lang, "Untitled");
  const content = pickLocalized(lesson.content_en, lesson.content_bn, lang, "");
  const isCompleted = completedLessonIds.has(lesson.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
      {/* Breadcrumb */}
      <Link to={`/courses/${courseSlug}` as any} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors mb-6">
        <ArrowLeft className="h-3 w-3" /> {pickLocalized(course.title_en, course.title_bn, lang, "Course")}
      </Link>

      {/* Lesson header */}
      <div className="mb-10">
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Lesson {currentIndex + 1} of {lessons.length}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl leading-tight">{title}</h1>
      </div>

      {/* Progress toggle */}
      {user && (
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors mb-8 ${
            isCompleted
              ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
          }`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
          {isCompleted ? "Completed" : "Mark as complete"}
        </button>
      )}

      {/* Video */}
      {lesson.video_url && (
        <div className="aspect-video mb-8 bg-secondary/20">
          <iframe src={lesson.video_url} className="w-full h-full" title={title} allowFullScreen />
        </div>
      )}

      {/* Content */}
      <div className="prose-mitra max-w-none">
        {content.split("\n\n").filter(Boolean).map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed">{p}</p>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/40">
        {prevLesson ? (
          <Link to={`/courses/${courseSlug}/lessons/${prevLesson.slug}` as any}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            {pickLocalized(prevLesson.title_en, prevLesson.title_bn, lang, "Previous")}
          </Link>
        ) : <div />}
        {nextLesson ? (
          <Link to={`/courses/${courseSlug}/lessons/${nextLesson.slug}` as any}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {pickLocalized(nextLesson.title_en, nextLesson.title_bn, lang, "Next")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
