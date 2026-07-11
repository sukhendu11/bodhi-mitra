import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  cover_image: string | null;
  category: string | null;
  level: string | null;
  duration_weeks: number;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  content_en: string;
  content_bn: string;
  video_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Public ─────────────────────────────────────────────────────

export const fetchPublishedCourses = createServerFn({ method: "GET" })
  .handler(async () => {
    const db = supabase as any;
    const { data, error } = await db
      .from("courses")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Course[];
  });

export const fetchCourseBySlug = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { slug: string };
    const db = supabase as any;
    const { data: course, error } = await db
      .from("courses")
      .select("*")
      .eq("slug", input.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return course as Course | null;
  });

export const fetchLessons = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { courseId: string };
    const db = supabase as any;
    const { data: lessons, error } = await db
      .from("course_lessons")
      .select("*")
      .eq("course_id", input.courseId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (lessons ?? []) as CourseLesson[];
  });

export const fetchLessonBySlug = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: unknown }) => {
    const input = data as { courseSlug: string; lessonSlug: string };
    const db = supabase as any;
    const { data: course } = await db
      .from("courses")
      .select("id, published")
      .eq("slug", input.courseSlug)
      .eq("published", true)
      .maybeSingle();
    if (!course) return null;
    const { data: lesson, error } = await db
      .from("course_lessons")
      .select("*")
      .eq("course_id", course.id)
      .eq("slug", input.lessonSlug)
      .maybeSingle();
    if (error) throw error;
    return lesson as CourseLesson | null;
  });

// ─── Enrollment ─────────────────────────────────────────────────

export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { courseId: string };
    const db = supabase as any;
    const { error } = await db.from("enrollments").upsert(
      { user_id: userId, course_id: input.courseId },
      { onConflict: "user_id,course_id" },
    );
    if (error) throw error;
    return { enrolled: true };
  });

export const getEnrollmentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { courseId: string };
    const db = supabase as any;
    const { data: enrollment } = await db
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", input.courseId)
      .maybeSingle();
    return { enrolled: !!enrollment, completed: enrollment?.completed_at ? true : false };
  });

export const getUserEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const db = supabase as any;
    const { data, error } = await db
      .from("enrollments")
      .select("*, courses!inner(id, slug, title_en, title_bn, cover_image, category, level)")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

// ─── Lesson Progress ────────────────────────────────────────────

export const toggleLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { lessonId: string; courseId: string; completed: boolean };
    const db = supabase as any;
    if (input.completed) {
      const { error } = await db.from("lesson_progress").upsert(
        { user_id: userId, lesson_id: input.lessonId, course_id: input.courseId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) throw error;
    } else {
      const { error } = await db.from("lesson_progress").delete()
        .eq("user_id", userId).eq("lesson_id", input.lessonId);
      if (error) throw error;
    }
    return { completed: input.completed };
  });

export const getLessonProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: { userId: string }; data: unknown }) => {
    const { userId } = context;
    const input = data as { courseId: string };
    const db = supabase as any;
    const { data: progress } = await db
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", userId)
      .eq("course_id", input.courseId);
    return (progress ?? []) as { lesson_id: string; completed: boolean }[];
  });


