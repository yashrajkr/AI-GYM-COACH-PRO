import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Terms — AI Gym Coach Pro",
  description: "Terms of use for AI Gym Coach Pro, including health and safety limits.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <MarketingPageShell title="Terms of Use" updated="28 July 2026">
      <Section heading="Health and safety — read this one">
        <p>
          AI Gym Coach Pro is a training aid, not a medical device and not a substitute for
          professional instruction or medical advice. Form scoring is an estimate produced
          from a single 2D camera and can be wrong.
        </p>
        <p>
          Consult a doctor before starting a new exercise programme. Stop immediately if you
          feel pain, dizziness or shortness of breath. You exercise at your own risk.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You are responsible for keeping your credentials secure and for activity under
          your account. Provide accurate details when registering, and tell us if you
          believe your account has been compromised.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          Do not attempt to disrupt or overload the service, reverse-engineer it to
          circumvent paid tiers, upload unlawful content, or use it to harass others.
        </p>
      </Section>

      <Section heading="Subscriptions">
        <p>
          Paid tiers, where enabled, bill in advance on a recurring basis until cancelled.
          You can cancel at any time and keep access until the end of the current billing
          period, after which the account reverts to the free tier with data intact.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is provided &ldquo;as is&rdquo;, without warranty of uninterrupted or
          error-free operation. We may change or discontinue features.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for injury, loss or
          damages arising from use of the service. Nothing here limits liability that
          cannot lawfully be limited.
        </p>
      </Section>

      <Section heading="A note on this document">
        <p>
          This is a plain-language starting point, not legal advice. Have a lawyer review it
          before relying on it commercially.
        </p>
      </Section>
    </MarketingPageShell>
  );
}
