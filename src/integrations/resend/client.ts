import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Get the Resend client singleton.
 * Returns `null` if RESEND_API_KEY is not configured — callers should
 * check the return value before sending emails.
 */
export function getResendClient(): Resend | null {
  if (!client && process.env.RESEND_API_KEY) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
