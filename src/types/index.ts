export interface Idea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  mention_count: number
  difficulty: number
  popularity_score: number
  market_signal: "strong" | "moderate" | "weak" | "unknown"
  competition_level: "low" | "medium" | "high" | "unknown"
  revenue_potential: string
  /**
   * Parsed upper bound of revenue_potential in USD/month. Generated column
   * populated from the free-form range string at insert/update time.
   * NULL for "unknown" or unparseable values. See
   * supabase/migrations/012_revenue_upper_generated_column.sql.
   */
  revenue_upper_usd: number | null
  first_seen_at: string
  last_seen_at: string
  status: "active" | "needs_review" | "archived"
  created_at: string
  updated_at: string
  /**
   * LLM-generated "why this is interesting" paragraph. 2-4 sentences
   * covering market timing, closest competitor, unit economics hint, and
   * biggest risk. Generated once per idea by Claude Sonnet 4.6 at insert
   * time (new ideas) or via scripts/backfill-commentary.ts. NULL until
   * backfill runs or if generation failed. Rendered above the summary on
   * idea pages and included in /ideas/{slug}.md + /llms-full.txt.
   */
  commentary: string | null
  commentary_generated_at: string | null
  commentary_model: string | null
}

export interface IdeaSource {
  id: string
  idea_id: string
  source_platform: string
  source_url: string | null
  raw_text: string | null
  extracted_at: string
}

export type SortOption = "trending" | "newest" | "recent" | "easiest" | "popularity" | "revenue" | "fresh"

export type PopularityFilter = "all" | "trending" | "rising" | "new"

export type TimeFilter = "all" | "week" | "month" | "3months"

/**
 * Revenue-tier filter. Values are the minimum upper-bound USD/month an idea's
 * revenue_upper_usd must meet. "any" and undefined mean no filter applied.
 * Thresholds chosen to match the scarcity distribution surfaced by the
 * 2026-04-10 badge investigation — see Projects/Vibe Code Ideas cont. 3.
 */
export type RevenueFilter = "any" | "2k" | "10k" | "25k" | "50k"

export interface IdeaFilters {
  q?: string
  category?: string
  popularity?: PopularityFilter
  time?: TimeFilter
  sort?: SortOption
  view?: "card" | "list"
  cursor?: string
  difficulty?: "easy" | "medium" | "hard"
  revenue?: RevenueFilter
}

export interface AppUser {
  id: string
  email: string
  subscription_status: "free" | "pro"
  stripe_customer_id: string | null
}

export interface IdeaPackage {
  fill_data: Record<string, any>
  tech_spec: string
  brand_kit: string
  launch_checklist: string
  generated_at: string
}

export interface ScrapeRun {
  id: string
  source_platform: string
  started_at: string
  finished_at: string
  posts_fetched: number
  ideas_extracted: number
  ideas_new: number
  ideas_duplicate: number
  ideas_error: number
  duration_ms: number
  status: "success" | "failure"
  error_message: string | null
}

export interface AdminStats {
  total_ideas: number
  active_ideas: number
  needs_review: number
  by_category: { category: string; count: number }[]
  by_source: { source_platform: string; count: number }[]
  daily_ingest: { date: string; count: number }[]
  quality: {
    missing_enrichment: number
    low_mentions: number
    default_difficulty: number
  }
}
