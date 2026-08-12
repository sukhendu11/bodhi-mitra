import { Bell, Sparkles, MessageSquare, Star, Receipt, Newspaper } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import type { UserPreferences } from "@/lib/user-preferences";
import { SettingsSectionCard } from "./SettingsSectionCard";

/**
 * Notifications — per-topic email toggles. `email_notifications` is the master
 * switch; the six topics below are disabled while it is off (persisted for the
 * real email backend).
 */
export function NotificationsSection({
  prefs,
  updatePref,
  updateNotifications,
}: {
  prefs: UserPreferences;
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updateNotifications: (key: keyof UserPreferences["notifications"], value: boolean) => void;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";
  const masterOn = prefs.email_notifications;

  const rows: {
    key: keyof UserPreferences["notifications"];
    icon: typeof Bell;
    label: string;
    labelBn: string;
    desc: string;
    descBn: string;
  }[] = [
    {
      key: "content",
      icon: Newspaper,
      label: "New reflections",
      labelBn: "নতুন প্রতিফলন",
      desc: "When a new article or reflection is published",
      descBn: "নতুন নিবন্ধ বা প্রতিফলন প্রকাশিত হলে",
    },
    {
      key: "recommendations",
      icon: Sparkles,
      label: "Recommendations",
      labelBn: "সুপারিশ",
      desc: "Book and reading suggestions matched to you",
      descBn: "আপনার জন্য বাছাই করা বই ও পড়ার পরামর্শ",
    },
    {
      key: "comments",
      icon: MessageSquare,
      label: "Comments",
      labelBn: "মন্তব্য",
      desc: "Replies to your comments and new comments",
      descBn: "আপনার মন্তব্যের উত্তর ও নতুন মন্তব্য",
    },
    {
      key: "reviews",
      icon: Star,
      label: "Reviews",
      labelBn: "রিভিউ",
      desc: "Activity on reviews you've written",
      descBn: "আপনার লেখা রিভিউতে কার্যকলাপ",
    },
    {
      key: "orders",
      icon: Receipt,
      label: "Orders & purchases",
      labelBn: "অর্ডার ও ক্রয়",
      desc: "Order confirmations and purchase updates",
      descBn: "অর্ডার নিশ্চিতকরণ ও ক্রয় আপডেট",
    },
    {
      key: "newsletter",
      icon: Bell,
      label: "Newsletter",
      labelBn: "নিউজলেটার",
      desc: "The occasional Sabbe Satta newsletter",
      descBn: "সাব্বে সত্তার মাঝে মাঝে নিউজলেটার",
    },
  ];

  return (
    <SettingsSectionCard icon={Bell} title={bn ? "বিজ্ঞপ্তি" : "Notifications"} id="notifications">
      <div className="space-y-5">
        {/* Master switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm text-foreground">{bn ? "ইমেইল বিজ্ঞপ্তি" : "Email notifications"}</span>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {bn ? "সব ইমেইল বিজ্ঞপ্তির মূল সুইচ" : "Master switch for all email notifications"}
            </p>
          </div>
          <Switch
            checked={masterOn}
            onCheckedChange={(v) => updatePref("email_notifications", v)}
            aria-label={bn ? "ইমেইল বিজ্ঞপ্তি টগল" : "Toggle email notifications"}
          />
        </div>

        <hr className="border-border/40" />

        {/* Topic rows — disabled while the master is off */}
        <div className="space-y-5">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <div>
                    <span className="text-sm text-foreground">{bn ? r.labelBn : r.label}</span>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{bn ? r.descBn : r.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={masterOn && prefs.notifications[r.key]}
                  disabled={!masterOn}
                  onCheckedChange={(v) => updateNotifications(r.key, v)}
                  aria-label={bn ? `${r.labelBn} টগল` : `Toggle ${r.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </SettingsSectionCard>
  );
}
