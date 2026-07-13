import type { SiteConfig } from "@/lib/siteSettings";
import { Field, Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function ReaderTab({ cfg, update }: TabProps) {
  return (
    <>
      <Section title="Default Reader Theme" desc="Default color theme when users open the PDF reader.">
        <div className="flex gap-3">
          {(["light", "dark", "sepia"] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => update("reader", { default_theme: theme })}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                cfg.reader.default_theme === theme
                  ? "border-foreground/40 bg-foreground/5 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-foreground/20"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full border border-border/40 ${
                  theme === "light" ? "bg-white" : theme === "dark" ? "bg-zinc-900" : "bg-amber-50"
                }`}
              />
              <span className="text-xs font-medium capitalize">{theme}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Typography Defaults" desc="Default font size and line height in the reader.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Font Size: <span className="font-mono">{cfg.reader.default_font_size.toFixed(2)}</span>
            </Label>
            <Slider
              min={0.75}
              max={2.0}
              step={0.05}
              value={[cfg.reader.default_font_size]}
              onValueChange={([v]) => update("reader", { default_font_size: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Line Height: <span className="font-mono">{cfg.reader.default_line_height.toFixed(1)}</span>
            </Label>
            <Slider
              min={1.2}
              max={2.5}
              step={0.1}
              value={[cfg.reader.default_line_height]}
              onValueChange={([v]) => update("reader", { default_line_height: v })}
            />
          </div>
        </div>
      </Section>

      <Section title="Access Controls" desc="Control what readers can do with PDF content.">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={cfg.reader.allow_download}
              onCheckedChange={(v) => update("reader", { allow_download: v })}
            />
            <div>
              <Label>Allow PDF Download</Label>
              <p className="text-xs text-muted-foreground">Users can download the original PDF file</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={cfg.reader.show_page_numbers}
              onCheckedChange={(v) => update("reader", { show_page_numbers: v })}
            />
            <div>
              <Label>Show Page Numbers</Label>
              <p className="text-xs text-muted-foreground">Display page numbers in the reader UI</p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
