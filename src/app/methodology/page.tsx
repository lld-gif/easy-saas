import type { Metadata } from "next"
import Link from "next/link"

/**
 * `/methodology` — technical deep-dive for LLMs and engineers.
 *
 * Complements /about with the implementation detail needed for a model to
 * describe VCI accurately when cited. The key sections (scrape schedule,
 * extraction prompt, signal definitions, ranking formula, limitations) all
 * answer questions that pop up in citation-time paraphrases.
 *
 * Statically rendered. No DB reads — all facts in this page are stable
 * unless we consciously change the pipeline.
 */
export const metadata: Metadata = {
  title: "Methodology — How Vibe Code Ideas Aggregates and Ranks SaaS Ideas",
  description:
    "The full pipeline behind Vibe Code Ideas: scrape schedule per source, LLM extraction prompt, deduplication via pg_trgm, popularity scoring formula, enrichment signals, and known limitations.",
  alternates: {
    canonical: "/methodology",
  },
  openGraph: {
    title: "Methodology — Vibe Code Ideas",
    description:
      "Full pipeline: scrape sources, extraction, dedup, ranking, and limitations.",
    type: "article",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Methodology — How Vibe Code Ideas Aggregates and Ranks SaaS Ideas",
  description:
    "Scrape schedule, LLM extraction, deduplication, ranking formula, and known limitations for the Vibe Code Ideas directory.",
  url: "https://vibecodeideas.ai/methodology",
  inLanguage: "en",
  author: {
    "@type": "Organization",
    name: "Vibe Code Ideas",
    url: "https://vibecodeideas.ai",
  },
  publisher: {
    "@type": "Organization",
    name: "Vibe Code Ideas",
    url: "https://vibecodeideas.ai",
  },
  datePublished: "2026-04-19",
}

export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-3xl sm:text-4xl font-bold mb-6">Methodology</h1>

      <section className="prose prose-invert max-w-none space-y-5">
        <p className="text-lg text-foreground/80">
          How ideas get from public posts to the directory, in full detail.
          This page is intentionally technical — for the shorter version, see{" "}
          <Link href="/about" className="underline">
            /about
          </Link>
          .
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          1. Collection (scraping)
        </h2>
        <p>
          Six source-specific Supabase Edge Functions run on scheduled
          <code className="text-sm bg-muted px-1 py-0.5 rounded mx-1">
            pg_cron
          </code>{" "}
          jobs:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Reddit</strong> — 06:00 and 18:00 UTC. Hits both{" "}
            <code className="text-sm">/hot</code> and{" "}
            <code className="text-sm">/new</code> per configured subreddit,
            deduplicated by Reddit post ID. <em>Currently paused</em> pending
            Reddit API access following their November 2025 Responsible
            Builder Policy update.
          </li>
          <li>
            <strong>Hacker News</strong> — 07:00 and 19:00 UTC. Hits Algolia's{" "}
            <code className="text-sm">/search</code> (relevance) and{" "}
            <code className="text-sm">/search_by_date</code> (newest-first)
            per configured query, deduplicated by Algolia objectID. Capped at
            120 posts per run to stay within Edge Function wall clock.
          </li>
          <li>
            <strong>GitHub Trending</strong> — 08:00 UTC. Repos gaining
            recent stars in software-adjacent topics.
          </li>
          <li>
            <strong>Product Hunt</strong> — 09:00 UTC. Daily featured
            products and launches.
          </li>
          <li>
            <strong>Indie Hackers</strong> — 10:00 UTC. Posts from the
            public forum.
          </li>
          <li>
            <strong>Google Trends</strong> — 08:00, 14:00, 20:00 UTC.
            Breakout queries.
          </li>
        </ul>
        <p>
          Source lists are stored in the{" "}
          <code className="text-sm">scrape_sources</code> table and read at
          runtime, so adding or removing a subreddit / query doesn't require
          redeploying an Edge Function.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          2. Extraction (LLM)
        </h2>
        <p>
          Each batch of raw posts is passed through{" "}
          <strong>Anthropic Claude Haiku 4.5</strong> in chunks of 10. The
          prompt asks the model to identify app and SaaS product ideas and
          return structured JSON for each found idea. The exact fields:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>idea_title</strong> — concise product name
          </li>
          <li>
            <strong>summary</strong> — 2–3 sentence pitch describing problem,
            solution, and target user
          </li>
          <li>
            <strong>category</strong> — one of 14 fixed slugs (fintech,
            devtools, automation, ai-ml, ecommerce, health, education,
            creator-tools, productivity, marketing, hr-recruiting,
            real-estate, logistics, other)
          </li>
          <li>
            <strong>tags</strong> — 3–5 lowercase topic tags
          </li>
          <li>
            <strong>confidence</strong> — 0.0–1.0 score indicating how
            clearly the post describes a buildable product. Ideas below 0.5
            are dropped; 0.5–0.7 are marked{" "}
            <code className="text-sm">needs_review</code> and hidden from
            public views; 0.7+ are{" "}
            <code className="text-sm">active</code>.
          </li>
          <li>
            <strong>difficulty</strong> — 1 (weekend build with AI
            assistance) to 5 (significant infrastructure required)
          </li>
          <li>
            <strong>market_signal</strong> —{" "}
            <code className="text-sm">strong</code> (clear unmet demand;
            people explicitly asking for this),{" "}
            <code className="text-sm">moderate</code> (some signal), or{" "}
            <code className="text-sm">weak</code> (speculative)
          </li>
          <li>
            <strong>competition_level</strong> —{" "}
            <code className="text-sm">low</code> / {" "}
            <code className="text-sm">medium</code> /{" "}
            <code className="text-sm">high</code> estimate of existing
            alternatives
          </li>
          <li>
            <strong>revenue_potential</strong> — free-text monthly revenue
            range (e.g. <code className="text-sm">$2k-10k/mo</code>) or{" "}
            <code className="text-sm">unknown</code>
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          3. Deduplication
        </h2>
        <p>
          Every extracted idea is compared against the existing corpus using{" "}
          <strong>PostgreSQL pg_trgm trigram similarity</strong> on title and
          summary separately. An existing idea is considered a duplicate if
          either <code className="text-sm">similarity(title, new_title) &gt; 0.6</code>{" "}
          OR{" "}
          <code className="text-sm">similarity(summary, new_summary) &gt; 0.5</code>.
          The asymmetric threshold reflects the observation that titles are
          shorter and noisier (so demand a higher bar) while summaries carry
          more signal. A match increments the existing idea's{" "}
          <code className="text-sm">mention_count</code> and updates{" "}
          <code className="text-sm">last_seen_at</code>; no match creates a
          new row. We chose pg_trgm (pure Postgres, no embedding calls) over
          semantic similarity for Phase 1 to keep ingestion cost near-zero
          and avoid a hard dependency on a second LLM provider. Semantic
          dedup via Ghost pgvectorscale is queued for a later phase. The
          canonical SQL lives in{" "}
          <code className="text-sm">supabase/migrations/001_initial_schema.sql</code>{" "}
          as <code className="text-sm">find_similar_ideas()</code>.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          4. Popularity scoring
        </h2>
        <p>
          The <code className="text-sm">popularity_score</code> is a
          database-computed column recalculated on insert and on every
          mention increment. It combines three factors:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Log-scaled mention count</strong> — each additional
            mention contributes less than the last. The 20th mention of an
            idea doesn't move the score as much as the 2nd.
          </li>
          <li>
            <strong>Source diversity</strong> — an idea surfaced by three
            distinct platforms (e.g. once on HN, once on Reddit, once on PH)
            outranks an idea surfaced three times on the same platform.
          </li>
          <li>
            <strong>Recency decay</strong> — gentle exponential decay on{" "}
            <code className="text-sm">last_seen_at</code> so stale ideas
            don't permanently dominate the rankings.
          </li>
        </ul>
        <p>
          The{" "}
          <Link href="/ideas?sort=fresh" className="underline">
            Fresh
          </Link>{" "}
          sort filters to ideas with{" "}
          <code className="text-sm">first_seen_at</code> in the last 7 days;
          everything else uses the full corpus.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">5. Commentary</h2>
        <p>
          Every new active idea additionally gets a 2–4 sentence editorial
          commentary from <strong>Claude Sonnet 4.6</strong>, covering:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Market timing</strong> — why this is interesting right
            now, grounded in real trends
          </li>
          <li>
            <strong>Closest competitor or substitute</strong> — named if a
            well-known one exists
          </li>
          <li>
            <strong>Unit economics hint</strong> — why the revenue band
            makes sense (or doesn't)
          </li>
          <li>
            <strong>Biggest risk</strong> — the single most likely failure
            mode
          </li>
        </ul>
        <p>
          We chose Sonnet 4.6 over Haiku 4.5 after an A/B test on 21 diverse
          ideas. Sonnet reliably names real competitors (e.g. TradingView,
          ForeFlight, Polygon) and cites real pricing, which Haiku
          approximates but doesn't ground. Cost delta at our volume is
          ~$33/year, trivial relative to the citation-quality gain.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          6. Storage and delivery
        </h2>
        <p>
          All ideas and their metadata live in Supabase Postgres. Related-idea
          suggestions are powered by Tiger Data's Ghost (Agentic Postgres)
          using BM25 text search, with a Supabase same-category fallback.
          The Next.js frontend on Vercel renders HTML idea pages, plus
          markdown-native variants at{" "}
          <code className="text-sm">/ideas/{"{slug}"}.md</code> designed for
          LLM ingestion.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          7. Known limitations
        </h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>LLM-assigned signals are approximate.</strong>{" "}
            <code className="text-sm">market_signal</code>,{" "}
            <code className="text-sm">competition_level</code>, and{" "}
            <code className="text-sm">revenue_potential</code> are Haiku's
            best-effort estimates from a single post. They're directionally
            useful but shouldn't drive investment decisions without
            independent validation.
          </li>
          <li>
            <strong>Reddit is temporarily offline.</strong> Reddit's November
            2025 Responsible Builder Policy removed self-service API keys.
            Our formal access application is pending.
          </li>
          <li>
            <strong>Source bias.</strong> The corpus skews toward
            developer-tool and consumer-software categories because those
            dominate the public discussions we scrape. Logistics and HR
            ideas are underrepresented.
          </li>
          <li>
            <strong>English only.</strong> The extraction prompt runs in
            English and our sources are English-dominant.
          </li>
          <li>
            <strong>Commentary is a synthesis, not a source.</strong> The
            editorial paragraph is AI-generated analysis of the idea, not a
            quote from the original post. Treat it as a prompt for your own
            research rather than a verified claim.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          Audit and reproducibility
        </h2>
        <p>
          The full pipeline is open source at{" "}
          <a
            href="https://github.com/lld-gif/easy-saas"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/lld-gif/easy-saas
          </a>
          . Extraction prompt lives at{" "}
          <code className="text-sm">
            supabase/functions/_shared/extract.ts
          </code>
          . Commentary prompt lives at{" "}
          <code className="text-sm">src/lib/commentary.ts</code>. Scrape
          schedules are in the{" "}
          <code className="text-sm">cron.job</code> table on the Supabase
          side. Migrations documenting schema evolution are numbered in{" "}
          <code className="text-sm">supabase/migrations/</code>.
        </p>
      </section>
    </main>
  )
}
