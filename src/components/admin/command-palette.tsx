import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BookOpen,
  Video,
  Globe,
  ImageIcon,
  Menu,
  MessageSquare,
  FolderTree,
  Activity,
  Users,
  Settings,
  Search,
  ExternalLink,
  FileType,
  type LucideIcon,
} from "lucide-react";
import { searchContent, type SearchResult, type ContentType } from "@/lib/search";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  keywords?: string[];
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/admin",
    keywords: ["home", "overview"],
  },
  { id: "posts", label: "All Posts", icon: FileText, to: "/admin", keywords: ["articles", "blog"] },
  {
    id: "new-post",
    label: "New Post",
    icon: PlusCircle,
    to: "/admin/new",
    keywords: ["create", "write", "article"],
  },
  { id: "pages", label: "Pages", icon: Globe, to: "/admin/pages", keywords: ["static"] },
  {
    id: "media",
    label: "Media Library",
    icon: ImageIcon,
    to: "/admin/media",
    keywords: ["images", "uploads", "files"],
  },
  {
    id: "books",
    label: "All Books",
    icon: BookOpen,
    to: "/admin/books",
    keywords: ["library", "publications"],
  },
  {
    id: "videos",
    label: "All Videos",
    icon: Video,
    to: "/admin/videos",
    keywords: ["youtube", "media"],
  },
  {
    id: "courses",
    label: "All Courses",
    icon: BookOpen,
    to: "/admin/courses",
    keywords: ["learning", "lessons"],
  },
  {
    id: "navigation",
    label: "Menu Builder",
    icon: Menu,
    to: "/admin/navigation",
    keywords: ["nav", "menu"],
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: MessageSquare,
    to: "/admin/comments",
    keywords: ["comments", "contact", "spam"],
  },
  {
    id: "taxonomy",
    label: "Taxonomy",
    icon: FolderTree,
    to: "/admin/taxonomy",
    keywords: ["categories", "tags"],
  },
  {
    id: "users",
    label: "Users & Roles",
    icon: Users,
    to: "/admin/users",
    keywords: ["permissions", "accounts"],
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: Activity,
    to: "/admin/audit",
    keywords: ["history", "changes"],
  },
  {
    id: "settings",
    label: "General Settings",
    icon: Settings,
    to: "/admin/settings",
    keywords: ["config", "preferences"],
  },
  {
    id: "view-site",
    label: "View Site",
    icon: ExternalLink,
    to: "/",
    keywords: ["frontend", "public"],
  },
];

const typeIcons: Record<ContentType, LucideIcon> = {
  post: FileText,
  page: Globe,
  book: BookOpen,
  video: Video,
  course: BookOpen,
};

const typeLabels: Record<ContentType, string> = {
  post: "Post",
  page: "Page",
  book: "Book",
  video: "Video",
  course: "Course",
};

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useServerFn(searchContent);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["admin-command-search", search],
    queryFn: () => (doSearch as any)({ data: { q: search } }),
    enabled: open && search.length >= 2,
    staleTime: 15_000,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleNavigate = useCallback(
    (to: string) => {
      setOpen(false);
      navigate({ to: to as any });
    },
    [navigate],
  );

  const handleSearchResult = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      const adminPath =
        result.type === "post"
          ? `/admin/${result.id}`
          : result.type === "page"
            ? "/admin/pages"
            : result.type === "book"
              ? "/admin/books"
              : result.type === "video"
                ? "/admin/videos"
                : result.type === "course"
                  ? `/admin/courses/${result.id}`
                  : result.url;
      navigate({ to: adminPath as any });
    },
    [navigate],
  );

  const hasResults = searchResults && searchResults.results && searchResults.results.length > 0;
  const showNav = search.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search admin pages or content…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isFetching
            ? "Searching…"
            : search.length >= 2
              ? "No results found."
              : "Type at least 2 characters to search content."}
        </CommandEmpty>

        {showNav && (
          <CommandGroup heading="Admin Pages">
            {navItems.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                onSelect={() => handleNavigate(item.to)}
                className="flex items-center gap-2"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Content">
              {searchResults.results.map((result: SearchResult) => {
                const Icon = typeIcons[result.type] || FileType;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.type}`}
                    onSelect={() => handleSearchResult(result)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{result.title}</span>
                      <span className="text-[0.6rem] text-muted-foreground">
                        {typeLabels[result.type]}
                        {result.excerpt ? ` — ${result.excerpt.substring(0, 60)}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
