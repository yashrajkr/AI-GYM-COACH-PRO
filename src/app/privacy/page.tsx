import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Privacy — AI Gym Coach Pro",
  description:
    "What AI Gym Coach Pro collects, what it never collects, and how to delete your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      title="Privacy"
      subtitle="Short version: your camera feed never leaves your device."
      updated="28 July 2026"
    >
      <Section heading="Camera and video">
        <p>
          Video frames are read from your camera, analysed in memory on your device, and
          discarded. They are never transmitted, never stored, and never seen by us. Pose
          detection runs locally in WebAssembly.
        </p>
      </Section>

      <Section heading="What we store">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account details: email address and a bcrypt hash of your password (never the password itself).</li>
          <li>If you sign in with Google: the name, email and avatar URL Google returns.</li>
          <li>Workout records: exercise, reps, sets, duration, form scores, timestamps.</li>
          <li>Progress data: XP, levels, streaks, achievements.</li>
          <li>Preferences: theme, coach personality, sound settings.</li>
        </ul>
      </Section>

      <Section heading="What we never store">
        <ul className="list-disc pl-5 space-y-1">
          <li>Video or images from your camera.</li>
          <li>Raw pose landmarks.</li>
          <li>Audio.</li>
          <li>Payment card details — these go directly to the payment provider.</li>
        </ul>
      </Section>

      <Section heading="Third parties">
        <p>
          Depending on configuration, this deployment may use a database host, a payment
          provider, a transactional email provider, and error/analytics services. Each
          receives only what it needs to do its job; none receives camera data. Where
          analytics are enabled they record page views and feature usage, not personal
          content.
        </p>
      </Section>

      <Section heading="Your data, your call">
        <p>
          Settings includes both &ldquo;Delete all local data&rdquo; and account deletion.
          Deleting your account removes your records from the database. Local workout
          history also lives in your browser&rsquo;s storage and is cleared with the local
          option or by clearing site data.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use a session cookie to keep you signed in. There are no advertising or
          cross-site tracking cookies.
        </p>
      </Section>

      <Section heading="A note on this document">
        <p>
          This page describes how the software behaves. It is not legal advice, and if you
          operate this application commercially you should have a lawyer review it against
          your jurisdiction&rsquo;s requirements.
        </p>
      </Section>
    </MarketingPageShell>
  );
}
