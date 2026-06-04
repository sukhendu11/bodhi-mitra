import type { SiteConfig } from "@/lib/siteSettings";
import { ColorField, FieldRow, Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function ThemeTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Accent Color" desc="Used for Sign In button and accent highlights site-wide.">
        <FieldRow>
          <ColorField label="Primary Accent" value={cfg.theme.accent_color}
            onChange={(v) => update("theme", { accent_color: v })} />
          <ColorField label="Accent Hover" value={cfg.theme.accent_hover}
            onChange={(v) => update("theme", { accent_hover: v })} />
        </FieldRow>
      </Section>
      <Section title="Background Mode">
        <div className="flex items-center gap-3">
          <Switch checked={cfg.theme.mode === "dark"}
            onCheckedChange={(v) => update("theme", { mode: v ? "dark" : "light" })} />
          <Label>{cfg.theme.mode === "dark" ? "Dark mode (default)" : "Light mode (default)"}</Label>
        </div>
      </Section>
      <Section title="Logo Scaling">
        <div className="space-y-3">
          <Label>Logo max-width: <span className="font-mono">{cfg.branding.logo_max_width}px</span></Label>
          <Slider min={60} max={320} step={4} value={[cfg.branding.logo_max_width]}
            onValueChange={([v]) => update("branding", { logo_max_width: v })} />
        </div>
      </Section>
    </>
  );
}
