import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { IdeaListRow } from "@/components/IdeaListRow"
import type { Idea } from "@/types"

export const metadata: Metadata = {
  title: "Trending SaaS Ideas This Week | Vibe Code Ideas",
  description:
    "The hottest SaaS ideas right now — ranked by popularity score and community buzz. Updated weekly.",
}

export default async function TrendingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Failed to fetch trending ideas:", error)
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

      <h1 className="text-3xl font-bold mb-3">Trending SaaS Ideas This Week</h1>

      <p className="text-muted-foreground mb-8 max-w-2xl leading-relaxed">
        The most popular SaaS ideas right now, ranked by community mentions and
        engagement. These are the ideas builders are talking about this week.
      </p>

      {ideas.length > 0 ? (
        <div className="divide-y divide-border/50">
          {ideas.map((idea, index) => (
            <IdeaListRow key={idea.id} idea={idea} rank={index + 1} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          No trending ideas right now. Check back soon.
        </p>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-lg font-semibold mb-2">
          Want the full Quick Start Package for any idea?
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          Get a tech spec, brand kit, and launch checklist — ready to build.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    </main>
  )
}
