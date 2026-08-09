import { Link, useMatches } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbEntry {
  label: string;
  to?: string;
}

const ROUTE_LABELS: Record<string, Record<string, string>> = {
  en: {
    books: "Books",
    posts: "Reflections",
    reflections: "Reflections",
    pages: "Pages",
    videos: "Videos",
    about: "About",
    contact: "Contact",
  },
  bn: {
    books: "বই",
    posts: "প্রতিফলন",
    reflections: "প্রতিফলন",
    pages: "পৃষ্ঠা",
    videos: "ভিডিও",
    about: "পরিচিতি",
    contact: "যোগাযোগ",
  },
};

function labelFor(segment: string, lang: "en" | "bn"): string {
  return ROUTE_LABELS[lang]?.[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// URL overrides for segments that redirect (e.g., /posts → /reflections)
const URL_OVERRIDES: Record<string, string> = {
  posts: "/reflections",
};

export function PublicBreadcrumbs() {
  const { lang } = useLang();
  const config = useSiteSettings();
  const matches = useMatches();

  if (!config.navigation.show_breadcrumbs) return null;

  const entries: BreadcrumbEntry[] = [];

  for (const match of matches) {
    const pathname = match.pathname;
    if (!pathname || pathname === "/") continue;

    const segments = pathname.split("/").filter(Boolean);
    let builtPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      builtPath += `/${seg}`;
      if (/^[0-9a-f]{8}-/i.test(seg) || /^\d+$/.test(seg)) continue;
      if (seg === "reader") continue;

      entries.push({
        label: labelFor(seg, lang),
        to: i < segments.length - 1 ? (URL_OVERRIDES[seg] || builtPath) : undefined,
      });
    }
  }

  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    const key = e.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length <= 1) return null;

  return (
    <nav aria-label="breadcrumb" className="mb-8 pt-6">
      <ol className="flex items-center gap-1 text-xs text-foreground/60">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors duration-300"
          >
            <Home className="h-3 w-3" />
            <span>{lang === "bn" ? "হোম" : "Home"}</span>
          </Link>
        </li>
        {unique.map((entry, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-foreground/30" />
            {entry.to ? (
              <Link
                to={entry.to}
                className="hover:text-foreground transition-colors duration-300"
              >
                {entry.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{entry.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
