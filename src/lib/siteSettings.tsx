import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteConfig {
  branding: {
    logo_url: string;
    favicon_url: string;
    site_name_en: string;
    site_name_bn: string;
    logo_max_width: number;
  };
  hero: {
    visible: boolean;
    image_url: string;
    eyebrow_en: string;
    eyebrow_bn: string;
    title_en: string;
    title_bn: string;
    desc_en: string;
    desc_bn: string;
    cta_label: string;
    cta_url: string;
  };
  theme: {
    accent_color: string;
    accent_hover: string;
    mode: "light" | "dark";
    header_visible: boolean;
    /** Heading font family */
    font_heading: string;
    /** Body/UI font family */
    font_body: string;
    /** Bangla font family */
    font_bn: string;
    /** Base font size (px) */
    font_size_base: number;
    /** Border radius scale multiplier (0.5–2) */
    radius_scale: number;
    /** Theme preset name */
    preset: string;
    /** Custom CSS injected into the page */
    custom_css: string;
  };
  footer: {
    copyright_en: string;
    copyright_bn: string;
    text_en: string;
    text_bn: string;
  };
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  contact: {
    email: string;
    phone: string;
    location: string;
    title_en: string;
    title_bn: string;
    intro_en: string;
    intro_bn: string;
    form_name_label_en: string;
    form_name_label_bn: string;
    form_email_label_en: string;
    form_email_label_bn: string;
    form_message_label_en: string;
    form_message_label_bn: string;
    submit_label_en: string;
    submit_label_bn: string;
    success_text_en: string;
    success_text_bn: string;
    address_en: string;
    address_bn: string;
    map_embed_url: string;
  };
  seo: {
    meta_desc_en: string;
    meta_desc_bn: string;
    og_image_url: string;
    google_analytics_id: string;
    enable_sitemap: boolean;
  };
  article: {
    show_author_bio: boolean;
    show_related_posts: boolean;
    sidebar_title_en: string;
    sidebar_title_bn: string;
    sidebar_text_en: string;
    sidebar_text_bn: string;
    newsletter_title_en: string;
    newsletter_title_bn: string;
    newsletter_text_en: string;
    newsletter_text_bn: string;
  };
  about: {
    title_en: string;
    title_bn: string;
    eyebrow_en: string;
    eyebrow_bn: string;
    body_en: string;
    body_bn: string;
    mission_en: string;
    mission_bn: string;
    image_url: string;
    image_alt_en: string;
    image_alt_bn: string;
    note_title_en: string;
    note_title_bn: string;
    note_text_en: string;
    note_text_bn: string;
  };
  maintenance: {
    enabled: boolean;
    message_en: string;
    message_bn: string;
  };
  features: {
    /** Enable reader annotations (highlights + notes) */
    reader_annotations: boolean;
    /** Enable reading statistics / streaks */
    reading_stats: boolean;
    /** Enable book recommendations */
    book_recommendations: boolean;
    /** Enable podcast module */
    podcasts: boolean;
    /** Enable donations page */
    donations: boolean;
    /** Enable course certificates */
    course_certificates: boolean;
    /** Enable newsletter welcome series */
    newsletter_automation: boolean;
    /** Enable AI chat assistant */
    ai_chat: boolean;
  };
  reader: {
    /** Default reader theme: light | dark | sepia */
    default_theme: "light" | "dark" | "sepia";
    /** Default font size in the reader (0.75–2.0) */
    default_font_size: number;
    /** Default line height in the reader (1.2–2.5) */
    default_line_height: number;
    /** Enable download button in reader */
    allow_download: boolean;
    /** Show page numbers in reader */
    show_page_numbers: boolean;
  };
  commerce: {
    /** Currency code (USD, BDT, EUR, etc.) */
    currency: string;
    /** Currency symbol */
    currency_symbol: string;
    /** Tax rate percentage (0–100) */
    tax_rate: number;
    /** Refund policy text (EN) */
    refund_policy_en: string;
    /** Refund policy text (BN) */
    refund_policy_bn: string;
  };
  navigation: {
    /** Sticky header on scroll */
    sticky_header: boolean;
    /** Show breadcrumbs on public pages */
    show_breadcrumbs: boolean;
    /** Mobile nav animation: slide | overlay */
    mobile_nav_style: "slide" | "overlay";
    /** Max dropdown nesting depth (1–3) */
    max_depth: number;
    /** Show icons on nav items */
    show_icons: boolean;
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  branding: {
    logo_url: "",
    favicon_url: "",
    site_name_en: "Bodhi Mitra",
    site_name_bn: "বোধি মিত্র",
    logo_max_width: 120,
  },
  hero: {
    visible: true,
    image_url: "",
    eyebrow_en: "❖ Bodhi Mitra",
    eyebrow_bn: "❖ বোধি মিত্র",
    title_en: "Where ancient wisdom\nmeets modern psychology.",
    title_bn: "যেখানে প্রাচীন প্রজ্ঞা\nআধুনিক মনোবিজ্ঞানের সাথে মিলে।",
    desc_en:
      "Quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.",
    desc_bn: "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
    cta_label: "Begin reading",
    cta_url: "/buddhist-psychology",
  },
  theme: {
    accent_color: "#d35400",
    accent_hover: "#e67e22",
    mode: "light",
    header_visible: true,
    font_heading: "Cormorant Garamond, serif",
    font_body: "Inter, sans-serif",
    font_bn: "Hind Siliguri, sans-serif",
    font_size_base: 16,
    radius_scale: 1,
    preset: "warm",
    custom_css: "",
  },
  footer: {
    copyright_en: "© {year} Bodhi Mitra. All rights reserved.",
    copyright_bn: "© {year} বোধি মিত্র। সর্বস্বত্ব সংরক্ষিত।",
    text_en: "Where ancient wisdom meets modern psychology.",
    text_bn: "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।",
  },
  social: { facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "" },
  contact: {
    email: "",
    phone: "",
    location: "",
    title_en: "Get in touch",
    title_bn: "যোগাযোগ করুন",
    intro_en: "Send a quiet note. We read everything, and reply when we can.",
    intro_bn: "একটি শান্ত বার্তা পাঠান। আমরা সব পড়ি, এবং যখন পারি উত্তর দিই।",
    form_name_label_en: "Your name",
    form_name_label_bn: "আপনার নাম",
    form_email_label_en: "Email",
    form_email_label_bn: "ইমেইল",
    form_message_label_en: "Message",
    form_message_label_bn: "বার্তা",
    submit_label_en: "Send",
    submit_label_bn: "Send",
    success_text_en: "Thank you — your note has arrived.",
    success_text_bn: "ধন্যবাদ — আপনার বার্তাটি পৌঁছেছে।",
    address_en: "",
    address_bn: "",
    map_embed_url: "",
  },
  seo: {
    meta_desc_en:
      "A serene blog blending Buddhist teachings with modern mental health, by practicing psychiatrists.",
    meta_desc_bn:
      "অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা বৌদ্ধ শিক্ষা ও আধুনিক মানসিক স্বাস্থ্যের সংমিশ্রণে একটি শান্ত ব্লগ।",
    og_image_url: "",
    google_analytics_id: "",
    enable_sitemap: true,
  },
  article: {
    show_author_bio: true,
    show_related_posts: true,
    sidebar_title_en: "On the path",
    sidebar_title_bn: "পথের উপর",
    sidebar_text_en: "Quiet writings on the mind, delivered when they are ready.",
    sidebar_text_bn: "মন নিয়ে শান্ত লেখা, যখন প্রস্তুত হয় তখন পৌঁছানো হয়।",
    newsletter_title_en: "Stay in touch",
    newsletter_title_bn: "যোগাযোগে থাকুন",
    newsletter_text_en: "Receive new reflections by email — slow, occasional, never noisy.",
    newsletter_text_bn: "ইমেলে নতুন প্রতিফলন পান — ধীর, কখনও কখনও, কখনও শব্দময় নয়।",
  },
  about: {
    eyebrow_en: "About",
    eyebrow_bn: "পরিচিতি",
    title_en: "A quiet conversation between two traditions.",
    title_bn: "দুই ঐতিহ্যের মধ্যে একটি শান্ত কথোপকথন।",
    body_en:
      'Bodhi Mitra — "a friend on the path of awakening" — is a small journal maintained by practicing psychiatrists who have spent many years sitting with patients in clinic, and many mornings sitting in silence on the cushion.\n\nWe write at the seam where two great traditions of mind meet: the contemplative inheritance of the Buddha, refined across twenty-five centuries, and the empirical science of modern psychiatry and psychology. Neither replaces the other. Each, at its best, illuminates the other.\n\nOur essays are not prescriptions. They are notes from the road — offered gently, in the hope that some sentence here might meet you where you are.',
    body_bn:
      'বোধি মিত্র — "জাগরণের পথে এক বন্ধু" — একটি ছোট জার্নাল, যা অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা পরিচালিত।\n\nআমরা সেখানে লিখি যেখানে মনের দুটি মহান ঐতিহ্য মিলিত হয়: বুদ্ধের ধ্যানময় উত্তরাধিকার এবং আধুনিক মনোরোগবিদ্যার অভিজ্ঞ বিজ্ঞান।\n\nআমাদের প্রবন্ধ চিকিৎসার নির্দেশনা নয়। এগুলি পথের নোট — মৃদুভাবে দেওয়া।',
    mission_en: "",
    mission_bn: "",
    image_url: "",
    image_alt_en: "",
    image_alt_bn: "",
    note_title_en: "Editorial note",
    note_title_bn: "সম্পাদকীয় নোট",
    note_text_en:
      "Nothing on this site constitutes medical advice. If you are suffering, please reach out to a qualified clinician in your community.",
    note_text_bn:
      "এই সাইটের কিছুই চিকিৎসা পরামর্শ নয়। যদি আপনি কষ্টে থাকেন, অনুগ্রহ করে আপনার কমিউনিটিতে একজন যোগ্য চিকিৎসকের কাছে যান।",
  },
  maintenance: {
    enabled: false,
    message_en: "We are performing scheduled maintenance. Please check back soon.",
    message_bn: "আমরা নির্ধারিত রক্ষণাবেক্ষণ করছি। অনুগ্রহ করে শীঘ্রই আবার দেখুন।",
  },
  features: {
    reader_annotations: true,
    reading_stats: true,
    book_recommendations: true,
    podcasts: false,
    donations: false,
    course_certificates: false,
    newsletter_automation: false,
    ai_chat: true,
  },
  reader: {
    default_theme: "sepia",
    default_font_size: 1.0,
    default_line_height: 1.8,
    allow_download: false,
    show_page_numbers: true,
  },
  commerce: {
    currency: "USD",
    currency_symbol: "$",
    tax_rate: 0,
    refund_policy_en: "",
    refund_policy_bn: "",
  },
  navigation: {
    sticky_header: true,
    show_breadcrumbs: true,
    mobile_nav_style: "slide",
    max_depth: 2,
    show_icons: true,
  },
};

/** Deep-merge a partial config onto defaults so missing keys still resolve. */
export function mergeConfig(partial: unknown): SiteConfig {
  function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = out[key];
      if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)) {
        out[key] = deepMerge(tgtVal as Record<string, unknown>, srcVal as Record<string, unknown>);
      } else if (srcVal !== undefined) {
        out[key] = srcVal;
      }
    }
    return out;
  }
  return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, (partial ?? {}) as Record<string, unknown>) as unknown as SiteConfig;
}

