"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { IdeaCard } from "@/components/IdeaCard"
import { IdeaListRow } from "@/components/IdeaListRow"
import { EmptyState } from "@/components/EmptyState"
import type { Idea } from "@/types"
import { createClient } from "@/lib/supabase/client"

interface InfiniteIdeasProps {
  initialIdeas: Idea[]
  initialCursor: string | null
  view: "card" | "list"
  hasFilters?: boolean
  hasCategory?: boolean
  /** Server-computed p99 popularity_score threshold — scalar, not the full sorted array. */
  popularityThreshold?: number
  /**
   * Array of idea IDs the current user has saved. Passed as an array
   * (not a Set) so it serializes cleanly across the server → client
   * boundary; we rebuild the Set inside.
   *
   * Known limitation: cursor-loaded ideas (page 2+) use the initial
   * server prefetch, so if the user had a save on an idea that only
   * appears on page 2, the star will render unsaved until the next
   * full page reload. Acceptable for launch; a follow-up could
   * refetch saved IDs after cursor loads.
   */
  initialSavedIds?: string[]
}

const PAGE_SIZE = 24

export function InfiniteIdeas({
  initialIdeas,
  initialCursor,
  view,
  hasFilters,
  hasCategory,
  popularityThreshold,
  initialSavedIds,
}: InfiniteIdeasProps) {
  // Cheap to rebuild on every render — O(n) where n is the user's
  // saved count (capped in practice at whatever they've actually saved).
  const savedIds = new Set(initialSavedIds ?? [])
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Reset when filters change (SSR will provide new initialIdeas)
  useEffect(() => {
    setIdeas(initialIdeas)
    setCursor(initialCursor)
  }, [initialIdeas, initialCursor])

  const fetchMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)

    try {
      const supabase = createClient()
      const sort = searchParams.get("sort") ?? "trending"
      const category = searchParams.get("category")
      const q = searchParams.get("q")
      const difficulty = searchParams.get("difficulty")

      // Fetch the cursor row to get its sort value
      const { data: cursorRow } = await supabase
        .from("ideas")
        .select("id, mention_count, first_seen_at, last_seen_at, difficulty")
        .eq("id", cursor)
        .single()

      if (!cursorRow) {
        setCursor(null)
        setLoading(false)
        return
      }

      let query = supabase
        .from("ideas")
        .select("*")
        .eq("status", "active")

      if (category) query = query.eq("category", category)

      if (difficulty === "easy") query = query.lte("difficulty", 2)
      else if (difficulty === "medium") query = query.eq("difficulty", 3)
      else if (difficulty === "hard") query = query.gte("difficulty", 4)

      if (q) {
        query = query.textSearch("search_vector", q, {
          type: "websearch",
          config: "english",
        })
      }

      // Sort
      switch (sort) {
        case "trending":
          query = query
            .order("mention_count", { ascending: false })
            .order("id", { ascending: false })
          query = query.or(
            `mention_count.lt.${cursorRow.mention_count},and(mention_count.eq.${cursorRow.mention_count},id.lt.${cursorRow.id})`
          )
          break
        case "newest":
          query = query
            .order("first_seen_at", { ascending: false })
            .order("id", { ascending: false })
          query = query.or(
            `first_seen_at.lt.${cursorRow.first_seen_at},and(first_seen_at.eq.${cursorRow.first_seen_at},id.lt.${cursorRow.id})`
          )
          break
        case "recent":
          query = query
            .order("last_seen_at", { ascending: false })
            .order("id", { ascending: false })
          query = query.or(
            `last_seen_at.lt.${cursorRow.last_seen_at},and(last_seen_at.eq.${cursorRow.last_seen_at},id.lt.${cursorRow.id})`
          )
          break
        case "easiest":
          query = query
            .order("difficulty", { ascending: true })
            .order("id", { ascending: false })
          query = query.or(
            `difficulty.gt.${cursorRow.difficulty},and(difficulty.eq.${cursorRow.difficulty},id.lt.${cursorRow.id})`
          )
          break
      }

      query = query.limit(PAGE_SIZE + 1)
      const { data, error } = await query

      if (error || !data) {
        setCursor(null)
        setLoading(false)
        return
      }

      const newIdeas = data as Idea[]
      const hasMore = newIdeas.length > PAGE_SIZE
      const pageIdeas = hasMore ? newIdeas.slice(0, PAGE_SIZE) : newIdeas
      const nextCursor = hasMore ? pageIdeas[pageIdeas.length - 1].id : null

      setIdeas((prev) => [...prev, ...pageIdeas])
      setCursor(nextCursor)
    } catch (e) {
      console.error("Failed to fetch more ideas:", e)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, searchParams])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !loading) {
          fetchMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [cursor, loading, fetchMore])

  if (ideas.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          title="No ideas match your search"
          description="Try a broader term or remove some filters."
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

  return (
    <>
      {view === "list" ? (
        <div>
          {ideas.map((idea, index) => (
            <IdeaListRow
              key={idea.id}
              idea={idea}
              rank={index + 1}
              popThreshold={popularityThreshold}
              savedIds={savedIds}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              popThreshold={popularityThreshold}
              savedIds={savedIds}
            />
          ))}
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      {cursor && (
        <div ref={observerRef} className="flex justify-center py-8">
          {loading && (
            <div className="text-sm text-gray-400">Loading more ideas...</div>
          )}
        </div>
      )}
    </>
  )
}
