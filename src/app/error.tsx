"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Copy } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Lazy-load Sentry only on the client to avoid SSR issues.
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error);
      })
      .catch(() => {
        // Sentry not configured — fall back to console.error.
        console.error("[unhandled]", error);
      });
  }, [error]);

  const copyDetails = async () => {
    const details = `Error: ${error.message}\nDigest: ${error.digest || "n/a"}\nStack: ${error.stack || "n/a"}\nURL: ${typeof window !== "undefined" ? window.location.href : "n/a"}\nTime: ${new Date().toISOString()}`;
    try {
      await navigator.clipboard.writeText(details);
    } catch {
      // Clipboard may be unavailable (permissions, insecure context).
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        An unexpected error occurred. The details below have been logged
        automatically — you can copy them to share with support.
      </p>
      <pre className="text-left text-xs bg-muted/50 rounded-lg p-4 max-w-md w-full overflow-auto mb-6 font-mono">
        <div>{error.message}</div>
        {error.digest && <div className="text-muted-foreground mt-2">digest: {error.digest}</div>}
      </pre>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Try again
        </Button>
        <Button variant="outline" onClick={copyDetails}>
          <Copy className="mr-2 h-4 w-4" /> Copy details
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
