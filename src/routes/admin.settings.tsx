import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEFAULT_CONFIG,
  fetchSiteSettings,
  saveSiteSettings,
  type DynamicPage,
  type SiteConfig,
} from "@/lib/siteSettings";
import { createSiteAssetUpload } from "@/lib/siteAssets.functions";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { BrandingTab } from "@/components/SettingsBrandingTab";
import { HomepageTab } from "@/components/SettingsHomepageTab";
import { ArticleTab } from "@/components/SettingsArticleTab";
import { AboutTab } from "@/components/SettingsAboutTab";
import { ContactTab } from "@/components/SettingsContactTab";
import { PagesTab } from "@/components/SettingsPagesTab";
import { ThemeTab } from "@/components/SettingsThemeTab";
import { NavTab } from "@/components/SettingsNavTab";
import { SocialTab } from "@/components/SettingsSocialTab";
import { SeoTab } from "@/components/SettingsSeoTab";

export const Route = createFileRoute("/admin/settings")({
  loader: () => fetchSiteSettings(),
  component: SettingsPage,
});

function SettingsPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const createAssetUpload = useServerFn(createSiteAssetUpload);
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

  const tabProps = { cfg, update, updatePage, addPage, removePage, uploadAsset, setCfg };

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
        <TabsContent value="branding" className="mt-6 space-y-6"><BrandingTab {...tabProps} /></TabsContent>
        <TabsContent value="home" className="mt-6 space-y-6"><HomepageTab {...tabProps} /></TabsContent>
        <TabsContent value="article" className="mt-6 space-y-6"><ArticleTab {...tabProps} /></TabsContent>
        <TabsContent value="about" className="mt-6 space-y-6"><AboutTab {...tabProps} /></TabsContent>
        <TabsContent value="contact" className="mt-6 space-y-6"><ContactTab {...tabProps} /></TabsContent>
        <TabsContent value="pages" className="mt-6 space-y-6"><PagesTab {...tabProps} /></TabsContent>
        <TabsContent value="theme" className="mt-6 space-y-6"><ThemeTab {...tabProps} /></TabsContent>
        <TabsContent value="nav" className="mt-6 space-y-6"><NavTab {...tabProps} /></TabsContent>
        <TabsContent value="social" className="mt-6 space-y-6"><SocialTab {...tabProps} /></TabsContent>
        <TabsContent value="seo" className="mt-6 space-y-6"><SeoTab {...tabProps} /></TabsContent>
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
