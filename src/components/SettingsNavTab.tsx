import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section, TextareaField } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

const navFields = [
  { key: "home", label: "HOME" },
  { key: "philosophy", label: "PHILOSOPHY (dropdown)" },
  { key: "buddhism", label: "  ↳ BUDDHISM" },
  { key: "mind", label: "  ↳ MIND" },
  { key: "practice", label: "PRACTICE (dropdown)" },
  { key: "wellness", label: "  ↳ WELLNESS" },
  { key: "today", label: "  ↳ TODAY" },
  { key: "books", label: "BOOKS" },
  { key: "about", label: "ABOUT" },
  { key: "contact", label: "CONTACT" },
] as const;

export function NavTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Navigation Link Labels">
        <p className="text-xs text-muted-foreground mb-4 -mt-2">
          Customize every label in the header navigation. Dropdown parents (Philosophy, Practice)
          are the clickable trigger labels; indented items appear inside the dropdown.
        </p>
        {navFields.map(({ key, label }) => (
          <FieldRow key={key}>
            <Field label={`${label} — English`}
              value={(cfg.nav as Record<string, string>)[`${key}_en`]}
              onChange={(v) => update("nav", { [`${key}_en`]: v } as Partial<SiteConfig["nav"]>)} />
            <Field label={`${label} — বাংলা`}
              value={(cfg.nav as Record<string, string>)[`${key}_bn`]}
              onChange={(v) => update("nav", { [`${key}_bn`]: v } as Partial<SiteConfig["nav"]>)} />
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
