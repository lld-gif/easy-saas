import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IdeaCard } from "@/components/IdeaCard"
import { IdeaListRow } from "@/components/IdeaListRow"
import { EmptyState } from "@/components/EmptyState"
import type { Idea } from "@/types"

interface IdeaGridProps {
  ideas: Idea[]
  view: "card" | "list"
  hasFilters?: boolean
  hasCategory?: boolean
  /** Sorted popularity scores for percentile calculation */
  popScores?: number[]
}

function getPercentile(score: number, sorted: number[]): number {
  if (sorted.length === 0) return 50
  let count = 0
  for (const s of sorted) {
    if (s < score) count++
    else break
  }
  return Math.round((count / sorted.length) * 100)
}

export function IdeaGrid({ ideas, view, hasFilters, hasCategory, popScores = [] }: IdeaGridProps) {
  if (ideas.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          title="No ideas match your search"
          description="Try a broader term or remove some filters."
          action={
            <Link href="/ideas">
              <Button variant="outline">Clear all filters</Button>
            </Link>
          }
        />
      )
    }
    if (hasCategory) {
      return (
        <EmptyState
          title="No ideas in this category yet"
          description="Check back soon — we discover new ideas daily."
        />
      )
    }
    return (
      <EmptyState
        title="No ideas yet"
        description="Ideas are being discovered. Check back soon!"
      />
    )
  }

  if (view === "list") {
    return (
      <div className="divide-y">
        {ideas.map((idea, index) => (
          <IdeaListRow
            key={idea.id}
            idea={idea}
            rank={index + 1}
            popPercentile={getPercentile(idea.popularity_score ?? 0, popScores)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          popPercentile={getPercentile(idea.popularity_score ?? 0, popScores)}
        />
      ))}
    </div>
  )
}