export async function fetchSiteSettings(): Promise<SiteConfig> {
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("config")
    .eq("id", "1")
    .maybeSingle();
  if (error) {
    console.warn("[siteSettings] fetch failed, using defaults", error);
    return DEFAULT_CONFIG;
  }
  return mergeConfig(data?.config);
}

const SiteSettingsContext = createContext<SiteConfig>(DEFAULT_CONFIG);

export async function getSiteName(): Promise<string> {
  const settings = await fetchSiteSettings();
  return settings.branding.site_name_en || "Bodhi Mitra";
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useSiteSettingsQuery() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
  });
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useSiteSettingsQuery();
  const config = data ?? DEFAULT_CONFIG;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const t = config.theme;

    // Accent color → semantic tokens
    root.style.setProperty("--color-saffron", t.accent_color);
    root.style.setProperty("--color-saffron-hover", t.accent_hover);
    // Use accent color for primary, with dark mode adjustment via CSS
    root.style.setProperty("--primary", t.accent_color);
    root.style.setProperty("--primary-light", `color-mix(in oklch, ${t.accent_color} 70%, white)`);
    root.style.setProperty("--primary-foreground", "#ffffff");

    // Typography — override the CSS custom properties in styles.css
    root.style.setProperty("--font-serif", t.font_heading);
    root.style.setProperty("--font-sans", t.font_body);
    root.style.setProperty("--font-bn", t.font_bn);
    root.style.setProperty("--font-size-base", `${t.font_size_base / 16}rem`);

    // Radius scale — override the base radius
    root.style.setProperty("--radius", `${0.25 * t.radius_scale}rem`);

    // Logo
    root.style.setProperty("--site-logo-max-width", `${config.branding.logo_max_width}px`);

    // Dark mode
    if (t.mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    // Favicon
    if (config.branding.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.branding.favicon_url;
    }

    // Custom CSS
    let styleEl = document.getElementById("site-custom-css") as HTMLStyleElement | null;
    if (t.custom_css && t.custom_css.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "site-custom-css";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = t.custom_css;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [config]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = config.seo.google_analytics_id?.trim();
    const existing = document.getElementById("ga-script");
    if (existing) existing.remove();
    const existingInit = document.getElementById("ga-init");
    if (existingInit) existingInit.remove();
    if (!id) return;
    const isValidGaId = /^G-[A-Z0-9]{4,20}$/.test(id) || /^UA-\d{4,12}-\d{1,4}$/.test(id);
    if (!isValidGaId) {
      console.warn("[siteSettings] Invalid Google Analytics ID format; refusing to inject script.");
      return;
    }
    const s1 = document.createElement("script");
    s1.id = "ga-script";
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s1);
    const s2 = document.createElement("script");
    s2.id = "ga-init";
    s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)});`;
    document.head.appendChild(s2);
  }, [config.seo.google_analytics_id]);

  return <SiteSettingsContext.Provider value={config}>{children}</SiteSettingsContext.Provider>;
}
