import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section, TextareaField } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

export function ArticleTab({ cfg, update }: TabProps): ReactNode {
  return (
    <>
      <Section title="Article Page Toggles" desc="Control what appears around each blog post.">
        <div className="flex items-center gap-3">
          <Switch checked={cfg.article.show_author_bio} onCheckedChange={(v) => update("article", { show_author_bio: v })} />
          <Label>Show author avatar &amp; byline</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={cfg.article.show_related_posts} onCheckedChange={(v) => update("article", { show_related_posts: v })} />
          <Label>Show related posts at the bottom</Label>
        </div>
      </Section>
      <Section title="Sidebar Widget" desc="Optional aside shown after the article body.">
        <FieldRow>
          <Field label="Sidebar Title (English)" value={cfg.article.sidebar_title_en}
            onChange={(v) => update("article", { sidebar_title_en: v })} />
          <Field label="Sidebar Title (বাংলা)" value={cfg.article.sidebar_title_bn}
            onChange={(v) => update("article", { sidebar_title_bn: v })} />
        </FieldRow>
        <FieldRow>
          <TextareaField label="Sidebar Text (English)" value={cfg.article.sidebar_text_en}
            onChange={(v) => update("article", { sidebar_text_en: v })} />
          <TextareaField label="Sidebar Text (বাংলা)" value={cfg.article.sidebar_text_bn}
            onChange={(v) => update("article", { sidebar_text_bn: v })} />
        </FieldRow>
      </Section>
      <Section title="Newsletter Block">
        <FieldRow>
          <Field label="Newsletter Title (English)" value={cfg.article.newsletter_title_en}
            onChange={(v) => update("article", { newsletter_title_en: v })} />
          <Field label="Newsletter Title (বাংলা)" value={cfg.article.newsletter_title_bn}
            onChange={(v) => update("article", { newsletter_title_bn: v })} />
        </FieldRow>
        <FieldRow>
          <TextareaField label="Newsletter Text (English)" value={cfg.article.newsletter_text_en}
            onChange={(v) => update("article", { newsletter_text_en: v })} />
          <TextareaField label="Newsletter Text (বাংলা)" value={cfg.article.newsletter_text_bn}
            onChange={(v) => update("article", { newsletter_text_bn: v })} />
        </FieldRow>
      </Section>
    </>
  );
}
