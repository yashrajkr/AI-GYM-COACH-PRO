import { Resend } from "resend";
import type { ReactElement } from "react";

/**
 * Resend email service integration.
 *
 * When RESEND_API_KEY is configured, the app can send transactional emails:
 *   - Welcome email (on signup)
 *   - Weekly workout summary
 *   - Password reset
 *   - Achievement notifications
 *
 * Fallback: if RESEND_API_KEY is not set, all email functions are no-ops
 * (logged but don't throw). The app works perfectly without email —
 * it's an enhancement, not a dependency.
 *
 * ENVIRONMENT VARIABLES:
 *   RESEND_API_KEY              — re_xxx (server-side only)
 *   NEXT_PUBLIC_RESEND_FROM     — "AI Gym Coach Pro <noreply@yourdomain.com>"
 *                                 (visible to client so it can check isEmailConfigured)
 */

let cachedClient: Resend | null = null;

/**
 * Returns the Resend client, or null if not configured.
 */
export function getResend(): Resend | null {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    cachedClient = new Resend(apiKey);
    return cachedClient;
  } catch (e) {
    console.error("[Resend] Client init failed:", e);
    return null;
  }
}

/**
 * Returns true if email service is available.
 * Checks the public env var (NEXT_PUBLIC_RESEND_FROM) so the client
 * can also detect email availability.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_RESEND_FROM && !!process.env.RESEND_API_KEY;
}

/**
 * Send an email using a React template (via @react-email/components).
 *
 * Usage:
 *   import { WelcomeEmail } from "./templates/welcome";
 *   await sendEmail("user@example.com", "Welcome!", <WelcomeEmail name="Sarah" />);
 *
 * Returns { success: boolean; messageId?: string }.
 * Never throws — logs errors + returns { success: false } so callers
 * don't need try/catch.
 */
export async function sendEmail(
  to: string,
  subject: string,
  react: ReactElement
): Promise<{ success: boolean; messageId?: string }> {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] Not configured — would send to ${to}: "${subject}"`);
    return { success: false };
  }

  const from = process.env.NEXT_PUBLIC_RESEND_FROM || "AI Gym Coach Pro <noreply@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("[Resend] Send failed:", error);
      return { success: false };
    }

    return { success: true, messageId: data?.id };
  } catch (e) {
    console.error("[Resend] Send threw:", e);
    return { success: false };
  }
}
