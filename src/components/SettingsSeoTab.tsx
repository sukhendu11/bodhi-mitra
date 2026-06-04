import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, FileUploadField, Section, TextareaField } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
}

export function SeoTab({ cfg, update, uploadAsset }: TabProps): ReactNode {
  return (
    <>
      <Section title="Open Graph Image" desc="The image shown when the site is shared on social media (Facebook, Twitter, etc.). Upload or paste a URL below.">
        <FileUploadField
          label="OG Image"
          value={cfg.seo.og_image_url}
          onUpload={async (f) => { const url = await uploadAsset(f, "og-image"); if (url) update("seo", { og_image_url: url }); }}
          onClear={() => update("seo", { og_image_url: "" })}
          onUrl={(url) => update("seo", { og_image_url: url })}
          previewClass="h-24 w-48"
        />
      </Section>
      <Section title="Meta Description" desc="Shown by Google and social previews.">
        <FieldRow>
          <TextareaField label="Meta Description (English)" value={cfg.seo.meta_desc_en}
            onChange={(v) => update("seo", { meta_desc_en: v })} />
          <TextareaField label="Meta Description (বাংলা)" value={cfg.seo.meta_desc_bn}
            onChange={(v) => update("seo", { meta_desc_bn: v })} />
        </FieldRow>
      </Section>
      <Section title="Google Analytics" desc="Paste your Measurement ID (e.g. G-XXXXXXX). Leave blank to disable.">
        <Field label="Tracking ID" value={cfg.seo.google_analytics_id}
          onChange={(v) => update("seo", { google_analytics_id: v })}
          placeholder="G-XXXXXXXXXX" />
      </Section>
    </>
  );
}
