import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

/**
 * Shared chrome for the standalone marketing/legal pages (About, Blog,
 * Privacy, Terms…).
 *
 * These are plain server components on real routes rather than hash views
 * inside the SPA: they need to be linkable, crawlable, and reachable without
 * booting the app shell. The landing page's footer links straight to them.
 */
export function MarketingPageShell({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-lime/20 border border-lime/40 flex items-center justify-center">
              <Activity className="h-4 w-4 text-lime" />
            </div>
            <span className="font-bold tracking-tight text-sm group-hover:text-lime transition-colors">
              GYM COACH <span className="text-lime">PRO</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors h-11 px-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">{title}</h1>
        {subtitle && <p className="text-lg text-muted-foreground mb-2">{subtitle}</p>}
        {updated && (
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-8">
            Last updated {updated}
          </p>
        )}
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>

      <footer className="border-t border-border/30 mt-8">
        <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 AI Gym Coach Pro</span>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/about" className="hover:text-lime transition-colors">About</Link>
            <Link href="/blog" className="hover:text-lime transition-colors">Blog</Link>
            <Link href="/privacy" className="hover:text-lime transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-lime transition-colors">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Section heading used inside the shell's prose. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
