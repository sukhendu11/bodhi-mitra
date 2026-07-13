import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";

const STORAGE_KEY = "bodhi-mitra-lang";

const dict = {
  // Nav & system actions — ALWAYS English in both languages
  nav_home: { en: "Home", bn: "Home" },
  nav_philosophy: { en: "Philosophy", bn: "Philosophy" },
  nav_practice: { en: "Practice", bn: "Practice" },
  nav_buddhism: { en: "Buddhism", bn: "Buddhism" },
  nav_mind: { en: "Mind (Buddhist Psychology)", bn: "Mind (Buddhist Psychology)" },
  nav_wellness: {
    en: "Wellness (Mental Health Approach)",
    bn: "Wellness (Mental Health Approach)",
  },
  nav_today: { en: "Today (Modern Relevance)", bn: "Today (Modern Relevance)" },
  nav_books: { en: "Books", bn: "Books" },
  nav_about: { en: "About", bn: "About" },
  nav_admin: { en: "Admin Panel", bn: "Admin Panel" },
  nav_admin_short: { en: "Admin", bn: "Admin" },
  sign_in: { en: "Sign in", bn: "Sign in" },
  sign_out: { en: "Sign out", bn: "Sign out" },

  // Home — content (translatable)
  home_eyebrow: { en: "❖ Bodhi Mitra", bn: "❖ বোধি মিত্র" },
  home_h1_line1: { en: "Where ancient wisdom", bn: "যেখানে প্রাচীন প্রজ্ঞা" },
  home_h1_line2: { en: "meets modern psychology.", bn: "আধুনিক মনোবিজ্ঞানের সাথে মিলে।" },
  home_lede: {
    en: "Quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.",
    bn: "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
  },
  // CTA / action — English only
  home_cta: { en: "Begin reading →", bn: "Begin reading →" },
  recent_reflections: { en: "Recent reflections", bn: "সাম্প্রতিক প্রতিফলন" },
  filter_all: { en: "All", bn: "All" },

  // Footer
  footer_tagline: {
    en: "Where ancient wisdom meets modern psychology.",
    bn: "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।",
  },

  // Post / generic system labels — English only
  by: { en: "By", bn: "By" },
  back_all: { en: "← Back to all reflections", bn: "← Back to all reflections" },
  no_posts: {
    en: "No reflections here yet. Return soon.",
    bn: "No reflections here yet. Return soon.",
  },
  load_error: { en: "Unable to load posts right now.", bn: "Unable to load posts right now." },

  // Search
  search_posts: { en: "Search reflections…", bn: "Search reflections…" },

  // Pagination
  prev_page: { en: "Previous", bn: "Previous" },
  next_page: { en: "Next", bn: "Next" },

  // Reading time
  min_read: { en: "min read", bn: "মিনিট পড়া" },

  // Category descriptions
  cat_bp_desc: {
    en: "Where the Buddha's two-and-a-half-millennia of inquiry into the mind meets the evidence base of modern psychiatry.",
    bn: "যেখানে বুদ্ধের আড়াই হাজার বছরের মনস্তাত্ত্বিক অনুসন্ধান আধুনিক মনোরোগবিদ্যার প্রমাণের সাথে মিলিত হয়।",
  },
  cat_wisdom_desc: {
    en: "Short meditations on attention, equanimity, and the texture of an examined life.",
    bn: "মনোযোগ, সমতা এবং পরীক্ষিত জীবনের গঠন নিয়ে সংক্ষিপ্ত ধ্যান।",
  },
  cat_books_desc: {
    en: "A small shelf of companions — books we return to, and the ones we recommend without hesitation.",
    bn: "সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই, এবং যেগুলো নির্দ্বিধায় সুপারিশ করি।",
  },
} as const;

type Key = keyof typeof dict;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: Key) => string;
}

const LanguageContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "bn") setLangState(stored);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-lang", lang);
      document.documentElement.setAttribute("lang", lang === "bn" ? "bn" : "en");
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* noop */
    }
  };

  const toggle = () => setLang(lang === "en" ? "bn" : "en");
  const t = (key: Key) => dict[key][lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

/** Pick the right localized field from a post-like object with EN/BN variants. */
export function pickLocalized(
  enValue: string | null | undefined,
  bnValue: string | null | undefined,
  lang: Lang,
  fallback = "",
): string {
  if (lang === "bn") return bnValue?.trim() || enValue?.trim() || fallback;
  return enValue?.trim() || bnValue?.trim() || fallback;
}
