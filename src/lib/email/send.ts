import { getResendClient } from "@/integrations/resend/client";
import { fetchSiteSettings } from "@/lib/siteSettings";
import { renderEmailTemplate, type EmailTemplate, type EmailTemplateData } from "./templates";

interface SendEmailOptions<T extends EmailTemplate> {
  to: string;
  template: T;
  data: EmailTemplateData[T];
  replyTo?: string;
}

/** Send an email using the template system */
export async function sendEmail<T extends EmailTemplate>(
  options: SendEmailOptions<T>,
): Promise<{ sent: boolean; error?: string }> {
  const { to, template, data, replyTo } = options;

  // Get Resend client
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] Resend not configured (RESEND_API_KEY missing). Skipping email.");
    return { sent: false, error: "Email service not configured" };
  }

  // Get email settings from config
  const config = await fetchSiteSettings();
  const emailConfig = (config as any).email || {};

  // Sender address — configured or fallback to Resend dev
  const senderName = emailConfig.sender_name || "Bodhi Mitra";
  const senderEmail = emailConfig.sender_email || "onboarding@resend.dev";
  const from = `${senderName} <${senderEmail}>`;

  // Render template
  const { subject, html, text } = renderEmailTemplate(template, data);

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || emailConfig.reply_to || undefined,
    });
    return { sent: true };
  } catch (error: any) {
    console.error("[email] Failed to send:", error?.message || error);
    return { sent: false, error: error?.message || "Unknown error" };
  }
}
