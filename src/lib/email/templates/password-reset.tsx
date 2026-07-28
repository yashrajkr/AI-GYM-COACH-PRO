import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

interface PasswordResetEmailProps {
  email: string;
  resetUrl: string;
}

/**
 * Password reset email — sent when user requests a password reset.
 * The resetUrl contains a one-time token that expires in 1 hour.
 */
export function PasswordResetEmail({ email, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your AI Gym Coach Pro password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Reset Your Password 🔐</Heading>
          <Text style={text}>
            We received a request to reset the password for your AI Gym Coach Pro account.
          </Text>
          <Text style={text}>
            Click the button below to set a new password. This link expires in 1 hour.
          </Text>

          <Button style={button} href={resetUrl}>
            Reset Password →
          </Button>

          <Section style={{ ...section, marginTop: "24px" }}>
            <Text style={{ ...text, fontSize: "12px", color: "#71717a" }}>
              If the button doesn't work, copy and paste this URL into your browser:
            </Text>
            <Text style={{ ...text, fontSize: "12px", color: "#a3e635", wordBreak: "break-all" }}>
              {resetUrl}
            </Text>
          </Section>

          <Hr style={hr} />
          <Text style={{ ...text, fontSize: "12px", color: "#71717a" }}>
            If you didn't request a password reset, you can safely ignore this email — your password hasn't changed.
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
const heading = { color: "#a3e635", fontSize: "22px", fontWeight: 700, marginBottom: "16px" };
const text = { color: "#e8edf2", fontSize: "14px", lineHeight: "1.6", margin: "12px 0" };
const section = { backgroundColor: "#1a1d24", borderRadius: "8px", padding: "16px" };
const button = { backgroundColor: "#a3e635", color: "#050608", fontSize: "14px", fontWeight: 600, padding: "12px 24px", borderRadius: "8px", textDecoration: "none", display: "inline-block", margin: "20px 0" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
