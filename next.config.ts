import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Serve clean markdown variants of idea pages for LLM crawlers and
      // end-user agents fetching a citation. The canonical HTML route
      // continues to live at /ideas/{slug} via app/ideas/[slug]/page.tsx;
      // this rewrite exposes a parallel /ideas/{slug}.md URL that returns
      // the markdown body produced by app/api/ideas/[slug]/md/route.ts.
      // Using a rewrite (rather than defining a literal `[slug].md`
      // directory) avoids Next's dynamic-segment collision with the HTML
      // route and keeps routing behavior predictable.
      {
        source: "/ideas/:slug.md",
        destination: "/api/ideas/:slug/md",
      },
    ]
  },
}

export default nextConfig
