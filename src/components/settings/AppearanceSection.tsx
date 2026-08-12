import { Palette, Sun, Moon, Monitor, Globe, Activity } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import { SettingsSectionCard } from "./SettingsSectionCard";
import type { UserPreferences } from "@/lib/user-preferences";

/**
 * Appearance — display theme, language, and the site-wide reduced-motion
 * toggle (live-applied via the `data-reduced-motion` attribute on <html>).
 */
export function AppearanceSection({
  prefs,
  updatePref,
  setTheme,
}: {
  prefs: UserPreferences;
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  setTheme: (mode: "light" | "dark" | "system") => void;
}) {
  const { lang, setLang } = useLang();
  const bn = lang === "bn";

  return (
    <SettingsSectionCard icon={Palette} title={bn ? "চেহারা" : "Appearance"} id="appearance">
      <div className="space-y-6">
        {/* Theme */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {prefs.theme === "dark" ? (
              <Moon className="h-3.5 w-3.5 text-muted-foreground/60" />
            ) : prefs.theme === "light" ? (
              <Sun className="h-3.5 w-3.5 text-muted-foreground/60" />
            ) : (
              <Monitor className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <span className="text-sm text-foreground">{bn ? "ডিসপ্লে থিম" : "Display theme"}</span>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={prefs.theme}
            onValueChange={(v) => {
              if (v === "light" || v === "dark" || v === "system") {
                updatePref("theme", v);
                setTheme(v);
              }
            }}
          >
            <ToggleGroupItem value="light" aria-label={bn ? "লাইট থিম" : "Light theme"}>
              {bn ? "লাইট" : "Light"}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={bn ? "ডার্ক থিম" : "Dark theme"}>
              {bn ? "ডার্ক" : "Dark"}
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label={bn ? "সিস্টেম থিম" : "System theme"}>
              {bn ? "সিস্টেম" : "System"}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-sm text-foreground">{bn ? "ভাষা" : "Language"}</span>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={lang}
            onValueChange={(v) => {
              if (v === "en" || v === "bn") {
                updatePref("locale", v);
                setLang(v);
              }
            }}
          >
            <ToggleGroupItem value="en" aria-label="English">English</ToggleGroupItem>
            <ToggleGroupItem value="bn" aria-label="বাংলা">বাংলা</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Reduced motion */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground/60" />
            <div>
              <span className="text-sm text-foreground">{bn ? "কম গতি (রিডিউসড মোশন)" : "Reduced motion"}</span>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {bn
                  ? "পুরো সাইটের অ্যানিমেশন ও ট্রানজিশন বন্ধ করুন"
                  : "Minimize animations and transitions across the site"}
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.reduced_motion}
            onCheckedChange={(v) => updatePref("reduced_motion", v)}
            aria-label={bn ? "কম গতি টগল" : "Toggle reduced motion"}
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
