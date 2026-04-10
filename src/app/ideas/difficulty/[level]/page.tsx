import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { IdeaListRow } from "@/components/IdeaListRow"
import { getAggregateStats, getPercentile } from "@/lib/queries"
import type { Idea } from "@/types"

type Props = {
  params: Promise<{ level: string }>
}

const levels = ["easy", "medium", "hard"] as const
type Level = (typeof levels)[number]

const levelConfig: Record<
  Level,
  {
    title: string
    heading: string
    description: string
    filterFn: (query: any) => any
  }
> = {
  easy: {
    title: "Easy SaaS Project Ideas",
    heading: "Easy SaaS Ideas Anyone Can Build",
    description:
      "Low-complexity SaaS ideas perfect for solo founders, weekend projects, or your first product. These ideas can be built with basic CRUD, simple integrations, and minimal infrastructure.",
    filterFn: (query) => query.lte("difficulty", 2),
  },
  medium: {
    title: "Medium-Difficulty SaaS Ideas",
    heading: "Medium SaaS Ideas for Growing Builders",
    description:
      "Mid-range SaaS ideas that require some technical depth — real-time features, third-party API integrations, or moderate data pipelines. Great for developers ready to level up.",
    filterFn: (query) => query.gt("difficulty", 2).lte("difficulty", 3),
  },
  hard: {
    title: "Hard SaaS Project Ideas",
    heading: "Hard SaaS Ideas for Ambitious Builders",
    description:
      "High-complexity SaaS ideas involving AI/ML pipelines, complex data processing, multi-tenant architectures, or significant infrastructure. For experienced builders chasing big markets.",
    filterFn: (query) => query.gt("difficulty", 3),
  },
}

export async function generateStaticParams() {
  return levels.map((level) => ({ level }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level } = await params
  const config = levelConfig[level as Level]

  if (!config) {
    return { title: "SaaS Ideas | Vibe Code Ideas" }
  }

  return {
    title: `${config.title} | Vibe Code Ideas`,
    description: config.description,
  }
}

export default async function DifficultyPage({ params }: Props) {
  const { level } = await params

  if (!levels.includes(level as Level)) {
    notFound()
  }

  const config = levelConfig[level as Level]
  const supabase = await createClient()

  let query = supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")

  query = config.filterFn(query)
  query = query.order("popularity_score", { ascending: false }).limit(20)

  const [{ data, error }, stats] = await Promise.all([query, getAggregateStats()])

  if (error) {
    console.error("Failed to fetch difficulty ideas:", error)
  }

  const ideas = (data ?? []) as Idea[]

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-2">
        <Link
          href="/ideas"
          className="text-sm text-muted-foreground hover:text-orange-500 transition-colors"
        >
          &larr; All ideas
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-3">{config.heading}</h1>

      <p className="text-muted-foreground mb-8 max-w-2xl leading-relaxed">
        {config.description}
      </p>

      {ideas.length > 0 ? (
        <div className="divide-y divide-border/50">
          {ideas.map((idea, index) => (
            <IdeaListRow
              key={idea.id}
              idea={idea}
              rank={index + 1}
              popPercentile={
                stats.popularity_scores.length > 0
                  ? getPercentile(idea.popularity_score, stats.popularity_scores)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          No ideas found at this difficulty level yet.
        </p>
      )}

      {/* Cross-link other difficulty levels */}
      <div className="mt-12 flex flex-wrap gap-3">
        {levels
          .filter((l) => l !== level)
          .map((l) => (
            <Link
              key={l}
              href={`/ideas/difficulty/${l}`}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-orange-500 hover:border-orange-500/30 transition-colors"
            >
              Browse {l} ideas &rarr;
            </Link>
          ))}
      </div>
    </main>
  )
}
