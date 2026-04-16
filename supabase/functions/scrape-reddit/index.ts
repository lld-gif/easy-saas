import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler, getEnabledSources } from "../_shared/extract.ts"

const DEFAULT_SUBREDDITS = ["SaaS", "Entrepreneur", "SideProject", "slavelabour", "microsaas", "indiehackers"]

// Fetch both /hot and /new for each subreddit to double discovery without
// adding new sources. Dedupe by Reddit post ID within a run so the same post
// appearing in both feeds only generates one input to the LLM.
const SORT_MODES = ["hot", "new"] as const

async function fetchReddit(): Promise<string[]> {
  const configured = await getEnabledSources("reddit")
  const subreddits = configured.length > 0 ? configured : DEFAULT_SUBREDDITS
  console.log(`Reddit: using ${subreddits.length} subreddits (${configured.length > 0 ? "from DB" : "hardcoded fallback"}), fetching hot + new for each`)

  const posts: string[] = []
  const seenIds = new Set<string>()

  for (const sub of subreddits) {
    for (const mode of SORT_MODES) {
      try {
        const res = await fetch(
          `https://www.reddit.com/r/${sub}/${mode}.json?limit=25`,
          { headers: { "User-Agent": "EasySaaS-Pipeline/2.0" } }
        )
        if (!res.ok) continue
        const data = await res.json()

        for (const child of data.data.children) {
          const post = child.data
          if (!post.id || seenIds.has(post.id)) continue
          seenIds.add(post.id)
          if (post.selftext && post.selftext.length > 50) {
            posts.push(`Title: ${post.title}\nBody: ${post.selftext.slice(0, 500)}`)
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch r/${sub}/${mode}:`, e)
      }

      // Polite delay between Reddit API calls
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`Reddit: ${posts.length} unique posts across ${subreddits.length} subreddits × 2 feeds`)
  return posts
}

Deno.serve(
  createScrapeHandler(
    "reddit",
    fetchReddit,
    "from Reddit posts about building software and side projects"
  )
)
