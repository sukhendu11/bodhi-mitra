import type { SiteConfig } from "@/lib/siteSettings";
import { Field, Section } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function FooterTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Copyright" desc="Used in the site footer.">
        <Field label="Copyright (English)" value={cfg.footer.copyright_en}
          onChange={(v) => update("footer", { copyright_en: v })}
          placeholder="© {year} Bodhi Mitra. All rights reserved." />
        <Field label="Copyright (Bangla)" value={cfg.footer.copyright_bn}
          onChange={(v) => update("footer", { copyright_bn: v })}
          placeholder="© {year} বোধি মিত্র। সর্বস্বত্ব সংরক্ষিত।" />
      </Section>
      <Section title="Tagline" desc="Short description shown below the copyright.">
        <Field label="Tagline (English)" value={cfg.footer.text_en}
          onChange={(v) => update("footer", { text_en: v })}
          placeholder="Where ancient wisdom meets modern psychology." />
        <Field label="Tagline (Bangla)" value={cfg.footer.text_bn}
          onChange={(v) => update("footer", { text_bn: v })}
          placeholder="যেখানে প্রাচীন প্রজ্ঞা আধুনিক মনোবিজ্ঞানের সাথে মিলে।" />
      </Section>
    </>
  );
}