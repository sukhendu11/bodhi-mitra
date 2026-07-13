import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Globe,
  ImageIcon,
  Menu,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface MobileLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

const links: MobileLink[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/videos", label: "Videos", icon: Video },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/pages", label: "Pages", icon: Globe },
  { to: "/admin/media", label: "Media", icon: ImageIcon },
  { to: "/admin/navigation", label: "Nav", icon: Menu },
  { to: "/admin/comments", label: "Mod", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminMobileNav({ collapsed }: { collapsed?: boolean }) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      className={cn(
        "md:hidden border-t border-zinc-800/60 bg-zinc-900 dark:bg-black",
        collapsed ? "opacity-90" : "",
      )}
    >
      <div className="flex items-center justify-around px-1.5 py-1 overflow-x-auto gap-0.5">
        {links.map((link) => {
          const active =
            link.to === "/admin"
              ? currentPath === link.to
              : currentPath.startsWith(link.to + "/") || currentPath === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-150 shrink-0 relative group",
                active ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {active && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-500 rounded-full" />
              )}
              <link.icon
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  active ? "text-orange-400" : "group-hover:scale-110",
                )}
              />
              <span
                className={cn(
                  "text-[0.4rem] font-medium uppercase tracking-[0.06em]",
                  active ? "text-orange-400/80" : "text-zinc-600",
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
