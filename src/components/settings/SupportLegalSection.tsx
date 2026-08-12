import { Link } from "@tanstack/react-router";
import { LifeBuoy, HelpCircle, Mail, FileText, Scale } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { SettingsSectionCard } from "./SettingsSectionCard";

/** Support & Legal — help, contact, privacy and terms links. */
export function SupportLegalSection() {
  const { lang } = useLang();
  const bn = lang === "bn";

  const links: {
    to: string;
    icon: typeof LifeBuoy;
    label: string;
    labelBn: string;
    desc: string;
    descBn: string;
  }[] = [
    {
      to: "/faq",
      icon: HelpCircle,
      label: "Help & FAQ",
      labelBn: "সহায়তা ও সচরাচর জিজ্ঞাসা",
      desc: "Answers to common questions",
      descBn: "সাধারণ প্রশ্নের উত্তর",
    },
    {
      to: "/contact",
      icon: Mail,
      label: "Contact us",
      labelBn: "যোগাযোগ",
      desc: "Reach out to the team",
      descBn: "টিমের সাথে যোগাযোগ করুন",
    },
    {
      to: "/privacy",
      icon: FileText,
      label: "Privacy policy",
      labelBn: "গোপনীয়তা নীতি",
      desc: "How your data is handled",
      descBn: "আপনার ডেটা কীভাবে ব্যবহৃত হয়",
    },
    {
      to: "/terms",
      icon: Scale,
      label: "Terms of service",
      labelBn: "পরিষেবার শর্তাবলী",
      desc: "The rules of using the site",
      descBn: "সাইট ব্যবহারের শর্তাবলী",
    },
  ];

  return (
    <SettingsSectionCard icon={LifeBuoy} title={bn ? "সহায়তা ও আইনি" : "Support & Legal"} id="support">
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:border-[var(--color-saffron)]/40 hover:bg-secondary/40 p-4 transition-all duration-200"
            >
              <Icon className="h-4 w-4 text-[var(--color-saffron)]/70 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{bn ? l.labelBn : l.label}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{bn ? l.descBn : l.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
