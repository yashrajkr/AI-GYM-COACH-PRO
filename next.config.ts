import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces a self-contained server build for Docker.
  // Vercel handles this automatically — the option is harmless on Vercel.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,

  // Allow Next.js Image to load avatars from OAuth providers (Google/GitHub).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  // Allow the preview iframe to load the app
  // (The preview panel is an iframe — X-Frame-Options: DENY blocks it)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Use SAMEORIGIN instead of DENY so the preview iframe works
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },

  // Dev-server only: hosts allowed to load /_next/* cross-origin. Has no
  // effect on a production build. (The scaffold shipped with two third-party
  // preview domains listed here; they are gone because nothing in this project
  // serves from them.)
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
