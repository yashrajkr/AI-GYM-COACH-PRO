import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { getSiteUrl } from "@/lib/config/site-url";

interface WelcomeEmailProps {
  name?: string;
  email: string;
}

/**
 * Welcome email — sent on signup.
 * Uses React Email components (rendered to HTML by Resend).
 */
export function WelcomeEmail({ name, email }: WelcomeEmailProps) {
  const firstName = name?.split(" ")[0] || "there";
  // Rendered server-side by Resend, so the real origin is available here.
  // This link used to be hardcoded to a domain the project doesn't own.
  const siteUrl = getSiteUrl();

  return (
    <Html>
      <Head />
      <Preview>Welcome to AI Gym Coach Pro — your AI personal trainer is ready 🎯</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Welcome to AI Gym Coach Pro, {firstName}! 💪</Heading>
          <Text style={text}>
            Your account is ready. You're joining thousands of users who train smarter with
            real-time AI form coaching — no gym, no personal trainer, just your webcam and 30 seconds.
          </Text>

          <Section style={section}>
            <Text style={{ ...text, marginBottom: "12px" }}>Here's what you can do right now:</Text>
            <Text style={listItem}>🎯 <strong>Start a workout</strong> — pick from 8 exercises with AI form detection</Text>
            <Text style={listItem}>📊 <strong>Track progress</strong> — see your form accuracy improve over time</Text>
            <Text style={listItem}>🏆 <strong>Earn badges</strong> — level up with XP, streaks, and achievements</Text>
            <Text style={listItem}>🔒 <strong>Privacy-first</strong> — your video never leaves your device</Text>
          </Section>

          <Button style={button} href={`${siteUrl}/#/dashboard`}>
            Start Your First Workout →
          </Button>

          <Hr style={hr} />
          <Text style={{ ...text, fontSize: "12px", color: "#71717a" }}>
            You signed up with <strong>{email}</strong>. If this wasn't you, you can safely ignore this email.
          </Text>
          <Text style={{ ...text, fontSize: "12px", color: "#71717a" }}>
            — The AI Gym Coach Pro team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#050608", fontFamily: "Inter, system-ui, sans-serif", padding: "20px" };
const container = { maxWidth: "560px", margin: "0 auto", backgroundColor: "#0f1117", borderRadius: "12px", padding: "32px" };
const heading = { color: "#a3e635", fontSize: "24px", fontWeight: 700, marginBottom: "16px" };
const text = { color: "#e8edf2", fontSize: "14px", lineHeight: "1.6", margin: "12px 0" };
const section = { backgroundColor: "#1a1d24", borderRadius: "8px", padding: "16px", margin: "20px 0" };
const listItem = { color: "#e8edf2", fontSize: "13px", lineHeight: "1.8", margin: "4px 0" };
const button = { backgroundColor: "#a3e635", color: "#050608", fontSize: "14px", fontWeight: 600, padding: "12px 24px", borderRadius: "8px", textDecoration: "none", display: "inline-block", margin: "20px 0" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
