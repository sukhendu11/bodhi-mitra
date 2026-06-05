import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEFAULT_CONFIG,
  fetchSiteSettings,
  saveSiteSettings,
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
import { ThemeTab } from "@/components/SettingsThemeTab";
import { SocialTab } from "@/components/SettingsSocialTab";
import { SeoTab } from "@/components/SettingsSeoTab";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  loader: () => fetchSiteSettings(),
  component: SettingsPage,
});

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "home", label: "Homepage" },
  { id: "article", label: "Article" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "theme", label: "Theme" },
  { id: "social", label: "Social" },
  { id: "seo", label: "SEO" },
] as const;

function SettingsPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const createAssetUpload = useServerFn(createSiteAssetUpload);
  const [cfg, setCfg] = useState<SiteConfig>(initial ?? DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("branding");
  const [hasChanges, setHasChanges] = useState(false);

  const save = useMutation({
    mutationFn: (next: SiteConfig) => saveSiteSettings(next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      setHasChanges(false);
      toast.success("Settings saved — UI updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => {
    setCfg((c) => ({ ...c, [group]: { ...c[group], ...patch } as SiteConfig[K] }));
    setHasChanges(true);
  };

  async function uploadAsset(file: File, kind: string): Promise<string | null> {
    const signed = await createAssetUpload({ data: { kind, filename: file.name, contentType: file.type || "image/png" } });
    const { error } = await supabase.storage
      .from("site-assets")
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || "image/png" });
    if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
    return signed.publicUrl;
  }

  const tabProps = { cfg, update, uploadAsset, setCfg };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground/60" />
          <div>
            <h2 className="text-lg font-semibold">Site Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize every aspect of your journal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-[0.55rem] text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
              Unsaved changes
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setCfg(initial ?? DEFAULT_CONFIG)} disabled={save.isPending}>
            Reset
          </Button>
          <Button size="sm" onClick={() => save.mutate(cfg)} disabled={save.isPending || !hasChanges}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Settings tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/60 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/60 px-1 pt-1">
            <TabsList className="flex flex-wrap h-auto bg-transparent gap-0.5">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-foreground/5 data-[state=active]:shadow-none rounded-md px-3 py-2 text-xs font-medium"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-6">
            {TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-6">
                {tab.id === "branding" && <BrandingTab {...tabProps} />}
                {tab.id === "home" && <HomepageTab {...tabProps} />}
                {tab.id === "article" && <ArticleTab {...tabProps} />}
                {tab.id === "about" && <AboutTab {...tabProps} />}
                {tab.id === "contact" && <ContactTab {...tabProps} />}
                {tab.id === "theme" && <ThemeTab {...tabProps} />}
                {tab.id === "social" && <SocialTab {...tabProps} />}
                {tab.id === "seo" && <SeoTab {...tabProps} />}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {hasChanges && (
          <span className="text-[0.55rem] text-amber-600 dark:text-amber-400 mr-2">
            You have unsaved changes
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => setCfg(initial ?? DEFAULT_CONFIG)} disabled={save.isPending}>
          Reset
        </Button>
        <Button size="sm" onClick={() => save.mutate(cfg)} disabled={save.isPending || !hasChanges}>
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
