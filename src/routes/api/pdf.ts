import { createFileRoute } from "@tanstack/react-router";
import { decodePdfSrc, resolvePdfSource } from "@/lib/pdf-proxy";

/**
 * Minimal PDF proxy — serves book PDFs through an extension-less URL so
 * download managers (Internet Download Manager) cannot hijack them.
 *
 * GET /api/pdf?src=<base64url-encoded-pdf-url>
 *
 * IDM's network filter is aggressive: it sniffs the RESPONSE BODY's magic
 * bytes (e.g. `%PDF`) and hijacks any response containing PDF bytes with a
 * fake `204 Intercepted by the IDM Advanced Integration` — regardless of the
 * URL, query string, filename, or content-type. (Verified empirically: the
 * same route serving a text body passes; the same route serving PDF bytes is
 * intercepted.)
 *
 * The only reliable counter-measure is to never send raw PDF bytes over the
 * wire: the server fetches the PDF upstream, base64-encodes the bytes, and
 * returns them inside a JSON envelope (`{ data: "<base64>" }`). The bytes
 * are fetched server-side (same-origin dev paths or Supabase storage signed
 * URLs), so IDM never sees the upstream URL either. PdfViewer decodes the
 * base64 and hands a Uint8Array to pdf.js, which renders it inline.
 */
function bytesToBase64(bytes: Uint8Array): string {
  // Chunked conversion avoids call-stack overflow on large PDFs.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const Route = createFileRoute("/api/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const requestUrl = new URL(request.url);
          const supabaseBase = (
            process.env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            ""
          ).replace(/\/+$/, "");

          let srcRaw: string | null = null;
          const srcParam = requestUrl.searchParams.get("src");
          if (srcParam) {
            try {
              srcRaw = decodePdfSrc(srcParam);
            } catch {
              return new Response("Invalid src", { status: 400 });
            }
          }

          const check = resolvePdfSource(srcRaw, requestUrl.origin, supabaseBase);
          if (!check.ok) {
            return new Response(check.message, { status: check.status });
          }

          // `redirect: "manual"` keeps the allowlist from being escaped via a 3xx.
          const upstream = await fetch(check.target.toString(), {
            redirect: "manual",
          });
          if (upstream.status >= 300 && upstream.status < 400) {
            return new Response("Redirects not allowed", { status: 400 });
          }
          if (!upstream.ok) {
            return new Response("Upstream fetch failed", {
              status: upstream.status,
            });
          }

          // Mask the PDF bytes: base64 inside JSON so IDM's body sniffing never
          // sees `%PDF`. The viewer decodes and feeds pdf.js a Uint8Array.
          const bytes = new Uint8Array(await upstream.arrayBuffer());
          const base64 = bytesToBase64(bytes);

          return Response.json(
            { data: base64 },
            {
              status: 200,
              headers: {
                // JSON is never treated as a downloadable file by any manager.
                "x-content-type-options": "nosniff",
                "cache-control": "private, max-age=300",
              },
            },
          );
        } catch (error) {
          console.error("[api/pdf] Error:", error);
          return new Response("Internal server error", { status: 500 });
        }
      },
    },
  },
});
