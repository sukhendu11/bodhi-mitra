import type { SiteConfig } from "@/lib/siteSettings";
import { ColorField, Field, FieldRow, Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

/* ─── Theme Presets ─────────────────────────────────────────────── */

const THEME_PRESETS: Record<string, { label: string; accent_color: string; accent_hover: string; font_heading: string; font_body: string; radius_scale: number }> = {
  warm: { label: "Warm Saffron", accent_color: "#d35400", accent_hover: "#e67e22", font_heading: "Cormorant Garamond, serif", font_body: "Inter, sans-serif", radius_scale: 1 },
  cool: { label: "Cool Indigo", accent_color: "#4338ca", accent_hover: "#6366f1", font_heading: "Cormorant Garamond, serif", font_body: "Inter, sans-serif", radius_scale: 1 },
  forest: { label: "Forest Green", accent_color: "#166534", accent_hover: "#22c55e", font_heading: "Cormorant Garamond, serif", font_body: "Inter, sans-serif", radius_scale: 1 },
  minimal: { label: "Minimal Gray", accent_color: "#374151", accent_hover: "#6b7280", font_heading: "Inter, sans-serif", font_body: "Inter, sans-serif", radius_scale: 0.75 },
  elegant: { label: "Elegant Serif", accent_color: "#7c2d12", accent_hover: "#c2410c", font_heading: "Georgia, serif", font_body: "Georgia, serif", radius_scale: 0.5 },
  modern: { label: "Modern Clean", accent_color: "#0f172a", accent_hover: "#334155", font_heading: "Inter, sans-serif", font_body: "Inter, sans-serif", radius_scale: 1.25 },
};

/* ─── Font Options ──────────────────────────────────────────────── */

const FONT_OPTIONS = [
  { value: "Cormorant Garamond, serif", label: "Cormorant Garamond" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "system-ui, sans-serif", label: "System UI" },
  { value: "Merriweather, serif", label: "Merriweather" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "Source Sans 3, sans-serif", label: "Source Sans 3" },
  { value: "Lora, serif", label: "Lora" },
];

const BN_FONT_OPTIONS = [
  { value: "Hind Siliguri, sans-serif", label: "Hind Siliguri" },
  { value: "Noto Sans Bengali, sans-serif", label: "Noto Sans Bengali" },
  { value: "Kalpurush, sans-serif", label: "Kalpurush" },
  { value: "SolaimanLipi, sans-serif", label: "SolaimanLipi" },
];

/* ─── Theme Tab ─────────────────────────────────────────────────── */

export function ThemeTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      {/* Theme Presets */}
      <Section title="Theme Presets" desc="Quick-start with a curated theme. Customize individual settings below.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => {
            const isActive = cfg.theme.preset === key;
            return (
              <button
                key={key}
                onClick={() =>
                  update("theme", {
                    preset: key,
                    accent_color: preset.accent_color,
                    accent_hover: preset.accent_hover,
                    font_heading: preset.font_heading,
                    font_body: preset.font_body,
                    radius_scale: preset.radius_scale,
                  })
                }
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  isActive
                    ? "border-foreground/40 bg-foreground/5 ring-1 ring-foreground/20"
                    : "border-border/60 hover:border-foreground/20 hover:bg-secondary/20"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0 border border-border/40"
                  style={{ backgroundColor: preset.accent_color }}
                />
                <div className="min-w-0">
                  <span className="text-xs font-medium block">{preset.label}</span>
                  <span className="text-[0.6rem] text-muted-foreground block truncate">
                    {preset.font_heading.split(",")[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Accent Color */}
      <Section title="Accent Color" desc="Primary brand color used for buttons, links, and highlights site-wide.">
        <FieldRow>
          <ColorField
            label="Primary Accent"
            value={cfg.theme.accent_color}
            onChange={(v) => update("theme", { accent_color: v, preset: "custom" })}
          />
          <ColorField
            label="Accent Hover"
            value={cfg.theme.accent_hover}
            onChange={(v) => update("theme", { accent_hover: v, preset: "custom" })}
          />
        </FieldRow>
        {/* Live preview swatch */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex gap-1">
            {[0.9, 0.75, 0.6, 0.45, 0.3].map((l) => (
              <div
                key={l}
                className="w-6 h-6 rounded-md border border-border/30"
                style={{ backgroundColor: cfg.theme.accent_color, opacity: l }}
                title={`Opacity ${Math.round(l * 100)}%`}
              />
            ))}
          </div>
          <span className="text-[0.6rem] text-muted-foreground">Opacity preview</span>
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" desc="Control font families and base size across the entire site.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Heading Font</Label>
            <select
              value={cfg.theme.font_heading}
              onChange={(e) => update("theme", { font_heading: e.target.value, preset: "custom" })}
              className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-[0.6rem] text-muted-foreground mt-1" style={{ fontFamily: cfg.theme.font_heading }}>
              Preview: The path of awakening begins with a single step.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body Font</Label>
            <select
              value={cfg.theme.font_body}
              onChange={(e) => update("theme", { font_body: e.target.value, preset: "custom" })}
              className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-[0.6rem] text-muted-foreground mt-1" style={{ fontFamily: cfg.theme.font_body }}>
              Preview: Quiet essays on the Buddha&apos;s teachings and the science of the mind.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bangla Font</Label>
            <select
              value={cfg.theme.font_bn}
              onChange={(e) => update("theme", { font_bn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
            >
              {BN_FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-[0.6rem] text-muted-foreground mt-1" style={{ fontFamily: cfg.theme.font_bn }}>
              প্রিভিউ: বুদ্ধের শিক্ষা এবং মনের বিজ্ঞান নিয়ে শান্ত প্রবন্ধ।
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Base Font Size: <span className="font-mono">{cfg.theme.font_size_base}px</span>
            </Label>
            <Slider
              min={12}
              max={22}
              step={1}
              value={[cfg.theme.font_size_base]}
              onValueChange={([v]) => update("theme", { font_size_base: v })}
            />
          </div>
        </div>
      </Section>

      {/* Border Radius */}
      <Section title="Border Radius" desc="Global radius multiplier for all rounded elements.">
        <div className="space-y-3">
          <Label>
            Scale: <span className="font-mono">{cfg.theme.radius_scale}x</span>
          </Label>
          <Slider
            min={0}
            max={2}
            step={0.25}
            value={[cfg.theme.radius_scale]}
            onValueChange={([v]) => update("theme", { radius_scale: v })}
          />
          <div className="flex items-center gap-3">
            {[0, 4, 8, 12, 16, 20].map((base) => (
              <div
                key={base}
                className="w-10 h-10 bg-foreground/10 border border-border/40"
                style={{ borderRadius: `${base * cfg.theme.radius_scale}px` }}
                title={`${Math.round(base * cfg.theme.radius_scale)}px`}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Header Visibility */}
      <Section title="Header Visibility">
        <div className="flex items-center gap-3">
          <Switch
            checked={cfg.theme.header_visible}
            onCheckedChange={(v) => update("theme", { header_visible: v })}
          />
          <Label>{cfg.theme.header_visible ? "Header visible on site" : "Header hidden"}</Label>
        </div>
      </Section>

      {/* Background Mode */}
      <Section title="Background Mode">
        <div className="flex items-center gap-3">
          <Switch
            checked={cfg.theme.mode === "dark"}
            onCheckedChange={(v) => update("theme", { mode: v ? "dark" : "light" })}
          />
          <Label>
            {cfg.theme.mode === "dark" ? "Dark mode (default)" : "Light mode (default)"}
          </Label>
        </div>
      </Section>

      {/* Logo Scaling */}
      <Section title="Logo Scaling">
        <div className="space-y-3">
          <Label>
            Logo max-width: <span className="font-mono">{cfg.branding.logo_max_width}px</span>
          </Label>
          <Slider
            min={60}
            max={320}
            step={4}
            value={[cfg.branding.logo_max_width]}
            onValueChange={([v]) => update("branding", { logo_max_width: v })}
          />
        </div>
      </Section>

      {/* Custom CSS */}
      <Section title="Custom CSS" desc="Inject custom styles that apply site-wide. Use CSS custom properties (e.g. var(--primary)) for theme-aware styling.">
        <div className="space-y-1.5">
          <Textarea
            value={cfg.theme.custom_css}
            onChange={(e) => update("theme", { custom_css: e.target.value })}
            placeholder="/* Add custom CSS here */&#10;.my-class { color: var(--primary); }"
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-[0.6rem] text-muted-foreground">
            CSS is injected as a style tag in the document head. Changes apply instantly on the frontend.
          </p>
        </div>
      </Section>
    </>
  );
}
