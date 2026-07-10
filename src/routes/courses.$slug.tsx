import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchCourseBySlug, fetchLessons, enrollInCourse, getEnrollmentStatus, getLessonProgress, type CourseLesson } from "@/lib/courses";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/useAuth";
import { BookOpen, Clock, BarChart3, CheckCircle, Circle, Play, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/courses/$slug")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Course — ${loaderData}` },
    ],
  }),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const { user } = useAuthSession();
  const doFetchCourse = useServerFn(fetchCourseBySlug);
  const doFetchLessons = useServerFn(fetchLessons);
  const doEnroll = useServerFn(enrollInCourse);
  const doEnrollmentStatus = useServerFn(getEnrollmentStatus);
  const doProgress = useServerFn(getLessonProgress);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => (doFetchCourse as any)({ data: { slug } }),
    staleTime: 60_000,
  });

  const courseId = course?.id;

  const { data: lessons = [] } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: () => (doFetchLessons as any)({ data: { courseId } }),
    enabled: !!courseId,
    staleTime: 60_000,
  });

  const { data: enrollment, refetch: refetchEnrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: () => (doEnrollmentStatus as any)({ data: { courseId } }),
    enabled: !!courseId && !!user,
    staleTime: 30_000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", courseId, user?.id],
    queryFn: () => (doProgress as any)({ data: { courseId } }),
    enabled: !!courseId && !!user,
    staleTime: 30_000,
  });

  const completedLessonIds = new Set(progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id));
  const completedCount = completedLessonIds.size;

  const handleEnroll = async () => {
    if (!user || !courseId) return;
    await (doEnroll as any)({ data: { courseId } });
    refetchEnrollment();
  };

  if (isLoading) return <div className="mx-auto max-w-4xl px-6 py-20"><div className="h-64 bg-secondary/20 animate-pulse" /></div>;
  if (!course) throw notFound();

  const title = pickLocalized(course.title_en, course.title_bn, lang, "Untitled");
  const desc = pickLocalized(course.description_en, course.description_bn, lang, "");

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
      <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors mb-8">
        <ArrowLeft className="h-3 w-3" /> All Courses
      </Link>

      {/* Course header */}
      <div className="grid md:grid-cols-[1fr_280px] gap-8 mb-12">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight">{title}</h1>
          {desc && <p className="mt-4 text-muted-foreground leading-relaxed">{desc}</p>}
          <div className="flex flex-wrap gap-4 mt-5 text-xs text-muted-foreground">
            {course.level && (
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> {course.level}</span>
            )}
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {course.duration_weeks} weeks</span>
            <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {lessons.length} lessons</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border border-border/60 p-6">
          {course.cover_image && (
            <img src={course.cover_image} alt={title} className="w-full aspect-video object-cover mb-4" />
          )}
          {user ? (
            enrollment?.enrolled ? (
              <div className="text-center">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mb-2">
                  <CheckCircle className="h-4 w-4" /> Enrolled
                </div>
                <p className="text-xs text-muted-foreground">{completedCount}/{lessons.length} lessons completed</p>
              </div>
            ) : (
              <button onClick={handleEnroll}
                className="w-full px-6 py-2.5 text-xs uppercase tracking-[0.2em] font-medium bg-foreground text-background hover:opacity-90 transition-opacity">
                Enroll Free
              </button>
            )
          ) : (
            <Link to="/login" search={{ message: "Sign in to enroll in this course", redirect: `/courses/${slug}` } as any}
              className="w-full px-6 py-2.5 text-xs uppercase tracking-[0.2em] font-medium bg-foreground text-background hover:opacity-90 transition-opacity text-center block">
              Sign in to Enroll
            </Link>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {enrollment?.enrolled && lessons.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round((completedCount / lessons.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / lessons.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Lesson list */}
      <div className="border border-border/60 divide-y divide-border/40">
        {lessons.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No lessons yet. Check back soon.</p>
          </div>
        ) : (
          lessons.map((lesson: CourseLesson, i: number) => {
            const isCompleted = completedLessonIds.has(lesson.id);
            const lessonTitle = pickLocalized(lesson.title_en, lesson.title_bn, lang, "Untitled");
            return (
              <Link
                key={lesson.id}
                to={`/courses/${slug}/lessons/${lesson.slug}` as any}
                className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/10 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center shrink-0 group-hover:border-foreground/30 transition-colors">
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-foreground/80 transition-colors">{lessonTitle}</p>
                </div>
                <Play className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
