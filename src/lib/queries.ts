import { createClient } from "@/lib/supabase/server"
import type { Idea, IdeaFilters, PopularityFilter, TimeFilter } from "@/types"

const PAGE_SIZE = 24

function getMinMentions(popularity?: PopularityFilter): number {
  switch (popularity) {
    case "trending": return 10
    case "rising": return 5
    case "new": return 1
    default: return 0
  }
}

function getMaxMentions(popularity?: PopularityFilter): number | null {
  switch (popularity) {
    case "rising": return 9
    case "new": return 4
    default: return null
  }
}

function getAfterDate(time?: TimeFilter): string | null {
  if (!time || time === "all") return null
  const now = new Date()
  switch (time) {
    case "week":
      now.setDate(now.getDate() - 7)
      return now.toISOString()
    case "month":
      now.setMonth(now.getMonth() - 1)
      return now.toISOString()
    case "3months":
      now.setMonth(now.getMonth() - 3)
      return now.toISOString()
    default:
      return null
  }
}

export async function getIdeas(filters: IdeaFilters): Promise<{
  ideas: Idea[]
  nextCursor: string | null
}> {
  const supabase = await createClient()
  const sort = filters.sort ?? "trending"
  const minMentions = getMinMentions(filters.popularity)
  const maxMentions = getMaxMentions(filters.popularity)
  const afterDate = getAfterDate(filters.time)

  let query = supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .gte("mention_count", minMentions)

  if (maxMentions !== null) {
    query = query.lte("mention_count", maxMentions)
  }

  if (filters.category) {
    query = query.eq("category", filters.category)
  }

  if (afterDate) {
    query = query.gte("first_seen_at", afterDate)
  }

  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, {
      type: "websearch",
      config: "english",
    })
  }

  if (filters.difficulty) {
    switch (filters.difficulty) {
      case "easy":
        query = query.lte("difficulty", 2)
        break
      case "medium":
        query = query.gte("difficulty", 3).lte("difficulty", 3)
        break
      case "hard":
        query = query.gte("difficulty", 4)
        break
    }
  }

  // Sort
  switch (sort) {
    case "trending":
      query = query.order("mention_count", { ascending: false }).order("id", { ascending: false })
      break
    case "newest":
      query = query.order("first_seen_at", { ascending: false }).order("id", { ascending: false })
      break
    case "recent":
      query = query.order("last_seen_at", { ascending: false }).order("id", { ascending: false })
      break
    case "easiest":
      query = query.order("difficulty", { ascending: true }).order("id", { ascending: false })
      break
    case "popularity":
      query = query.order("popularity_score", { ascending: false }).order("id", { ascending: false })
      break
  }

  // Cursor pagination
  if (filters.cursor) {
    const { data: cursorRow } = await supabase
      .from("ideas")
      .select("id, mention_count, first_seen_at, last_seen_at, difficulty, popularity_score")
      .eq("id", filters.cursor)
      .single()

    if (cursorRow) {
      switch (sort) {
        case "trending":
          query = query.or(
            `mention_count.lt.${cursorRow.mention_count},and(mention_count.eq.${cursorRow.mention_count},id.lt.${cursorRow.id})`
          )
          break
        case "newest":
          query = query.or(
            `first_seen_at.lt.${cursorRow.first_seen_at},and(first_seen_at.eq.${cursorRow.first_seen_at},id.lt.${cursorRow.id})`
          )
          break
        case "recent":
          query = query.or(
            `last_seen_at.lt.${cursorRow.last_seen_at},and(last_seen_at.eq.${cursorRow.last_seen_at},id.lt.${cursorRow.id})`
          )
          break
        case "easiest":
          query = query.or(
            `difficulty.gt.${cursorRow.difficulty},and(difficulty.eq.${cursorRow.difficulty},id.lt.${cursorRow.id})`
          )
          break
        case "popularity":
          query = query.or(
            `popularity_score.lt.${cursorRow.popularity_score || 0},and(popularity_score.eq.${cursorRow.popularity_score || 0},id.lt.${cursorRow.id})`
          )
          break
      }
    }
  }

  query = query.limit(PAGE_SIZE + 1)

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch ideas:", error)
    return { ideas: [], nextCursor: null }
  }

  const ideas = data as Idea[]
  const hasMore = ideas.length > PAGE_SIZE
  const pageIdeas = hasMore ? ideas.slice(0, PAGE_SIZE) : ideas
  const nextCursor = hasMore ? pageIdeas[pageIdeas.length - 1].id : null

  return { ideas: pageIdeas, nextCursor }
}

export async function getIdeaBySlug(slug: string): Promise<Idea | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single()

  if (error) {
    console.error("Failed to fetch idea:", error)
    return null
  }

  return data as Idea
}

export async function getTrendingIdeas(limit: number = 12): Promise<Idea[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("status", "active")
    .order("mention_count", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch trending ideas:", error)
    return []
  }

  return data as Idea[]
}

export interface AggregateStats {
  popularity_scores: number[] // sorted ascending, for percentile lookup
  total: number
}

let _cachedStats: AggregateStats | null = null
let _cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getAggregateStats(): Promise<AggregateStats> {
  if (_cachedStats && Date.now() - _cacheTime < CACHE_TTL) return _cachedStats

  const supabase = await createClient()
  const { data } = await supabase
    .from("ideas")
    .select("popularity_score")
    .eq("status", "active")
    .order("popularity_score", { ascending: true })

  const scores = (data || []).map((d) => d.popularity_score ?? 0)
  _cachedStats = { popularity_scores: scores, total: scores.length }
  _cacheTime = Date.now()
  return _cachedStats
}

// getPercentile moved to @/lib/signal-utils so it's usable from client
// components. Re-exported here for backward compatibility with existing
// server-component imports.
export { getPercentile } from "@/lib/signal-utils"

/** Maps market_signal to a percentile-like value for display */
export function signalToPercentile(signal: string): number {
  switch (signal) {
    case "strong": return 85
    case "moderate": return 50
    case "weak": return 20
    default: return 0
  }
}

/** Maps revenue_potential string to a percentile-like value */
export function revenueToPercentile(revenue: string): number {
  if (revenue.includes("50k") || revenue.includes("100k")) return 95
  if (revenue.includes("10k")) return 75
  if (revenue.includes("5k")) return 60
  if (revenue.includes("2k")) return 45
  if (revenue.includes("1k")) return 30
  if (revenue.includes("500")) return 20
  return 0 // unknown
}

/** Maps revenue_potential string to a color */
export function revenueToColor(revenue: string): "green" | "orange" | "blue" | "gray" {
  if (revenue.includes("10k") || revenue.includes("50k") || revenue.includes("100k")) return "green"
  if (revenue.includes("2k") || revenue.includes("5k")) return "orange"
  if (revenue.includes("500") || revenue.includes("1k")) return "blue"
  return "gray"
}

/** Maps market_signal to a display color */
export function signalToColor(signal: string): "green" | "orange" | "red" | "gray" {
  switch (signal) {
    case "strong": return "green"
    case "moderate": return "orange"
    case "weak": return "red"
    default: return "gray"
  }
}

export async function getIdeaCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  if (error) {
    console.error("Failed to count ideas:", error)
    return 0
  }

  return count ?? 0
}
