import { createFileRoute } from "@tanstack/react-router";
import { DesignTokensDoc } from "@/components/admin/design-tokens-doc";
import { ErrorPage } from "@/components/error-page";

export const Route = createFileRoute("/admin/tokens")({
  component: TokensPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function TokensPage() {
  return <DesignTokensDoc />;
}
