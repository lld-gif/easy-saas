import { createClient } from "@supabase/supabase-js"
import type { Idea, ScrapeRun } from "@/types"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAdminStats() {
  const supabase = getServiceClient()

  // Total counts
  const [
    { count: totalIdeas },
    { count: activeIdeas },
    { count: needsReview },
  ] = await Promise.all([
    supabase.from("ideas").select("*", { count: "exact", head: true }),
    supabase.from("ideas").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("ideas").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
  ])

  // Ideas by category
  const { data: categoryData } = await supabase
    .from("ideas")
    .select("category")
    .eq("status", "active")

  const categoryMap = new Map<string, number>()
  for (const row of categoryData || []) {
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + 1)
  }
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Ideas by source
  const { data: sourceData } = await supabase
    .from("idea_sources")
    .select("source_platform")

  const sourceMap = new Map<string, number>()
  for (const row of sourceData || []) {
    sourceMap.set(row.source_platform, (sourceMap.get(row.source_platform) || 0) + 1)
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source_platform, count]) => ({ source_platform, count }))
    .sort((a, b) => b.count - a.count)

  // Daily ingest rate (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: dailyData } = await supabase
    .from("ideas")
    .select("first_seen_at")
    .gte("first_seen_at", thirtyDaysAgo.toISOString())

  const dailyMap = new Map<string, number>()
  for (const row of dailyData || []) {
    const date = row.first_seen_at.split("T")[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  }

  // Fill in missing days with 0
  const dailyIngest: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    dailyIngest.push({ date: dateStr, count: dailyMap.get(dateStr) || 0 })
  }

  // Data quality metrics
  const [
    { count: missingEnrichment },
    { count: lowMentions },
    { count: defaultDifficulty },
  ] = await Promise.all([
    supabase.from("ideas").select("*", { count: "exact", head: true }).eq("market_signal", "unknown"),
    supabase.from("ideas").select("*", { count: "exact", head: true }).lte("mention_count", 1),
    supabase.from("ideas").select("*", { count: "exact", head: true }).eq("difficulty", 3),
  ])

  return {
    total_ideas: totalIdeas || 0,
    active_ideas: activeIdeas || 0,
    needs_review: needsReview || 0,
    by_category: byCategory,
    by_source: bySource,
    daily_ingest: dailyIngest,
    quality: {
      missing_enrichment: missingEnrichment || 0,
      low_mentions: lowMentions || 0,
      default_difficulty: defaultDifficulty || 0,
    },
  }
}

export async function getScrapeRuns(limit = 20): Promise<ScrapeRun[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("scrape_runs")
    .select("*")
    .order("finished_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch scrape runs:", error)
    return []
  }

  return (data || []) as ScrapeRun[]
}

/**
 * Per-platform pipeline health row. Shape matches the columns of
 * `get_platform_health()` RPC (migration 018). Computed against the
 * last 7 days of scrape_runs + 30 days for the consecutive-failure
 * streak.
 *
 * health_state values:
 *   - healthy    — recent successful runs, <3 consecutive failures
 *   - degraded   — 3+ consecutive failures but ran in the last 24h
 *   - stale      — last run was 24-48h ago (missed at least one cron cycle)
 *   - broken     — last run was >48h ago (multiple missed cycles)
 *   - unknown    — no runs in the last 30 days (never ran or purged)
 */
export interface PlatformHealth {
  source_platform: string
  total_runs_7d: number
  successful_runs_7d: number
  failed_runs_7d: number
  zero_post_runs_7d: number
  total_posts_7d: number
  total_new_ideas_7d: number
  total_ideas_errors_7d: number
  avg_duration_ms: number | null
  last_run_at: string | null
  last_status: string | null
  last_error_message: string | null
  last_posts_fetched: number | null
  minutes_since_last_run: number | null
  consecutive_failures: number
  health_state: "healthy" | "degraded" | "stale" | "broken" | "unknown"
}

/**
 * Fetch the per-platform pipeline health snapshot. Calls the
 * `get_platform_health()` SQL function so RLS isn't involved (the
 * function is SECURITY DEFINER + only reachable via service role).
 *
 * The view ordering already floats broken/stale/degraded to the top,
 * so the admin UI can render the returned rows in order without
 * additional sorting.
 */
export async function getPlatformHealth(): Promise<PlatformHealth[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase.rpc("get_platform_health")

  if (error) {
    console.error("Failed to fetch platform health:", error)
    return []
  }

  return (data || []) as PlatformHealth[]
}

