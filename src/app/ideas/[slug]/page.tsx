import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CategoryBadge } from "@/components/CategoryBadge"
import { MentionBadge } from "@/components/MentionBadge"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { SignalBar } from "@/components/SignalBar"
import { PackageSection } from "@/components/PackageSection"
import {
  getIdeaBySlug,
  getAggregateStats,
  getPercentile,
} from "@/lib/queries"
import {
  signalToPercentile,
  signalToColor,
  revenueToPercentile,
  revenueToColor,
} from "@/lib/signal-utils"
import { formatDate } from "@/lib/utils"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const idea = await getIdeaBySlug(slug)
  if (!idea) return { title: "Idea Not Found — Vibe Code Ideas" }

  return {
    title: `${idea.title} — Vibe Code Ideas`,
    description: idea.summary,
    openGraph: {
      title: `${idea.title} — Vibe Code Ideas`,
      description: idea.summary,
      siteName: "Vibe Code Ideas",
    },
  }
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

  const popPercentile = getPercentile(idea.popularity_score, stats.popularity_scores)
  const mktPercentile = signalToPercentile(idea.market_signal)
  const revPercentile = revenueToPercentile(idea.revenue_potential)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: idea.title,
    description: idea.summary,
    applicationCategory: idea.category,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: idea.popularity_score.toFixed(1),
      ratingCount: idea.mention_count,
      bestRating: stats.popularity_scores.length > 0 ? Math.max(...stats.popularity_scores).toFixed(1) : "100",
    },
  }

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

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">{idea.title}</h1>
        <MentionBadge count={idea.mention_count} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <CategoryBadge category={idea.category} />
        <DifficultyBadge difficulty={idea.difficulty} />
        {idea.tags.map((tag) => (
          <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-input">
            {tag}
          </span>
        ))}
      </div>

      <div className="prose prose-invert max-w-none mb-8">
        <p className="text-lg leading-relaxed text-foreground/80">{idea.summary}</p>
      </div>

      {/* Signals Section */}
      <div className="rounded-lg border border-border bg-card p-5 mb-8">
        <h2 className="font-semibold text-foreground mb-4">Idea Signals</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Indexed against {stats.total} ideas in the database
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Popularity Score */}
          <div>
            <SignalBar
              label="Popularity"
              value={`${idea.popularity_score.toFixed(1)} pts`}
              percentile={popPercentile}
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
          Spotted <span className="font-semibold text-foreground">{idea.mention_count}</span> time{idea.mention_count !== 1 ? "s" : ""} across
          the internet since {formatDate(idea.first_seen_at)}.
          {idea.last_seen_at !== idea.first_seen_at && (
            <> Most recently on {formatDate(idea.last_seen_at)}.</>
          )}
        </p>
      </div>

      <Suspense fallback={null}>
        <PackageSection ideaId={idea.id} ideaTitle={idea.title} />
      </Suspense>
    </main>
  )
}
