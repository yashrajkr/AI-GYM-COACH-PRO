/**
 * Single source of truth for the app's public origin.
 *
 * SERVER-ONLY. Reads unprefixed Vercel system env vars, so never import this
 * into a client component — call it in metadata, route handlers, or email
 * rendering and pass the string down.
 *
 * Why this exists: the origin was previously derived inline in `layout.tsx`
 * and hardcoded in robots.txt / sitemap.xml / the email templates, and the
 * three disagreed. In production that shipped:
 *
 *   - canonical + og:image pointing at NEXT_PUBLIC_VERCEL_URL, which is the
 *     *per-deployment* host (ai-gym-coach-<hash>-<team>.vercel.app). It changes
 *     on every deploy, so canonical URLs churned and social scrapers fetched
 *     og-image.png from a host that can sit behind deployment protection.
 *   - robots.txt + sitemap.xml advertising `aigymcoachpro.com`, a domain the
 *     project does not own.
 *
 * Priority below is deliberate: an explicit override first, then Vercel's
 * STABLE production alias, and only then the per-deployment host (which is
 * genuinely the right answer for preview deployments).
 */

/** Normalize to `https://host` with no trailing slash. */
function normalize(raw: string): string {
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  // 1. Explicit override — always wins. Set this once you have a real domain.
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalize(process.env.NEXT_PUBLIC_SITE_URL);
  }

  // 2. Vercel's stable production alias (e.g. ai-gym-coach-pro.vercel.app).
  //    Present on every Vercel deployment, and does NOT change per deploy.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  // 3. Per-deployment host. Correct for previews, where there is no alias.
  const deploymentUrl =
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (deploymentUrl) {
    return normalize(deploymentUrl);
  }

  // 4. Local dev. Deliberately NOT a placeholder domain — emitting a URL the
  //    project doesn't control is worse than emitting an obviously local one.
  return process.env.NEXTAUTH_URL
    ? normalize(process.env.NEXTAUTH_URL)
    : "http://localhost:3000";
}
