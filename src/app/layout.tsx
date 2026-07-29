import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { HydrationSafe } from "@/components/hydration-safe";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChunkErrorHandler } from "@/components/chunk-error-handler";
import { getSiteUrl } from "@/lib/config/site-url";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Gym Coach Pro — Real-time AI Form Coaching",
  description:
    "Browser-native AI fitness coach. Real-time pose detection, voice coaching, adaptive workout programs, and progress analytics. No video leaves your device.",
  keywords: [
    "AI gym coach",
    "pose detection",
    "form coaching",
    "fitness app",
    "workout tracker",
    "MediaPipe",
    "personal trainer AI",
    "exercise form checker",
  ],
  authors: [{ name: "AI Gym Coach Pro" }],
  creator: "AI Gym Coach Pro",
  // Absolute base for canonical + OG/Twitter image URLs. See `getSiteUrl`:
  // this used to prefer NEXT_PUBLIC_VERCEL_URL, which is the per-deployment
  // host, so canonical changed on every deploy and og:image pointed at a URL
  // social scrapers may not be able to reach.
  metadataBase: new URL(getSiteUrl()),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      // 32px first — browsers pick the smallest adequate size for the tab,
      // and downscaling the 192 gave a muddy favicon.
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Coach Pro",
  },
  openGraph: {
    title: "AI Gym Coach Pro — The only AI coach that watches your form",
    description: "Your camera tracks 33 body landmarks at 30 FPS. The AI scores every rep and speaks coaching cues — all in your browser, no video leaves your device.",
    type: "website",
    locale: "en_US",
    siteName: "AI Gym Coach Pro",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Gym Coach Pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Gym Coach Pro — Real-time AI Form Coaching",
    description: "The only AI coach that watches your form and corrects it in real time. Browser-native, privacy-first.",
    images: ["/og-image.png"],
    creator: "@aigymcoachpro",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "fitness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Inline theme script — runs BEFORE hydration to set the `dark` class
          on <html> so the first paint matches the user's saved preference.
          `next-themes` stores under `gym-coach-theme` as `{"theme":"dark","resolvedTheme":"dark"}`
          (NOT the Zustand `{"state":{"theme":...}}` shape — that was the old bug).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('gym-coach-theme');
                  var theme = 'dark';
                  if (raw) {
                    try {
                      var parsed = JSON.parse(raw);
                      theme = parsed.theme || parsed.state?.theme || 'dark';
                    } catch (e) { theme = 'dark'; }
                  }
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (theme === 'system' && systemDark);
                  if (isDark) document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }

                // Strip browser-extension attributes that cause hydration mismatches.
                // MutationObserver is heavy — only run it briefly after load.
                var attrsToStrip = ['fdprocessedid', 'data-lt-installed', 'data-adblock', 'cwtemp'];
                var stripOnce = function() {
                  var sel = '[' + attrsToStrip.join('], [') + ']';
                  var els = document.querySelectorAll(sel);
                  for (var i = 0; i < els.length; i++) {
                    for (var j = 0; j < attrsToStrip.length; j++) {
                      els[i].removeAttribute(attrsToStrip[j]);
                    }
                  }
                };
                stripOnce();
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      if (mutations[i].type === 'attributes') {
                        var attr = mutations[i].attributeName;
                        if (attr && attrsToStrip.indexOf(attr) !== -1) {
                          mutations[i].target.removeAttribute(attr);
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: attrsToStrip
                  });
                  // Disconnect after 3s — hydration is done by then.
                  setTimeout(function() { observer.disconnect(); }, 3000);
                }
              })();
            `,
          }}
        />
        {/* Razorpay checkout.js — loaded conditionally via the components that need it.
            We load it here so it's available when the settings/pricing buttons call
            `new window.Razorpay(options)`. Only loads in production (dev doesn't need it). */}
        {process.env.NEXT_PUBLIC_RAZORPAY_ENABLED === "true" && (
          <script
            src="https://checkout.razorpay.com/v1/checkout.js"
            async
          />
        )}
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AI Gym Coach Pro",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web Browser",
              "description": "Browser-native AI fitness coach with real-time pose detection, voice coaching, and adaptive workout programs.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                { "@type": "Question", "name": "Do I need a special camera?", "acceptedAnswer": { "@type": "Answer", "text": "No. Any laptop or phone webcam works." } },
                { "@type": "Question", "name": "Does my video leave my device?", "acceptedAnswer": { "@type": "Answer", "text": "No. All pose detection runs in your browser via MediaPipe." } },
                { "@type": "Question", "name": "Which browsers are supported?", "acceptedAnswer": { "@type": "Answer", "text": "Chrome 90+, Edge 90+, Firefox 90+, and Safari 15+." } },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          storageKey="gym-coach-theme"
        >
          <SessionProvider>
            <PostHogProvider>
              {/* Auto-reloads the page once if a lazy-loaded chunk fails to fetch.
                  Handles dev-server cache misses + production deploys where old
                  tabs hold stale chunk URLs. */}
              <ChunkErrorHandler />
              <HydrationSafe>
                <ErrorBoundary>
                  <a href="#main-content" className="skip-link">Skip to content</a>
                  {children}
                </ErrorBoundary>
              </HydrationSafe>
              <Toaster />
            </PostHogProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
