import { createServerFn } from "@tanstack/react-start";
import { getResendClient } from "@/integrations/resend/client";
import { escapeHtml } from "@/lib/utils";

interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

/**
 * Server function to send a notification email to the site admin
 * when a contact form is submitted. This runs server-side after the
 * contact message has been stored in the database.
 *
 * Requires RESEND_API_KEY env var. If not configured, the email is
 * silently skipped (the message is still stored in the database).
 */
export const sendContactNotification = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as ContactFormInput;

    if (!input.name?.trim() || !input.email?.trim() || !input.message?.trim()) {
      throw new Error("Missing required fields.");
    }

    // If Resend or admin email isn't configured, skip silently — the message is already in the DB
    const adminEmail = process.env.SITE_ADMIN_EMAIL;
    const resend = getResendClient();
    if (!resend || !adminEmail) {
      const reason = !resend ? "resend_not_configured" : "admin_email_not_set";
      console.warn(`[contact-notification] ${reason}. Skipping email notification.`);
      return { sent: false, reason };
    }

    const siteUrl = process.env.SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const adminUrl = `${siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`}/admin/comments`;

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px;">
        <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 16px;">
          <h1 style="font-size: 18px; font-weight: 600; margin: 0; color: #1a1a1a;">New Contact Message</h1>
          <p style="font-size: 13px; color: #666; margin: 4px 0 0 0;">
            Someone has submitted the contact form on your site.
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: 500; color: #1a1a1a; width: 80px; vertical-align: top;">Name</td>
            <td style="padding: 8px 12px; color: #333;">${escapeHtml(input.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 500; color: #1a1a1a; vertical-align: top;">Email</td>
            <td style="padding: 8px 12px; color: #333;">
              <a href="mailto:${escapeHtml(input.email)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(input.email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 500; color: #1a1a1a; vertical-align: top;">Message</td>
            <td style="padding: 8px 12px; color: #333; white-space: pre-wrap;">${escapeHtml(input.message)}</td>
          </tr>
        </table>
        <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 16px;">
          <a href="${adminUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1a1a1a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500;">
            View in Admin Panel
          </a>
        </div>
      </div>
    `;

    const text = `New Contact Message\n\nName: ${input.name}\nEmail: ${input.email}\nMessage: ${input.message}\n\nView in admin: ${adminUrl}`;

    try {
      const { error } = await resend.emails.send({
        from: "Contact Form <onboarding@resend.dev>",
        to: adminEmail,
        subject: `New Contact Message from ${input.name}`,
        html,
        text,
        replyTo: input.email,
      });

      if (error) {
        console.error("[contact-notification] Failed to send email:", error);
        return { sent: false, reason: "send_failed", error: error.message };
      }

      return { sent: true };
    } catch (err) {
      console.error("[contact-notification] Error sending email:", err);
      return { sent: false, reason: "error" };
    }
  },
);


