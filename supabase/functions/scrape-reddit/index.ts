import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler, getEnabledSources } from "../_shared/extract.ts"

const DEFAULT_SUBREDDITS = ["SaaS", "Entrepreneur", "SideProject", "slavelabour", "microsaas", "indiehackers"]

async function fetchReddit(): Promise<string[]> {
  const configured = await getEnabledSources("reddit")
  const subreddits = configured.length > 0 ? configured : DEFAULT_SUBREDDITS
  console.log(`Reddit: using ${subreddits.length} subreddits (${configured.length > 0 ? "from DB" : "hardcoded fallback"})`)

  const posts: string[] = []

  for (const sub of subreddits) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=25`,
        { headers: { "User-Agent": "EasySaaS-Pipeline/2.0" } }
      )
      if (!res.ok) continue
      const data = await res.json()

      for (const child of data.data.children) {
        const post = child.data
        if (post.selftext && post.selftext.length > 50) {
          posts.push(`Title: ${post.title}\nBody: ${post.selftext.slice(0, 500)}`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch r/${sub}:`, e)
    }
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "reddit",
    fetchReddit,
    "from Reddit posts about building software and side projects"
  )
)
