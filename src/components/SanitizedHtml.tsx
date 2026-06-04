import { useEffect, useState } from "react";

/** Renders HTML content with client-side DOMPurify sanitization.
 *  DOMPurify is imported dynamically so it's not bundled into the initial route chunk. */
export function SanitizedHtml({ html }: { html: string }) {
  const [safe, setSafe] = useState("");

  useEffect(() => {
    import("dompurify").then((mod) => {
      setSafe(mod.default.sanitize(html));
    });
  }, [html]);

  if (!safe) return <div className="prose-mitra">{html}</div>;
  return <div className="prose-mitra" dangerouslySetInnerHTML={{ __html: safe }} />;
}
