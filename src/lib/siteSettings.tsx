import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DynamicPage {
  slug: string;
  title_en: string;
  title_bn: string;
  header_en: string;
  header_bn: string;
  body_en: string;
  body_bn: string;
  banner_url: string;
  visible: boolean;
}

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
  };
  nav: {
    home_en: string; home_bn: string;
    philosophy_en: string; philosophy_bn: string;
    practice_en: string; practice_bn: string;
    buddhism_en: string; buddhism_bn: string;
    mind_en: string; mind_bn: string;
    wellness_en: string; wellness_bn: string;
    today_en: string; today_bn: string;
    books_en: string; books_bn: string;
    about_en: string; about_bn: string;
    contact_en: string; contact_bn: string;
  };
  footer: {
    copyright_en: string;
    copyright_bn: string;
    text_en: string;
    text_bn: string;
  };
  social: {
    facebook: string; twitter: string; instagram: string; linkedin: string; youtube: string;
  };
  contact: {
    email: string; phone: string; location: string;
    title_en: string; title_bn: string;
    intro_en: string; intro_bn: string;
    form_name_label_en: string; form_name_label_bn: string;
    form_email_label_en: string; form_email_label_bn: string;
    form_message_label_en: string; form_message_label_bn: string;
    submit_label_en: string; submit_label_bn: string;
    success_text_en: string; success_text_bn: string;
    address_en: string; address_bn: string;
    map_embed_url: string;
  };
  seo: {
    meta_desc_en: string;
    meta_desc_bn: string;
    og_image_url: string;
    google_analytics_id: string;
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
    title_en: string; title_bn: string;
    eyebrow_en: string; eyebrow_bn: string;
    body_en: string; body_bn: string;
    mission_en: string; mission_bn: string;
    image_url: string;
    image_alt_en: string; image_alt_bn: string;
    note_title_en: string; note_title_bn: string;
    note_text_en: string; note_text_bn: string;
  };
  pages: DynamicPage[];
}

