import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { generateSitemap } from "@/lib/sitemap";

export const Route = createFileRoute("/sitemap/xml")({
  component: SitemapRoute,
});

function SitemapRoute() {
  const doGenerate = useServerFn(generateSitemap);

  const { data } = useQuery({
    queryKey: ["sitemap"],
    queryFn: () => (doGenerate as any)(),
    staleTime: 3600_000,
  });

  return (
    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12, padding: 20 }}>
      {data ?? "Generating sitemap..."}
    </pre>
  );
}
