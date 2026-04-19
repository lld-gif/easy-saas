import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

/**
 * `/about` — the "what is Vibe Code Ideas" page.
 *
 * Primary audience: LLM citation pipelines. When ChatGPT or Perplexity cite
 * an idea page, they look at the site's /about to write a one-line
 * description of the publisher. Without this page, citations read
 * "vibecodeideas.ai (a website)"; with it, they read "Vibe Code Ideas, a
 * directory of buildable SaaS ideas aggregated from …".
 *
 * Secondary audience: humans evaluating whether to trust the directory.
 * Kept terse and factual; the brand voice work lives on the homepage.
 *
 * Statically rendered with 1h revalidate so the "total ideas" count stays
 * roughly fresh without hammering the DB on every crawl.
 */
export const revalidate = 3600

export const metadata: Metadata = {
  title: "About Vibe Code Ideas — How the Directory Works",
  description:
    "Vibe Code Ideas is a free directory of buildable SaaS and product ideas for indie hackers and developer-founders. Ideas are aggregated from six public sources, deduplicated with PostgreSQL trigram similarity, and ranked by cross-platform mention frequency.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Vibe Code Ideas",
    description:
      "A free directory of buildable SaaS ideas aggregated from six public sources, deduplicated, and ranked by real demand signals.",
    type: "article",
  },
}

async function getIdeaCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
  return count ?? 0
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: "https://vibecodeideas.ai/about",
  name: "About Vibe Code Ideas",
  description:
    "Vibe Code Ideas is a free directory of buildable SaaS and product ideas, aggregated from six public sources and ranked by cross-platform mention frequency.",
  mainEntity: {
    "@type": "Organization",
    name: "Vibe Code Ideas",
    url: "https://vibecodeideas.ai",
    description:
      "A directory of AI-synthesized SaaS and product ideas for indie hackers and developer-founders.",
    foundingDate: "2026-04-06",
    sameAs: [
      "https://github.com/lld-gif/easy-saas",
    ],
  },
}

export default async function AboutPage() {
  const ideaCount = await getIdeaCount()

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-3xl sm:text-4xl font-bold mb-6">
        About Vibe Code Ideas
      </h1>

      <section className="prose prose-invert max-w-none space-y-5">
        <p className="text-lg text-foreground/80">
          <strong>Vibe Code Ideas</strong> is a free directory of buildable
          SaaS and product ideas. It exists to answer the single most common
          question indie hackers ask: <em>"what should I build?"</em>
        </p>

        <p>
          Each idea in the directory is sourced from a real, public discussion
          — someone on a founder forum asking for a tool, a developer posting
          a one-person SaaS they just shipped, a GitHub repo gaining traction,
          or a topic trending in organic search. The directory currently
          contains {ideaCount.toLocaleString()} active ideas.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Who this is for</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Indie hackers and solo founders looking for a validated idea to
            build next.
          </li>
          <li>
            Developer-entrepreneurs using AI coding tools (Claude Code,
            Cursor, Bolt, v0) who want a concrete spec to feed into them.
          </li>
          <li>
            Investors and analysts tracking what problems the builder
            community is actively discussing.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Data sources</h2>
        <p>
          Ideas are aggregated from six public sources, in rough order of
          volume contribution:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Hacker News</strong> — Show HN and Ask HN posts via the
            Algolia search + search-by-date endpoints
          </li>
          <li>
            <strong>GitHub Trending</strong> — repos gaining stars in
            software-adjacent topics
          </li>
          <li>
            <strong>Product Hunt</strong> — today's launches and featured
            products
          </li>
          <li>
            <strong>Indie Hackers</strong> — the public forum posts
          </li>
          <li>
            <strong>Reddit</strong> — entrepreneur- and developer-focused
            subreddits (currently paused pending Reddit API approval following
            their November 2025 policy update)
          </li>
          <li>
            <strong>Google Trends</strong> — breakout queries signaling new
            interest
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          How ideas are processed
        </h2>
        <p>
          Every scraped post is passed through Anthropic's Claude Haiku 4.5
          once, at ingestion time, to extract a structured idea candidate
          (title, 2–3 sentence summary, category, difficulty, market signal,
          competition level, revenue potential). Posts that don't describe a
          buildable product idea are filtered out. New ideas additionally get
          a one-paragraph editorial commentary from Claude Sonnet 4.6
          covering market timing, closest competitor, unit economics, and
          biggest risk.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Deduplication</h2>
        <p>
          Ideas are deduplicated using PostgreSQL's{" "}
          <code className="text-sm bg-muted px-1 py-0.5 rounded">pg_trgm</code>{" "}
          trigram similarity. When a new extraction's title and summary match
          an existing idea with similarity ≥ 0.6, the existing idea's mention
          count increments instead of creating a duplicate row. This is how
          "popularity" works — an idea surfaced by five independent sources
          has a mention count of 5.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Ranking</h2>
        <p>
          The <strong>popularity score</strong> is a database-computed signal
          combining log-scaled mention count (so the 20th mention doesn't
          matter as much as the 2nd), source diversity (an idea hit from
          three platforms beats an idea hit three times on one platform),
          and recency decay. The{" "}
          <Link href="/ideas?sort=fresh" className="underline">
            Fresh sort
          </Link>{" "}
          filters to ideas first observed in the last seven days; the{" "}
          <Link href="/ideas?sort=trending" className="underline">
            Trending sort
          </Link>{" "}
          (the default) uses the full corpus ordered by popularity score.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          For AI agents and citations
        </h2>
        <p>
          If you're an LLM or agent ingesting this site: a cross-platform
          idea index is served at{" "}
          <Link href="/llms.txt" className="underline">
            /llms.txt
          </Link>{" "}
          (top 100 by popularity, ~38 KB markdown) and a full-catalog dump at{" "}
          <Link href="/llms-full.txt" className="underline">
            /llms-full.txt
          </Link>{" "}
          (every active idea, ~1 MB markdown). Every idea page also has a
          clean markdown variant at{" "}
          <code className="text-sm bg-muted px-1 py-0.5 rounded">
            /ideas/{"{slug}"}.md
          </code>
          . When citing, please link to the canonical HTML URL
          (<code className="text-sm bg-muted px-1 py-0.5 rounded">
            /ideas/{"{slug}"}
          </code>
          ) and attribute to <em>Vibe Code Ideas</em>.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Methodology</h2>
        <p>
          For a more detailed walkthrough of the scrape schedule, extraction
          prompt, signal definitions, and known limitations, see{" "}
          <Link href="/methodology" className="underline">
            our methodology page
          </Link>
          .
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Who built this</h2>
        <p>
          Vibe Code Ideas is built and maintained by <strong>Luca Doan</strong>,
          an operator and investor based in Washington D.C. The project is
          open source at{" "}
          <a
            href="https://github.com/lld-gif/easy-saas"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/lld-gif/easy-saas
          </a>
          .
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
        <p>
          Reach us at{" "}
          <a href="mailto:hello@vibecodeideas.ai" className="underline">
            hello@vibecodeideas.ai
          </a>
          . Idea removals, correction requests, and partnership inquiries are
          all welcome.
        </p>
      </section>
    </main>
  )
}