export const DEFAULT_PAGES: DynamicPage[] = [
  {
    slug: "buddhist-psychology",
    title_en: "Buddhist Psychology", title_bn: "বৌদ্ধ মনোবিজ্ঞান",
    header_en: "Buddhist Psychology", header_bn: "বৌদ্ধ মনোবিজ্ঞান",
    body_en: "Where the Buddha's two-and-a-half-millennia of inquiry into the mind meets the evidence base of modern psychiatry.",
    body_bn: "যেখানে বুদ্ধের আড়াই হাজার বছরের মনস্তাত্ত্বিক অনুসন্ধান আধুনিক মনোরোগবিদ্যার প্রমাণের সাথে মিলিত হয়।",
    banner_url: "", visible: true,
  },
  {
    slug: "wisdom",
    title_en: "Wisdom", title_bn: "প্রজ্ঞা",
    header_en: "Wisdom", header_bn: "প্রজ্ঞা",
    body_en: "Short meditations on attention, equanimity, and the texture of an examined life.",
    body_bn: "মনোযোগ, সমতা এবং পরীক্ষিত জীবনের গঠন নিয়ে সংক্ষিপ্ত ধ্যান।",
    banner_url: "", visible: true,
  },
  {
    slug: "books",
    title_en: "Books", title_bn: "বই",
    header_en: "Books", header_bn: "বই",
    body_en: "A small shelf of companions — books we return to, and the ones we recommend without hesitation.",
    body_bn: "সঙ্গীদের একটি ছোট তাক — যেসব বইয়ে আমরা ফিরে যাই, এবং যেগুলো নির্দ্বিধায় সুপারিশ করি।",
    banner_url: "", visible: true,
  },
  {
    slug: "satsang",
    title_en: "Satsang", title_bn: "সৎসঙ্গ",
    header_en: "Satsang", header_bn: "সৎসঙ্গ",
    body_en: "Gatherings in good company — talks, retreats, and shared silence.",
    body_bn: "সৎসঙ্গে সমাবেশ — আলোচনা, রিট্রিট এবং ভাগ করা নীরবতা।",
    banner_url: "", visible: false,
  },
];

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
    desc_en: "Quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.",
    desc_bn: "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
    cta_label: "Begin reading",
    cta_url: "/buddhist-psychology",
  },
  theme: {
    accent_color: "#d35400",
    accent_hover: "#e67e22",
    mode: "light",
  },
  nav: {
    home_en: "Home", home_bn: "Home",
    philosophy_en: "Philosophy", philosophy_bn: "Philosophy",
    practice_en: "Practice", practice_bn: "Practice",
    buddhism_en: "Buddhism", buddhism_bn: "Buddhism",
    mind_en: "Mind (Buddhist Psychology)", mind_bn: "Mind (Buddhist Psychology)",
    wellness_en: "Wellness (Mental Health Approach)", wellness_bn: "Wellness (Mental Health Approach)",
    today_en: "Today (Modern Relevance)", today_bn: "Today (Modern Relevance)",
    books_en: "Books", books_bn: "Books",
    about_en: "About", about_bn: "About",
    contact_en: "Contact", contact_bn: "Contact",
  },
  footer: {
    copyright_en: "© {year} Bodhi Mitra. All rights reserved.",
    copyright_bn: "© {year} বোধি মিত্র। সর্বস্বত্ব সংরক্ষিত।",
    text_en: "Where ancient wisdom meets modern psychology.",
    text_bn: "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।",
  },
  social: { facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "" },
  contact: {
    email: "", phone: "", location: "",
    title_en: "Get in touch", title_bn: "যোগাযোগ করুন",
    intro_en: "Send a quiet note. We read everything, and reply when we can.",
    intro_bn: "একটি শান্ত বার্তা পাঠান। আমরা সব পড়ি, এবং যখন পারি উত্তর দিই।",
    form_name_label_en: "Your name", form_name_label_bn: "আপনার নাম",
    form_email_label_en: "Email", form_email_label_bn: "ইমেইল",
    form_message_label_en: "Message", form_message_label_bn: "বার্তা",
    submit_label_en: "Send", submit_label_bn: "Send",
    success_text_en: "Thank you — your note has arrived.",
    success_text_bn: "ধন্যবাদ — আপনার বার্তাটি পৌঁছেছে।",
    address_en: "", address_bn: "",
    map_embed_url: "",
  },
  seo: {
    meta_desc_en: "A serene blog blending Buddhist teachings with modern mental health, by practicing psychiatrists.",
    meta_desc_bn: "অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা বৌদ্ধ শিক্ষা ও আধুনিক মানসিক স্বাস্থ্যের সংমিশ্রণে একটি শান্ত ব্লগ।",
    og_image_url: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/11cf2395-0332-4caa-9d73-3ad5cf777114/id-preview-36f7f9ee--2d38f8d2-888c-45a0-8b23-e5cefe82af66.lovable.app-1779959858012.png",
    google_analytics_id: "",
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
    eyebrow_en: "About", eyebrow_bn: "পরিচিতি",
    title_en: "A quiet conversation between two traditions.",
    title_bn: "দুই ঐতিহ্যের মধ্যে একটি শান্ত কথোপকথন।",
    body_en:
      "Bodhi Mitra — \"a friend on the path of awakening\" — is a small journal maintained by practicing psychiatrists who have spent many years sitting with patients in clinic, and many mornings sitting in silence on the cushion.\n\nWe write at the seam where two great traditions of mind meet: the contemplative inheritance of the Buddha, refined across twenty-five centuries, and the empirical science of modern psychiatry and psychology. Neither replaces the other. Each, at its best, illuminates the other.\n\nOur essays are not prescriptions. They are notes from the road — offered gently, in the hope that some sentence here might meet you where you are.",
    body_bn:
      "বোধি মিত্র — \"জাগরণের পথে এক বন্ধু\" — একটি ছোট জার্নাল, যা অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা পরিচালিত।\n\nআমরা সেখানে লিখি যেখানে মনের দুটি মহান ঐতিহ্য মিলিত হয়: বুদ্ধের ধ্যানময় উত্তরাধিকার এবং আধুনিক মনোরোগবিদ্যার অভিজ্ঞ বিজ্ঞান।\n\nআমাদের প্রবন্ধ চিকিৎসার নির্দেশনা নয়। এগুলি পথের নোট — মৃদুভাবে দেওয়া।",
    mission_en: "",
    mission_bn: "",
    image_url: "",
    image_alt_en: "", image_alt_bn: "",
    note_title_en: "Editorial note", note_title_bn: "সম্পাদকীয় নোট",
    note_text_en: "Nothing on this site constitutes medical advice. If you are suffering, please reach out to a qualified clinician in your community.",
    note_text_bn: "এই সাইটের কিছুই চিকিৎসা পরামর্শ নয়। যদি আপনি কষ্টে থাকেন, অনুগ্রহ করে আপনার কমিউনিটিতে একজন যোগ্য চিকিৎসকের কাছে যান।",
  },
  pages: DEFAULT_PAGES,
};

/** Deep-merge a partial config onto defaults so missing keys still resolve. */
export function mergeConfig(partial: unknown): SiteConfig {
  const p = (partial ?? {}) as Record<string, unknown>;
  const out = {} as SiteConfig;
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof SiteConfig)[]) {
    const defVal = DEFAULT_CONFIG[k];
    const inVal = p[k];
    if (Array.isArray(defVal)) {
      (out as any)[k] = Array.isArray(inVal) && inVal.length ? inVal : defVal;
    } else if (defVal && typeof defVal === "object") {
      (out as any)[k] = { ...(defVal as object), ...((inVal as object) || {}) };
    } else {
      (out as any)[k] = inVal ?? defVal;
    }
  }
  return out;
}

export async function fetchSiteSettings(): Promise<SiteConfig> {
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("config")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    console.warn("[siteSettings] fetch failed, using defaults", error);
    return DEFAULT_CONFIG;
  }
  return mergeConfig(data?.config);
}

export async function saveSiteSettings(config: SiteConfig): Promise<void> {
  const { error } = await (supabase as any)
    .from("site_settings")
    .upsert({ id: true, config }, { onConflict: "id" });
  if (error) throw new Error(error.message);
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
    root.style.setProperty("--color-saffron", config.theme.accent_color);
    root.style.setProperty("--color-saffron-hover", config.theme.accent_hover);
    root.style.setProperty("--site-logo-max-width", `${config.branding.logo_max_width}px`);

    if (config.theme.mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    if (config.branding.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.branding.favicon_url;
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
    // Strict allowlist: only valid GA4 (G-XXXXXXXX) or Universal Analytics (UA-XXXX-Y) IDs.
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
    // id is validated against a strict allowlist above, so JSON.stringify is safe here.
    s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(id)});`;
    document.head.appendChild(s2);
  }, [config.seo.google_analytics_id]);

  return (
    <SiteSettingsContext.Provider value={config}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
