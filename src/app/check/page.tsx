import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { getRelatedIdeas } from "@/lib/ghost/queries"
import { getCategoryBySlug } from "@/lib/categories"

/**
 * /check — "Has someone already built this?"
 *
 * Standalone search tool that takes a free-text idea description and
 * matches it against the 2,300+ active ideas using the existing Ghost
 * hybrid BM25 + vector search infrastructure. Shipped as a separate
 * surface from the main /ideas browser because the user intent is
 * different ("is my idea taken?" vs "show me ideas to build"). That
 * intent makes it a shareable artifact — people paste their idea on
 * Twitter / HN / Reddit, then drop a link to their /check?q=... result
 * page as the punchline. Every share is a backlink.
 *
 * Architecture:
 * - Server component.
 * - Query lives in the URL (?q=...) so results are bookmarkable and
 *   shareable. No client-side state.
 * - getRelatedIdeas() takes an idea-shape; we wrap the user's text in
 *   a sentinel-UUID "synthetic idea" so the function accepts it. The
 *   id != $2 exclusion clause is a no-op on the sentinel.
 * - Graceful empty state, graceful "nothing matched" state.
 * - revalidate=3600 since the catalog grows by ~20 ideas/day — results
 *   for a given query are essentially stable over an hour.
 */

export const revalidate = 3600

const SENTINEL_ID = "00000000-0000-0000-0000-000000000000"
const MAX_QUERY_LENGTH = 600
const RESULTS_LIMIT = 8

export const metadata: Metadata = {
  title: "Has someone already built your SaaS idea? — Vibe Code Ideas",
  description:
    "Paste your SaaS idea below. We'll match it against 2,300+ validated ideas pulled daily from Hacker News, GitHub, Product Hunt, and Google Trends. Hybrid semantic + keyword search — no signup required.",
  alternates: {
    canonical: "/check",
  },
  openGraph: {
    title: "Has someone already built your SaaS idea?",
    description:
      "Hybrid semantic search across 2,300+ crowdsourced SaaS ideas. Free, no signup.",
    type: "website",
    url: "https://vibecodeideas.ai/check",
  },
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CheckPage({ searchParams }: Props) {
  const params = await searchParams
  const rawQuery = (params.q ?? "").trim()
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH)
  const hasQuery = query.length >= 5

  // Run the search server-side so the response page is fully indexable.
  // Suspense wraps the results because the embedding round-trip (~200-400ms)
  // is the slowest piece — the form should paint instantly while results
  // stream in.
  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Has someone already built your SaaS idea?
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Paste your idea below. We&apos;ll match it against{" "}
          <strong className="text-foreground">2,300+ validated SaaS ideas</strong>{" "}
          pulled daily from Hacker News, GitHub, Product Hunt, and Google Trends.
        </p>
      </header>

      <form
        method="GET"
        action="/check"
        className="mb-10"
        aria-label="Check your idea"
      >
        <label htmlFor="q" className="sr-only">
          Describe your SaaS idea
        </label>
        <textarea
          id="q"
          name="q"
          rows={3}
          maxLength={MAX_QUERY_LENGTH}
          required
          defaultValue={query}
          placeholder="e.g. AI-powered code review for solo developers — catches logic bugs that linters miss"
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Free · No signup · {MAX_QUERY_LENGTH} char max
          </p>
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Check
          </button>
        </div>
      </form>

      {hasQuery && (
        <Suspense fallback={<ResultsSkeleton />}>
          <Results query={query} />
        </Suspense>
      )}

      {!hasQuery && <EmptyState />}
    </main>
  )
}

// ---------------------------------------------------------------------------
// Results component — runs the hybrid search
// ---------------------------------------------------------------------------

