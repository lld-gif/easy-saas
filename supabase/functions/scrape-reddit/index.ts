import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createScrapeHandler, getEnabledSources } from "../_shared/extract.ts"

const DEFAULT_SUBREDDITS = ["SaaS", "Entrepreneur", "SideProject", "slavelabour", "microsaas", "indiehackers"]

// Fetch both /hot and /new for each subreddit to double discovery without
// adding new sources. Dedupe by Reddit post ID within a run so the same post
// appearing in both feeds only generates one input to the LLM.
const SORT_MODES = ["hot", "new"] as const

// Reddit blocks Supabase Edge Function outbound IPs on the anonymous
// reddit.com/r/{sub}.json endpoint. OAuth-authenticated requests against
// oauth.reddit.com are not blocked and also give us a higher rate limit
// (100 QPM vs. ~60 QPM anonymous), so we switched to the script-app password
// grant flow. Env vars REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET /
// REDDIT_USERNAME / REDDIT_PASSWORD are required — if any are missing,
// we log a warning and return zero posts (handler logs a success run with
// posts_fetched=0, keeping the same shape as before).

interface RedditTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: string
}

async function getRedditAccessToken(
  clientId: string,
  clientSecret: string,
  username: string,
  password: string,
  userAgent: string
): Promise<string | null> {
  try {
    const basicAuth = btoa(`${clientId}:${clientSecret}`)
    const body = new URLSearchParams({
      grant_type: "password",
      username,
      password,
    })

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Reddit OAuth token fetch failed: ${res.status} ${text}`)
      return null
    }

    const data: RedditTokenResponse = await res.json()
    if (data.error || !data.access_token) {
      console.error(`Reddit OAuth returned error: ${data.error ?? "no access_token"}`)
      return null
    }

    return data.access_token
  } catch (e) {
    console.error("Reddit OAuth token fetch threw:", e)
    return null
  }
}

async function fetchReddit(): Promise<string[]> {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID")
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET")
  const username = Deno.env.get("REDDIT_USERNAME")
  const password = Deno.env.get("REDDIT_PASSWORD")

  if (!clientId || !clientSecret || !username || !password) {
    console.warn(
      "Reddit OAuth credentials missing — set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / " +
        "REDDIT_USERNAME / REDDIT_PASSWORD in Supabase Edge Function secrets. " +
        "Skipping scrape and returning 0 posts."
    )
    return []
  }

  // Reddit's API policy requires a descriptive UA that identifies the bot
  // and the owning account. Using anything generic (or a browser UA) will
  // get 429'd within a few requests.
  const userAgent = `VibeCodeIdeas/1.0 by /u/${username}`

  const token = await getRedditAccessToken(clientId, clientSecret, username, password, userAgent)
  if (!token) {
    console.error("Reddit: no access token obtained — aborting scrape")
    return []
  }

  const configured = await getEnabledSources("reddit")
  const subreddits = configured.length > 0 ? configured : DEFAULT_SUBREDDITS
  console.log(
    `Reddit: authenticated as /u/${username}, using ${subreddits.length} subreddits ` +
      `(${configured.length > 0 ? "from DB" : "hardcoded fallback"}), fetching hot + new for each`
  )

  const posts: string[] = []
  const seenIds = new Set<string>()

  for (const sub of subreddits) {
    for (const mode of SORT_MODES) {
      try {
        const res = await fetch(
          `https://oauth.reddit.com/r/${sub}/${mode}.json?limit=25`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": userAgent,
            },
          }
        )
        if (!res.ok) {
          console.warn(`Reddit: r/${sub}/${mode} returned ${res.status}`)
          continue
        }
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

      // Polite delay between Reddit API calls. OAuth limit is 100 QPM so
      // 500ms between calls (= 120 QPM theoretical) is already close to
      // the ceiling; the per-request latency keeps us comfortably under.
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