export async function getTopTrendingThisWeek(limit = 10) {
  const supabase = getServiceClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from("ideas")
    .select("id, title, slug, category, mention_count, popularity_score, market_signal, difficulty")
    .eq("status", "active")
    .gte("last_seen_at", weekAgo.toISOString())
    .order("mention_count", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch trending:", error)
    return []
  }

  return data || []
}

export async function getEstimatedCosts() {
  const supabase = getServiceClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from("scrape_runs")
    .select("source_platform, ideas_extracted")
    .gte("finished_at", thirtyDaysAgo.toISOString())
    .eq("status", "success")

  // Estimate: ~$0.001 per idea extracted (Haiku batches of 10)
  const costPerIdea = 0.001
  const costMap = new Map<string, { ideas: number; cost: number }>()

  for (const row of data || []) {
    const current = costMap.get(row.source_platform) || { ideas: 0, cost: 0 }
    current.ideas += row.ideas_extracted
    current.cost += row.ideas_extracted * costPerIdea
    costMap.set(row.source_platform, current)
  }

  const byCost = Array.from(costMap.entries()).map(([source, data]) => ({
    source,
    ideas_extracted: data.ideas,
    estimated_cost: Math.round(data.cost * 100) / 100,
  }))

  const totalCost = byCost.reduce((sum, r) => sum + r.estimated_cost, 0)

  return { by_source: byCost, total_cost_30d: Math.round(totalCost * 100) / 100 }
}

// ─── Ideas Management ──────────────────────────────────────────

export interface AdminIdeasParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  category?: string
  sort?: string
  direction?: "asc" | "desc"
}

export async function getAdminIdeas(params: AdminIdeasParams = {}) {
  const supabase = getServiceClient()
  const {
    page = 1,
    pageSize = 50,
    search,
    status,
    category,
    sort = "created_at",
    direction = "desc",
  } = params

  let query = supabase
    .from("ideas")
    .select("*", { count: "exact" })

  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
  }
  if (status && status !== "all") {
    query = query.eq("status", status)
  }
  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  query = query.order(sort, { ascending: direction === "asc" })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    console.error("Failed to fetch admin ideas:", error)
    return { ideas: [] as Idea[], total: 0 }
  }

  return { ideas: (data || []) as Idea[], total: count || 0 }
}

export async function getIdeaCategories(): Promise<string[]> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from("ideas")
    .select("category")

  const categories = new Set<string>()
  for (const row of data || []) {
    if (row.category) categories.add(row.category)
  }
  return Array.from(categories).sort()
}

export async function updateIdeaStatus(id: string, status: string) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from("ideas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function updateIdea(id: string, data: Partial<Idea>) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from("ideas")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function bulkUpdateIdeaStatus(ids: string[], status: string) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from("ideas")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)

  if (error) throw new Error(error.message)
}

export async function deleteIdeas(ids: string[]) {
  const supabase = getServiceClient()
  // Delete sources first (FK constraint)
  await supabase.from("idea_sources").delete().in("idea_id", ids)
  const { error } = await supabase.from("ideas").delete().in("id", ids)
  if (error) throw new Error(error.message)
}

// ─── Users Management ──────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  subscription_status: string
  stripe_customer_id: string | null
  created_at: string
  package_count: number
}

export async function getAdminUsers(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const supabase = getServiceClient()
  const { page = 1, pageSize = 50, search } = params

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })

  if (search) {
    query = query.ilike("email", `%${search}%`)
  }

  query = query.order("created_at", { ascending: false })

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, count, error } = await query

  if (error) {
    console.error("Failed to fetch admin users:", error)
    return { users: [] as AdminUser[], total: 0 }
  }

  // Get package generation counts per user
  const userIds = (data || []).map((u: any) => u.id)
  let packageCounts = new Map<string, number>()

  if (userIds.length > 0) {
    const { data: packages } = await supabase
      .from("idea_packages")
      .select("user_id")
      .in("user_id", userIds)

    for (const pkg of packages || []) {
      packageCounts.set(pkg.user_id, (packageCounts.get(pkg.user_id) || 0) + 1)
    }
  }

  const users: AdminUser[] = (data || []).map((u: any) => ({
    id: u.id,
    email: u.email,
    subscription_status: u.subscription_status || "free",
    stripe_customer_id: u.stripe_customer_id,
    created_at: u.created_at,
    package_count: packageCounts.get(u.id) || 0,
  }))

  return { users, total: count || 0 }
}
