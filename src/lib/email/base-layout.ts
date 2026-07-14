import { getServerSiteUrl } from "@/lib/site-url";

/** Shared email HTML layout with BM branding */
export function emailLayout(bodyContent: string, options?: { preheader?: string; brandName?: string; tagline?: string }): string {
  const preheader = options?.preheader || "";
  const brandName = options?.brandName || "Bodhi Mitra";
  const tagline = options?.tagline || "Where ancient wisdom meets modern psychology";
  const siteUrl = getServerSiteUrl();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f6f3;font-family:system-ui,-apple-system,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f6f3;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <p style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0;font-family:Georgia,serif;">${brandName}</p>
              <p style="font-size:12px;color:#999;margin:4px 0 0;">${tagline}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;border-radius:8px;padding:32px;border:1px solid #e5e5e5;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding:24px 0;">
              <p style="font-size:12px;color:#999;margin:0;">This email was sent by ${brandName}</p>
              <p style="font-size:11px;color:#bbb;margin:4px 0 0;">
                <a href="${siteUrl}" style="color:#999;">Visit our site</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Generate plain text version from HTML */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}
