import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { IdeaCard } from "@/components/IdeaCard"
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

      {/* Category chips */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.filter((c) => c.slug !== "other").map((cat) => (
              <Link
                key={cat.slug}
                href={`/ideas?category=${cat.slug}`}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${cat.color} hover:opacity-80 transition-opacity`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending ideas */}
      {trending.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trending Ideas</h2>
              <Link href="/ideas" className="text-sm text-muted-foreground hover:text-foreground">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trending.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
