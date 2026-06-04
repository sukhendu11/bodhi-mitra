import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section, TextareaField } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function NavTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Navigation Link Labels">
        {(["home", "bp", "wisdom", "books", "about", "contact"] as const).map((k) => (
          <FieldRow key={k}>
            <Field label={`${k.toUpperCase()} — English`}
              value={(cfg.nav as Record<string, string>)[`${k}_en`]}
              onChange={(v) => update("nav", { [`${k}_en`]: v } as Partial<SiteConfig["nav"]>)} />
            <Field label={`${k.toUpperCase()} — বাংলা`}
              value={(cfg.nav as Record<string, string>)[`${k}_bn`]}
              onChange={(v) => update("nav", { [`${k}_bn`]: v } as Partial<SiteConfig["nav"]>)} />
          </FieldRow>
        ))}
      </Section>
      <Section title="Footer Text" desc="Use {year} to insert the current year automatically.">
        <FieldRow>
          <Field label="Copyright (English)" value={cfg.footer.copyright_en}
            onChange={(v) => update("footer", { copyright_en: v })} />
          <Field label="Copyright (বাংলা)" value={cfg.footer.copyright_bn}
            onChange={(v) => update("footer", { copyright_bn: v })} />
        </FieldRow>
        <FieldRow>
          <TextareaField label="Footer description (English)" value={cfg.footer.text_en}
            onChange={(v) => update("footer", { text_en: v })} />
          <TextareaField label="Footer description (বাংলা)" value={cfg.footer.text_bn}
            onChange={(v) => update("footer", { text_bn: v })} />
        </FieldRow>
      </Section>
    </>
  );
}
