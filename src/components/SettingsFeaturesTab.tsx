import type { SiteConfig } from "@/lib/siteSettings";
import { Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

const FLAGS: Array<{ key: keyof SiteConfig["features"]; label: string; desc: string }> = [
  { key: "reader_annotations", label: "Reader Annotations", desc: "Highlight text and add notes in the PDF reader" },
  { key: "reading_stats", label: "Reading Statistics", desc: "Reading streaks, pages read, and completion tracking" },
  { key: "book_recommendations", label: "Book Recommendations", desc: "Semantic book recommendations on detail pages" },
  { key: "ai_chat", label: "AI Chat Assistant", desc: "Floating chat panel for asking questions about content" },
  { key: "podcasts", label: "Podcasts Module", desc: "Castopod integration for podcast episodes" },
  { key: "donations", label: "Donations Page", desc: "Stripe-powered donation page" },
  { key: "course_certificates", label: "Course Certificates", desc: "PDF certificates for course completion" },
  { key: "newsletter_automation", label: "Newsletter Automation", desc: "Welcome email series for new subscribers" },
];

export function FeaturesTab({ cfg, update }: TabProps) {
  return (
    <Section title="Feature Flags" desc="Toggle features on or off. Changes apply immediately on the frontend.">
      <div className="space-y-4">
        {FLAGS.map((flag) => (
          <div key={flag.key} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
            <Switch
              checked={cfg.features[flag.key]}
              onCheckedChange={(v) => update("features", { [flag.key]: v })}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">{flag.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{flag.desc}</p>
            </div>
            <span className={`text-[0.55rem] px-2 py-0.5 rounded-full font-medium shrink-0 ${
              cfg.features[flag.key]
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              {cfg.features[flag.key] ? "On" : "Off"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
