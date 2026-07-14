import { createServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/email/send";

interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

/**
 * Server function to send notification emails when a contact form is submitted.
 * Sends admin notification + submitter confirmation.
 */
export const sendContactNotification = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = data as ContactFormInput;

    if (!input.name?.trim() || !input.email?.trim() || !input.message?.trim()) {
      throw new Error("Missing required fields.");
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
