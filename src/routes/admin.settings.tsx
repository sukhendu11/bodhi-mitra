import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEFAULT_CONFIG,
  DEFAULT_PAGES,
  fetchSiteSettings,
  saveSiteSettings,
  type DynamicPage,
  type SiteConfig,
  useSiteSettingsQuery,
} from "@/lib/siteSettings";
import { createSiteAssetUpload } from "@/lib/siteAssets.functions";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/admin/settings")({
  loader: () => fetchSiteSettings(),
  component: SettingsPage,
});

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-md p-6 bg-card space-y-5">
      <header>
        <h3 className="font-serif text-xl">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </header>
      {children}
    </section>
  );
}

function SettingsPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const createAssetUpload = useServerFn(createSiteAssetUpload);
  // Intentionally do NOT subscribe to useSiteSettingsQuery here — its background
  // refetches would overwrite in-progress edits. We seed once from the loader
  // and only refresh local state after a successful save.
  const [cfg, setCfg] = useState<SiteConfig>(initial ?? DEFAULT_CONFIG);

  const save = useMutation({
    mutationFn: (next: SiteConfig) => saveSiteSettings(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings saved — UI updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) =>
    setCfg((c) => ({ ...c, [group]: { ...c[group], ...patch } as SiteConfig[K] }));

  const updatePage = (slug: string, patch: Partial<DynamicPage>) =>
    setCfg((c) => ({
      ...c,
      pages: c.pages.map((p) => (p.slug === slug ? { ...p, ...patch } : p)),
    }));

  const addPage = () => {
    const slug = prompt("URL slug for new page (lowercase, no spaces):")?.trim();
    if (!slug) return;
    if (cfg.pages.some((p) => p.slug === slug)) {
      toast.error("A page with that slug already exists.");
      return;
    }
    setCfg((c) => ({
      ...c,
      pages: [
        ...c.pages,
        {
          slug,
          title_en: slug, title_bn: slug,
          header_en: slug, header_bn: slug,
          body_en: "", body_bn: "",
          banner_url: "", visible: true,
        },
      ],
    }));
  };

  const removePage = (slug: string) => {
    if (!confirm(`Remove page "${slug}"?`)) return;
    setCfg((c) => ({ ...c, pages: c.pages.filter((p) => p.slug !== slug) }));
  };

  async function uploadAsset(file: File, kind: string): Promise<string | null> {
    const signed = await createAssetUpload({ data: { kind, filename: file.name, contentType: file.type || "image/png" } });
    const { error } = await supabase.storage
      .from("site-assets")
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || "image/png" });
    if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
    return signed.publicUrl;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl">Site Customizer</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Full control over every page — branding, content, layout, and language variants.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCfg(initial ?? DEFAULT_CONFIG)} disabled={save.isPending}>
            Reset
          </Button>
          <Button onClick={() => save.mutate(cfg)} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="article">Article Page</TabsTrigger>
          <TabsTrigger value="about">About Page</TabsTrigger>
          <TabsTrigger value="contact">Contact Page</TabsTrigger>
          <TabsTrigger value="pages">Dynamic Pages</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="nav">Nav & Footer</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* BRANDING */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          <Section title="Logo & Favicon" desc="Uploaded to Supabase Storage, served publicly.">
            <FieldRow>
              <FileUploadField
                label="Website Logo"
                value={cfg.branding.logo_url}
                onUpload={async (f) => {
                  const url = await uploadAsset(f, "logo");
                  if (url) update("branding", { logo_url: url });
                }}
                onClear={() => update("branding", { logo_url: "" })}
                onUrl={(url) => update("branding", { logo_url: url })}
                previewClass="h-12"
              />
              <FileUploadField
                label="Favicon (32×32 .ico/.png)"
                value={cfg.branding.favicon_url}
                onUpload={async (f) => {
                  const url = await uploadAsset(f, "favicon");
                  if (url) update("branding", { favicon_url: url });
                }}
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
        </TabsContent>

        {/* HOMEPAGE */}
        <TabsContent value="home" className="mt-6 space-y-6">
          <Section title="Hero Visibility">
            <div className="flex items-center gap-3">
              <Switch checked={cfg.hero.visible} onCheckedChange={(v) => update("hero", { visible: v })} />
              <Label>Show hero section on homepage</Label>
            </div>
          </Section>
          <Section title="Hero Content (English)">
            <Field label="Eyebrow / kicker" value={cfg.hero.eyebrow_en} onChange={(v) => update("hero", { eyebrow_en: v })} />
            <TextareaField label="Main Heading" value={cfg.hero.title_en} onChange={(v) => update("hero", { title_en: v })}
              hint="Use a line break to split across two lines." />
            <TextareaField label="Subheading / Description" value={cfg.hero.desc_en} onChange={(v) => update("hero", { desc_en: v })} />
          </Section>
          <Section title="Hero Content (বাংলা)">
            <Field label="Eyebrow / kicker" value={cfg.hero.eyebrow_bn} onChange={(v) => update("hero", { eyebrow_bn: v })} />
            <TextareaField label="Main Heading" value={cfg.hero.title_bn} onChange={(v) => update("hero", { title_bn: v })} />
            <TextareaField label="Subheading / Description" value={cfg.hero.desc_bn} onChange={(v) => update("hero", { desc_bn: v })} />
          </Section>
          <Section title="Hero Image" desc="Upload a background image for the hero section. Recommended ~2000×1200px.">
            <FileUploadField
              label="Hero Image"
              value={cfg.hero.image_url}
              onUpload={async (f) => {
                const url = await uploadAsset(f, "hero");
                if (url) update("hero", { image_url: url });
              }}
              onClear={() => update("hero", { image_url: "" })}
              onUrl={(url) => update("hero", { image_url: url })}
              previewClass="h-24 w-48"
            />
          </Section>
          <Section title="Call-to-Action Button">
            <FieldRow>
              <Field label="Button label" value={cfg.hero.cta_label} onChange={(v) => update("hero", { cta_label: v })} />
              <Field label="Redirect URL" value={cfg.hero.cta_url} onChange={(v) => update("hero", { cta_url: v })}
                placeholder="/buddhist-psychology or https://…" />
            </FieldRow>
          </Section>
        </TabsContent>

        {/* ARTICLE PAGE */}
        <TabsContent value="article" className="mt-6 space-y-6">
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
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <Section title="About Page — Hero">
            <FieldRow>
              <Field label="Eyebrow (English)" value={cfg.about.eyebrow_en} onChange={(v) => update("about", { eyebrow_en: v })} />
              <Field label="Eyebrow (বাংলা)" value={cfg.about.eyebrow_bn} onChange={(v) => update("about", { eyebrow_bn: v })} />
            </FieldRow>
            <FieldRow>
              <TextareaField label="Title (English)" value={cfg.about.title_en} onChange={(v) => update("about", { title_en: v })} />
              <TextareaField label="Title (বাংলা)" value={cfg.about.title_bn} onChange={(v) => update("about", { title_bn: v })} />
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
              <Field label="Image Alt Text (English)" value={cfg.about.image_alt_en} onChange={(v) => update("about", { image_alt_en: v })} />
              <Field label="Image Alt Text (বাংলা)" value={cfg.about.image_alt_bn} onChange={(v) => update("about", { image_alt_bn: v })} />
            </FieldRow>
          </Section>
          <Section title="Main Body" desc="Use blank lines to separate paragraphs.">
            <RichTextField label="Body (English)" value={cfg.about.body_en} onChange={(v) => update("about", { body_en: v })} />
            <RichTextField label="Body (বাংলা)" value={cfg.about.body_bn} onChange={(v) => update("about", { body_bn: v })} />
          </Section>
          <Section title="Mission Statement (optional)">
            <FieldRow>
              <TextareaField label="Mission (English)" value={cfg.about.mission_en} onChange={(v) => update("about", { mission_en: v })} />
              <TextareaField label="Mission (বাংলা)" value={cfg.about.mission_bn} onChange={(v) => update("about", { mission_bn: v })} />
            </FieldRow>
          </Section>
          <Section title="Editorial Note">
            <FieldRow>
              <Field label="Note Title (English)" value={cfg.about.note_title_en} onChange={(v) => update("about", { note_title_en: v })} />
              <Field label="Note Title (বাংলা)" value={cfg.about.note_title_bn} onChange={(v) => update("about", { note_title_bn: v })} />
            </FieldRow>
            <FieldRow>
              <TextareaField label="Note Text (English)" value={cfg.about.note_text_en} onChange={(v) => update("about", { note_text_en: v })} />
              <TextareaField label="Note Text (বাংলা)" value={cfg.about.note_text_bn} onChange={(v) => update("about", { note_text_bn: v })} />
            </FieldRow>
          </Section>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact" className="mt-6 space-y-6">
          <Section title="Contact Page Header">
            <FieldRow>
              <Field label="Title (English)" value={cfg.contact.title_en} onChange={(v) => update("contact", { title_en: v })} />
              <Field label="Title (বাংলা)" value={cfg.contact.title_bn} onChange={(v) => update("contact", { title_bn: v })} />
            </FieldRow>
            <FieldRow>
              <TextareaField label="Intro (English)" value={cfg.contact.intro_en} onChange={(v) => update("contact", { intro_en: v })} />
              <TextareaField label="Intro (বাংলা)" value={cfg.contact.intro_bn} onChange={(v) => update("contact", { intro_bn: v })} />
            </FieldRow>
          </Section>
          <Section title="Form Labels">
            <FieldRow>
              <Field label="Name Label (English)" value={cfg.contact.form_name_label_en} onChange={(v) => update("contact", { form_name_label_en: v })} />
              <Field label="Name Label (বাংলা)" value={cfg.contact.form_name_label_bn} onChange={(v) => update("contact", { form_name_label_bn: v })} />
            </FieldRow>
            <FieldRow>
              <Field label="Email Label (English)" value={cfg.contact.form_email_label_en} onChange={(v) => update("contact", { form_email_label_en: v })} />
              <Field label="Email Label (বাংলা)" value={cfg.contact.form_email_label_bn} onChange={(v) => update("contact", { form_email_label_bn: v })} />
            </FieldRow>
            <FieldRow>
              <Field label="Message Label (English)" value={cfg.contact.form_message_label_en} onChange={(v) => update("contact", { form_message_label_en: v })} />
              <Field label="Message Label (বাংলা)" value={cfg.contact.form_message_label_bn} onChange={(v) => update("contact", { form_message_label_bn: v })} />
            </FieldRow>
            <FieldRow>
              <Field label="Submit Button (English)" value={cfg.contact.submit_label_en} onChange={(v) => update("contact", { submit_label_en: v })} />
              <Field label="Submit Button (বাংলা)" value={cfg.contact.submit_label_bn} onChange={(v) => update("contact", { submit_label_bn: v })} />
            </FieldRow>
            <FieldRow>
              <TextareaField label="Success Text (English)" value={cfg.contact.success_text_en} onChange={(v) => update("contact", { success_text_en: v })} />
              <TextareaField label="Success Text (বাংলা)" value={cfg.contact.success_text_bn} onChange={(v) => update("contact", { success_text_bn: v })} />
            </FieldRow>
          </Section>
          <Section title="Contact Details">
            <FieldRow>
              <Field label="Email" value={cfg.contact.email} onChange={(v) => update("contact", { email: v })} placeholder="hello@example.com" />
              <Field label="Phone" value={cfg.contact.phone} onChange={(v) => update("contact", { phone: v })} />
            </FieldRow>
            <FieldRow>
              <TextareaField label="Address (English)" value={cfg.contact.address_en} onChange={(v) => update("contact", { address_en: v })} />
              <TextareaField label="Address (বাংলা)" value={cfg.contact.address_bn} onChange={(v) => update("contact", { address_bn: v })} />
            </FieldRow>
            <TextareaField label="Map Embed URL" value={cfg.contact.map_embed_url} onChange={(v) => update("contact", { map_embed_url: v })}
              hint="Paste the Google Maps embed src URL (https://www.google.com/maps/embed?…)." />
          </Section>
        </TabsContent>

        {/* DYNAMIC PAGES */}
        <TabsContent value="pages" className="mt-6 space-y-6">
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
                onUpload={async (f) => {
                  const url = await uploadAsset(f, `page-${p.slug}`);
                  if (url) updatePage(p.slug, { banner_url: url });
                }}
                onClear={() => updatePage(p.slug, { banner_url: "" })}
                onUrl={(url) => updatePage(p.slug, { banner_url: url })}
                previewClass="h-20 w-40"
              />
            </Section>
          ))}
        </TabsContent>

        {/* THEME */}
        <TabsContent value="theme" className="mt-6 space-y-6">
          <Section title="Accent Color" desc="Used for Sign In button and accent highlights site-wide.">
            <FieldRow>
              <ColorField label="Primary Accent" value={cfg.theme.accent_color}
                onChange={(v) => update("theme", { accent_color: v })} />
              <ColorField label="Accent Hover" value={cfg.theme.accent_hover}
                onChange={(v) => update("theme", { accent_hover: v })} />
            </FieldRow>
          </Section>
          <Section title="Background Mode">
            <div className="flex items-center gap-3">
              <Switch checked={cfg.theme.mode === "dark"}
                onCheckedChange={(v) => update("theme", { mode: v ? "dark" : "light" })} />
              <Label>{cfg.theme.mode === "dark" ? "Dark mode (default)" : "Light mode (default)"}</Label>
            </div>
          </Section>
          <Section title="Logo Scaling">
            <div className="space-y-3">
              <Label>Logo max-width: <span className="font-mono">{cfg.branding.logo_max_width}px</span></Label>
              <Slider min={60} max={320} step={4} value={[cfg.branding.logo_max_width]}
                onValueChange={([v]) => update("branding", { logo_max_width: v })} />
            </div>
          </Section>
        </TabsContent>

        {/* NAV & FOOTER */}
        <TabsContent value="nav" className="mt-6 space-y-6">
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
        </TabsContent>

        {/* SOCIAL */}
        <TabsContent value="social" className="mt-6 space-y-6">
          <Section title="Social Media Links">
            <FieldRow>
              <Field label="Facebook URL" value={cfg.social.facebook}
                onChange={(v) => update("social", { facebook: v })} />
              <Field label="Twitter / X URL" value={cfg.social.twitter}
                onChange={(v) => update("social", { twitter: v })} />
            </FieldRow>
            <FieldRow>
              <Field label="Instagram URL" value={cfg.social.instagram}
                onChange={(v) => update("social", { instagram: v })} />
              <Field label="LinkedIn URL" value={cfg.social.linkedin}
                onChange={(v) => update("social", { linkedin: v })} />
            </FieldRow>
            <Field label="YouTube URL" value={cfg.social.youtube}
              onChange={(v) => update("social", { youtube: v })} />
          </Section>
          <Section title="Footer Contact (legacy)">
            <TextareaField label="Quick footer location line" value={cfg.contact.location}
              onChange={(v) => update("contact", { location: v })}
              hint="Short single-line location shown in the footer. For full address, use the Contact Page tab." />
          </Section>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-6 space-y-6">
          <Section title="Open Graph Image" desc="The image shown when the site is shared on social media (Facebook, Twitter, etc.). Upload or paste a URL below.">
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
              <TextareaField label="Meta Description (English)" value={cfg.seo.meta_desc_en}
                onChange={(v) => update("seo", { meta_desc_en: v })} />
              <TextareaField label="Meta Description (বাংলা)" value={cfg.seo.meta_desc_bn}
                onChange={(v) => update("seo", { meta_desc_bn: v })} />
            </FieldRow>
          </Section>
          <Section title="Google Analytics" desc="Paste your Measurement ID (e.g. G-XXXXXXX). Leave blank to disable.">
            <Field label="Tracking ID" value={cfg.seo.google_analytics_id}
              onChange={(v) => update("seo", { google_analytics_id: v })}
              placeholder="G-XXXXXXXXXX" />
          </Section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => setCfg(initial ?? DEFAULT_CONFIG)} disabled={save.isPending}>
          Reset
        </Button>
        <Button onClick={() => save.mutate(cfg)} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextareaField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RichTextField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={10} className="font-serif" />
      <p className="text-[11px] text-muted-foreground">Use blank lines to separate paragraphs.</p>
    </div>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-border bg-transparent cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
      </div>
    </div>
  );
}

function FileUploadField({ label, value, onUpload, onClear, onUrl, previewClass }: {
  label: string;
  value: string;
  onUpload: (f: File) => Promise<void>;
  onClear: () => void;
  onUrl?: (url: string) => void;
  previewClass: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-4 border border-dashed border-border rounded-md p-3">
        {value ? (
          <img src={value} alt="" className={`${previewClass} object-contain bg-muted/40 rounded`} />
        ) : (
          <div className={`${previewClass} grid place-items-center bg-muted/40 rounded text-xs text-muted-foreground px-2`}>
            none
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              setBusy(true); await onUpload(f); setBusy(false);
              if (ref.current) ref.current.value = "";
            }} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
              {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>Remove</Button>
            )}
          </div>
          {onUrl && (
            <div className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="…or paste image URL (https://…)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 border border-border rounded bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!urlInput.trim()}
                onClick={() => {
                  const u = urlInput.trim();
                  if (!u) return;
                  onUrl(u);
                  setUrlInput("");
                }}
              >
                Use URL
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
