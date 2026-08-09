import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  to: string;
  label: string;
  search?: Record<string, unknown>;
}

export function BackLink({ to, label, search }: BackLinkProps) {
  return (
    <Link
      to={to}
      search={search as any}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
