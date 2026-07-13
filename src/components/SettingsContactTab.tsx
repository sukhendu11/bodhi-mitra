import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section, TextareaField } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function ContactTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Contact Page Header">
        <FieldRow>
          <Field
            label="Title (English)"
            value={cfg.contact.title_en}
            onChange={(v) => update("contact", { title_en: v })}
          />
          <Field
            label="Title (বাংলা)"
            value={cfg.contact.title_bn}
            onChange={(v) => update("contact", { title_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <TextareaField
            label="Intro (English)"
            value={cfg.contact.intro_en}
            onChange={(v) => update("contact", { intro_en: v })}
          />
          <TextareaField
            label="Intro (বাংলা)"
            value={cfg.contact.intro_bn}
            onChange={(v) => update("contact", { intro_bn: v })}
          />
        </FieldRow>
      </Section>
      <Section title="Form Labels">
        <FieldRow>
          <Field
            label="Name Label (English)"
            value={cfg.contact.form_name_label_en}
            onChange={(v) => update("contact", { form_name_label_en: v })}
          />
          <Field
            label="Name Label (বাংলা)"
            value={cfg.contact.form_name_label_bn}
            onChange={(v) => update("contact", { form_name_label_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Email Label (English)"
            value={cfg.contact.form_email_label_en}
            onChange={(v) => update("contact", { form_email_label_en: v })}
          />
          <Field
            label="Email Label (বাংলা)"
            value={cfg.contact.form_email_label_bn}
            onChange={(v) => update("contact", { form_email_label_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Message Label (English)"
            value={cfg.contact.form_message_label_en}
            onChange={(v) => update("contact", { form_message_label_en: v })}
          />
          <Field
            label="Message Label (বাংলা)"
            value={cfg.contact.form_message_label_bn}
            onChange={(v) => update("contact", { form_message_label_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Submit Button (English)"
            value={cfg.contact.submit_label_en}
            onChange={(v) => update("contact", { submit_label_en: v })}
          />
          <Field
            label="Submit Button (বাংলা)"
            value={cfg.contact.submit_label_bn}
            onChange={(v) => update("contact", { submit_label_bn: v })}
          />
        </FieldRow>
        <FieldRow>
          <TextareaField
            label="Success Text (English)"
            value={cfg.contact.success_text_en}
            onChange={(v) => update("contact", { success_text_en: v })}
          />
          <TextareaField
            label="Success Text (বাংলা)"
            value={cfg.contact.success_text_bn}
            onChange={(v) => update("contact", { success_text_bn: v })}
          />
        </FieldRow>
      </Section>
      <Section title="Contact Details">
        <FieldRow>
          <Field
            label="Email"
            value={cfg.contact.email}
            onChange={(v) => update("contact", { email: v })}
            placeholder="hello@example.com"
          />
          <Field
            label="Phone"
            value={cfg.contact.phone}
            onChange={(v) => update("contact", { phone: v })}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Location / Short address line"
            value={cfg.contact.location}
            onChange={(v) => update("contact", { location: v })}
            placeholder="e.g. Dhaka, Bangladesh"
          />
          <TextareaField
            label="Address (English)"
            value={cfg.contact.address_en}
            onChange={(v) => update("contact", { address_en: v })}
          />
        </FieldRow>
        <FieldRow>
          <TextareaField
            label="Address (বাংলা)"
            value={cfg.contact.address_bn}
            onChange={(v) => update("contact", { address_bn: v })}
          />
        </FieldRow>
        <TextareaField
          label="Map Embed URL"
          value={cfg.contact.map_embed_url}
          onChange={(v) => update("contact", { map_embed_url: v })}
          hint="Paste the Google Maps embed src URL (https://www.google.com/maps/embed?…)."
        />
      </Section>
    </>
  );
}
