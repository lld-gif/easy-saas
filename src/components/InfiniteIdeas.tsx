"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { IdeaCard } from "@/components/IdeaCard"
import { IdeaListRow } from "@/components/IdeaListRow"
import { EmptyState } from "@/components/EmptyState"
import { getPercentile } from "@/lib/signal-utils"
import type { Idea } from "@/types"

interface InfiniteIdeasProps {
  initialIdeas: Idea[]
  initialCursor: string | null
  view: "card" | "list"
  hasFilters?: boolean
  hasCategory?: boolean
  /** Sorted-ascending popularity_score array for percentile lookup */
  popularityScores?: number[]
}

export function InfiniteIdeas({
  initialIdeas,
  initialCursor,
  view,
  hasFilters,
  hasCategory,
  popularityScores,
}: InfiniteIdeasProps) {
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  const pctFor = (score: number) =>
    popularityScores && popularityScores.length > 0 ? getPercentile(score, popularityScores) : undefined

  // Reset when filters change (SSR will provide new initialIdeas)
  useEffect(() => {
    setIdeas(initialIdeas)
    setCursor(initialCursor)
  }, [initialIdeas, initialCursor])

  const fetchMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)

    try {
      // Forward every filter URL param unchanged so /api/ideas sees the
      // exact same query the server-rendered first page used. Single source
      // of truth: src/lib/queries.ts getIdeas().
      const next = new URLSearchParams(searchParams.toString())
      next.set("cursor", cursor)

      const res = await fetch(`/api/ideas?${next.toString()}`, {
        headers: { Accept: "application/json" },
      })

      if (!res.ok) {
        console.error("Failed to fetch more ideas:", res.status)
        setCursor(null)
        return
      }

      const body = (await res.json()) as {
        ideas: Idea[]
        nextCursor: string | null
      }

      setIdeas((prev) => [...prev, ...body.ideas])
      setCursor(body.nextCursor)
    } catch (e) {
      console.error("Failed to fetch more ideas:", e)
      setCursor(null)
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
              popPercentile={pctFor(idea.popularity_score)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              popPercentile={pctFor(idea.popularity_score)}
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
