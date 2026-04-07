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
  }

  // Cursor pagination
  if (filters.cursor) {
    const { data: cursorRow } = await supabase
      .from("ideas")
      .select("id, mention_count, first_seen_at, last_seen_at")
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
