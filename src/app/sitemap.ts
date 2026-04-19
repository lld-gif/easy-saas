import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { CATEGORIES } from "@/lib/categories"

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

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `https://vibecodeideas.ai/ideas/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  const difficultyEntries: MetadataRoute.Sitemap = (
    ["easy", "medium", "hard"] as const
  ).map((level) => ({
    url: `https://vibecodeideas.ai/ideas/difficulty/${level}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
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
      url: "https://vibecodeideas.ai/ideas/trending",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://vibecodeideas.ai/about",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://vibecodeideas.ai/methodology",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://vibecodeideas.ai/pricing",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://vibecodeideas.ai/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://vibecodeideas.ai/terms",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...categoryEntries,
    ...difficultyEntries,
    ...ideaEntries,
  ]
}
