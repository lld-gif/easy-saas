import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * GET /api/cron/recalc-scores
 *
 * Called daily by Vercel Cron. Recalculates popularity_score for all
 * active ideas so recency decay keeps rankings fresh.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Order matters: refresh the 7d window FIRST so popularity_score's
    // (small) recency component sees the same source-of-truth window
    // the Trending sort uses. Both RPCs are SECURITY DEFINER and
    // service-role only.
    const recentRes = await supabase.rpc(
      "recalculate_all_recent_mention_counts"
    )
    if (recentRes.error) {
      console.error(
        "recalculate_all_recent_mention_counts failed:",
        recentRes.error
      )
      return NextResponse.json(
        { error: recentRes.error.message, stage: "recent_mentions" },
        { status: 500 }
      )
    }

    const popRes = await supabase.rpc("recalculate_all_popularity_scores")
    if (popRes.error) {
      console.error("recalculate_all_popularity_scores failed:", popRes.error)
      return NextResponse.json(
        { error: popRes.error.message, stage: "popularity_score" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ideas_updated: popRes.data,
      recent_mention_rows_updated: recentRes.data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Recalculation error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
