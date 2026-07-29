import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config/site-url";

/**
 * Generated at request time so entries always match the serving origin.
 *
 * Replaces the old static `public/sitemap.xml`, which listed
 * `https://aigymcoachpro.com/...`.
 *
 * Only real, server-rendered routes are listed. The previous file also
 * submitted hash URLs (`/#/dashboard`, `/#/analytics`), which are not separate
 * documents — a fragment is never sent to the server, so every one of those
 * entries resolved to `/` and was a duplicate. Two of them were also
 * authenticated views that shouldn't be indexed at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/blog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
