import { sendEmail } from "@/lib/email/send";

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
 */
export async function sendPurchaseConfirmation(
  input: PurchaseConfirmationInput,
): Promise<{ sent: boolean; reason?: string; error?: string }> {
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
  const siteUrl = process.env.SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const baseUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;

  const readerUrl = `${baseUrl}/reader/${input.bookId}`;
  const libraryUrl = `${baseUrl}/books/library`;
  const bookUrl = `${baseUrl}/books/${book.slug || input.bookId}`;

  const result = await sendEmail({
    to: userEmail,
    template: "purchase-confirmation",
    data: {
      userName,
      bookTitle: title,
      amountPaid: input.amountPaid,
      isFree: input.isFree,
      readerUrl,
      libraryUrl,
      bookUrl,
    },
  });

  return { sent: result.sent, error: result.error };
}
