import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler } from "../_shared/extract.ts"

async function fetchGoogleTrends(): Promise<string[]> {
  const posts: string[] = []

  // Google Trends RSS feed — US trending searches
  const feeds = [
    "https://trends.google.com/trending/rss?geo=US",
    "https://trends.google.com/trending/rss?geo=US&cat=t", // Technology category
  ]

  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EasySaaS/2.0)",
          "Accept": "application/xml, text/xml, */*",
        },
      })

      if (!res.ok) {
        console.warn(`Google Trends RSS returned ${res.status}`)
        continue
      }

      const xml = await res.text()

      // Parse RSS items
      const items = xml.matchAll(/<item>[\s\S]*?<\/item>/gi)
      for (const item of items) {
        const titleMatch = item[0].match(/<title>(.+?)<\/title>/i)
        const trafficMatch = item[0].match(/<ht:approx_traffic>(.+?)<\/ht:approx_traffic>/i)
        const newsMatch = item[0].match(/<ht:news_item_title>(.+?)<\/ht:news_item_title>/gi)

        if (titleMatch) {
          const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()
          const traffic = trafficMatch ? trafficMatch[1].trim() : "unknown"
          const newsContext = newsMatch
            ? newsMatch
                .slice(0, 3)
                .map((m) => m.replace(/<[^>]+>/g, "").trim())
                .join("; ")
            : ""

          posts.push(
            `Trending: ${title}\nTraffic: ${traffic}\nContext: ${newsContext || "General trending topic"}`
          )
        }
      }
    } catch (e) {
      console.warn(`Google Trends RSS failed:`, e)
    }
  }

  return posts
}

Deno.serve(
  createScrapeHandler(
    "googletrends",
    fetchGoogleTrends,
    "from Google Trends trending searches. IMPORTANT: Only extract trends that relate to software, apps, SaaS, technology tools, or digital products. Skip celebrity gossip, sports, politics, and non-tech topics entirely. For tech-related trends, imagine what SaaS product or tool could capitalize on this trend."
  )
)
