"use client";

import posthog from "posthog-js";

/**
 * Analytics helper — wraps PostHog calls so they're safe no-ops
 * if PostHog isn't initialized (e.g. no env key set).
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("workout_started", { exercise: "squat" });
 */

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, properties);
  } catch {
    // PostHog not initialized — silent no-op
  }
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, properties);
  } catch {
    // PostHog not initialized — silent no-op
  }
}

export function reset() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    // PostHog not initialized — silent no-op
  }
}
