export interface RedirectRule {
  from: string;
  to: string;
  statusCode: number;
}

const REDIRECTS: RedirectRule[] = [
  { from: "/blog", to: "/reflections", statusCode: 301 },
];

export async function lookupRedirect(path: string): Promise<{ to: string; statusCode: number } | null> {
  const rule = REDIRECTS.find((r) => r.from === path);
  if (!rule) return null;
  return { to: rule.to, statusCode: rule.statusCode };
}
