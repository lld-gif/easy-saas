import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchIndieHackers(): Promise<string[]> {
  const posts: string[] = []

  // Primary: Fetch from r/indiehackers (reliable JSON API)
  const subreddits = ["indiehackers", "EntrepreneurRideAlong", "IMadeThis"]

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
        } else if (post.title && post.title.length > 20) {
          posts.push(`Title: ${post.title}`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch r/${sub}:`, e)
    }

    // Rate limit between subreddits
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Secondary: Try Indie Hackers directly
  try {
    const res = await fetch("https://www.indiehackers.com/feed", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EasySaaS/2.0)",
        "Accept": "application/xml, text/xml, */*",
      },
    })
    if (res.ok) {
      const xml = await res.text()
      // Parse RSS items
      const items = xml.matchAll(/<item>[\s\S]*?<\/item>/gi)
      for (const item of items) {
        const titleMatch = item[0].match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/i) ||
          item[0].match(/<title>(.+?)<\/title>/i)
        const descMatch = item[0].match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/i) ||
          item[0].match(/<description>(.+?)<\/description>/i)

        if (titleMatch) {
          const title = titleMatch[1].replace(/<[^>]+>/g, "").trim()
          const desc = descMatch
            ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 500)
            : ""
          posts.push(`Title: ${title}${desc ? `\nBody: ${desc}` : ""}`)
        }
      }
    }
  } catch (e) {
    console.warn("Indie Hackers RSS failed:", e)
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "indiehackers",
    fetchIndieHackers,
    "from Indie Hackers community posts about building SaaS businesses and side projects"
  )
)
