import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
// 5 ideas × ~2k tokens each through Sonnet ≈ 90s wall-clock worst case.
// Vercel Pro defaults to 60s; bump to 300 for headroom.
export const maxDuration = 300

/**
 * GET /api/cron/auto-blog
 *
 * Once per week (Fri 22:00 UTC = 3pm PT) Vercel Cron pings this route.
 * It picks the top 5 ideas first-seen in the last 7 days, asks Sonnet
 * to write a structured weekly recap post in the existing blog voice,
 * and inserts the result into `auto_blog_posts`. The /blog index merges
 * static + auto sources by published_at, so the post appears at the
 * top of /blog within minutes of generation (revalidate=3600 on the
 * page; the cron tick itself bumps the cache key via the new row).
 *
 * Idempotency:
 *   - Slug is `weekly-roundup-YYYY-MM-DD` keyed to the Monday of the
 *     recap week. Two cron firings in the same week produce identical
 *     slugs; the UNIQUE constraint short-circuits the second insert
 *     and the route returns `{ skipped: true, reason: "already_exists" }`.
 *
 * Failure modes:
 *   - <3 fresh ideas (rare; means the scrape pipeline is degraded too)
 *     → fall back to the top 5 by 14-day mention growth, label the post
 *     "Top 5 ideas building momentum this fortnight."
 *   - Anthropic 5xx / timeout → no row inserted, alert via the existing
 *     pipeline-health observability — operator gets a daily digest
 *     before the next Friday tick.
 *   - Supabase write fails → log + return 500 so Vercel marks the
 *     invocation failed and we can grep logs.
 *
 * Auth: standard CRON_SECRET Bearer header (matches every other
 * /api/cron/* route).
 */
