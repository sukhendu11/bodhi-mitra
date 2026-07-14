import { createServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/email/send";

interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

/** Simple in-memory rate limiter for contact form submissions */
const submissionTracker = new Map<string, { count: number; resetAt: number }>();

function checkContactRateLimit(identifier: string, maxPerHour = 5): boolean {
  const now = Date.now();
  const record = submissionTracker.get(identifier);
  if (!record || now > record.resetAt) {
    submissionTracker.set(identifier, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (record.count >= maxPerHour) return false;
  record.count++;
  return true;
}

/**
 * Server function to send notification emails when a contact form is submitted.
 * Sends admin notification + submitter confirmation.
 * Rate-limited to 5 submissions per IP per hour.
 */
export const sendContactNotification = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as ContactFormInput & { _ip?: string };

    if (!input.name?.trim() || !input.email?.trim() || !input.message?.trim()) {
      throw new Error("Missing required fields.");
    }

    // Rate limit check (by IP or email as fallback)
    const identifier = input._ip || input.email;
    if (!checkContactRateLimit(identifier)) {
      throw new Error("Too many submissions. Please try again later.");
    }

    const results = [];

    // 1. Send admin notification
    const adminEmail = process.env.SITE_ADMIN_EMAIL;
    if (adminEmail) {
      const adminResult = await sendEmail({
        to: adminEmail,
        template: "contact-notification",
        data: { name: input.name, email: input.email, message: input.message },
        replyTo: input.email,
      });
      results.push({ type: "admin", ...adminResult });
    }

    // 2. Send confirmation to submitter
    const confirmResult = await sendEmail({
      to: input.email,
      template: "contact-confirmation",
      data: { name: input.name, message: input.message },
    });
    results.push({ type: "confirmation", ...confirmResult });

    const anySent = results.some((r) => r.sent);
    return { sent: anySent, results };
  },
);
