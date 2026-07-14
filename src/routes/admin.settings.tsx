import { createFileRoute } from "@tanstack/react-router";
import { useOne, useUpdate } from "@refinedev/core";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_CONFIG, mergeConfig, type SiteConfig } from "@/lib/siteSettings";
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
import { FooterTab } from "@/components/SettingsFooterTab";
import { MaintenanceTab } from "@/components/SettingsMaintenanceTab";
import { FeaturesTab } from "@/components/SettingsFeaturesTab";
import { ReaderTab } from "@/components/SettingsReaderTab";
import { CommerceTab } from "@/components/SettingsCommerceTab";
import { NavigationTab } from "@/components/SettingsNavigationTab";
import { SettingsNewsletterTab } from "@/components/SettingsNewsletterTab";
import { Settings } from "lucide-react";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "home", label: "Homepage" },
  { id: "article", label: "Article" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "footer", label: "Footer" },
  { id: "theme", label: "Theme" },
  { id: "social", label: "Social" },
  { id: "seo", label: "SEO" },
  { id: "features", label: "Features" },
  { id: "reader", label: "Reader" },
  { id: "commerce", label: "Commerce" },
  { id: "navigation", label: "Navigation" },
  { id: "newsletter", label: "Newsletter" },
  { id: "maintenance", label: "Maintenance" },
] as const;

function SettingsPage() {
  const queryClient = useQueryClient();
  const createAssetUpload = useServerFn(createSiteAssetUpload);
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");
  const [hasChanges, setHasChanges] = useState(false);

  /* ── Fetch via Refine useOne ──────────────────────────────────── */

  const { query: settingsQuery, result: settingsResult } = useOne({
    resource: "site_settings",
    id: "1",
  });

  useEffect(() => {
    if (settingsResult && !ready) {
      setCfg(mergeConfig((settingsResult as any)?.config));
      setReady(true);
    }
  }, [settingsResult, ready]);

  /* ── Save via Refine useUpdate ────────────────────────────────── */

  const { mutate: updateMutate, mutation: updateMutation } = useUpdate();

  const handleSave = () => {
    updateMutate(
      { resource: "site_settings", id: "1", values: { config: cfg } },
      {
        onSuccess: () => {
          setHasChanges(false);
          queryClient.invalidateQueries({ queryKey: ["site-settings"] });
          toast.success("Settings saved — frontend updated.");
        },
        onError: (e: any) => toast.error(e?.message ?? "Save failed"),
      },
    );
  };

  const update = <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => {
    setCfg((c) => ({ ...c, [group]: { ...c[group], ...patch } as SiteConfig[K] }));
    setHasChanges(true);
  };

  async function uploadAsset(file: File, kind: string): Promise<string | null> {
    const signed = await createAssetUpload({
      data: { kind, filename: file.name, contentType: file.type || "image/png" },
    });
    const { error } = await supabase.storage
      .from("site-assets")
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type || "image/png",
      });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return signed.publicUrl;
  }

  const tabProps = { cfg, update, uploadAsset, setCfg };
  const isPending = updateMutation?.isPending ?? false;

  return (
    <div className="space-y-6">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCfg(DEFAULT_CONFIG)}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending || !hasChanges}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

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
                {tab.id === "footer" && <FooterTab {...tabProps} />}
                {tab.id === "theme" && <ThemeTab {...tabProps} />}
                {tab.id === "social" && <SocialTab {...tabProps} />}
                {tab.id === "seo" && <SeoTab {...tabProps} />}
                {tab.id === "features" && <FeaturesTab {...tabProps} />}
                {tab.id === "reader" && <ReaderTab {...tabProps} />}
                {tab.id === "commerce" && <CommerceTab {...tabProps} />}
                {tab.id === "navigation" && <NavigationTab {...tabProps} />}
                {tab.id === "newsletter" && <SettingsNewsletterTab />}
                {tab.id === "maintenance" && <MaintenanceTab {...tabProps} />}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {hasChanges && (
          <span className="text-[0.55rem] text-amber-600 dark:text-amber-400 mr-2">
            You have unsaved changes
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCfg(DEFAULT_CONFIG)}
          disabled={isPending}
        >
          Reset
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
