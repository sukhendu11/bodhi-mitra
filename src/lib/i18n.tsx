import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";

const STORAGE_KEY = "sabbe-satta-lang";

const dict = {
  // Nav & system actions — ALWAYS English in both languages
  nav_home: { en: "Home", bn: "Home" },
  nav_books: { en: "Books", bn: "Books" },
  sign_in: { en: "Sign in", bn: "Sign in" },
  sign_out: { en: "Sign out", bn: "Sign out" },

  // Home — content (translatable)
  home_eyebrow: { en: "❖ Sabbe Satta", bn: "❖ সব্বে সত্তা" },
  home_h1_line1: { en: "Where ancient wisdom", bn: "যেখানে প্রাচীন প্রজ্ঞা" },
  home_h1_line2: { en: "meets modern psychology.", bn: "আধুনিক মনোবিজ্ঞানের সাথে মিলে।" },
  home_lede: {
    en: "Quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.",
    bn: "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
  },
  // CTA / action — bilingual (hero link localizes in Bangla mode)
  home_cta: { en: "Begin reading →", bn: "পড়া শুরু করুন →" },
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

const BANGLA_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

/** Convert Latin digits in a string/number to Bengali numerals (keeps "." and other chars as-is). */
export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BANGLA_DIGITS[d] ?? d);
}

/**
 * Localize a cart-action result message. The cart services
 * (src/lib/cart.ts / src/lib/mock-cart.ts) return English-only messages
 * because they run server-side / in shared code and cannot know the client's
 * language; the caller knows `lang`, so map the service's result to
 * bilingual copy (DESIGN.md §5.6 / §6). Keep the matched strings in sync
 * with the message constants in those two modules.
 */
export function localizeCartResult(
  lang: Lang,
  result: { message?: string; alreadyInCart?: boolean },
): string {
  if (result.alreadyInCart) {
    return lang === "bn" ? "বইটি ইতিমধ্যে আপনার কার্টে আছে।" : "Book is already in your cart.";
  }
  switch (result.message) {
    case "Added to cart.":
      return lang === "bn" ? "কার্টে যোগ করা হয়েছে।" : "Added to cart.";
    case "Book is already in your cart.":
      return lang === "bn" ? "বইটি ইতিমধ্যে আপনার কার্টে আছে।" : "Book is already in your cart.";
    case "Removed from cart.":
      return lang === "bn" ? "কার্ট থেকে সরানো হয়েছে।" : "Removed from cart.";
    case "Cart cleared.":
      return lang === "bn" ? "কার্ট খালি করা হয়েছে।" : "Cart cleared.";
    case "Cart is already empty.":
      return lang === "bn" ? "কার্ট ইতিমধ্যে খালি।" : "Cart is already empty.";
    default:
      return result.message ?? "";
  }
}

/** Human-readable relative time ("3m ago") with Bengali numerals in BN mode. */
export function timeAgo(iso: string, lang: Lang): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return lang === "bn" ? "এইমাত্র" : "now";
  if (mins < 60) return lang === "bn" ? `${toBanglaDigits(mins)} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "bn" ? `${toBanglaDigits(hrs)} ঘণ্টা আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return lang === "bn" ? `${toBanglaDigits(days)} দিন আগে` : `${days}d ago`;
  return new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format an ISO date for a UI language.
 * - EN: "en-US" locale, Latin digits
 * - BN: "bn-BD" locale AND the result is passed through `toBanglaDigits` so
 *   numerals are guaranteed Bengali regardless of the runtime's ICU data
 *   (Node/SSR and browsers both render `bn-BD`, but the explicit pass keeps
 *   it consistent everywhere).
 */
export function formatDate(
  iso: string,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const formatted = d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", options);
  return lang === "bn" ? toBanglaDigits(formatted) : formatted;
}

/**
 * Format a money amount for a UI language.
 * - EN: "BDT" prefix before the Latin digits, e.g. "BDT 20.00"
 * - BN: Bengali numerals with "টাকা" after the digits, e.g. "২০.০০ টাকা"
 */
export function formatMoney(
  amount: number,
  lang: Lang,
  _configuredSymbol?: string | null,
): string {
  const decimal = amount.toFixed(2);
  if (lang === "bn") return `${toBanglaDigits(decimal)} টাকা`;
  return `BDT ${decimal}`;
}
