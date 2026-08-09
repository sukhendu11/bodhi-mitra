import { createFileRoute, Outlet } from "@tanstack/react-router";
import { fetchSiteSettings } from "@/lib/siteSettings";
import { useLang } from "@/lib/i18n";
import { ErrorPage } from "@/components/error-page";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reflections")({
  loader: async () => {
    const settings = await fetchSiteSettings().catch(() => null);
    return { siteName: settings?.branding?.site_name_en || "Sabbe Satta" };
  },
  head: (ctx) => {
    const ld = ctx.loaderData as { siteName: string } | undefined;
    return seoHead({
      title: "Reflections",
      description: "Reflections, meditations, and inquiries into Buddhist psychology, wisdom, and the art of living.",
      path: "/reflections",
      siteName: ld?.siteName,
    });
  },
  component: ReflectionsLayout,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ReflectionsLayout() {
  return <Outlet />;
}
