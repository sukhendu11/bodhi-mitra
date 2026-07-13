import type { SiteConfig } from "@/lib/siteSettings";
import {
  Field,
  FieldRow,
  FileUploadField,
  Section,
  TextareaField,
} from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
}

export function HomepageTab({ cfg, update, uploadAsset }: TabProps): ReactNode {
  return (
    <>
      <Section title="Hero Visibility">
        <div className="flex items-center gap-3">
          <Switch
            checked={cfg.hero.visible}
            onCheckedChange={(v) => update("hero", { visible: v })}
          />
          <Label>Show hero section on homepage</Label>
        </div>
      </Section>
      <Section title="Hero Content (English)">
        <Field
          label="Eyebrow / kicker"
          value={cfg.hero.eyebrow_en}
          onChange={(v) => update("hero", { eyebrow_en: v })}
        />
        <TextareaField
          label="Main Heading"
          value={cfg.hero.title_en}
          onChange={(v) => update("hero", { title_en: v })}
          hint="Use a line break to split across two lines."
        />
        <TextareaField
          label="Subheading / Description"
          value={cfg.hero.desc_en}
          onChange={(v) => update("hero", { desc_en: v })}
        />
      </Section>
      <Section title="Hero Content (বাংলা)">
        <Field
          label="Eyebrow / kicker"
          value={cfg.hero.eyebrow_bn}
          onChange={(v) => update("hero", { eyebrow_bn: v })}
        />
        <TextareaField
          label="Main Heading"
          value={cfg.hero.title_bn}
          onChange={(v) => update("hero", { title_bn: v })}
        />
        <TextareaField
          label="Subheading / Description"
          value={cfg.hero.desc_bn}
          onChange={(v) => update("hero", { desc_bn: v })}
        />
      </Section>
      <Section
        title="Hero Image"
        desc="Upload a background image for the hero section. Recommended ~2000×1200px."
      >
        <FileUploadField
          label="Hero Image"
          value={cfg.hero.image_url}
          onUpload={async (f) => {
            const url = await uploadAsset(f, "hero");
            if (url) update("hero", { image_url: url });
          }}
          onClear={() => update("hero", { image_url: "" })}
          onUrl={(url) => update("hero", { image_url: url })}
          previewClass="h-24 w-48"
        />
      </Section>
      <Section title="Call-to-Action Button">
        <FieldRow>
          <Field
            label="Button label"
            value={cfg.hero.cta_label}
            onChange={(v) => update("hero", { cta_label: v })}
          />
          <Field
            label="Redirect URL"
            value={cfg.hero.cta_url}
            onChange={(v) => update("hero", { cta_url: v })}
            placeholder="/buddhist-psychology or https://…"
          />
        </FieldRow>
      </Section>
    </>
  );
}
