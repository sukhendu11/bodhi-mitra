import { BookOpenText, Type, ArrowUpDown, Maximize, Contrast, Save } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import { SettingsSectionCard } from "./SettingsSectionCard";
import type { UserPreferences } from "@/lib/user-preferences";

/**
 * Reading — the long-form reading preferences (font size, line spacing,
 * measure width, reader theme, save-progress). These were previously only
 * editable in-context via the article TypographyControls / PDF reader; this
 * section gives them a home on /settings so every reading surface is
 * configurable from one place.
 *
 * Note: rows intentionally stack (label above control) rather than using
 * justify-between so the section is safe on 320px viewports.
 */
export function ReadingSection({
  prefs,
  updatePref,
}: {
  prefs: UserPreferences;
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const { lang } = useLang();
  const bn = lang === "bn";

  const setReading = (patch: Partial<UserPreferences["reading"]>) =>
    updatePref("reading", { ...prefs.reading, ...patch });

  const label = (en: string, bangla: string) => (bn ? bangla : en);
  const desc = (en: string, bangla: string) => (
    <p className="mt-1.5 text-xs text-muted-foreground/60">{label(en, bangla)}</p>
  );

  return (
    <SettingsSectionCard icon={BookOpenText} title={bn ? "পঠন" : "Reading"} id="reading">
      <div className="space-y-6">
        {/* Font size */}
        <div>
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Type className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {label("Font size", "ফন্টের আকার")}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={prefs.reading.font_size}
            onValueChange={(v) => {
              if (v === "sm" || v === "md" || v === "lg") setReading({ font_size: v });
            }}
            className="mt-2 justify-start"
          >
            <ToggleGroupItem value="sm" aria-label={bn ? "ছোট" : "Small"}>
              {label("Small", "ছোট")}
            </ToggleGroupItem>
            <ToggleGroupItem value="md" aria-label={bn ? "মাঝারি" : "Medium"}>
              {label("Medium", "মাঝারি")}
            </ToggleGroupItem>
            <ToggleGroupItem value="lg" aria-label={bn ? "বড়" : "Large"}>
              {label("Large", "বড়")}
            </ToggleGroupItem>
          </ToggleGroup>
          {desc(
            "Sets the text size for reflections and the reader.",
            "প্রতিফলন ও রিডারের লেখার আকার নির্ধারণ করে।",
          )}
        </div>

        {/* Line spacing */}
        <div>
          <span className="flex items-center gap-2 text-sm text-foreground">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {label("Line spacing", "লাইনের ব্যবধান")}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={prefs.reading.line_spacing}
            onValueChange={(v) => {
              if (v === "normal" || v === "relaxed" || v === "wide")
                setReading({ line_spacing: v });
            }}
            className="mt-2 justify-start"
          >
            <ToggleGroupItem value="normal" aria-label={bn ? "স্বাভাবিক" : "Normal"}>
              {label("Normal", "স্বাভাবিক")}
            </ToggleGroupItem>
            <ToggleGroupItem value="relaxed" aria-label={bn ? "আরাম" : "Relaxed"}>
              {label("Relaxed", "আরাম")}
            </ToggleGroupItem>
            <ToggleGroupItem value="wide" aria-label={bn ? "প্রশস্ত" : "Wide"}>
              {label("Wide", "প্রশস্ত")}
            </ToggleGroupItem>
          </ToggleGroup>
          {desc(
            "Line spacing for comfortable long-form reading.",
            "দীর্ঘ পড়ার জন্য আরামদায়ক লাইনের ব্যবধান।",
          )}
        </div>

        {/* Reading width */}
        <div>
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Maximize className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {label("Reading width", "পড়ার প্রস্থ")}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={prefs.reading.width}
            onValueChange={(v) => {
              if (v === "narrow" || v === "normal" || v === "wide")
                setReading({ width: v });
            }}
            className="mt-2 justify-start"
          >
            <ToggleGroupItem value="narrow" aria-label={bn ? "সরু" : "Narrow"}>
              {label("Narrow", "সরু")}
            </ToggleGroupItem>
            <ToggleGroupItem value="normal" aria-label={bn ? "স্বাভাবিক" : "Normal"}>
              {label("Normal", "স্বাভাবিক")}
            </ToggleGroupItem>
            <ToggleGroupItem value="wide" aria-label={bn ? "প্রশস্ত" : "Wide"}>
              {label("Wide", "প্রশস্ত")}
            </ToggleGroupItem>
          </ToggleGroup>
          {desc(
            "Narrow tightens the text column; wide removes the cap.",
            "সরু লেখার কলাম সংকুচিত করে; প্রশস্ত সীমা সরিয়ে দেয়।",
          )}
        </div>

        {/* Reader mode */}
        <div>
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Contrast className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {label("Reader theme", "রিডার থিম")}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={prefs.reading.mode}
            onValueChange={(v) => {
              if (v === "light" || v === "sepia" || v === "dark")
                setReading({ mode: v });
            }}
            className="mt-2 justify-start"
          >
            <ToggleGroupItem value="light" aria-label={bn ? "লাইট" : "Light"}>
              {label("Light", "লাইট")}
            </ToggleGroupItem>
            <ToggleGroupItem value="sepia" aria-label={bn ? "সেপিয়া" : "Sepia"}>
              {label("Sepia", "সেপিয়া")}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={bn ? "ডার্ক" : "Dark"}>
              {label("Dark", "ডার্ক")}
            </ToggleGroupItem>
          </ToggleGroup>
          {desc(
            "Default theme for the PDF reader.",
            "পিডিএফ রিডারের ডিফল্ট থিম।",
          )}
        </div>

        {/* Save progress */}
        <div className="flex items-start gap-3 pt-1">
          <Switch
            checked={prefs.reading.save_progress}
            onCheckedChange={(v) => setReading({ save_progress: v })}
            aria-label={bn ? "অগ্রগতি সংরক্ষণ টগল" : "Toggle save reading progress"}
          />
          <div className="flex items-center gap-2">
            <Save className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <div>
              <span className="block text-sm text-foreground">
                {label("Save reading progress", "পড়ার অগ্রগতি সংরক্ষণ")}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                {label(
                  "Persist progress and history so you can resume where you left off.",
                  "অগ্রগতি ও ইতিহাস সংরক্ষণ করুন যাতে পরে যেখানে থামিয়েছিলেন সেখান থেকে শুরু করতে পারেন।",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