export async function GET(request: Request) {
  // --- Auth ---
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

  // --- Env ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!supabaseUrl || !supabaseServiceKey || !anthropicKey) {
    return NextResponse.json(
      { error: "Missing Supabase or Anthropic env vars" },
      { status: 503 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  // --- Compute the recap week ---
  // "This week" runs Mon 00:00 UTC → Mon 00:00 UTC. Slug keys to the
  // Monday so all firings within the same week converge to the same row.
  const now = new Date()
  const weekStart = mondayUtc(now)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const slug = `weekly-roundup-${weekStart.toISOString().slice(0, 10)}`

  // --- Idempotency check ---
  const { data: existing } = await supabase
    .from("auto_blog_posts")
    .select("slug, published_at")
    .eq("slug", slug)
    .maybeSingle()
  if (existing) {
    // Even on a no-op, run revalidation. Cheap (Next path invalidation
    // is microseconds) and recovers from the case where the previous
    // insert succeeded but its revalidate call didn't propagate (e.g.
    // a cold edge cache region or a deploy that landed between the
    // insert and the page render).
    try {
      revalidatePath("/blog")
      revalidatePath("/sitemap.xml")
      revalidatePath("/blog/rss")
    } catch {}
    return NextResponse.json({
      skipped: true,
      reason: "already_exists",
      slug,
      published_at: existing.published_at,
      revalidated: true,
    })
  }

  // --- Source selection ---
  // Primary: top 5 ideas first-seen this past week, ordered by popularity_score.
  // Fallback: if <3 such ideas, broaden to 14d by mention_count.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { data: weekIdeas } = await supabase
    .from("ideas")
    .select(
      "id, slug, title, summary, category, mention_count, popularity_score, revenue_potential, difficulty, market_signal, competition_level, commentary"
    )
    .eq("status", "active")
    .gte("first_seen_at", sevenDaysAgo.toISOString())
    .order("popularity_score", { ascending: false, nullsFirst: false })
    .limit(5)

  const fallbackUsed = !weekIdeas || weekIdeas.length < 3

  let ideas = weekIdeas ?? []
  if (fallbackUsed) {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const { data: broaderIdeas } = await supabase
      .from("ideas")
      .select(
        "id, slug, title, summary, category, mention_count, popularity_score, revenue_potential, difficulty, market_signal, competition_level, commentary"
      )
      .eq("status", "active")
      .gte("last_seen_at", fourteenDaysAgo.toISOString())
      .order("mention_count", { ascending: false, nullsFirst: false })
      .limit(5)
    ideas = broaderIdeas ?? []
  }

  if (ideas.length === 0) {
    return NextResponse.json(
      { error: "No ideas found for recap window — pipeline may be degraded" },
      { status: 500 }
    )
  }

  // --- Prompt ---
  const ideaBullets = ideas
    .map(
      (i, n) =>
        `${n + 1}. ${i.title}\n` +
        `   Category: ${i.category}\n` +
        `   Mentions: ${i.mention_count ?? 0}\n` +
        `   Difficulty: ${i.difficulty}/5\n` +
        `   Revenue: ${i.revenue_potential ?? "unknown"}\n` +
        `   Market signal: ${i.market_signal ?? "unknown"}\n` +
        `   Competition: ${i.competition_level ?? "unknown"}\n` +
        `   Slug: ${i.slug}\n` +
        `   Summary: ${i.summary}\n` +
        (i.commentary ? `   Existing commentary: ${i.commentary}` : "")
    )
    .join("\n\n")

  const weekLabel = formatWeekLabel(weekStart, weekEnd)
  const titleHint = fallbackUsed
    ? `Top 5 SaaS ideas building momentum this fortnight (${weekLabel})`
    : `Top 5 SaaS ideas trending the week of ${weekLabel}`

  const prompt = `You are writing a short weekly blog post for Vibe Code Ideas (vibecodeideas.ai), a directory of crowdsourced SaaS ideas. The audience is indie hackers and solo founders looking for their next project.

Voice: direct, expert, opinionated. Same tone as Patrick McKenzie or Pieter Levels — short paragraphs, no filler, evidence-first. Do NOT use phrases like "in today's rapidly evolving landscape" or "harness the power of." No exclamation points. No emojis except ▲ for trending and ⭐ for save.

Format: markdown. The post body must follow this structure exactly:

1. Title as plain text on its own line — return as the FIRST line, no leading "#".
2. Then a one-line description (single sentence, ≤160 chars) on its own line, prefixed with "DESCRIPTION: ".
3. Then a blank line.
4. Then the body in this order:
   - **2-3 sentence intro** anchoring the recap (which week, how many ideas, where they came from). Be specific. Include the source breakdown if obvious.
   - **One H2 per idea** (## ${ideas.length === 5 ? "5" : ideas.length}-numbered "## 1. {title}" etc.) Under each H2, write 2-3 sentences covering: what the idea is in one line, why it surfaced this week (mention count, signal), and the most interesting wrinkle (competitor gap / unit econ / weekend-build potential / risk). End each section with a markdown link to the idea's detail page formatted as: \`[Browse the full idea →](/ideas/{slug})\`.
   - **A short closing paragraph** (2 sentences max): one observation about the pattern across these 5 (e.g. "All five lean into the AI-tools-for-non-AI-people thesis"), and a CTA: \`[Browse fresh ideas →](/ideas?sort=fresh)\`.

Constraints:
- Total length: 600-900 words. Tight is better than long.
- Do NOT invent revenue numbers, mention counts, or competitor names beyond what's in the source data.
- If a "Existing commentary:" field is provided for an idea, USE it as your reference for the wrinkle/competitor angle — do not contradict it.
- The title you generate may differ from the title hint, but it must mention "this week" or the week label.

Title hint: ${titleHint}

Source data — top ${ideas.length} ideas to cover, in order:

${ideaBullets}

Return only the post (title + DESCRIPTION line + blank line + body). No preface, no signoff.`

  // --- Generate ---
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  })

  const block = res.content[0]
  const raw = block && block.type === "text" ? block.text.trim() : ""
  if (!raw) {
    return NextResponse.json(
      { error: "Sonnet returned empty content" },
      { status: 500 }
    )
  }

  // --- Parse the output ---
  // Expected: line 1 = title; line 2 = "DESCRIPTION: …"; rest = body
  const lines = raw.split("\n")
  const title = lines[0]?.trim().replace(/^#\s*/, "")
  const descLine = lines[1]?.trim()
  if (!title || !descLine?.startsWith("DESCRIPTION:")) {
    return NextResponse.json(
      {
        error: "Generated post failed format check",
        preview: raw.slice(0, 400),
      },
      { status: 500 }
    )
  }
  const description = descLine.replace(/^DESCRIPTION:\s*/, "").trim()
  const body = lines.slice(2).join("\n").trim()

  if (description.length > 200 || body.length < 200) {
    return NextResponse.json(
      {
        error: "Description or body length out of bounds",
        descriptionLength: description.length,
        bodyLength: body.length,
      },
      { status: 500 }
    )
  }

  // --- Persist ---
  const inputTokens = res.usage.input_tokens
  const outputTokens = res.usage.output_tokens
  const costUsd = (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000

  const { error: insertErr } = await supabase
    .from("auto_blog_posts")
    .insert({
      slug,
      title,
      description,
      content: body,
      generated_by: "auto-blog-weekly-v1",
      metadata: {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        fallback_used: fallbackUsed,
        source_idea_ids: ideas.map((i) => i.id),
        source_idea_slugs: ideas.map((i) => i.slug),
        model: "claude-sonnet-4-6",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
    })

  if (insertErr) {
    return NextResponse.json(
      { error: "DB insert failed", detail: insertErr.message },
      { status: 500 }
    )
  }

  // On-demand ISR revalidation — without this, /blog and /sitemap.xml
  // would keep serving their pre-insert cached render until the natural
  // 1h ISR window expired. New posts deserve to appear immediately so
  // GSC + IndexNow + RSS pollers pick them up on the next crawl.
  // revalidate* is a no-op in dev/local but ships fine on Vercel.
  try {
    revalidatePath("/blog")
    revalidatePath("/sitemap.xml")
    revalidatePath("/blog/rss")
    revalidatePath("/ideas/rss")
  } catch (e) {
    console.warn("revalidate failed (non-fatal):", e)
  }

  return NextResponse.json({
    success: true,
    slug,
    title,
    description,
    body_length: body.length,
    ideas_used: ideas.length,
    fallback_used: fallbackUsed,
    cost_usd: Number(costUsd.toFixed(5)),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  })
}

// --- Helpers ---

/** Returns 00:00 UTC on the Monday of the week containing `d`. */
function mondayUtc(d: Date): Date {
  const utc = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  )
  const dow = utc.getUTCDay() // 0 Sun, 1 Mon, ..., 6 Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow
  return new Date(utc.getTime() + offsetToMonday * 24 * 60 * 60 * 1000)
}

/** "Apr 28 – May 4, 2026" style label for the post title. */
function formatWeekLabel(start: Date, end: Date): string {
  const fmt: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }
  const startStr = start.toLocaleDateString("en-US", fmt)
  // End is exclusive — humans expect "ending Sunday" so subtract 1 day.
  const inclusiveEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const endStr = inclusiveEnd.toLocaleDateString("en-US", fmt)
  const year = end.getUTCFullYear()
  return `${startStr} – ${endStr}, ${year}`
}
