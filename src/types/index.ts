export interface Idea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  mention_count: number
  difficulty: number
  first_seen_at: string
  last_seen_at: string
  status: "active" | "needs_review" | "archived"
  created_at: string
  updated_at: string
}

export interface IdeaSource {
  id: string
  idea_id: string
  source_platform: string
  source_url: string | null
  raw_text: string | null
  extracted_at: string
}

export type SortOption = "trending" | "newest" | "recent" | "easiest"

export type PopularityFilter = "all" | "trending" | "rising" | "new"

export type TimeFilter = "all" | "week" | "month" | "3months"

export interface IdeaFilters {
  q?: string
  category?: string
  popularity?: PopularityFilter
  time?: TimeFilter
  sort?: SortOption
  view?: "card" | "list"
  cursor?: string
  difficulty?: "easy" | "medium" | "hard"
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
