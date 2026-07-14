import { Link, useMatches } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
  label: string;
  to?: string;
}

const ROUTE_LABELS: Record<string, Record<string, string>> = {
  en: {
    books: "Books",
    posts: "Reflections",
    pages: "Pages",
    videos: "Videos",
    courses: "Courses",
    about: "About",
    contact: "Contact",
    wisdom: "Wisdom",
    satsang: "Satsang",
    "buddhist-psychology": "Buddhist Psychology",
  },
  bn: {
    books: "বই",
    posts: "প্রতিফলন",
    pages: "পৃষ্ঠা",
    videos: "ভিডিও",
    courses: "কোর্স",
    about: "পরিচিতি",
    contact: "যোগাযোগ",
    wisdom: "প্রজ্ঞা",
    satsang: "সতসঙ্গ",
    "buddhist-psychology": "বৌদ্ধ মনোবিজ্ঞান",
  },
};

function labelFor(segment: string, lang: "en" | "bn"): string {
  return ROUTE_LABELS[lang]?.[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PublicBreadcrumbs() {
  const { lang } = useLang();
  const matches = useMatches();

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
        to: i < segments.length - 1 ? builtPath : undefined,
      });
    }
  }

  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    const key = e.label + (e.to || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length <= 1) return null;

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link to="/" className="transition-colors hover:text-foreground">
            {lang === "bn" ? "হোম" : "Home"}
          </Link>
        </BreadcrumbItem>
        {unique.map((entry, i) => (
          <span key={i}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {entry.to ? (
                <Link to={entry.to} className="transition-colors hover:text-foreground">
                  {entry.label}
                </Link>
              ) : (
                <BreadcrumbPage>{entry.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
