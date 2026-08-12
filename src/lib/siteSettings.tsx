import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { isMockMode } from "@/lib/data-source";
import { mockGetSettings } from "@/lib/mock-settings";

export interface SiteConfig {
  branding: {
    logo_url: string;
    favicon_url: string;
    site_name_en: string;
    site_name_bn: string;
    tagline_en: string;
    tagline_bn: string;
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
    /** Bangla variant of the hero CTA label (e.g. "পড়া শুরু করুন"). */
    cta_label_bn: string;
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
    explore_title_en: string;
    explore_title_bn: string;
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
    sidebar_email_label_en: string;
    sidebar_email_label_bn: string;
    sidebar_phone_label_en: string;
    sidebar_phone_label_bn: string;
    sidebar_location_label_en: string;
    sidebar_location_label_bn: string;
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
    site_url: string;
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
    pullout_title_en: string;
    pullout_title_bn: string;
    pullout_text_en: string;
    pullout_text_bn: string;
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
    title_en: string;
    title_bn: string;
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
    /** Enable newsletter welcome series */
    newsletter_automation: boolean;
    /** Enable AI chat assistant */
    ai_chat: boolean;
  };
  reader: {
    /** Sign-in prompt title */
    sign_in_prompt_title: string;
    /** Sign-in prompt message */
    sign_in_prompt_message: string;
    bookmarks_tab_label_en: string;
    bookmarks_tab_label_bn: string;
    notes_tab_label_en: string;
    notes_tab_label_bn: string;
    search_tab_label_en: string;
    search_tab_label_bn: string;
    bookmarks_empty_en: string;
    bookmarks_empty_bn: string;
    notes_empty_en: string;
    notes_empty_bn: string;
    no_pdf_message_en: string;
    no_pdf_message_bn: string;
    open_reader_failed_en: string;
    open_reader_failed_bn: string;
    /** Default reader theme: light | dark | sepia */
    default_theme: "light" | "dark" | "sepia";
    /** Default font size in the reader (0.75–2.0) */
    default_font_size: number;
    /** Default line height in the reader (1.2–2.5) */
    default_line_height: number;
    /** Show page numbers in reader */
    show_page_numbers: boolean;
    /** Allow readers to download the PDF (permission-gated by ownership) */
    allow_download: boolean;
    /** Allow readers to print the book (permission-gated by ownership) */
    allow_print: boolean;
  };
  commerce: {
    proceed_checkout_label_en: string;
    proceed_checkout_label_bn: string;
    checkout_notice_en: string;
    checkout_notice_bn: string;
    cart_empty_en: string;
    cart_empty_bn: string;
    cart_sign_in_desc_en: string;
    cart_sign_in_desc_bn: string;
    subtotal_label_en: string;
    subtotal_label_bn: string;
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
    cart_title_en: string;
    cart_title_bn: string;
    checkout_success_en: string;
    checkout_success_bn: string;
    checkout_cancel_en: string;
    checkout_cancel_bn: string;
    purchase_success_en: string;
    purchase_success_bn: string;
    purchase_cancel_en: string;
    purchase_cancel_bn: string;
    get_free_copy_label_en: string;
    get_free_copy_label_bn: string;
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
  email: {
    /** Sender display name for outgoing emails */
    sender_name: string;
    /** Sender email address (must be verified in Resend) */
    sender_email: string;
    /** Reply-to address for admin notifications */
    reply_to: string;
    /** Enable/disable email sending entirely */
    enabled: boolean;
  };
  book_grid: {
    /** Number of books per page */
    page_size: number;
    /** Eyebrow title EN */
    eyebrow_en: string;
    /** Eyebrow title BN */
    eyebrow_bn: string;
    /** Number of columns on mobile (<768px): 1 | 2 */
    columns_mobile: number;
    /** Number of columns on tablet (≥768px): 2 | 3 | 4 */
    columns_tablet: number;
    /** Number of columns on desktop (≥1024px): 3 | 4 | 5 */
    columns_desktop: number;
    /** Grid gap in px */
    gap: number;
    /** Card aspect ratio: "3/4" | "2/3" | "1/1" | "4/3" */
    cover_aspect_ratio: string;
    /** Card border radius in px */
    card_radius: number;
    /** Show author name on cards */
    show_author: boolean;
    /** Show "Free" badge on free books */
    show_free_badge: boolean;
    /** Show "Featured" badge on featured books */
    show_featured_badge: boolean;
    /** Title font size in px */
    title_font_size: number;
    /** Author font size in px */
    author_font_size: number;
    /** Taxonomy/badge font size in px (badges, metadata, labels) */
    taxonomy_font_size: number;
    /** Title max lines: 1 | 2 | 3 */
    title_lines: number;
  };
  home: {
    recently_added_title_en: string;
    recently_added_title_bn: string;
    featured_books_title_en: string;
    featured_books_title_bn: string;
    videos_title_en: string;
    videos_title_bn: string;
    newsletter_heading_en: string;
    newsletter_heading_bn: string;
  };
  ai_chat: {
    welcome_message_en: string;
    welcome_message_bn: string;
    panel_title_en: string;
    panel_title_bn: string;
    panel_subtitle_en: string;
    panel_subtitle_bn: string;
    assistant_name: string;
    disclaimer_en: string;
    disclaimer_bn: string;
  };
  comments: {
    section_title_en: string;
    section_title_bn: string;
    empty_state_en: string;
    empty_state_bn: string;
    share_thought_placeholder_en: string;
    share_thought_placeholder_bn: string;
    sign_in_to_share_en: string;
    sign_in_to_share_bn: string;
    delete_dialog_title_en: string;
    delete_dialog_title_bn: string;
    delete_dialog_desc_en: string;
    delete_dialog_desc_bn: string;
  };
  search: {
    title_en: string;
    title_bn: string;
  };
  profile: {
    title_en: string;
    title_bn: string;
  };
  error: {
    not_found_title_en: string;
    not_found_title_bn: string;
    not_found_message_en: string;
    not_found_message_bn: string;
    generic_title_en: string;
    generic_title_bn: string;
  };
  book_detail: {
    rating_label_en: string;
    rating_label_bn: string;
    description_label_en: string;
    description_label_bn: string;
    pages_label_en: string;
    pages_label_bn: string;
    reading_time_label_en: string;
    reading_time_label_bn: string;
    isbn_label_en: string;
    isbn_label_bn: string;
    price_label_en: string;
    price_label_bn: string;
    file_size_label_en: string;
    file_size_label_bn: string;
    refund_policy_label_en: string;
    refund_policy_label_bn: string;
    rating_breakdown_label_en: string;
    rating_breakdown_label_bn: string;
    continue_reading_label_en: string;
    continue_reading_label_bn: string;
    read_now_label_en: string;
    read_now_label_bn: string;
    add_to_cart_label_en: string;
    add_to_cart_label_bn: string;
    free_to_read_label_en: string;
    free_to_read_label_bn: string;
    featured_badge_en: string;
    featured_badge_bn: string;
    free_badge_en: string;
    free_badge_bn: string;
    not_found_heading_en: string;
    not_found_heading_bn: string;
    purchase_success_en: string;
    purchase_success_bn: string;
    purchase_cancel_en: string;
    purchase_cancel_bn: string;
    already_owned_en: string;
    already_owned_bn: string;
    added_to_library_en: string;
    added_to_library_bn: string;
    purchase_failed_en: string;
    purchase_failed_bn: string;
  };
  newsletter: {
    already_subscribed_en: string;
    already_subscribed_bn: string;
    success_message_en: string;
    success_message_bn: string;
    error_fallback_en: string;
    error_fallback_bn: string;
    subscribe_another_en: string;
    subscribe_another_bn: string;
    subscribe_button_en: string;
    subscribe_button_bn: string;
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  branding: {
    logo_url: "",
    favicon_url: "",
    site_name_en: "Sabbe Satta",
    site_name_bn: "সব্বে সত্তা",
    tagline_en: "Where ancient wisdom meets modern psychology.",
    tagline_bn: "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।",
    logo_max_width: 120,
  },
  hero: {
    visible: true,
    image_url: "",
    eyebrow_en: "❖ Sabbe Satta",
    eyebrow_bn: "❖ সব্বে সত্তা",
    title_en: "Where ancient wisdom\nmeets modern psychology.",
    title_bn: "যেখানে প্রাচীন প্রজ্ঞা\nআধুনিক মনোবিজ্ঞানের সাথে মিলে।",
    desc_en:
      "Quiet essays on the Buddha's teachings, the science of the mind, and the slow art of becoming well.",
    desc_bn: "বুদ্ধের শিক্ষা, মনের বিজ্ঞান, এবং সুস্থ হয়ে ওঠার ধীর শিল্প নিয়ে শান্ত প্রবন্ধ।",
    cta_label: "Begin reading",
    cta_label_bn: "পড়া শুরু করুন",
    cta_url: "/reflections",
  },
  theme: {
    accent_color: "#d35400",
    accent_hover: "#e67e22",
    mode: "light",
    header_visible: true,
    font_heading: "Cormorant Garamond, serif",
    font_body: "Inter, sans-serif",
    font_bn: "Noto Sans Bengali, sans-serif",
    font_size_base: 16,
    radius_scale: 1,
    preset: "warm",
    custom_css: "",
  },
  footer: {
    copyright_en: "© {year} Sabbe Satta. All rights reserved.",
    copyright_bn: "© {year} সব্বে সত্তা। সর্বস্বত্ব সংরক্ষিত।",
    text_en: "Where ancient wisdom meets modern psychology.",
    text_bn: "যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।",
    explore_title_en: "Explore",
    explore_title_bn: "অন্বেষণ",
  },
  social: { facebook: "", twitter: "", instagram: "", linkedin: "", youtube: "" },
  contact: {
    email: "",
    phone: "",
    location: "",
    title_en: "Get in touch",
    title_bn: "যোগাযোগ করুন",
    sidebar_email_label_en: "Email",
    sidebar_email_label_bn: "ইমেইল",
    sidebar_phone_label_en: "Phone",
    sidebar_phone_label_bn: "ফোন",
    sidebar_location_label_en: "Location",
    sidebar_location_label_bn: "অবস্থান",
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
    site_url: "",
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
    pullout_title_en: "❖ The Mindful Connection",
    pullout_title_bn: "❖ দ্য মাইন্ডফুল কানেকশন",
    pullout_text_en: "Mindfulness is not about clearing the mind — it is about learning to sit with what is already here, without reaching for the next thought, the next distraction, the next fix.",
    pullout_text_bn: "মননশীলতা মন খালি করা নয় — এটি এখানে যা আছে তার সাথে বসতে শেখা, পরবর্তী চিন্তা, পরবর্তী বিক্ষেপ, পরবর্তী সমাধানের জন্য না পৌঁছে।",
  },
  about: {
    eyebrow_en: "About",
    eyebrow_bn: "পরিচিতি",
    title_en: "A quiet conversation between two traditions.",
    title_bn: "দুই ঐতিহ্যের মধ্যে একটি শান্ত কথোপকথন।",
    body_en:
      'Sabbe Satta — "a friend on the path of awakening" — is a small journal maintained by practicing psychiatrists who have spent many years sitting with patients in clinic, and many mornings sitting in silence on the cushion.\n\nWe write at the seam where two great traditions of mind meet: the contemplative inheritance of the Buddha, refined across twenty-five centuries, and the empirical science of modern psychiatry and psychology. Neither replaces the other. Each, at its best, illuminates the other.\n\nOur essays are not prescriptions. They are notes from the road — offered gently, in the hope that some sentence here might meet you where you are.',
    body_bn:
      'সব্বে সত্তা — "জাগরণের পথে এক বন্ধু" — একটি ছোট জার্নাল, যা অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা পরিচালিত।\n\nআমরা সেখানে লিখি যেখানে মনের দুটি মহান ঐতিহ্য মিলিত হয়: বুদ্ধের ধ্যানময় উত্তরাধিকার এবং আধুনিক মনোরোগবিদ্যার অভিজ্ঞ বিজ্ঞান।\n\nআমাদের প্রবন্ধ চিকিৎসার নির্দেশনা নয়। এগুলি পথের নোট — মৃদুভাবে দেওয়া।',
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
    title_en: "We'll be back soon",
    title_bn: "আমরা শীঘ্রই ফিরে আসছি",
    message_en: "We are performing scheduled maintenance. Please check back soon.",
    message_bn: "আমরা নির্ধারিত রক্ষণাবেক্ষণ করছি। অনুগ্রহ করে শীঘ্রই আবার দেখুন।",
  },
  features: {
    reader_annotations: true,
    reading_stats: true,
    book_recommendations: true,
    podcasts: false,
    donations: false,
    newsletter_automation: false,
    ai_chat: true,
  },
  reader: {
    sign_in_prompt_title: "Sign in to read",
    sign_in_prompt_message: "Sign in to read books",
    bookmarks_tab_label_en: "Bookmarks",
    bookmarks_tab_label_bn: "বুকমার্ক",
    notes_tab_label_en: "Notes",
    notes_tab_label_bn: "নোটস",
    search_tab_label_en: "Search",
    search_tab_label_bn: "অনুসন্ধান",
    bookmarks_empty_en: "No bookmarks yet",
    bookmarks_empty_bn: "এখনও কোনো বুকমার্ক নেই",
    notes_empty_en: "No notes yet",
    notes_empty_bn: "এখনও কোনো নোট নেই",
    no_pdf_message_en: "No PDF available for this book.",
    no_pdf_message_bn: "এই বইয়ের জন্য কোনো PDF উপলব্ধ নেই।",
    open_reader_failed_en: "Failed to open the reader. Please try again.",
    open_reader_failed_bn: "পাঠক খুলতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
    default_theme: "sepia",
    default_font_size: 1.0,
    default_line_height: 1.8,
    show_page_numbers: true,
    allow_download: true,
    allow_print: true,
  },
  commerce: {
    proceed_checkout_label_en: "Proceed to Checkout",
    proceed_checkout_label_bn: "চেকআউটে যান",
    checkout_notice_en: "You are about to complete your purchase. By proceeding, you agree to our refund policy.",
    checkout_notice_bn: "আপনি আপনার ক্রয় সম্পন্ন করতে চলেছেন। এগিয়ে গিয়ে, আপনি আমাদের ফেরত নীতি সম্মত হন।",
    cart_empty_en: "Your cart is empty",
    cart_empty_bn: "আপনার কার্ট খালি",
    cart_sign_in_desc_en: "Sign in to view items in your cart.",
    cart_sign_in_desc_bn: "আপনার কার্টের আইটেম দেখতে সাইন ইন করুন।",
    subtotal_label_en: "Subtotal",
    subtotal_label_bn: "সাবটোটাল",
    currency: "BDT",
    currency_symbol: "BDT",
    tax_rate: 0,
    refund_policy_en: "",
    refund_policy_bn: "",
    cart_title_en: "Your Cart",
    cart_title_bn: "আপনার কার্ট",
    checkout_success_en: "Purchase complete! Books have been added to your library.",
    checkout_success_bn: "ক্রয় সম্পন্ন! বই আপনার লাইব্রেরিতে যোগ করা হয়েছে।",
    checkout_cancel_en: "Checkout was cancelled. Your cart items are still saved.",
    checkout_cancel_bn: "চেকআউট বাতিল হয়েছে। আপনার কার্ট আইটেমগুলি সংরক্ষিত আছে।",
    purchase_success_en: "Book purchased! You can now read it.",
    purchase_success_bn: "বই কেনা হয়েছে! আপনি এখন এটি পড়তে পারেন।",
    purchase_cancel_en: "Purchase was cancelled. No charges were made.",
    purchase_cancel_bn: "ক্রয় বাতিল হয়েছে। কোনো চার্জ নেওয়া হয়নি।",
    get_free_copy_label_en: "Get Free Copy",
    get_free_copy_label_bn: "বিনামূল্যে কপি নিন",
  },
  navigation: {
    sticky_header: true,
    show_breadcrumbs: true,
    mobile_nav_style: "slide",
    max_depth: 2,
    show_icons: true,
  },
  email: {
    sender_name: "Sabbe Satta",
    sender_email: "onboarding@resend.dev",
    reply_to: "",
    enabled: true,
  },
  book_grid: {
    page_size: 12,
    eyebrow_en: "Books",
    eyebrow_bn: "বই",
    columns_mobile: 1,
    columns_tablet: 2,
    columns_desktop: 3,
    gap: 40,
    cover_aspect_ratio: "4/3",
    card_radius: 12,
    show_author: true,
    show_free_badge: true,
    show_featured_badge: true,
    title_font_size: 18,
    author_font_size: 14,
    taxonomy_font_size: 13,
    title_lines: 2,
  },
  home: {
    recently_added_title_en: "Recently Added",
    recently_added_title_bn: "সম্প্রতি যুক্ত",
    featured_books_title_en: "Featured Books",
    featured_books_title_bn: "বৈশিষ্ট্যযুক্ত বই",
    videos_title_en: "Recent Videos",
    videos_title_bn: "সাম্প্রতিক ভিডিও",
    newsletter_heading_en: "Stay in Touch",
    newsletter_heading_bn: "যোগাযোগে থাকুন",
  },
  ai_chat: {
    welcome_message_en: "Namaste! I'm Bodhi, your guide to the wisdom here. Ask me about books, reflections, or anything on your mind.",
    welcome_message_bn: "নমস্কার! আমি বোধি, এখানের জ্ঞানের জন্য আপনার গাইড। বই, প্রতিফলন বা আপনার মনের কোনো কিছু সম্পর্কে জিজ্ঞাসা করুন।",
    panel_title_en: "Ask Bodhi",
    panel_title_bn: "বোধিকে জিজ্ঞাসা করুন",
    panel_subtitle_en: "AI-powered wisdom guide",
    panel_subtitle_bn: "AI-চালিত জ্ঞান গাইড",
    assistant_name: "Bodhi",
    disclaimer_en: "Responses are AI-generated and may not always be accurate",
    disclaimer_bn: "উত্তরগুলি AI-জেনারেটেড এবং সবসময় সঠিক নাও হতে পারে",
  },
  comments: {
    section_title_en: "Reflections",
    section_title_bn: "প্রতিফলন",
    empty_state_en: "No reflections yet. Be the first to share.",
    empty_state_bn: "এখনও কোনো প্রতিফলন নেই। প্রথম শেয়ার করুন।",
    share_thought_placeholder_en: "Share your thoughts...",
    share_thought_placeholder_bn: "আপনার চিন্তা শেয়ার করুন...",
    sign_in_to_share_en: "Sign in to share a reflection",
    sign_in_to_share_bn: "প্রতিফলন শেয়ার করতে সাইন ইন করুন",
    delete_dialog_title_en: "Delete reflection?",
    delete_dialog_title_bn: "প্রতিফলন মুছবেন?",
    delete_dialog_desc_en: "Are you sure? This cannot be undone.",
    delete_dialog_desc_bn: "আপনি কি নিশ্চিত? এটি ফেরানো যাবে না।",
  },
  search: {
    title_en: "Search",
    title_bn: "অনুসন্ধান",
  },
  profile: {
    title_en: "Profile",
    title_bn: "প্রোফাইল",
  },
  error: {
    not_found_title_en: "Page not found",
    not_found_title_bn: "পৃষ্ঠা পাওয়া যায়নি",
    not_found_message_en: "The page you're looking for doesn't exist or has moved.",
    not_found_message_bn: "আপনি যে পৃষ্ঠাটি খুঁজছেন তা নেই বা সরানো হয়েছে।",
    generic_title_en: "Something went wrong",
    generic_title_bn: "কিছু ভুল হয়েছে",
  },
  book_detail: {
    rating_label_en: "Rating",
    rating_label_bn: "রেটিং",
    description_label_en: "Description",
    description_label_bn: "বিবরণ",
    pages_label_en: "Pages",
    pages_label_bn: "পৃষ্ঠা",
    reading_time_label_en: "Reading time",
    reading_time_label_bn: "পড়ার সময়",
    isbn_label_en: "ISBN",
    isbn_label_bn: "আইএসবিএন",
    price_label_en: "Price",
    price_label_bn: "মূল্য",
    file_size_label_en: "File size",
    file_size_label_bn: "ফাইলের আকার",
    refund_policy_label_en: "Refund policy",
    refund_policy_label_bn: "ফেরত নীতি",
    rating_breakdown_label_en: "Rating breakdown",
    rating_breakdown_label_bn: "রেটিং ভাঙ্গন",
    continue_reading_label_en: "Continue Reading",
    continue_reading_label_bn: "পড়া চালিয়ে যান",
    read_now_label_en: "Read Now",
    read_now_label_bn: "এখন পড়ুন",
    add_to_cart_label_en: "Add to Cart",
    add_to_cart_label_bn: "কার্টে যোগ করুন",
    free_to_read_label_en: "Free to Read",
    free_to_read_label_bn: "বিনামূল্যে পড়ুন",
    featured_badge_en: "Featured",
    featured_badge_bn: "বৈশিষ্ট্যযুক্ত",
    free_badge_en: "Free",
    free_badge_bn: "বিনামূল্যে",
    not_found_heading_en: "Book not found",
    not_found_heading_bn: "বই পাওয়া যায়নি",
    purchase_success_en: "Purchase complete! Books have been added to your library.",
    purchase_success_bn: "ক্রয় সম্পন্ন! বই আপনার লাইব্রেরিতে যোগ করা হয়েছে।",
    purchase_cancel_en: "Checkout was cancelled.",
    purchase_cancel_bn: "চেকআউট বাতিল হয়েছে।",
    already_owned_en: "You already own this book.",
    already_owned_bn: "আপনি ইতিমধ্যে এই বইটি মালিক।",
    added_to_library_en: "This book has been added to your library.",
    added_to_library_bn: "এই বইটি আপনার লাইব্রেরিতে যোগ করা হয়েছে।",
    purchase_failed_en: "Purchase failed. Please try again.",
    purchase_failed_bn: "ক্রয় ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
  },
  newsletter: {
    already_subscribed_en: "You're already subscribed.",
    already_subscribed_bn: "আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন।",
    success_message_en: "Thanks! You're now subscribed.",
    success_message_bn: "ধন্যবাদ! আপনি এখন সাবস্ক্রাইব করেছেন।",
    error_fallback_en: "Something went wrong. Please try again.",
    error_fallback_bn: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
    subscribe_another_en: "Subscribe another email",
    subscribe_another_bn: "অন্য ইমেইল সাবস্ক্রাইব করুন",
    subscribe_button_en: "Subscribe",
    subscribe_button_bn: "সাবস্ক্রাইব",
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

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = import.meta.env.VITE_STRAPI_API_TOKEN || "";

async function fetchSiteSettingsFromStrapi(): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
    const res = await fetch(`${STRAPI_URL}/api/sitesetting`, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.config ?? null;
  } catch {
    return null;
  }
}

export async function fetchSiteSettings(): Promise<SiteConfig> {
  // Mock mode — merge persisted admin overrides over the defaults so
  // SiteSettingsProvider re-applies theme/branding/book-grid live.
  if (isMockMode()) {
    const stored = mockGetSettings();
    return mergeConfig(stored ?? {});
  }
  // Real mode — Strapi config, falling back to defaults.
  const strapiConfig = await fetchSiteSettingsFromStrapi();
  return strapiConfig ? mergeConfig(strapiConfig) : DEFAULT_CONFIG;
}

const SiteSettingsContext = createContext<SiteConfig>(DEFAULT_CONFIG);

export async function getSiteName(): Promise<string> {
  const settings = await fetchSiteSettings();
  return settings.branding.site_name_en || "Sabbe Satta";
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

    // Accent color → brand token (fixed across themes)
    root.style.setProperty("--color-saffron", t.accent_color);
    root.style.setProperty("--color-saffron-hover", t.accent_hover);
    // Light-mode primary tracks the accent via CSS (`--primary: var(--color-saffron)`).
    // Dark mode uses --primary-light (lighter saffron) with a dark --primary-foreground,
    // as defined in styles.css `.dark`. Do NOT pin --primary / --primary-foreground here —
    // that would force the light-mode values onto dark mode and break the design flow.
    root.style.setProperty("--primary-light", `color-mix(in oklch, ${t.accent_color} 70%, white)`);

    // Typography — override the CSS custom properties in styles.css
    root.style.setProperty("--font-serif", t.font_heading);
    root.style.setProperty("--font-sans", t.font_body);
    root.style.setProperty("--font-bn", t.font_bn);
    root.style.setProperty("--font-size-base", `${t.font_size_base / 16}rem`);

    // Radius scale — override the base radius
    root.style.setProperty("--radius", `${0.25 * t.radius_scale}rem`);

    // Logo
    root.style.setProperty("--site-logo-max-width", `${config.branding.logo_max_width}px`);

    // NOTE: `.dark` class is owned exclusively by useTheme (ThemeController).
    // SiteSettingsProvider must not toggle it here, otherwise it would clobber
    // the user's personal theme preference right after hydration (and also
    // fight the admin-forced dark mode handled by the FOUC pre-paint script).

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

    // Book grid
    const bg = config.book_grid;
    root.style.setProperty("--book-grid-cols-mobile", String(bg.columns_mobile));
    root.style.setProperty("--book-grid-cols-tablet", String(bg.columns_tablet));
    root.style.setProperty("--book-grid-cols-desktop", String(bg.columns_desktop));
    root.style.setProperty("--book-grid-gap", `${bg.gap}px`);
    root.style.setProperty("--book-grid-cover-aspect-ratio", bg.cover_aspect_ratio);
    root.style.setProperty("--book-grid-card-radius", `${bg.card_radius}px`);
    root.style.setProperty("--book-grid-show-author", bg.show_author ? "block" : "none");
    root.style.setProperty("--book-grid-show-free-badge", bg.show_free_badge ? "flex" : "none");
    root.style.setProperty("--book-grid-show-featured-badge", bg.show_featured_badge ? "flex" : "none");
    root.style.setProperty("--book-grid-title-font-size", `${bg.title_font_size}px`);
    root.style.setProperty("--book-grid-author-font-size", `${bg.author_font_size}px`);
    root.style.setProperty("--book-grid-taxonomy-font-size", `${bg.taxonomy_font_size}px`);
    root.style.setProperty("--book-grid-title-lines", String(bg.title_lines));

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
