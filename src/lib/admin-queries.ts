import { createClient } from "@supabase/supabase-js"
import type { ScrapeRun } from "@/types"

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
