import { createClient } from "@supabase/supabase-js"

/**
 * One Sonnet-generated SEO content block for a category page.
 * Refreshed monthly by /api/cron/refresh-category-content.
 *
 * `trendingSubtopics` is the parsed JSON shape stored in the
 * `trending_subtopics jsonb` column. We type it explicitly so the
 * page renderer can iterate without `any`.
 */
export interface CategoryContent {
  categorySlug: string
  introParagraph: string
  trendingSubtopics: Array<{
    topic: string
    why_interesting: string
    example_idea_slugs: string[]
  }>
  generatedAt: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase env not configured for category-content reader")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Single-row lookup for /ideas/category/[slug]. Returns null if the
 * cron hasn't populated this row yet — caller falls back to the
 * static categoryDescriptions map so the page never breaks.
 */
export async function getCategoryContent(
  slug: string
): Promise<CategoryContent | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from("category_content")
      .select(
        "category_slug, intro_paragraph, trending_subtopics, generated_at"
      )
      .eq("category_slug", slug)
      .maybeSingle()
    if (error || !data) return null
    return {
      categorySlug: data.category_slug,
      introParagraph: data.intro_paragraph,
      trendingSubtopics: Array.isArray(data.trending_subtopics)
        ? (data.trending_subtopics as CategoryContent["trendingSubtopics"])
        : [],
      generatedAt: data.generated_at,
    }
  } catch (err) {
    console.error("getCategoryContent threw:", err)
    return null
  }
}
