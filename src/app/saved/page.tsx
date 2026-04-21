import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { IdeaGrid } from "@/components/IdeaGrid"
import { getAggregateStats } from "@/lib/queries"
import { getUserSavedIdeaIds } from "@/lib/saves"
import type { Idea } from "@/types"

/**
 * `/saved` — the current user's starred ideas, newest-save first.
 *
 * Auth policy: the page is reachable signed out, but renders a
 * sign-in CTA instead of content. No redirect — a redirect here would
 * trip up the Navbar "Saved" link for unauthenticated visitors who
 * are just exploring.
 *
 * Dynamic (force-dynamic) because per-user content changes on every
 * request; no useful caching across users, and RLS makes a CDN cache
 * dangerous.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Saved SaaS Ideas — Vibe Code Ideas",
  description:
    "Your saved SaaS and product ideas. Star ideas while browsing the directory and they'll land here for later.",
  alternates: {
    canonical: "/saved",
  },
  // noindex — per-user private page, no reason for a crawler to
  // ingest it. Protects us from a crawler accidentally discovering
  // the path via the Navbar and indexing an empty shell.
  robots: { index: false, follow: false },
}

export default async function SavedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Your saved ideas</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Sign in to save ideas while you browse. Your saves stay synced across
          devices and are never shared publicly.
        </p>
        <Link
          href="/ideas"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Browse ideas
        </Link>
      </main>
    )
  }

  // Two-step: pull saved idea_ids (RLS scopes to this user), then fetch
  // the matching ideas ordered by how recently they were saved (not by
  // popularity). Single round-trip via a join would be cleaner but the
  // existing `ideas` RLS doesn't currently support a joined query from
  // a user_saves perspective cleanly — doing it in two queries is
  // simpler and the cost is negligible.
  const { data: savesRows, error: savesError } = await supabase
    .from("user_saves")
    .select("idea_id, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(100)

  if (savesError) {
    console.error("Failed to fetch saved ideas:", savesError)
  }

  const orderedIdeaIds = (savesRows ?? []).map((row) => row.idea_id as string)

  // Bail early on empty state rather than doing a .in("id", []) which
  // Supabase would run as a trivial query but still costs a round trip.
  if (orderedIdeaIds.length === 0) {
    const savedIds = await getUserSavedIdeaIds()
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Your saved ideas</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Star an idea while browsing and it&rsquo;ll show up here.
        </p>
        <IdeaGrid
          ideas={[]}
          view="card"
          hasFilters={false}
          hasCategory={false}
          savedIds={savedIds}
        />
        <div className="mt-10 text-center">
          <Link
            href="/ideas"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Browse ideas
          </Link>
        </div>
      </main>
    )
  }

  const [{ data: ideasRows }, stats, savedIds] = await Promise.all([
    supabase.from("ideas").select("*").in("id", orderedIdeaIds),
    getAggregateStats(),
    getUserSavedIdeaIds(),
  ])

  // Restore save-order (DB returns rows in an unspecified order when
  // filtered by an IN list). Map by id, then walk the saved-order
  // array.
  const byId = new Map<string, Idea>(
    (ideasRows ?? []).map((row) => [row.id as string, row as Idea])
  )
  const ideas = orderedIdeaIds
    .map((id) => byId.get(id))
    .filter((idea): idea is Idea => !!idea)

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Your saved ideas</h1>
      <p className="text-muted-foreground mb-10 max-w-2xl">
        {ideas.length} saved idea{ideas.length === 1 ? "" : "s"}, newest first.
        Click the star again to remove from this list.
      </p>
      <IdeaGrid
        ideas={ideas}
        view="card"
        hasFilters={false}
        hasCategory={false}
        popularityThreshold={stats.popularity_threshold}
        savedIds={savedIds}
      />
    </main>
  )
}
