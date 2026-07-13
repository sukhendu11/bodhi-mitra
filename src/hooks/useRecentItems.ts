import { useState, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const STORAGE_KEY = "admin-recent-items";
const MAX_ITEMS = 8;

interface RecentItem {
  to: string;
  label: string;
  timestamp: number;
}

function loadRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const labelMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/posts": "Posts",
  "/admin/pages": "Pages",
  "/admin/books": "Books",
  "/admin/videos": "Videos",
  "/admin/courses": "Courses",
  "/admin/media": "Media Library",
  "/admin/navigation": "Navigation",
  "/admin/comments": "Moderation",
  "/admin/taxonomy": "Taxonomy",
  "/admin/users": "Users",
  "/admin/audit": "Audit Log",
  "/admin/settings": "Settings",
  "/admin/orders": "Orders",
};

function getPathLabel(path: string): string {
  // Exact match first
  if (labelMap[path]) return labelMap[path];
  // Prefix match for dynamic routes
  for (const [prefix, label] of Object.entries(labelMap)) {
    if (path.startsWith(prefix + "/")) return label;
  }
  // Fallback: capitalize last segment
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "Unknown";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function useRecentItems() {
  const [recent, setRecent] = useState<RecentItem[]>(loadRecent);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Track navigation
  useEffect(() => {
    if (currentPath === "/admin" || !currentPath.startsWith("/admin")) return;

    setRecent((prev) => {
      const filtered = prev.filter((r) => r.to !== currentPath);
      const next = [
        { to: currentPath, label: getPathLabel(currentPath), timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      saveRecent(next);
      return next;
    });
  }, [currentPath]);

  const clearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  return { recentItems: recent, clearRecent };
}
