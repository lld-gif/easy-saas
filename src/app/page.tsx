import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { IdeaListRow } from "@/components/IdeaListRow"

import { getTrendingIdeas, getIdeaCount } from "@/lib/queries"
import { CATEGORIES } from "@/lib/categories"

export default async function Home() {
  const [trending, ideaCount] = await Promise.all([
    getTrendingIdeas(12),
    getIdeaCount(),
  ])

  return (
    <main>
      <HeroSection ideaCount={ideaCount} />

      {/* Browse by category */}
      <nav className="px-4 py-4 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium mr-1">Browse by category:</span>
          {CATEGORIES.filter((c) => c.slug !== "other").map((cat, i, arr) => (
            <span key={cat.slug}>
              <Link
                href={`/ideas/category/${cat.slug}`}
                className="hover:text-orange-500 transition-colors"
              >
                {cat.label}
              </Link>
              {i < arr.length - 1 && <span className="ml-1.5">&middot;</span>}
            </span>
          ))}
          <span className="ml-1.5">&middot;</span>
          <Link
            href="/ideas/trending"
            className="hover:text-orange-500 transition-colors font-medium"
          >
            Trending
          </Link>
        </div>
      </nav>

      {/* Trending ideas */}
      {trending.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trending Ideas</h2>
              <Link href="/ideas" className="text-sm text-muted-foreground hover:text-orange-500 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {trending.map((idea, index) => (
                <IdeaListRow
                  key={idea.id}
                  idea={idea}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}
