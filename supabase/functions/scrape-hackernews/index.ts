import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchHackerNews(): Promise<string[]> {
  const posts: string[] = []
  const queries = ["Show HN", "SaaS idea", "I built", "Ask HN what should", "micro saas", "side project revenue"]

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
