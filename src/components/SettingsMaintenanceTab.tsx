import type { SiteConfig } from "@/lib/siteSettings";
import { Field, Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function MaintenanceTab({ cfg, update }: TabProps) {
  return (
    <>
      <Section title="Maintenance Mode" desc="Temporarily take the site offline for visitors. Admins can always access the site.">
        <div className="flex items-center gap-3 mb-4">
          <Switch
            checked={cfg.maintenance.enabled}
            onCheckedChange={(v) => update("maintenance", { enabled: v })}
          />
          <Label>
            {cfg.maintenance.enabled ? "Maintenance mode is ON" : "Maintenance mode is OFF"}
          </Label>
        </div>
        {cfg.maintenance.enabled && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
            Visitors will see the maintenance page. Admins can still access the site.
          </div>
        )}
      </Section>
      <Section title="Maintenance Message" desc="Message shown to visitors during maintenance.">
        <div className="space-y-4">
          <Field
            label="Message (English)"
            value={cfg.maintenance.message_en}
            onChange={(v) => update("maintenance", { message_en: v })}
            placeholder="We are performing scheduled maintenance."
          />
          <Field
            label="Message (Bangla)"
            value={cfg.maintenance.message_bn}
            onChange={(v) => update("maintenance", { message_bn: v })}
            placeholder="আমরা নির্ধারিত রক্ষণাবেক্ষণ করছি।"
          />
        </div>
      </Section>
    </>
  );
}
