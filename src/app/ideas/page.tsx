import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchBar } from "@/components/SearchBar"
import { FilterBar } from "@/components/FilterBar"
import { ViewToggle } from "@/components/ViewToggle"
import { InfiniteIdeas } from "@/components/InfiniteIdeas"
import { getIdeas, getAggregateStats } from "@/lib/queries"
import { parseSearchParams } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Browse SaaS Ideas — EasySaaS",
  description: "Search and filter hundreds of validated SaaS ideas from across the internet.",
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IdeasPage({ searchParams }: Props) {
  const params = await searchParams
  const filters = parseSearchParams(params)
  const [{ ideas, nextCursor }, stats] = await Promise.all([
    getIdeas(filters),
    getAggregateStats(),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Browse Ideas</h1>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={null}>
          <InfiniteIdeas
            initialIdeas={ideas}
            initialCursor={nextCursor}
            view={filters.view ?? "card"}
            hasFilters={!!(filters.q || filters.popularity || filters.time)}
            hasCategory={!!filters.category}
            popScores={stats.popularity_scores}
          />
        </Suspense>
      </div>
    </main>
  )
}
