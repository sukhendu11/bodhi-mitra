import type { IResourceItem } from "@refinedev/core";

export const refineResources: IResourceItem[] = [
  {
    name: "posts",
    list: "/admin/posts",
    meta: { canDelete: true, label: "Posts" },
  },
  {
    name: "pages",
    list: "/admin/pages",
    meta: { canDelete: true, label: "Pages" },
  },
  {
    name: "books",
    list: "/admin/books",
    meta: { canDelete: true, label: "Books" },
  },
  {
    name: "videos",
    list: "/admin/videos",
    meta: { canDelete: true, label: "Videos" },
  },
  {
    name: "courses",
    list: "/admin/courses",
    edit: "/admin/courses/$id",
    meta: { canDelete: true, label: "Courses" },
  },
  {
    name: "course_lessons",
    meta: { canDelete: true, label: "Lessons" },
  },
  {
    name: "media_assets",
    list: "/admin/media",
    meta: { canDelete: true, label: "Media" },
  },
  {
    name: "navigation_items",
    list: "/admin/navigation",
    meta: { label: "Navigation" },
  },
  {
    name: "comments",
    list: "/admin/comments",
    meta: { canDelete: true, label: "Comments" },
  },
  {
    name: "categories",
    list: "/admin/taxonomy",
    meta: { canDelete: true, label: "Categories" },
  },
  {
    name: "tags",
    list: "/admin/taxonomy",
    meta: { canDelete: true, label: "Tags" },
  },
  {
    name: "users",
    list: "/admin/users",
    meta: { label: "Users" },
  },
  {
    name: "site_settings",
    list: "/admin/settings",
    meta: { label: "Settings" },
  },
  {
    name: "audit",
    list: "/admin/audit",
    meta: { label: "Audit Log" },
  },
];
