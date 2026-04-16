import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler, getEnabledSources } from "../_shared/extract.ts"

const DEFAULT_QUERIES = ["Show HN", "SaaS idea", "I built", "Ask HN what should", "micro saas", "side project revenue"]

// Hit both /search (by relevance) AND /search_by_date (newest first) to
// surface fresh Show HN posts that haven't accumulated enough votes to rank
// in the relevance search yet. Dedupe by Algolia objectID.
const SEARCH_ENDPOINTS = [
  "https://hn.algolia.com/api/v1/search",
  "https://hn.algolia.com/api/v1/search_by_date",
] as const

async function fetchHackerNews(): Promise<string[]> {
  const configured = await getEnabledSources("hackernews")
  const queries = configured.length > 0 ? configured : DEFAULT_QUERIES
  console.log(`HN: using ${queries.length} queries (${configured.length > 0 ? "from DB" : "hardcoded fallback"}), hitting search + search_by_date`)

  const posts: string[] = []
  const seenIds = new Set<string>()

  for (const q of queries) {
    for (const endpoint of SEARCH_ENDPOINTS) {
      try {
        const res = await fetch(
          `${endpoint}?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`
        )
        if (!res.ok) continue
        const data = await res.json()

        for (const hit of data.hits) {
          if (!hit.objectID || seenIds.has(hit.objectID)) continue
          seenIds.add(hit.objectID)
          if (hit.title) {
            posts.push(
              `Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}`
            )
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch HN ${endpoint}:`, e)
      }
    }
  }

  console.log(`HN: ${posts.length} unique posts across ${queries.length} queries × 2 endpoints`)
  return posts
}

Deno.serve(
  createScrapeHandler(
    "hackernews",
    fetchHackerNews,
    "from Hacker News discussions about building products and startups"
  )
)
