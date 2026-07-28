import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { z } from "zod";
import { createElement } from "react";

/**
 * POST /api/email/welcome
 *
 * Sends a welcome email to a newly-registered user.
 * Called by the client after successful signup.
 *
 * If email isn't configured, returns 200 with { sent: false } —
 * the client doesn't need to know or retry.
 */
const Schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Construct the email element OUTSIDE the try/catch (ESLint rule:
    // react-hooks/error-boundaries forbids JSX in try/catch because
    // render errors aren't caught by try/catch anyway).
    const emailElement = createElement(WelcomeEmail, {
      email: parsed.data.email,
      name: parsed.data.name,
    });

    const result = await sendEmail(
      parsed.data.email,
      "Welcome to AI Gym Coach Pro! 🎯",
      emailElement
    );

    return NextResponse.json({ sent: result.success, messageId: result.messageId });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ sent: false }, { status: 200 }); // don't fail signup
  }
}
