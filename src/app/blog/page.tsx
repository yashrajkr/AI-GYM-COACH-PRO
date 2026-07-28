import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Blog — AI Gym Coach Pro",
  description:
    "Notes on form, pose estimation and training technique from the team building AI Gym Coach Pro.",
  alternates: { canonical: "/blog" },
};

/**
 * Post index.
 *
 * Deliberately a small typed array rather than a CMS: there is no content
 * pipeline in this project yet, and an empty page that renders honestly beats
 * a fake list of links that 404. Add entries here (and a route under
 * /blog/[slug]) as posts are actually written.
 */
const POSTS: { slug: string; title: string; excerpt: string; date: string }[] = [];

export default function BlogPage() {
  return (
    <MarketingPageShell
      title="Blog"
      subtitle="Notes on form, pose estimation, and training technique."
    >
      {POSTS.length === 0 ? (
        <div className="rounded-xl border border-border bg-background/40 p-8 text-center">
          <p className="text-sm text-foreground font-medium mb-2">No posts yet.</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We are writing the first few — on how joint-angle scoring works, why depth is
            the hardest thing to judge from a single camera, and what the form score
            actually measures.
          </p>
          <Link
            href="/about"
            className="inline-flex items-center justify-center h-11 px-5 mt-6 rounded-lg bg-lime text-background text-sm font-semibold hover:bg-lime/90 transition-colors"
          >
            Read how it works instead
          </Link>
        </div>
      ) : (
        <ul className="space-y-6">
          {POSTS.map((post) => (
            <li key={post.slug} className="border-b border-border/50 pb-6 last:border-0">
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="text-lg font-semibold text-foreground group-hover:text-lime transition-colors">
                  {post.title}
                </h2>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
                  {post.date}
                </p>
                <p className="mt-2">{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MarketingPageShell>
  );
}
