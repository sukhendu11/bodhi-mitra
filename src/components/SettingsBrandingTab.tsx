import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, FileUploadField, Section } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
}

export function BrandingTab({ cfg, update, uploadAsset }: TabProps): ReactNode {
  return (
    <>
      <Section title="Logo & Favicon" desc="Uploaded to Supabase Storage, served publicly.">
        <FieldRow>
          <FileUploadField
            label="Website Logo"
            value={cfg.branding.logo_url}
            onUpload={async (f) => { const url = await uploadAsset(f, "logo"); if (url) update("branding", { logo_url: url }); }}
            onClear={() => update("branding", { logo_url: "" })}
            onUrl={(url) => update("branding", { logo_url: url })}
            previewClass="h-12"
          />
          <FileUploadField
            label="Favicon (32×32 .ico/.png)"
            value={cfg.branding.favicon_url}
            onUpload={async (f) => { const url = await uploadAsset(f, "favicon"); if (url) update("branding", { favicon_url: url }); }}
            onClear={() => update("branding", { favicon_url: "" })}
            onUrl={(url) => update("branding", { favicon_url: url })}
            previewClass="h-8 w-8"
          />
        </FieldRow>
      </Section>
      <Section title="Brand Name">
        <FieldRow>
          <Field label="Site Name (English)" value={cfg.branding.site_name_en}
            onChange={(v) => update("branding", { site_name_en: v })} />
          <Field label="Site Name (বাংলা)" value={cfg.branding.site_name_bn}
            onChange={(v) => update("branding", { site_name_bn: v })} />
        </FieldRow>
      </Section>
    </>
  );
}
