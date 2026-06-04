import type { DynamicPage, SiteConfig } from "@/lib/siteSettings";
import { DEFAULT_PAGES } from "@/lib/siteSettings";
import { Field, FieldRow, FileUploadField, Section, TextareaField } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  updatePage: (slug: string, patch: Partial<DynamicPage>) => void;
  addPage: () => void;
  removePage: (slug: string) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
  setCfg: React.Dispatch<React.SetStateAction<SiteConfig>>;
}

export function PagesTab({ cfg, updatePage, addPage, removePage, uploadAsset, setCfg }: TabProps): ReactNode {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Customize headers, descriptions, and banners for each dynamic page. Toggle visibility to hide from the site.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCfg((c) => ({ ...c, pages: DEFAULT_PAGES }))}>
            Reset to defaults
          </Button>
          <Button size="sm" onClick={addPage}>+ Add page</Button>
        </div>
      </div>

      {cfg.pages.map((p) => (
        <Section key={p.slug} title={`/${p.slug}`} desc="Slug is the URL path. Toggle visibility to hide.">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <Switch checked={p.visible} onCheckedChange={(v) => updatePage(p.slug, { visible: v })} />
              <Label>{p.visible ? "Visible" : "Hidden"}</Label>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removePage(p.slug)}>Remove</Button>
          </div>
          <FieldRow>
            <Field label="Eyebrow / Short Title (English)" value={p.title_en} onChange={(v) => updatePage(p.slug, { title_en: v })} />
            <Field label="Eyebrow / Short Title (বাংলা)" value={p.title_bn} onChange={(v) => updatePage(p.slug, { title_bn: v })} />
          </FieldRow>
          <FieldRow>
            <Field label="Header (English)" value={p.header_en} onChange={(v) => updatePage(p.slug, { header_en: v })} />
            <Field label="Header (বাংলা)" value={p.header_bn} onChange={(v) => updatePage(p.slug, { header_bn: v })} />
          </FieldRow>
          <FieldRow>
            <TextareaField label="Body (English)" value={p.body_en} onChange={(v) => updatePage(p.slug, { body_en: v })} />
            <TextareaField label="Body (বাংলা)" value={p.body_bn} onChange={(v) => updatePage(p.slug, { body_bn: v })} />
          </FieldRow>
          <FileUploadField
            label="Banner Image"
            value={p.banner_url}
            onUpload={async (f) => { const url = await uploadAsset(f, `page-${p.slug}`); if (url) updatePage(p.slug, { banner_url: url }); }}
            onClear={() => updatePage(p.slug, { banner_url: "" })}
            onUrl={(url) => updatePage(p.slug, { banner_url: url })}
            previewClass="h-20 w-40"
          />
        </Section>
      ))}
    </>
  );
}
