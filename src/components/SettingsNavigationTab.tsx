import type { SiteConfig } from "@/lib/siteSettings";
import { Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function NavigationTab({ cfg, update }: TabProps) {
  return (
    <>
      <Section title="Header" desc="Configure header behavior and appearance.">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={cfg.navigation.sticky_header}
              onCheckedChange={(v) => update("navigation", { sticky_header: v })}
            />
            <div>
              <Label>Sticky Header</Label>
              <p className="text-xs text-muted-foreground">Header stays visible when scrolling down</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={cfg.navigation.show_breadcrumbs}
              onCheckedChange={(v) => update("navigation", { show_breadcrumbs: v })}
            />
            <div>
              <Label>Show Breadcrumbs</Label>
              <p className="text-xs text-muted-foreground">Display breadcrumb navigation on content pages</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={cfg.navigation.show_icons}
              onCheckedChange={(v) => update("navigation", { show_icons: v })}
            />
            <div>
              <Label>Show Icons</Label>
              <p className="text-xs text-muted-foreground">Display icons next to navigation items</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Mobile Navigation" desc="Configure mobile menu behavior.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Animation Style</Label>
            <div className="flex gap-3">
              {(["slide", "overlay"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update("navigation", { mobile_nav_style: style })}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all text-center ${
                    cfg.navigation.mobile_nav_style === style
                      ? "border-foreground/40 bg-foreground/5 ring-1 ring-foreground/20"
                      : "border-border/60 hover:border-foreground/20"
                  }`}
                >
                  <span className="text-xs font-medium capitalize">{style}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Dropdown Depth" desc="Maximum nesting level for dropdown menus.">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Max Depth: <span className="font-mono">{cfg.navigation.max_depth}</span>
          </Label>
          <Slider
            min={1}
            max={3}
            step={1}
            value={[cfg.navigation.max_depth]}
            onValueChange={([v]) => update("navigation", { max_depth: v })}
          />
          <p className="text-xs text-muted-foreground">
            {cfg.navigation.max_depth === 1 && "Single-level dropdowns only"}
            {cfg.navigation.max_depth === 2 && "One level of nested submenus"}
            {cfg.navigation.max_depth === 3 && "Up to two levels of nested submenus"}
          </p>
        </div>
      </Section>
    </>
  );
}
