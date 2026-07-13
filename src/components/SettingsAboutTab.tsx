import type { SiteConfig } from "@/lib/siteSettings";
import {
  Field,
  FieldRow,
  FileUploadField,
  RichTextField,
  Section,
  TextareaField,
} from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
  uploadAsset: (file: File, kind: string) => Promise<string | null>;
}

export function AboutTab({ cfg, update, uploadAsset }: TabProps): ReactNode {
  return (
    <>
      <Section title="About Page — Hero">
        <FieldRow>
          <Field
            label="Eyebrow (English)"
            value={cfg.about.eyebrow_en}
            onChange={(v) => update("about", { eyebrow_en: v })}
          />
          <Field
            label="Eyebrow (বাংলা)"
            value={cfg.about.eyebrow_bn}
            onChange={(v) => update("about", { eyebrow_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <TextareaField
            label="Title (English)"
            value={cfg.about.title_en}
            onChange={(v) => update("about", { title_en: v })}
          />
          <TextareaField
            label="Title (বাংলা)"
            value={cfg.about.title_bn}
            onChange={(v) => update("about", { title_bn: v })}
          />
        </FieldRow>
        <FileUploadField
          label="Hero Image"
          value={cfg.about.image_url}
          onUpload={async (f) => {
            const url = await uploadAsset(f, "about");
            if (url) update("about", { image_url: url });
          }}
          onClear={() => update("about", { image_url: "" })}
          onUrl={(url) => update("about", { image_url: url })}
          previewClass="h-24 w-40"
        />
        <FieldRow>
          <Field
            label="Image Alt Text (English)"
            value={cfg.about.image_alt_en}
            onChange={(v) => update("about", { image_alt_en: v })}
          />
          <Field
            label="Image Alt Text (বাংলা)"
            value={cfg.about.image_alt_bn}
            onChange={(v) => update("about", { image_alt_bn: v })}
          />
        </FieldRow>
      </Section>
      <Section title="Main Body" desc="Use blank lines to separate paragraphs.">
        <RichTextField
          label="Body (English)"
          value={cfg.about.body_en}
          onChange={(v) => update("about", { body_en: v })}
        />
        <RichTextField
          label="Body (বাংলা)"
          value={cfg.about.body_bn}
          onChange={(v) => update("about", { body_bn: v })}
        />
      </Section>
      <Section title="Mission Statement (optional)">
        <FieldRow>
          <TextareaField
            label="Mission (English)"
            value={cfg.about.mission_en}
            onChange={(v) => update("about", { mission_en: v })}
          />
          <TextareaField
            label="Mission (বাংলা)"
            value={cfg.about.mission_bn}
            onChange={(v) => update("about", { mission_bn: v })}
          />
        </FieldRow>
      </Section>
      <Section title="Editorial Note">
        <FieldRow>
          <Field
            label="Note Title (English)"
            value={cfg.about.note_title_en}
            onChange={(v) => update("about", { note_title_en: v })}
          />
          <Field
            label="Note Title (বাংলা)"
            value={cfg.about.note_title_bn}
            onChange={(v) => update("about", { note_title_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <TextareaField
            label="Note Text (English)"
            value={cfg.about.note_text_en}
            onChange={(v) => update("about", { note_text_en: v })}
          />
          <TextareaField
            label="Note Text (বাংলা)"
            value={cfg.about.note_text_bn}
            onChange={(v) => update("about", { note_text_bn: v })}
          />
        </FieldRow>
      </Section>
    </>
  );
}
