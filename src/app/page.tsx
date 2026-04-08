import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { IdeaListRow } from "@/components/IdeaListRow"
import { getTrendingIdeas, getIdeaCount, getAggregateStats, getPercentile } from "@/lib/queries"

export default async function Home() {
  const [trending, ideaCount, stats] = await Promise.all([
    getTrendingIdeas(12),
    getIdeaCount(),
    getAggregateStats(),
  ])

  return (
    <main>
      <HeroSection ideaCount={ideaCount} />

      {/* Trending ideas */}
      {trending.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trending Ideas</h2>
              <Link href="/ideas" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {trending.map((idea, index) => (
                <IdeaListRow
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                  popPercentile={getPercentile(idea.popularity_score ?? 0, stats.popularity_scores)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
