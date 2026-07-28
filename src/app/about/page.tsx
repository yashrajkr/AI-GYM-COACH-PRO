import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "About — AI Gym Coach Pro",
  description:
    "Why we built a browser-native AI form coach, how the pose tracking works, and what we do and do not do with your camera.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      title="About"
      subtitle="A form coach that runs entirely in your browser."
    >
      <Section heading="Why this exists">
        <p>
          Most fitness apps track <em>what</em> you did — reps, sets, minutes. Almost none
          watch <em>how</em> you did it. That gap is where injuries come from: a squat with
          collapsing knees counts the same as a clean one, and nothing tells you the
          difference until something hurts.
        </p>
        <p>
          Personal training solves it, at £50–120 an hour. We wanted the feedback loop a
          coach gives you — &ldquo;chest up, sit back, knees out&rdquo; — available on any
          laptop or phone, for free.
        </p>
      </Section>

      <Section heading="How it works">
        <p>
          Your camera feed is processed by MediaPipe Tasks-Vision, which locates 33 body
          landmarks per frame. We compute joint angles from those landmarks, compare them
          against the target range for the movement you selected, and score each rep from
          0–100. When a joint drifts outside its range, the coach calls it out.
        </p>
        <p>
          All of that runs client-side, in WebAssembly, on your device&rsquo;s GPU where
          available.
        </p>
      </Section>

      <Section heading="What happens to your video">
        <p>
          Nothing leaves your device. Frames are read from the camera, analysed in memory,
          and discarded — they are never uploaded, never written to disk, and never stored.
          What we persist is the derived numbers: rep counts, form scores, joint-angle
          summaries, session timestamps.
        </p>
        <p>
          This is an architectural property, not a policy promise. Open your browser&rsquo;s
          network tab during a session; you will not see frames going anywhere.
        </p>
      </Section>

      <Section heading="Honest limitations">
        <p>
          Accuracy depends on lighting, camera angle and clothing. A single 2D camera
          cannot measure everything a human coach sees — it infers depth rather than
          measuring it, and loose clothing can confuse landmark detection. Best results
          come from an even light source, your whole body in frame, and fitted clothes.
        </p>
        <p>
          This is a training aid, not a medical device or a substitute for qualified
          instruction. If a movement causes pain, stop.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Bug reports and feature requests are welcome — reach us through the repository
          issue tracker for this project.
        </p>
      </Section>
    </MarketingPageShell>
  );
}
