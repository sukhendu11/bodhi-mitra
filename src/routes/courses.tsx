import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchPublishedCourses, type Course } from "@/lib/courses";
import { getSiteName } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { BookOpen, Clock, BarChart3, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/courses")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Courses — ${loaderData}` },
      { name: "description", content: "Explore our guided courses on Buddhist psychology and mindfulness." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { lang } = useLang();
  const doFetch = useServerFn(fetchPublishedCourses);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["published-courses"],
    queryFn: () => (doFetch as any)(),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
      <div className="mb-12 text-center">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-tight">Courses</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Guided journeys through Buddhist psychology, mindfulness, and the examined life.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border/60 animate-pulse">
              <div className="aspect-video bg-secondary/30" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-secondary/30 rounded w-3/4" />
                <div className="h-3 bg-secondary/20 rounded w-full" />
                <div className="h-3 bg-secondary/20 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground">No courses available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: Course) => {
            const title = pickLocalized(course.title_en, course.title_bn, lang, "Untitled");
            const desc = pickLocalized(course.description_en, course.description_bn, lang, "");
            return (
              <Link
                key={course.id}
                to={`/courses/${course.slug}` as any}
                className="group block border border-border/60 hover:border-foreground/30 hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="aspect-video bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">{title}</h3>
                  {desc && <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{desc}</p>}
                  <div className="flex items-center gap-3 mt-4 text-[0.6rem] text-muted-foreground">
                    {course.level && (
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {course.level}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration_weeks} weeks
                    </span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
