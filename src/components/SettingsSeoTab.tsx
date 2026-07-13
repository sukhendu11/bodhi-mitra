import type { SiteConfig } from "@/lib/siteSettings";
import {
  Field,
  FieldRow,
  FileUploadField,
  Section,
  TextareaField,
} from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
}

export function SeoTab({ cfg, update, uploadAsset }: TabProps): ReactNode {
  return (
    <>
      <Section
        title="Open Graph Image"
        desc="The image shown when the site is shared on social media (Facebook, Twitter, etc.). Upload or paste a URL below."
      >
        <FileUploadField
          label="OG Image"
          value={cfg.seo.og_image_url}
          onUpload={async (f) => {
            const url = await uploadAsset(f, "og-image");
            if (url) update("seo", { og_image_url: url });
          }}
          onClear={() => update("seo", { og_image_url: "" })}
          onUrl={(url) => update("seo", { og_image_url: url })}
          previewClass="h-24 w-48"
        />
      </Section>
      <Section title="Meta Description" desc="Shown by Google and social previews.">
        <FieldRow>
          <TextareaField
            label="Meta Description (English)"
            value={cfg.seo.meta_desc_en}
            onChange={(v) => update("seo", { meta_desc_en: v })}
          />
          <TextareaField
            label="Meta Description (বাংলা)"
            value={cfg.seo.meta_desc_bn}
            onChange={(v) => update("seo", { meta_desc_bn: v })}
          />
        </FieldRow>
      </Section>
      <Section
        title="Google Analytics"
        desc="Paste your Measurement ID (e.g. G-XXXXXXX). Leave blank to disable."
      >
        <Field
          label="Tracking ID"
          value={cfg.seo.google_analytics_id}
          onChange={(v) => update("seo", { google_analytics_id: v })}
          placeholder="G-XXXXXXXXXX"
        />
      </Section>
      <Section
        title="Sitemap"
        desc="Generate a dynamic sitemap.xml for search engines. Disable if you prefer to supply your own."
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={cfg.seo.enable_sitemap}
            onClick={() => update("seo", { enable_sitemap: !cfg.seo.enable_sitemap })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              cfg.seo.enable_sitemap ? "bg-foreground" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                cfg.seo.enable_sitemap ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {cfg.seo.enable_sitemap ? "Sitemap enabled" : "Sitemap disabled"}
          </span>
        </div>
        {cfg.seo.enable_sitemap && (
          <p className="mt-2 text-[0.6rem] text-muted-foreground/60">
            Your sitemap is available at <code className="text-foreground/70">/sitemap.xml</code>{" "}
            and robots.txt at <code className="text-foreground/70">/robots.txt</code>.
          </p>
        )}
      </Section>
    </>
  );
}
