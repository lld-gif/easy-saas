import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler, getEnabledSources } from "../_shared/extract.ts"

const DEFAULT_QUERIES = ["Show HN", "SaaS idea", "I built", "Ask HN what should", "micro saas", "side project revenue"]

async function fetchHackerNews(): Promise<string[]> {
  const configured = await getEnabledSources("hackernews")
  const queries = configured.length > 0 ? configured : DEFAULT_QUERIES
  console.log(`HN: using ${queries.length} queries (${configured.length > 0 ? "from DB" : "hardcoded fallback"})`)

  const posts: string[] = []

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`
      )
      if (!res.ok) continue
      const data = await res.json()

      for (const hit of data.hits) {
        if (hit.title) {
          posts.push(
            `Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}`
          )
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch HN:`, e)
    }
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "hackernews",
    fetchHackerNews,
    "from Hacker News discussions about building products and startups"
  )
)
