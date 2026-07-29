import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config/site-url";

/**
 * Generated at request time so `Sitemap:` always points at the origin the app
 * is actually served from.
 *
 * Replaces the old static `public/robots.txt`, which hardcoded
 * `https://aigymcoachpro.com/sitemap.xml` — a domain this project does not
 * own, so crawlers were pointed at someone else's site.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Hash routes (#/login) are never sent to the server, so they can't be
        // crawled or disallowed — only the API paths are meaningful here.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
