import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { PopularBadge } from "@/components/PopularBadge"
import { SignalBar } from "@/components/SignalBar"
import { PackageSection } from "@/components/PackageSection"
import { ShareButtons } from "@/components/ShareButtons"
import { RelatedIdeas } from "@/components/RelatedIdeas"
import {
  getIdeaBySlug,
  getAggregateStats,
} from "@/lib/queries"
import {
  signalToPercentile,
  signalToColor,
  revenueToPercentile,
  revenueToColor,
  isPopularScore,
} from "@/lib/signal-utils"
import { formatDate, displayMentions } from "@/lib/utils"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)
  if (!idea) return { title: "Idea Not Found — Vibe Code Ideas" }

  const canonicalPath = `/ideas/${idea.slug}`
  const absoluteUrl = `https://vibecodeideas.ai${canonicalPath}`

  return {
    title: `${idea.title} — Vibe Code Ideas`,
    description: idea.summary,
    alternates: {
      canonical: canonicalPath,
      types: {
        // Surface the markdown variant as an alternate representation so
        // agents that prefer markdown can discover it from the HTML page.
        "text/markdown": `${canonicalPath}.md`,
      },
    },
    openGraph: {
      title: `${idea.title} — Vibe Code Ideas`,
      description: idea.summary,
      siteName: "Vibe Code Ideas",
      url: absoluteUrl,
      type: "article",
      publishedTime: idea.first_seen_at,
      modifiedTime: idea.last_seen_at,
    },
    // `citation_*` meta tags follow the Google Scholar / Highwire Press
    // convention that Perplexity, Semantic Scholar, and several LLM
    // citation pipelines read. Treating each idea page as a citable
    // article gives us attribution in AI search UIs.
    other: {
      citation_title: idea.title,
      citation_author: "Vibe Code Ideas",
      citation_publisher: "Vibe Code Ideas",
      citation_publication_date: idea.first_seen_at.slice(0, 10),
      citation_online_date: idea.last_seen_at.slice(0, 10),
      citation_public_url: absoluteUrl,
      citation_fulltext_html_url: absoluteUrl,
      citation_fulltext_world_readable: "true",
    },
  }
}

/**
 * Human-readable label for each category, used in the JSON-LD
 * BreadcrumbList and in the answer-shaped opener. Kept inline rather than
 * imported from categories.ts because the label casing we want here
 * ("AI/ML" not "ai-ml", "DevTools" not "devtools") differs from the slug.
 */
const CATEGORY_LABELS: Record<string, string> = {
  fintech: "Fintech",
  devtools: "DevTools",
  automation: "Automation",
  "ai-ml": "AI/ML",
  ecommerce: "Ecommerce",
  health: "Health",
  education: "Education",
  "creator-tools": "Creator Tools",
  productivity: "Productivity",
  marketing: "Marketing",
  "hr-recruiting": "HR / Recruiting",
  "real-estate": "Real Estate",
  logistics: "Logistics",
  other: "Other",
}

function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug
}

const competitionLabels: Record<string, string> = {
  low: "Low competition",
  medium: "Moderate competition",
  high: "Crowded market",
  unknown: "Unknown",
}

const competitionColors: Record<string, "green" | "orange" | "red" | "gray"> = {
  low: "green",
  medium: "orange",
  high: "red",
  unknown: "gray",
}