async function Results({ query }: { query: string }) {
  // Wrap the user's text in a synthetic idea so getRelatedIdeas accepts
  // it. The function uses idea.title for BM25 + ideaEmbeddingText
  // (title + summary) for the vector embedding. We put the whole query
  // in title and leave summary empty so a short query (e.g. "subscription
  // tracker") doesn't get noisy concatenation.
  const { ideas, source } = await getRelatedIdeas(
    {
      id: SENTINEL_ID,
      title: query,
      summary: "",
      category: "",
    },
    RESULTS_LIMIT
  )

  if (ideas.length === 0) {
    return <NoMatches query={query} />
  }

  // Verdict logic based on top similarity score. Hybrid scores are in
  // [0, 1] after normalization. Tuned by eye on test queries:
  //   - >= 0.70 → strong overlap (very likely built)
  //   - 0.40-0.70 → meaningful overlap (something close exists)
  //   - < 0.40 → light overlap (probably original-ish, browse for adjacent)
  const topScore = ideas[0]?.similarity ?? 0
  const verdict =
    topScore >= 0.7
      ? {
          label: "Likely already built",
          tone: "high",
          subtitle:
            "Multiple close matches. Read what's been tried and what's different about your angle.",
        }
      : topScore >= 0.4
        ? {
            label: "Some overlap exists",
            tone: "medium",
            subtitle:
              "A few adjacent ideas — none directly. Worth scanning the matches before you start.",
          }
        : {
            label: "Looks fairly original",
            tone: "low",
            subtitle:
              "Nothing close in the catalog. The closest matches below are loosely related.",
          }

  const verdictColor =
    verdict.tone === "high"
      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/60"
      : verdict.tone === "medium"
        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60"
        : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60"

  return (
    <div>
      {/* Verdict banner */}
      <div className={`rounded-xl border ${verdictColor} p-5 mb-6`}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="font-semibold text-foreground text-lg">{verdict.label}</p>
          <p className="text-sm font-medium text-muted-foreground">
            top match {Math.round(topScore * 100)}%
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {verdict.subtitle}
        </p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {ideas.length} closest match{ideas.length === 1 ? "" : "es"}
      </h2>

      <ol className="space-y-3">
        {ideas.map((idea, i) => {
          const cat = getCategoryBySlug(idea.category)
          const pct = idea.similarity ? Math.round(idea.similarity * 100) : null
          return (
            <li key={idea.id}>
              <Link
                href={`/ideas/${idea.slug}`}
                className="group block rounded-xl border border-border bg-card/40 hover:bg-card hover:border-orange-200 dark:hover:border-orange-800 transition-colors p-4"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono">
                      {i + 1}.
                    </span>
                    <h3 className="font-semibold text-foreground group-hover:text-orange-600 transition-colors truncate">
                      {idea.title}
                    </h3>
                  </div>
                  {pct !== null && (
                    <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
                      {pct}% match
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {idea.summary}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground">
                    {idea.mention_count} mentions
                  </span>
                  {idea.revenue_upper_usd && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-muted-foreground">
                        up to ${formatRevenue(idea.revenue_upper_usd)}/mo
                      </span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>

      <ShareFooter query={query} verdict={verdict.label} />

      {/* Tiny attribution so we can spot which backend served the results
          in case of weirdness. Renders as a muted footer. */}
      <p className="text-xs text-muted-foreground/60 text-center mt-8">
        powered by hybrid BM25 + vector search · {source}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="rounded-xl border border-border bg-muted/30 h-20" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-muted/20 h-24"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        Or browse the catalog directly:
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/ideas?sort=fresh"
          className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          Fresh this week
        </Link>
        <Link
          href="/ideas?sort=trending"
          className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          Trending now
        </Link>
        <Link
          href="/ideas?sort=revenue&revenue=10k"
          className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          $10k+/mo ceilings
        </Link>
        <Link
          href="/ideas?difficulty=easy"
          className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          Weekend builds
        </Link>
      </div>
    </div>
  )
}

function NoMatches({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-6 text-center">
      <p className="font-semibold text-foreground mb-2">No close matches.</p>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Either your idea is genuinely uncrowded territory, or the phrasing is so
        specific that nothing in the catalog matches keyword or vector-space.
        Try a more general description — &ldquo;{query.slice(0, 40)}
        {query.length > 40 ? "…" : ""}&rdquo; can be too narrow for the search to
        anchor.
      </p>
      <Link
        href="/ideas?sort=fresh"
        className="inline-block text-sm font-medium text-orange-600 hover:text-orange-500"
      >
        Browse the catalog directly →
      </Link>
    </div>
  )
}

function ShareFooter({ query, verdict }: { query: string; verdict: string }) {
  // Build a sharable URL so a tweet button doesn't have to know window.location.
  const url = `https://vibecodeideas.ai/check?q=${encodeURIComponent(query)}`
  const tweetText = `${verdict} — checked my SaaS idea against 2,300+ on Vibe Code Ideas:`
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`

  return (
    <div className="mt-8 pt-6 border-t border-border/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Share your result and help others sanity-check theirs:
        </p>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>
      </div>
    </div>
  )
}

function formatRevenue(usd: number): string {
  if (usd >= 1_000_000) return `${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000) return `${Math.round(usd / 1_000)}k`
  return String(usd)
}
