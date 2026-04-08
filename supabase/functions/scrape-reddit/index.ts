import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchReddit(): Promise<string[]> {
  const subreddits = ["SaaS", "Entrepreneur", "SideProject", "slavelabour", "microsaas", "indiehackers"]
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
