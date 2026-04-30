import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { CATEGORIES } from "@/lib/categories"

export const dynamic = "force-dynamic"
// 14 categories × Sonnet call ≈ 30s if parallel, 7min if serial. Keep
// parallel + budget for tail latency.
export const maxDuration = 300

/**
 * GET /api/cron/refresh-category-content
 *
 * Monthly cron (1st of every month, 03:00 UTC). For each category in
 * src/lib/categories.ts:
 *   1. Pull the top 20 ideas in that category from the last 30 days
 *      (fall back to all-time if <5 in window).
 *   2. Ask Sonnet for a structured payload: 100-150 word SEO intro +
 *      3 trending sub-topics with example idea slugs.
 *   3. Upsert the row into category_content.
 *
 * The /ideas/category/[slug] page reads this table and renders the
 * intro + sub-topics as the H1 + first content section. 14 distinct
 * indexable URLs become 14 keyword-rich SEO landing pages instead of
 * slight variants of /ideas.
 *
 * Cost: ~$0.02 per category × 14 = ~$0.28/run, ~$3.40/year.
 *
 * Auth: standard CRON_SECRET Bearer header.
 *
 * The route is safe to invoke manually (e.g. backfill, prompt tweak).
 * It always overwrites — no idempotency guard. Two firings in the same
 * day produce two new generations and two upserts; the cost is
 * acceptable and the freshness is the feature.
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!supabaseUrl || !supabaseServiceKey || !anthropicKey) {
    return NextResponse.json(
      { error: "Missing Supabase or Anthropic env vars" },
      { status: 503 }
    )
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  // Process all 14 categories in parallel. Each promise either resolves
  // to a CategoryResult or an error object — never rejects, so
  // Promise.all returns even if some fail. Each worker creates its own
  // Supabase client to keep worker types simple (passing a typed client
  // through a generic param fights the un-typed @supabase/supabase-js
  // generics; cold-start overhead per client is negligible).
  const results = await Promise.all(
    CATEGORIES.map((cat) =>
      refreshOneCategory(
        cat.slug,
        cat.label,
        supabaseUrl,
        supabaseServiceKey,
        anthropic,
        thirtyDaysAgo
      )
    )
  )

  const succeeded = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  const totalCostUsd = succeeded.reduce(
    (acc, r) => acc + (r.ok ? r.costUsd : 0),
    0
  )

  // Revalidate every category page so the new content shows up
  // immediately. Cheap — Next path invalidation is microseconds each.
  try {
    for (const cat of CATEGORIES) {
      revalidatePath(`/ideas/category/${cat.slug}`)
    }
    revalidatePath("/sitemap.xml")
  } catch (e) {
    console.warn("revalidate failed (non-fatal):", e)
  }

  return NextResponse.json({
    succeeded: succeeded.length,
    failed: failed.length,
    failed_categories: failed.map((r) => r.slug),
    total_cost_usd: Number(totalCostUsd.toFixed(4)),
    results,
  })
}

// --- Per-category worker ---

interface OkResult {
  ok: true
  slug: string
  ideas_used: number
  fallback_used: boolean
  costUsd: number
  intro_chars: number
  subtopics: number
}
interface ErrResult {
  ok: false
  slug: string
  error: string
}
type CategoryResult = OkResult | ErrResult

interface SourceIdea {
  slug: string
  title: string
  summary: string
  mention_count: number | null
  revenue_potential: string | null
  difficulty: number
  commentary: string | null
}

async function refreshOneCategory(
  slug: string,
  label: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  anthropic: Anthropic,
  thirtyDaysAgoIso: string
): Promise<CategoryResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // --- Source pull ---
    const { data: recent } = await supabase
      .from("ideas")
      .select("slug, title, summary, mention_count, revenue_potential, difficulty, commentary")
      .eq("status", "active")
      .eq("category", slug)
      .gte("last_seen_at", thirtyDaysAgoIso)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(20)

    let ideas = (recent ?? []) as unknown as SourceIdea[]
    let fallbackUsed = false
    if (ideas.length < 5) {
      fallbackUsed = true
      const { data: alltime } = await supabase
        .from("ideas")
        .select("slug, title, summary, mention_count, revenue_potential, difficulty, commentary")
        .eq("status", "active")
        .eq("category", slug)
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .limit(20)
      ideas = (alltime ?? []) as unknown as SourceIdea[]
    }

    if (!ideas || ideas.length === 0) {
      return {
        ok: false,
        slug,
        error: "No ideas in category — skipping",
      }
    }

    // --- Prompt ---
    const ideaLines = ideas
      .map(
        (i, n) =>
          `${n + 1}. ${i.title} [slug: ${i.slug}]\n` +
          `   Mentions: ${i.mention_count ?? 0} · Difficulty: ${i.difficulty}/5 · Revenue: ${i.revenue_potential ?? "unknown"}\n` +
          `   ${i.summary}` +
          (i.commentary ? `\n   Commentary: ${i.commentary}` : "")
      )
      .join("\n\n")

    const prompt = `You are writing SEO landing-page content for the "${label}" category page on Vibe Code Ideas (vibecodeideas.ai), a directory of crowdsourced SaaS ideas.

The page will list every active idea in this category. Your job is the section ABOVE the list:
  1. A 100-150 word intro paragraph that gives an indie hacker a useful overview of what's in this category, what kinds of opportunities cluster here, and why someone might pick a project from this category specifically. Direct, expert voice — no "in today's rapidly evolving" filler. Mention 1-2 of the top ideas by name as examples.
  2. Three trending sub-topics inside this category (cluster the ${ideas.length} ideas thematically). For each: a short topic name (3-6 words), one sentence on why it's interesting right now, and 2-3 example idea slugs from the list below.

Audience: indie hackers and solo founders looking for their next project to build. They already understand SaaS — don't define basic terms.

Return ONLY a JSON object matching this exact shape (no preamble, no markdown fence):

{
  "intro_paragraph": "string, 100-150 words",
  "trending_subtopics": [
    { "topic": "...", "why_interesting": "...", "example_idea_slugs": ["...", "..."] },
    { "topic": "...", "why_interesting": "...", "example_idea_slugs": ["...", "..."] },
    { "topic": "...", "why_interesting": "...", "example_idea_slugs": ["...", "..."] }
  ]
}

Constraints:
- example_idea_slugs MUST be exact slugs from the list below (case-sensitive). If you reference an idea you must use its slug verbatim.
- intro_paragraph must NOT end with "...".
- Do not invent statistics, mention counts, or competitor names.
- Avoid these phrases: "in today's", "harness the power of", "game-changer", "unlock", "leverage" (as a verb).

Source ideas (top ${ideas.length} ${fallbackUsed ? "all-time" : "from the last 30 days"} in ${label}):

${ideaLines}`

    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })

    const block = res.content[0]
    const raw = block && block.type === "text" ? block.text.trim() : ""
    if (!raw) {
      return { ok: false, slug, error: "Empty Sonnet response" }
    }

    // --- Parse ---
    let parsed: {
      intro_paragraph: string
      trending_subtopics: Array<{
        topic: string
        why_interesting: string
        example_idea_slugs: string[]
      }>
    }
    try {
      // Strip code fences in case the model wrapped them despite the prompt.
      const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      return {
        ok: false,
        slug,
        error: `JSON parse failed: ${(e as Error).message} — preview: ${raw.slice(0, 200)}`,
      }
    }

    // --- Validate ---
    if (
      typeof parsed.intro_paragraph !== "string" ||
      parsed.intro_paragraph.length < 200 ||
      parsed.intro_paragraph.length > 1500 ||
      !Array.isArray(parsed.trending_subtopics) ||
      parsed.trending_subtopics.length < 2
    ) {
      return {
        ok: false,
        slug,
        error: `Validation failed — intro=${parsed.intro_paragraph?.length ?? 0} chars, subtopics=${parsed.trending_subtopics?.length ?? 0}`,
      }
    }

    // Filter out subtopics with no valid slugs (Sonnet hallucinated).
    const validSlugs = new Set(ideas.map((i) => i.slug))
    const cleanedSubtopics = parsed.trending_subtopics
      .map((s) => ({
        topic: String(s.topic ?? "").slice(0, 80),
        why_interesting: String(s.why_interesting ?? "").slice(0, 280),
        example_idea_slugs: (s.example_idea_slugs ?? []).filter((sl) =>
          validSlugs.has(sl)
        ),
      }))
      .filter((s) => s.topic && s.why_interesting && s.example_idea_slugs.length > 0)
      .slice(0, 3)

    if (cleanedSubtopics.length === 0) {
      return {
        ok: false,
        slug,
        error: "All sub-topics dropped after slug validation",
      }
    }

    // --- Persist ---
    const inputTokens = res.usage.input_tokens
    const outputTokens = res.usage.output_tokens
    const costUsd = (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000

    const { error: upsertErr } = await supabase
      .from("category_content")
      .upsert(
        {
          category_slug: slug,
          intro_paragraph: parsed.intro_paragraph,
          trending_subtopics: cleanedSubtopics,
          generated_at: new Date().toISOString(),
          generated_by: "category-content-v1",
          metadata: {
            ideas_used: ideas.length,
            fallback_used: fallbackUsed,
            model: "claude-sonnet-4-6",
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost_usd: costUsd,
            source_idea_slugs: ideas.map((i) => i.slug),
          },
        },
        { onConflict: "category_slug" }
      )

    if (upsertErr) {
      return {
        ok: false,
        slug,
        error: `DB upsert failed: ${upsertErr.message}`,
      }
    }

    return {
      ok: true,
      slug,
      ideas_used: ideas.length,
      fallback_used: fallbackUsed,
      costUsd,
      intro_chars: parsed.intro_paragraph.length,
      subtopics: cleanedSubtopics.length,
    }
  } catch (e) {
    return {
      ok: false,
      slug,
      error: `Worker threw: ${(e as Error).message}`,
    }
  }
}
