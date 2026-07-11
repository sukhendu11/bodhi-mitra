import { createFileRoute, Link } from "@tanstack/react-router";
import { useTable, useDelete } from "@refinedev/core";
import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Edit3, Trash2, Eye, EyeOff, BookOpen, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ErrorPage } from "@/components/error-page";
import { type Course } from "@/lib/courses";
import { DataTable, DateCell, StatusBadge } from "@/components/admin/data-table";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { StatCard } from "@/components/admin/stat-card";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const columnHelper = createColumnHelper<Course>();

function AdminCoursesPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { tableQuery, result } = useTable<Course>({
    resource: "courses",
    pagination: { currentPage: 1, pageSize: 50 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const courses = result?.data ?? [];
  const isLoading = tableQuery?.isLoading ?? false;

  const { mutate: deleteMutate, mutation: deleteMutation } = useDelete();
  const isDeleting = deleteMutation?.isPending ?? false;

  const columns = useMemo(
    () => [
      columnHelper.accessor("title_en", {
        header: "Title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center shrink-0">
              {row.original.published ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium line-clamp-1">{row.original.title_en || row.original.title_bn || "Untitled"}</span>
              {row.original.title_bn && row.original.title_en && (
                <span className="text-[0.6rem] text-muted-foreground block">{row.original.title_bn}</span>
              )}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("level", {
        header: "Level",
        enableSorting: true,
        cell: ({ getValue }) => {
          const level = getValue();
          return level ? (
            <span className="text-xs capitalize text-muted-foreground">{level}</span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          );
        },
      }),
      columnHelper.accessor("duration_weeks", {
        header: "Duration",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue()}w</span>
        ),
      }),
      columnHelper.accessor("published", {
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => (
          getValue()
            ? <StatusBadge status="published" />
            : <StatusBadge status="draft" />
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        enableSorting: true,
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link to={`/admin/courses/${row.original.id}` as any}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors" title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => setDeletingId(row.original.id)}
              className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Courses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {courses.length} courses
            </p>
          </div>
        </div>
        <Link to="/admin/courses/$id" params={{ id: "new" }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">
          <Plus className="h-3.5 w-3.5" /> New Course
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total" value={courses.length} color="blue" />
        <StatCard icon={Eye} label="Published" value={courses.filter((c) => c.published).length} color="green" />
        <StatCard icon={EyeOff} label="Drafts" value={courses.filter((c) => !c.published).length} color="amber" />
        <StatCard icon={Clock} label="Total Weeks" value={courses.reduce((s, c) => s + c.duration_weeks, 0)} color="purple" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-border/60">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No courses yet.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={courses}
          searchPlaceholder="Search courses…"
          pageSize={15}
        />
      )}

      <ConfirmDelete
        open={!!deletingId}
        onConfirm={() => {
          if (!deletingId) return;
          deleteMutate(
            { resource: "courses", id: deletingId },
            {
              onSuccess: () => {
                toast.success("Course deleted");
                setDeletingId(null);
              },
              onError: (e: any) => {
                toast.error(e?.message ?? "Delete failed");
                setDeletingId(null);
              },
            },
          );
        }}
        onCancel={() => setDeletingId(null)}
        isPending={isDeleting}
        title="Delete course"
        description="This will delete the course and all its lessons. This cannot be undone."
      />
    </div>
  );
}
