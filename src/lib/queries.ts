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

  // Revenue-tier filter. Thresholds map to the parsed upper bound stored in
  // the generated column revenue_upper_usd (see migration 012). Undefined or
  // "any" is handled upstream in parseSearchParams by dropping the field, so
  // reaching this branch always means a real filter value.
  if (filters.revenue) {
    const threshold: Record<Exclude<typeof filters.revenue, undefined>, number> = {
      any: 0,
      "2k": 2000,
      "10k": 10000,
      "25k": 25000,
      "50k": 50000,
    }
    query = query.gte("revenue_upper_usd", threshold[filters.revenue])
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
    case "revenue":
      // NULLS LAST so "unknown"/unparseable revenue ranges don't dominate the
      // top of the list when descending. The partial index
      // idx_ideas_revenue_upper_usd_active matches this exact ORDER BY.
      query = query
        .order("revenue_upper_usd", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
      break
  }

  // Cursor pagination
  if (filters.cursor) {
    const { data: cursorRow } = await supabase
      .from("ideas")
      .select("id, mention_count, first_seen_at, last_seen_at, difficulty, popularity_score, revenue_upper_usd")
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
        case "revenue": {
          // Revenue sort is DESC NULLS LAST, so pagination has two regimes:
          //   (1) cursor row has a value → next page = rows with strictly
          //       lower value, OR same value with smaller id, OR rows with
          //       NULL (the NULL tail comes after all non-null values)
          //   (2) cursor row is NULL → we're already in the NULL tail, so
          //       next page = NULL rows with smaller id
          if (cursorRow.revenue_upper_usd === null) {
            query = query.is("revenue_upper_usd", null).lt("id", cursorRow.id)
          } else {
            query = query.or(
              `revenue_upper_usd.lt.${cursorRow.revenue_upper_usd},and(revenue_upper_usd.eq.${cursorRow.revenue_upper_usd},id.lt.${cursorRow.id}),revenue_upper_usd.is.null`
            )
          }
          break
        }
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
  /**
   * Server-computed p99 popularity_score. Any idea whose score is >= this
   * value qualifies as Popular. Single scalar is cheap to serialize across
   * the server/client boundary — no ~2000-number array prop, no client-side
   * percentile computation, no risk of drift between the idea's score and
   * the reference array.
   */
  popularity_threshold: number
  /** Max active score — used for schema.org bestRating on detail pages. */
  max_score: number
  total: number
}

let _cachedStats: AggregateStats | null = null
let _cacheTime = 0
// 60s TTL (was 5min). Short enough that a warm serverless container won't
// serve stale threshold data across a formula/backfill deploy, long enough
// that aggressive browsing doesn't hammer the DB.
const CACHE_TTL = 60 * 1000

export async function getAggregateStats(): Promise<AggregateStats> {
  if (_cachedStats && Date.now() - _cacheTime < CACHE_TTL) return _cachedStats

  const supabase = await createClient()
  // Compute the aggregate where the data lives. The previous version fetched
  // every active idea's popularity_score and computed p99 in Node after the
  // fact — but PostgREST silently clamped the response to ~1766 rows (short
  // of the true 1969-row corpus) despite an explicit `.limit(100000)`. The
  // p99 of that truncated sample was ~4.07, making ~200 mid-ranked ideas
  // qualify as Popular instead of the top ~20.
  //
  // Root cause is architectural: a client-requested limit cannot override a
  // server-configured max-rows ceiling. Any aggregate derived from a fetched
  // row set is vulnerable to transport truncation. The fix is to compute the
  // aggregate inside Postgres and ship only the scalar — zero rows across
  // the wire, no truncation surface, one roundtrip.
  //
  // See supabase/migrations/011_aggregate_stats_rpc.sql and
  // Knowledge/Midrank Percentile Computation (Fifth fix).
  const { data, error } = await supabase.rpc("get_aggregate_stats")

  if (error || !data || data.length === 0) {
    if (error) console.error("getAggregateStats RPC failed:", error)
    // Safe defaults: zero threshold → isPopularScore() always returns false,
    // so cold starts / failed calls never fire the badge on everything.
    const fallback: AggregateStats = {
      popularity_threshold: 0,
      max_score: 0,
      total: 0,
    }
    _cachedStats = fallback
    _cacheTime = Date.now()
    return fallback
  }

  // Postgres `numeric` and `bigint` come back as strings over the wire —
  // coerce explicitly so downstream comparisons against JS `number` scores
  // don't silently string-compare.
  const row = data[0] as {
    popularity_threshold: number | string
    max_score: number | string
    total: number | string
  }
  _cachedStats = {
    popularity_threshold: Number(row.popularity_threshold) || 0,
    max_score: Number(row.max_score) || 0,
    total: Number(row.total) || 0,
  }
  _cacheTime = Date.now()
  return _cachedStats
}

// Re-exported from @/lib/signal-utils for existing server-component imports.
// Prefer `isPopularScore(score, threshold)` + server-computed threshold over
// `getPercentile` — see Knowledge/Midrank Percentile Computation.
export { getPercentile, isPopularScore } from "@/lib/signal-utils"

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
