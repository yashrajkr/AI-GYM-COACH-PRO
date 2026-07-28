"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary — catches render errors and shows a graceful fallback
 * instead of a white screen. Reports to Sentry if configured.
 *
 * NOTE: Sentry is imported dynamically (not from `window.Sentry`) so the
 * report actually reaches Sentry's backend. The previous implementation
 * checked `(window as any).Sentry` which is never set by `@sentry/nextjs`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
    // Report to Sentry via the official SDK (not window.Sentry, which is
    // never set by @sentry/nextjs).
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error, { extra: { ...errorInfo } });
      })
      .catch(() => {
        // Sentry not installed / failed to load — already logged to console.
      });
  }

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const details = [
      `Error: ${error?.message || "unknown"}`,
      `Stack: ${error?.stack || "n/a"}`,
      `ComponentStack: ${errorInfo?.componentStack || "n/a"}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "n/a"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(details);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The app encountered an unexpected error. Your data is safe — try refreshing.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-muted/50 rounded-lg p-3 mb-4 overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-lime text-background hover:bg-lime/90"
            >
              Refresh Page
            </Button>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-2"
              >
                Try again
              </button>
              <button
                onClick={this.handleCopyError}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-2"
              >
                Copy details
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
