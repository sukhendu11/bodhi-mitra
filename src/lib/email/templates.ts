import { emailLayout } from "./base-layout";
import { escapeHtml } from "@/lib/utils";

/* ─── Template Types ───────────────────────────────────────────── */

export type EmailTemplate =
  | "contact-notification"
  | "contact-confirmation"
  | "purchase-confirmation"
  | "newsletter-welcome"
  | "newsletter-unsubscribe-confirm";

export interface EmailTemplateData {
  "contact-notification": { name: string; email: string; message: string };
  "contact-confirmation": { name: string; message: string };
  "purchase-confirmation": {
    userName: string;
    bookTitle: string;
    amountPaid: number;
    isFree: boolean;
    readerUrl: string;
    libraryUrl: string;
    bookUrl: string;
  };
  "newsletter-welcome": { email: string };
  "newsletter-unsubscribe-confirm": { email: string };
}

export interface EmailResult {
  subject: string;
  html: string;
  text: string;
}

/* ─── Template Renderers ───────────────────────────────────────── */

const templates: {
  [K in EmailTemplate]: (data: EmailTemplateData[K]) => EmailResult;
} = {
  "contact-notification": (data) => ({
    subject: `New Contact Message from ${escapeHtml(data.name)}`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">New Contact Message</h2>
      <p style="margin:0 0 8px;color:#666;">You received a new message from the contact form.</p>
      <table style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#999;font-size:13px;">From</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#d35400;">${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</a></td></tr>
        <tr><td style="padding:8px 0;color:#999;font-size:13px;vertical-align:top;">Message</td><td style="padding:8px 0;font-size:14px;line-height:1.5;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</td></tr>
      </table>
      <a href="${process.env.SITE_URL || "https://bodhimitra.com"}/admin/comments" style="display:inline-block;padding:10px 20px;background-color:#d35400;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;margin-top:16px;">View in Admin Panel</a>
    `, { preheader: `New message from ${data.name}` }),
    text: `New Contact Message\n\nFrom: ${data.name} <${data.email}>\n\nMessage:\n${data.message}\n\nView in Admin Panel: ${process.env.SITE_URL || "https://bodhimitra.com"}/admin/comments`,
  }),

  "contact-confirmation": (data) => ({
    subject: "We received your message — Bodhi Mitra",
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">Thank you, ${escapeHtml(data.name)}!</h2>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">We have received your message and will get back to you as soon as possible.</p>
      <div style="background-color:#f8f6f3;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Your message</p>
        <p style="margin:8px 0 0;color:#333;font-size:14px;line-height:1.5;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>
      </div>
      <p style="margin:16px 0 0;color:#666;font-size:14px;">If your matter is urgent, please reply directly to this email.</p>
    `, { preheader: "We received your message and will respond soon." }),
    text: `Thank you, ${data.name}!\n\nWe have received your message and will get back to you as soon as possible.\n\nYour message:\n${data.message}\n\nIf your matter is urgent, please reply directly to this email.`,
  }),

  "purchase-confirmation": (data) => ({
    subject: `You now own "${escapeHtml(data.bookTitle)}" — Bodhi Mitra`,
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">Purchase Confirmed!</h2>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">Hi ${escapeHtml(data.userName)}, thank you for your purchase.</p>
      <div style="background-color:#f8f6f3;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Book</p>
        <p style="margin:8px 0 0;color:#333;font-size:16px;font-weight:600;">${escapeHtml(data.bookTitle)}</p>
        <p style="margin:4px 0 0;color:#666;font-size:14px;">
          ${data.isFree ? "Free" : `Amount: $${data.amountPaid.toFixed(2)}`}
        </p>
      </div>
      <div style="margin:24px 0;">
        <a href="${data.readerUrl}" style="display:inline-block;padding:10px 20px;background-color:#d35400;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;margin-right:8px;">Start Reading</a>
        <a href="${data.libraryUrl}" style="display:inline-block;padding:10px 20px;border:1px solid #d35400;color:#d35400;border-radius:6px;text-decoration:none;font-size:14px;">My Library</a>
      </div>
    `, { preheader: `Your purchase of "${data.bookTitle}" is confirmed.` }),
    text: `Purchase Confirmed!\n\nHi ${data.userName}, thank you for your purchase.\n\nBook: ${data.bookTitle}\nAmount: ${data.isFree ? "Free" : `$${data.amountPaid.toFixed(2)}`}\n\nStart Reading: ${data.readerUrl}\nMy Library: ${data.libraryUrl}`,
  }),

  "newsletter-welcome": (data) => ({
    subject: "Welcome to Bodhi Mitra newsletter",
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">Welcome!</h2>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">Thank you for subscribing to the Bodhi Mitra newsletter.</p>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">You will receive occasional emails with new reflections, book recommendations, and updates from our community.</p>
      <p style="margin:0;color:#999;font-size:13px;">If you did not subscribe, you can safely ignore this email.</p>
    `, { preheader: "Welcome to the Bodhi Mitra newsletter." }),
    text: `Welcome!\n\nThank you for subscribing to the Bodhi Mitra newsletter.\nYou will receive occasional emails with new reflections, book recommendations, and updates.\n\nIf you did not subscribe, you can safely ignore this email.`,
  }),

  "newsletter-unsubscribe-confirm": (data) => ({
    subject: "You've been unsubscribed — Bodhi Mitra",
    html: emailLayout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">Unsubscribed</h2>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">You have been successfully unsubscribed from the Bodhi Mitra newsletter.</p>
      <p style="margin:0 0 16px;color:#666;line-height:1.6;">You will no longer receive newsletter emails from us.</p>
      <p style="margin:0;color:#999;font-size:13px;">If this was a mistake, you can resubscribe on our website.</p>
    `, { preheader: "You have been unsubscribed from the newsletter." }),
    text: `Unsubscribed\n\nYou have been successfully unsubscribed from the Bodhi Mitra newsletter.\nYou will no longer receive newsletter emails from us.\n\nIf this was a mistake, you can resubscribe on our website.`,
  }),
};

/* ─── Public API ───────────────────────────────────────────────── */

export function renderEmailTemplate<T extends EmailTemplate>(
  template: T,
  data: EmailTemplateData[T],
  options?: { brandName?: string },
): EmailResult {
  const renderer = templates[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer(data);
}