export default async function IdeaDetailPage({ params }: Props) {
  const { slug } = await params
  const [idea, stats] = await Promise.all([
    getIdeaBySlug(slug),
    getAggregateStats(),
  ])

  if (!idea) {
    notFound()
  }

  // Cosmetic-only bar position for the Popularity SignalBar. The scarcity
  // signal is carried entirely by the `<PopularBadge>` pill at the top —
  // this percentile is just the bar fill and never drives the "Popular"
  // label (which is gated on isPopularScore against the server threshold).
  const popDisplayPct =
    stats.max_score > 0
      ? Math.min(100, Math.round((idea.popularity_score / stats.max_score) * 100))
      : 0
  const isIdeaPopular = isPopularScore(idea.popularity_score, stats.popularity_threshold)
  const mktPercentile = signalToPercentile(idea.market_signal)
  const revPercentile = revenueToPercentile(idea.revenue_potential)

  const canonical = `https://vibecodeideas.ai/ideas/${idea.slug}`
  const categoryLabelText = categoryLabel(idea.category)

  // NOTE: The answer-shaped intro sentence ("{title} is a product idea in
  // the {category} category at difficulty N/5 …") that previously rendered
  // above the summary on this page was removed on 2026-04-19 after Luca
  // flagged it as visually cluttering the idea page. The same structured
  // claim still ships to LLM citation pipelines via:
  //   - /ideas/{slug}.md (human-readable markdown variant, preferred by
  //     most LLM crawlers)
  //   - /llms-full.txt (full-catalog markdown ingestion)
  //   - JSON-LD Article schema (headline + description + articleBody)
  //   - citation_* meta tags
  // Those four surfaces collectively cover every citation pipeline we
  // know of, so dropping the HTML render loses no material GEO value.

  // JSON-LD as an array of schemas in one script tag. This is valid
  // per schema.org and is the recommended pattern for pages that are
  // simultaneously an Article (editorial content), a SoftwareApplication
  // (the product idea), and a BreadcrumbList (navigation context). LLM
  // citation pipelines pick up whichever schema fits their extraction.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: idea.title,
      description: idea.summary,
      articleBody: idea.commentary ?? idea.summary,
      datePublished: idea.first_seen_at,
      dateModified: idea.last_seen_at,
      url: canonical,
      mainEntityOfPage: canonical,
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
      about: {
        "@type": "Thing",
        name: categoryLabelText,
      },
      keywords: idea.tags.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: idea.title,
      description: idea.summary,
      applicationCategory: idea.category,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: idea.popularity_score.toFixed(1),
        ratingCount: displayMentions(idea.mention_count),
        bestRating: stats.max_score > 0 ? stats.max_score.toFixed(1) : "100",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://vibecodeideas.ai",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Ideas",
          item: "https://vibecodeideas.ai/ideas",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: categoryLabelText,
          item: `https://vibecodeideas.ai/ideas/category/${idea.category}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: idea.title,
          item: canonical,
        },
      ],
    },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-foreground">
          Ideas
        </Link>
        <span className="mx-2">/</span>
        <span>{idea.title}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{idea.title}</h1>
        <MentionBadge count={idea.mention_count} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-8">
        <CategoryBadge category={idea.category} />
        <DifficultyBadge difficulty={idea.difficulty} />
        <PopularBadge
          score={idea.popularity_score}
          threshold={stats.popularity_threshold}
          variant="pill"
        />
        {idea.tags.map((tag) => (
          <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-input">
            {tag}
          </span>
        ))}
      </div>

      <div className="prose prose-invert max-w-none mb-6">
        <p className="text-lg leading-relaxed text-foreground/80">{idea.summary}</p>
      </div>

      {/* "Why this is interesting" commentary — LLM-generated analysis
          covering market timing, closest competitor, unit economics, and
          biggest risk. Placed AFTER the summary so readers see the
          factual pitch first and then the editorial take. Hidden entirely
          if commentary is NULL (pre-backfill or generation failed). */}
      {idea.commentary && (
        <div className="rounded-lg border border-border bg-card/60 p-4 sm:p-5 mb-8">
          <div className="mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why this is interesting
            </span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            {idea.commentary}
          </p>
        </div>
      )}

      {/* Signals Section */}
      <div className="rounded-lg border border-border bg-card p-5 mb-8">
        <h2 className="font-semibold text-foreground mb-4">Idea Signals</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Indexed against {stats.total} ideas in the database
        </p>

        <div className="grid gap-3 sm:gap-5 sm:grid-cols-2">
          {/* Popularity Score — value shows "Popular" only for p99+, blank
              otherwise. The bar graphic carries the position info; the
              scarcity signal lives in the header <PopularBadge> pill. */}
          <div>
            <SignalBar
              label="Popularity"
              value={isIdeaPopular ? "Popular" : ""}
              percentile={popDisplayPct}
              color="orange"
            />
          </div>

          {/* Market Signal */}
          <div>
            <SignalBar
              label="Market Demand"
              value={idea.market_signal === "unknown" ? "Unknown" : idea.market_signal.charAt(0).toUpperCase() + idea.market_signal.slice(1)}
              percentile={mktPercentile}
              color={signalToColor(idea.market_signal)}
            />
          </div>

          {/* Revenue Potential */}
          <div>
            <SignalBar
              label="Revenue Potential"
              value={idea.revenue_potential === "unknown" ? "Unknown" : idea.revenue_potential}
              percentile={revPercentile}
              color={revenueToColor(idea.revenue_potential)}
            />
          </div>

          {/* Competition */}
          <div>
            <SignalBar
              label="Competition"
              value={competitionLabels[idea.competition_level] || "Unknown"}
              percentile={idea.competition_level === "low" ? 20 : idea.competition_level === "medium" ? 50 : idea.competition_level === "high" ? 80 : 0}
              color={competitionColors[idea.competition_level] || "gray"}
            />
          </div>
        </div>
      </div>

      {/* Mentions Section */}
      <div className="rounded-lg border border-border bg-card/50 p-4 mb-8">
        <h2 className="font-semibold text-foreground mb-2">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Spotted <span className="font-semibold text-foreground">{displayMentions(idea.mention_count)}</span> time{idea.mention_count !== 1 ? "s" : ""} across
          the internet since {formatDate(idea.first_seen_at)}.
          {idea.last_seen_at !== idea.first_seen_at && (
            <> Most recently on {formatDate(idea.last_seen_at)}.</>
          )}
        </p>
      </div>

      <ShareButtons title={idea.title} summary={idea.summary} />

      {/* Related Ideas — powered by Ghost hybrid search (fallback: Supabase category match) */}
      <Suspense fallback={null}>
        <RelatedIdeas idea={{ id: idea.id, title: idea.title, summary: idea.summary, category: idea.category }} />
      </Suspense>

      <Suspense fallback={null}>
        <PackageSection ideaId={idea.id} ideaTitle={idea.title} />
      </Suspense>
    </main>
  )
}
