import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section, TextareaField } from "@/components/SettingsFields";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function SocialTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Social Media Links">
        <FieldRow>
          <Field
            label="Facebook URL"
            value={cfg.social.facebook}
            onChange={(v) => update("social", { facebook: v })}
          />
          <Field
            label="Twitter / X URL"
            value={cfg.social.twitter}
            onChange={(v) => update("social", { twitter: v })}
          />
        </FieldRow>
        <FieldRow>
          <Field
            label="Instagram URL"
            value={cfg.social.instagram}
            onChange={(v) => update("social", { instagram: v })}
          />
          <Field
            label="LinkedIn URL"
            value={cfg.social.linkedin}
            onChange={(v) => update("social", { linkedin: v })}
          />
        </FieldRow>
        <Field
          label="YouTube URL"
          value={cfg.social.youtube}
          onChange={(v) => update("social", { youtube: v })}
        />
      </Section>
    </>
  );
}
