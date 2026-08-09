/**
 * Minimal PDF proxy helpers — the only pieces needed to serve book PDFs
 * through an extension-less URL.
 *
 * Download managers (e.g. Internet Download Manager) are aggressive: their
 * network filter sniffs the RESPONSE BODY's magic bytes, so any response
 * containing `%PDF` bytes gets hijacked (fake `204 Intercepted by the IDM
 * Advanced Integration`) regardless of URL, content-type, or filename. The
 * viewer therefore asks the server for the bytes via `GET /api/pdf?src=<base64url>`
 * (no `.pdf` text can appear in the request), and the server returns the
 * bytes base64-encoded inside a JSON envelope — masking the magic bytes
 * entirely. See src/routes/api/pdf.ts for the rationale.
 */

/** Encode a PDF URL for the /api/pdf proxy query param (base64url, URL-safe). */
export function encodePdfSrc(url: string): string {
  return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url proxy `src` param back to the original URL. Throws if invalid. */
export function decodePdfSrc(param: string): string {
  let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return atob(b64);
}

export type PdfSourceCheck =
  | { ok: true; target: URL }
  | { ok: false; status: number; message: string };

/**
 * Minimal SSRF guard: allow same-origin http(s) paths (dev/mock PDFs) or URLs
 * on the configured Supabase storage host (production signed URLs). Rejects
 * other hosts, non-http(s) protocols, and self-recursion into /api/pdf.
 */
export function resolvePdfSource(
  srcRaw: string | null,
  requestOrigin: string,
  supabaseBase: string,
): PdfSourceCheck {
  if (!srcRaw) return { ok: false, status: 400, message: "Missing src" };

  let target: URL;
  try {
    target = new URL(srcRaw, requestOrigin);
  } catch {
    return { ok: false, status: 400, message: "Invalid src" };
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { ok: false, status: 400, message: "Unsupported protocol" };
  }
  if (target.pathname.startsWith("/api/pdf")) {
    return { ok: false, status: 400, message: "Invalid src" };
  }

  let supabaseOrigin: string | null = null;
  if (supabaseBase) {
    try {
      supabaseOrigin = new URL(supabaseBase).origin;
    } catch {
      supabaseOrigin = null;
    }
  }

  const isSameOrigin = target.origin === requestOrigin;
  const isSupabaseHost = supabaseOrigin !== null && target.origin === supabaseOrigin;
  if (!isSameOrigin && !isSupabaseHost) {
    return { ok: false, status: 403, message: "Forbidden source" };
  }

  return { ok: true, target };
}
