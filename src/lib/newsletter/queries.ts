/**
 * Newsletter data layer.
 *
 * Builds the four sections of the Tuesday digest email, deduplicating idea
 * IDs across sections so subscribers see 8-10 distinct ideas, not the same
 * top-5 recycled through different wrappers.
 *
 * Uses the service-role client because this runs from the cron route which
 * is authorized via CRON_SECRET, not a user session.
 */

import { createClient } from "@supabase/supabase-js"

export interface DigestIdea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  mention_count: number
  popularity_score: number
  revenue_potential: string
  revenue_upper_usd: number | null
  market_signal: string
}

export interface CategoryHighlight {
  category: string
  idea: DigestIdea
}

export interface DigestData {
  featured: DigestIdea | null
  trending: DigestIdea[]
  revenueSpotlight: DigestIdea | null
  categoryHighlights: CategoryHighlight[]
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const IDEA_COLUMNS =
  "id, slug, title, summary, category, mention_count, popularity_score, revenue_potential, revenue_upper_usd, market_signal"

/**
 * Readable category labels for the email. Keep this in sync with the
 * category enum used by the scraper/FilterBar — not worth a shared module
 * for the seven categories we highlight.
 */
const CATEGORY_LABELS: Record<string, string> = {
  devtools: "DevTools",
  "ai-ml": "AI/ML",
  fintech: "Fintech",
  automation: "Automation",
  productivity: "Productivity",
  marketing: "Marketing",
  ecommerce: "Ecommerce",
  health: "Health",
  education: "Education",
  "creator-tools": "Creator Tools",
  "hr-recruiting": "HR & Recruiting",
  "real-estate": "Real Estate",
  logistics: "Logistics",
  other: "Other",
}

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug
}

/**
 * Fetch the four sections of the digest in a single pass, deduplicating
 * idea IDs across sections. Returns a fully-hydrated DigestData payload
 * ready to hand to the email template.
 */
export async function getDigestData(): Promise<DigestData> {
  const supabase = getServiceClient()

  // Pull a larger top-N candidate pool so we have room to dedupe across
  // sections without risking an empty one. 30 is enough even if all three
  // picks collide on the same handful of ideas.
  const { data: trendingPool, error: trendingErr } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(30)

  if (trendingErr) {
    console.error("[newsletter] Failed to fetch trending pool:", trendingErr)
    return emptyDigestData()
  }

  const trendingIdeas = (trendingPool ?? []) as DigestIdea[]
  if (trendingIdeas.length === 0) {
    return emptyDigestData()
  }

  // Featured = #1 trending. Trending picks = #2-5.
  const featured = trendingIdeas[0]
  const trending = trendingIdeas.slice(1, 5)

  const usedIds = new Set<string>()
  usedIds.add(featured.id)
  for (const idea of trending) usedIds.add(idea.id)

  // Revenue spotlight: top unused idea by revenue_upper_usd with a floor
  // of $10k/mo. This uses the generated column from migration 012.
  // The floor keeps the spotlight meaningful — we don't want to feature
  // a "$500-1k/mo" idea as revenue-forward.
  const { data: revenuePool } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .eq("status", "active")
    .gte("revenue_upper_usd", 10000)
    .order("revenue_upper_usd", { ascending: false, nullsFirst: false })
    .order("popularity_score", { ascending: false })
    .limit(10)

  const revenueSpotlight =
    ((revenuePool ?? []) as DigestIdea[]).find((i) => !usedIds.has(i.id)) ??
    null

  if (revenueSpotlight) usedIds.add(revenueSpotlight.id)

  // Category highlights: pick 3 unused ideas from 3 distinct categories
  // that aren't already represented in the featured/trending/revenue picks.
  const representedCategories = new Set<string>()
  representedCategories.add(featured.category)
  for (const idea of trending) representedCategories.add(idea.category)
  if (revenueSpotlight) representedCategories.add(revenueSpotlight.category)

  // Fetch a broader pool to have headroom for category diversity.
  const { data: categoryPool } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(100)

  const categoryHighlights: CategoryHighlight[] = []
  const seenCategories = new Set(representedCategories)

  for (const idea of (categoryPool ?? []) as DigestIdea[]) {
    if (categoryHighlights.length >= 3) break
    if (usedIds.has(idea.id)) continue
    if (seenCategories.has(idea.category)) continue
    categoryHighlights.push({ category: idea.category, idea })
    seenCategories.add(idea.category)
    usedIds.add(idea.id)
  }

  return {
    featured,
    trending,
    revenueSpotlight,
    categoryHighlights,
  }
}

/**
 * Fetch all active newsletter subscribers. Returns email addresses in
 * insertion order.
 */
export async function getActiveSubscribers(): Promise<string[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active")

  if (error) {
    console.error("[newsletter] Failed to fetch subscribers:", error)
    return []
  }

  return (data ?? []).map((row) => row.email as string)
}

function emptyDigestData(): DigestData {
  return {
    featured: null,
    trending: [],
    revenueSpotlight: null,
    categoryHighlights: [],
  }
}
