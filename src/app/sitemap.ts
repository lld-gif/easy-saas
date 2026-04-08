import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: ideas } = await supabase
    .from("ideas")
    .select("slug, updated_at")
    .order("popularity_score", { ascending: false })

  const ideaEntries: MetadataRoute.Sitemap = (ideas ?? []).map((idea) => ({
    url: `https://vibecodeideas.ai/ideas/${idea.slug}`,
    lastModified: idea.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  return [
    {
      url: "https://vibecodeideas.ai",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://vibecodeideas.ai/ideas",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://vibecodeideas.ai/pricing",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...ideaEntries,
  ]
}
