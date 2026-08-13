import { Eye, UserRound, BookOpenCheck, Star, MessageSquare, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import type { UserPreferences } from "@/lib/user-preferences";
import { SettingsSectionCard } from "./SettingsSectionCard";

/**
 * Privacy — what other readers can see about you. `public_profile` and
 * `show_reading_activity` were historically top-level; they now live under
 * `privacy.*` (migrated automatically for existing saved preferences).
 */
export function PrivacySection({
  prefs,
  updatePrivacy,
}: {
  prefs: UserPreferences;
  updatePrivacy: (key: keyof UserPreferences["privacy"], value: boolean) => void;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";

  const rows: {
    key: keyof UserPreferences["privacy"];
    icon: typeof Eye;
    label: string;
    labelBn: string;
    desc: string;
    descBn: string;
  }[] = [
    {
      key: "public_profile",
      icon: UserRound,
      label: "Public profile",
      labelBn: "সর্বজনীন প্রোফাইল",
      desc: "Let others see your profile information",
      descBn: "অন্যদের আপনার প্রোফাইল তথ্য দেখার অনুমতি দিন",
    },
    {
      key: "show_reading_activity",
      icon: BookOpenCheck,
      label: "Show reading activity",
      labelBn: "পড়ার কার্যকলাপ দেখান",
      desc: "Display your progress and completed books",
      descBn: "আপনার অগ্রগতি ও সম্পন্ন বই প্রদর্শন করুন",
    },
    {
      key: "show_reviews",
      icon: Star,
      label: "Show my reviews",
      labelBn: "আমার রিভিউ দেখান",
      desc: "Make your book reviews visible to others",
      descBn: "আপনার বইয়ের রিভিউ অন্যদের কাছে দৃশ্যমান করুন",
    },
    {
      key: "show_comments",
      icon: MessageSquare,
      label: "Show my comments",
      labelBn: "আমার মন্তব্য দেখান",
      desc: "Make your comments visible on your profile",
      descBn: "আপনার মন্তব্য প্রোফাইলে দৃশ্যমান করুন",
    },
    {
      key: "show_recommendations",
      icon: Sparkles,
      label: "Show recommendations",
      labelBn: "সুপারিশ দেখান",
      desc: "Share the books and posts you recommend",
      descBn: "আপনার পছন্দের বই ও লেখা শেয়ার করুন",
    },
  ];

  return (
    <SettingsSectionCard icon={Eye} title={bn ? "গোপনীয়তা" : "Privacy"} id="privacy">
      <div className="space-y-5">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <div>
                  <span className="text-sm text-foreground">{bn ? r.labelBn : r.label}</span>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">{bn ? r.descBn : r.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs.privacy[r.key]}
                onCheckedChange={(v) => updatePrivacy(r.key, v)}
                aria-label={bn ? `${r.labelBn} টগল` : `Toggle ${r.label}`}
              />
            </div>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
