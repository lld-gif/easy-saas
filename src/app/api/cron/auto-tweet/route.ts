import { createClient } from "@supabase/supabase-js"
import { composeTweet } from "@/lib/tweet-composer"
import { NextResponse } from "next/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"

interface IdeaRow {
  id: string
  slug: string
  title: string
  summary: string
  category: string | null
  mention_count: number | null
  popularity_score: number | null
}

/**
 * GET /api/cron/auto-tweet
 *
 * Called daily by Vercel Cron. Picks the top trending idea that hasn't
 * been tweeted yet, composes a tweet, and posts it to X/Twitter.
 *
 * Protected by CRON_SECRET in the Authorization header.
 */
export async function GET(request: Request) {
  // --- Auth check ---
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // --- Supabase client (service role for server-side access) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Supabase environment variables not configured" },
      { status: 503 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // --- Get IDs of already-tweeted ideas ---
  const { data: tweeted } = await supabase
    .from("auto_tweets")
    .select("idea_id")

  const tweetedIds = (tweeted ?? []).map(
    (r: { idea_id: string }) => r.idea_id
  )

  // --- Find the top trending idea not yet tweeted ---
  let query = supabase
    .from("ideas")
    .select(
      "id, slug, title, summary, category, mention_count, popularity_score"
    )
    .order("popularity_score", { ascending: false })
    .limit(1)

  if (tweetedIds.length > 0) {
    // Filter out already-tweeted ideas using NOT IN
    query = query.not("id", "in", `(${tweetedIds.join(",")})`)
  }

  const { data: ideas, error: queryError } = await query

  if (queryError) {
    return NextResponse.json(
      { error: "Failed to query ideas", details: queryError.message },
      { status: 500 }
    )
  }

  const idea = (ideas as IdeaRow[] | null)?.[0] ?? null

  if (!idea) {
    return NextResponse.json({
      status: "skipped",
      reason: "No untweeted ideas available",
    })
  }

  // --- Compose the tweet ---
  const tweetText = composeTweet(idea)

  // --- Insert pending record ---
  const { data: tweetRecord, error: insertError } = await supabase
    .from("auto_tweets")
    .insert({
      idea_id: idea.id,
      tweet_text: tweetText,
      status: "pending",
    })
    .select("id")
    .single()

  if (insertError || !tweetRecord) {
    return NextResponse.json(
      { error: "Failed to insert tweet record", details: insertError?.message },
      { status: 500 }
    )
  }

  const recordId = (tweetRecord as { id: string }).id

  // --- Post to Twitter/X ---
  const twitterApiKey = process.env.TWITTER_API_KEY
  const twitterApiSecret = process.env.TWITTER_API_SECRET
  const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN
  const twitterAccessSecret = process.env.TWITTER_ACCESS_SECRET

  const hasTwitterCredentials =
    twitterApiKey &&
    twitterApiSecret &&
    twitterAccessToken &&
    twitterAccessSecret

  if (!hasTwitterCredentials) {
    // Log the tweet but leave as pending — Twitter not configured yet
    console.log("[auto-tweet] Twitter credentials not configured. Tweet text:")
    console.log(tweetText)

    return NextResponse.json({
      status: "pending",
      reason:
        "Twitter credentials not configured — tweet recorded but not posted",
      idea_id: idea.id,
      idea_title: idea.title,
      tweet_text: tweetText,
      tweet_record_id: recordId,
    })
  }

  try {
    const twitterTweetId = await postToTwitter(tweetText, {
      apiKey: twitterApiKey,
      apiSecret: twitterApiSecret,
      accessToken: twitterAccessToken,
      accessSecret: twitterAccessSecret,
    })

    // Update record to posted
    await supabase
      .from("auto_tweets")
      .update({ status: "posted", tweet_id: twitterTweetId })
      .eq("id", recordId)

    return NextResponse.json({
      status: "posted",
      idea_id: idea.id,
      idea_title: idea.title,
      tweet_text: tweetText,
      tweet_id: twitterTweetId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"

    // Update record to failed
    await supabase
      .from("auto_tweets")
      .update({ status: "failed" })
      .eq("id", recordId)

    return NextResponse.json(
      {
        status: "failed",
        error: message,
        idea_id: idea.id,
        tweet_text: tweetText,
      },
      { status: 502 }
    )
  }
}

// ---------------------------------------------------------------------------
// Twitter OAuth 1.0a posting
// ---------------------------------------------------------------------------

interface TwitterCredentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
}

async function postToTwitter(
  text: string,
  creds: TwitterCredentials
): Promise<string> {
  const url = "https://api.twitter.com/2/tweets"
  const method = "POST"

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  }

  // Build signature base string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(oauthParams[k])}`)
    .join("&")

  const signatureBase = `${method}&${encodeRFC3986(url)}&${encodeRFC3986(paramString)}`
  const signingKey = `${encodeRFC3986(creds.apiSecret)}&${encodeRFC3986(creds.accessSecret)}`

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64")

  oauthParams.oauth_signature = signature

  const oauthHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k])}"`)
      .join(", ")

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
  }

  const data = (await response.json()) as { data?: { id?: string } }
  return data.data?.id ?? "unknown"
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}
