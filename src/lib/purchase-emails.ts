import { escapeHtml } from "@/lib/utils";
import { getResendClient } from "@/integrations/resend/client";

interface PurchaseConfirmationInput {
  userId: string;
  bookId: string;
  amountPaid: number;
  isFree: boolean;
}

/**
 * Send a purchase confirmation email to the user after they successfully
 * purchase a book. Uses supabaseAdmin (service role) for data fetching since
 * this is called server-side (from the Stripe webhook handler).
 *
 * Requires RESEND_API_KEY and SITE_ADMIN_EMAIL env vars. If not configured,
 * the email is silently skipped (the purchase is already recorded).
 */
export async function sendPurchaseConfirmation(
  input: PurchaseConfirmationInput,
): Promise<{ sent: boolean; reason?: string; error?: string }> {
  const adminEmail = process.env.SITE_ADMIN_EMAIL;
  const resend = getResendClient();

  if (!resend || !adminEmail) {
    const reason = !resend ? "resend_not_configured" : "admin_email_not_set";
    console.warn(`[purchase-emails] ${reason}. Skipping confirmation email.`);
    return { sent: false, reason };
  }

  // Fetch user profile and book details (use supabaseAdmin for server-side RLS bypass)
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const [userResult, bookResult] = await Promise.all([
      db
        .from("profiles")
        .select("email, display_name")
        .eq("user_id", input.userId)
        .maybeSingle(),
      db
        .from("books")
        .select("title_en, title_bn, slug, price, cover_image, author_name")
        .eq("id", input.bookId)
        .maybeSingle(),
    ]);

    const profile = userResult.data ?? null;
    const book = bookResult.data ?? null;

    if (!profile || !book) {
      console.warn("[purchase-emails] Could not fetch profile or book data. Skipping email.");
      return { sent: false, reason: "missing_data" };
    }

    const userEmail = profile.email;
    if (!userEmail) {
      console.warn("[purchase-emails] User has no email. Skipping confirmation email.");
      return { sent: false, reason: "no_email" };
    }

    const userName = profile.display_name || "Reader";
    const title = book.title_en || book.title_bn || "Book";
    const siteUrl =
      process.env.SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const baseUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;

    const readerUrl = `${baseUrl}/reader/${input.bookId}`;
    const libraryUrl = `${baseUrl}/books/library`;
    const bookUrl = `${baseUrl}/books/${book.slug || input.bookId}`;

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background-color: #d35400; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: white; font-size: 18px; font-weight: bold;">BM</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0;">Thank you for your purchase!</h1>
          <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">
            You now own <strong style="color: #1a1a1a;">${escapeHtml(title)}</strong>
          </p>
        </div>

        <div style="background-color: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e5e5; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Book</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #1a1a1a;">
                <a href="${bookUrl}" style="color: #2563eb; text-decoration: none;">${escapeHtml(title)}</a>
              </td>
            </tr>
            ${book.author_name ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Author</td>
              <td style="padding: 8px 0; text-align: right; color: #333;">${escapeHtml(book.author_name)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 0; color: #666;">Amount</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a1a;">
                ${input.isFree || input.amountPaid === 0 ? '<span style="color: #16a34a;">Free</span>' : `$${input.amountPaid.toFixed(2)}`}
              </td>
            </tr>
          </table>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <a href="${readerUrl}" style="flex: 1; display: block; padding: 14px 20px; background-color: #1a1a1a; color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 500; text-align: center;">
            Start Reading
          </a>
          <a href="${libraryUrl}" style="flex: 1; display: block; padding: 14px 20px; background-color: white; color: #1a1a1a; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 500; text-align: center; border: 1px solid #e5e5e5;">
            My Library
          </a>
        </div>

        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          Bodhi Mitra — Where ancient wisdom meets modern psychology.
        </p>
      </div>
    `;

    const text = `Thank you for your purchase!\n\nYou now own: ${title}\n${book.author_name ? `Author: ${book.author_name}\n` : ""}Amount: ${input.isFree || input.amountPaid === 0 ? "Free" : `$${input.amountPaid.toFixed(2)}`}\n\nStart Reading: ${readerUrl}\nMy Library: ${libraryUrl}\n\nBodhi Mitra`;

    try {
      const { error } = await resend.emails.send({
        from: "Bodhi Mitra <onboarding@resend.dev>",
        to: [userEmail],
        subject: `You now own "${title}" — Bodhi Mitra`,
        html,
        text,
      });

      if (error) {
        console.error("[purchase-emails] Failed to send confirmation:", error);
        return { sent: false, reason: "send_failed", error: error.message };
      }

      return { sent: true };
    } catch (err) {
      console.error("[purchase-emails] Error sending confirmation:", err);
      return { sent: false, reason: "error" };
    }
}


