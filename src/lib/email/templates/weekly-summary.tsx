import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

interface WeeklySummaryEmailProps {
  name?: string;
  email: string;
  workoutsThisWeek: number;
  totalReps: number;
  avgFormScore: number;
  xpEarned: number;
  streak: number;
}

/**
 * Weekly summary email — sent every Monday to active users.
 * Shows the user's past week of training.
 */
export function WeeklySummaryEmail({
  name,
  email,
  workoutsThisWeek,
  totalReps,
  avgFormScore,
  xpEarned,
  streak,
}: WeeklySummaryEmailProps) {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>{`Your week in training: ${workoutsThisWeek} workouts, ${totalReps} reps 💪`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Your Week in Training, {firstName} 📊</Heading>

          {workoutsThisWeek === 0 ? (
            <Section>
              <Text style={text}>
                You didn't work out this week — but that's OK! Tomorrow is a fresh start.
                Even 5 minutes of bodyweight squats counts.
              </Text>
              <Button style={button} href="https://aigymcoachpro.com/#/dashboard">
                Start a Quick Workout →
              </Button>
            </Section>
          ) : (
            <>
              <Section style={section}>
                <Text style={{ ...text, marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                  This week you completed:
                </Text>
                <Text style={statLine}>💪 <strong>{workoutsThisWeek}</strong> workout{workoutsThisWeek !== 1 ? "s" : ""}</Text>
                <Text style={statLine}>🎯 <strong>{totalReps}</strong> total reps</Text>
                <Text style={statLine}>📈 <strong>{avgFormScore}</strong>/100 average form score</Text>
                <Text style={statLine}>⭐ <strong>+{xpEarned}</strong> XP earned</Text>
                {streak > 0 && (
                  <Text style={statLine}>🔥 <strong>{streak}</strong> day streak — keep it going!</Text>
                )}
              </Section>

              <Button style={button} href="https://aigymcoachpro.com/#/analytics">
                See Full Analytics →
              </Button>
            </>
          )}

          <Hr style={hr} />
          <Text style={{ ...text, fontSize: "12px", color: "#71717a" }}>
            Sent to {email}. Reply to this email if you have questions.
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
const section = { backgroundColor: "#1a1d24", borderRadius: "8px", padding: "20px", margin: "20px 0" };
const statLine = { color: "#e8edf2", fontSize: "15px", lineHeight: "2", margin: "4px 0" };
const button = { backgroundColor: "#a3e635", color: "#050608", fontSize: "14px", fontWeight: 600, padding: "12px 24px", borderRadius: "8px", textDecoration: "none", display: "inline-block", margin: "20px 0" };
const hr = { borderColor: "#27272a", margin: "24px 0" };
