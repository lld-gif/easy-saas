import { createClient } from "jsr:@supabase/supabase-js@2"
import {
  COMMENTARY_MODEL,
  buildCommentaryPrompt,
  type CommentaryInput,
} from "./commentary-prompt.ts"

// Re-export so existing callers that import from extract.ts don't break.
export { COMMENTARY_MODEL }
export type { CommentaryInput }

// Wall-clock budgets for external API calls. Kept conservative so that
// a single slow upstream can't eat the Edge Function's 150s ceiling.
// Commentary: Sonnet typically responds in 3-8s; 15s AbortController
// leaves headroom for network jitter without letting a wedged call stall
// the whole scrape. IndexNow: trivial HTTP POST, should round-trip in
// well under a second; 3s is a hard stop for outright failures.
const COMMENTARY_TIMEOUT_MS = 15_000
const INDEXNOW_TIMEOUT_MS = 3_000

/**
 * fetch with an AbortController-backed timeout. Returns the Response on
 * success, throws on timeout or network error. Callers decide whether
 * to treat timeout as fatal or soft-fail.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export const CATEGORIES = [
  "fintech", "devtools", "automation", "ai-ml", "ecommerce", "health",
  "education", "creator-tools", "productivity", "marketing",
  "hr-recruiting", "real-estate", "logistics", "other",
]

export interface ExtractedIdea {
  idea_title: string
  summary: string
  category: string
  tags: string[]
  confidence: number
  difficulty: number
  market_signal: "strong" | "moderate" | "weak"
  competition_level: "low" | "medium" | "high"
  revenue_potential: string
}

export interface ScrapeRunData {
  source_platform: string
  started_at: string
  posts_fetched: number
  ideas_extracted: number
  ideas_new: number
  ideas_duplicate: number
  ideas_error: number
  duration_ms: number
  status: "success" | "failure"
  error_message?: string
}

/**
 * Fetch enabled source identifiers for a platform from the scrape_sources
 * table. Returns an empty array on any error (table missing, network issue,
 * etc.) — callers should fall back to a hardcoded default list when empty.
 */
export async function getEnabledSources(platform: string): Promise<string[]> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    const { data, error } = await supabase
      .from("scrape_sources")
      .select("source_identifier")
      .eq("platform", platform)
      .eq("enabled", true)

    if (error || !data || data.length === 0) return []
    return data.map((s: { source_identifier: string }) => s.source_identifier)
  } catch {
    return []
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export async function extractIdeas(
  posts: string[],
  apiKey: string,
  sourceContext: string
): Promise<ExtractedIdea[]> {
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []

  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies app and SaaS product ideas ${sourceContext}. Focus on ideas that ANYONE could build — from simple weekend projects to more complex platforms.

Prioritize:
- Micro-SaaS ideas (small, focused tools)
- Simple utility apps (trackers, calculators, generators)
- Ideas a beginner could vibe-code with AI assistance
- Personal tools that could become products (habit trackers, budget tools, etc.)

Also include more complex ideas if they're clearly viable.

For each idea found, return a JSON array of objects with:
- idea_title: concise product name (e.g., "Daily Habit Streak Tracker")
- summary: 2-3 sentence pitch describing the problem, solution, and target user. Use simple language.
- category: one of: ${CATEGORIES.join(", ")}
- tags: 3-5 lowercase tags
- confidence: 0.0-1.0 (how clearly this is a viable product idea)
- difficulty: 1-5 (1=can build in a weekend with AI, 2=simple but needs some planning, 3=moderate complexity, 4=significant engineering, 5=complex infrastructure needed)
- market_signal: "strong" (clear unmet demand, people asking for this), "moderate" (some interest), "weak" (speculative)
- competition_level: "low" (few or no existing solutions), "medium" (some competitors but room for differentiation), "high" (crowded market)
- revenue_potential: estimated MRR range (e.g., "$500-2k/mo", "$2k-10k/mo", "$10k-50k/mo") based on category, target market, and difficulty. Use "unknown" if genuinely unsure.

If a post doesn't contain a product idea, skip it. Return ONLY a valid JSON array, no other text.

Posts:
${chunk.map((p, idx) => `--- Post ${idx + 1} ---\n${p}`).join("\n\n")}`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (!res.ok) {
        console.warn(`Claude API error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const text = data.content?.[0]?.text ?? ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const ideas: ExtractedIdea[] = JSON.parse(jsonMatch[0])
        for (const idea of ideas) {
          if (idea.confidence >= 0.5 && idea.idea_title && idea.summary) {
            // Set defaults for enrichment fields if missing
            idea.market_signal = idea.market_signal || "weak"
            idea.competition_level = idea.competition_level || "medium"
            idea.revenue_potential = idea.revenue_potential || "unknown"
            allIdeas.push(idea)
          }
        }
      }
    } catch (e) {
      console.warn(`Extraction batch failed:`, e)
    }
  }

  return allIdeas
}

/**
 * Generate a "why this is interesting" commentary paragraph for a single
 * idea. Uses the canonical prompt template from ./commentary-prompt.ts
 * (same file imported by the Next.js side) so there's a single source
 * of truth for the prompt string.
 *
 * Hits Anthropic's REST API directly rather than through the SDK so the
 * Deno Edge runtime stays dependency-light.
 *
 * Wrapped in a 15s AbortController so a wedged upstream call can't stall
 * the caller's loop. Throws on timeout, non-2xx response, or empty
 * content. Callers decide whether to swallow or propagate.
 */
export async function generateCommentary(
  apiKey: string,
  idea: CommentaryInput
): Promise<{ text: string; model: string }> {
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: COMMENTARY_MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: buildCommentaryPrompt(idea) }],
      }),
    },
    COMMENTARY_TIMEOUT_MS
  )

  if (!res.ok) {
    throw new Error(`Commentary API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text?.trim() ?? ""
  if (!text) {
    throw new Error("Commentary generation returned empty text")
  }

  return { text, model: COMMENTARY_MODEL }
}

/**
 * Result of `deduplicateAndInsert`. A "new" result carries the fields
 * the caller needs to generate + persist commentary asynchronously
 * outside the serial dedup loop.
 */
export type DedupeResult =
  | { type: "dupe" }
  | { type: "error" }
  | {
      type: "new"
      ideaId: string
      slug: string
      // Only populated when status === "active". Passed to the deferred
      // commentary batch. Kept as a separate field so the Dedupe loop
      // can decide whether to queue a commentary job per idea without
      // re-querying the DB.
      commentaryInput: CommentaryInput | null
    }

export async function deduplicateAndInsert(
  supabase: ReturnType<typeof createClient>,
  idea: ExtractedIdea,
  sourcePlatform: string,
  sourceText?: string
): Promise<DedupeResult> {
  try {
    const { data: matches } = await supabase.rpc("find_similar_ideas", {
      search_title: idea.idea_title,
      search_summary: idea.summary,
      match_threshold: 0.6,
      match_count: 1,
    })

    if (matches && matches.length > 0 && matches[0].title_similarity > 0.6) {
      const existing = matches[0]
      await supabase
        .from("ideas")
        .update({
          mention_count: existing.mention_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.idea_id)

      // Upsert with ignoreDuplicates so re-detections from a 2x/day
      // scrape don't create phantom mention rows. Migration 024 added a
      // UNIQUE index on (idea_id, source_platform, idea_sources_day(extracted_at))
      // — first hit per idea+platform+day wins, the rest are no-ops.
      // mention_count above is incremented unconditionally because it
      // happens BEFORE the upsert returns; ideally we'd only bump
      // mention_count on a successful insert. The recalc cron compensates
      // by re-deriving mention_count from idea_sources nightly.
      await supabase.from("idea_sources").upsert(
        {
          idea_id: existing.idea_id,
          source_platform: sourcePlatform,
          raw_text: sourceText?.slice(0, 2000),
        },
        {
          onConflict: "idea_id,source_platform,extracted_day",
          ignoreDuplicates: true,
        }
      )

      return { type: "dupe" }
    }

    const slug = `${slugify(idea.idea_title)}-${Date.now().toString(36)}`
    const status = idea.confidence >= 0.7 ? "active" : "needs_review"

    // Insert the idea with commentary: NULL. Commentary is generated
    // and UPDATE'd in a parallel batch after the dedup loop completes
    // (see createScrapeHandler below). This removes the ~5-8s/idea
    // commentary latency from the critical path of the dedup loop so
    // the Edge Function can handle more ideas without blowing past
    // the 150s wall clock. The `commentary_generated_at` / `_model`
    // columns get backfilled in the same UPDATE.
    //
    // Only 'active' ideas get commentary — 'needs_review' ideas are
    // hidden from users and aren't worth the ~$0.004/call.
    const commentaryInput: CommentaryInput | null =
      status === "active"
        ? {
            title: idea.idea_title,
            summary: idea.summary,
            category: idea.category,
            difficulty: idea.difficulty ?? null,
            market_signal: idea.market_signal ?? "unknown",
            competition_level: idea.competition_level ?? "unknown",
            revenue_potential: idea.revenue_potential ?? "unknown",
            mention_count: 1,
          }
        : null

    const { data: newIdea, error } = await supabase
      .from("ideas")
      .insert({
        slug,
        title: idea.idea_title,
        summary: idea.summary,
        category: CATEGORIES.includes(idea.category) ? idea.category : "other",
        tags: idea.tags,
        mention_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        status,
        difficulty: idea.difficulty ?? 3,
        market_signal: idea.market_signal ?? "unknown",
        competition_level: idea.competition_level ?? "unknown",
        revenue_potential: idea.revenue_potential ?? "unknown",
        // commentary, commentary_generated_at, commentary_model all
        // default to NULL; backfilled by the deferred commentary batch.
        // popularity_score is computed by DB trigger on insert.
      })
      .select()
      .single()

    if (error) {
      console.warn(`Insert failed: ${error.message}`)
      return { type: "error" }
    }

    await supabase.from("idea_sources").insert({
      idea_id: newIdea.id,
      source_platform: sourcePlatform,
      raw_text: sourceText?.slice(0, 2000),
    })

    // IndexNow ping notifies Bing (and by extension Microsoft Copilot),
    // Yandex, Seznam, Naver that this URL exists so they can index it
    // within minutes instead of hours. 3s AbortController timeout inside
    // pingIndexNow ensures a hung upstream can't delay the scrape.
    // Only ping for active (user-visible) ideas.
    if (status === "active") {
      try {
        await pingIndexNow(`https://vibecodeideas.ai/ideas/${slug}`)
      } catch (e) {
        console.warn(`IndexNow ping failed (non-fatal):`, e)
      }
    }

    return {
      type: "new",
      ideaId: newIdea.id as string,
      slug,
      commentaryInput,
    }
  } catch (e) {
    console.warn(`Dedup error:`, e)
    return { type: "error" }
  }
}

/**
 * Post-insert commentary backfill for a single scrape batch.
 *
 * Takes the list of newly-inserted ideas and generates commentary for
 * each in parallel chunks of 5 (Anthropic's free-tier RPM is low enough
 * that we can't just Promise.all everything). Writes the result back
 * with a single UPDATE per idea.
 *
 * Rationale: the previous serial-in-loop design meant 10 new ideas =
 * ~50-80s of commentary latency added to the scrape run, and the HN
 * scraper was already bounded at 120 posts specifically to fit inside
 * the 150s Edge Function wall clock. Batching pulls that cost below
 * the parallelism ceiling so discovery volume can grow without the
 * 504 coming back.
 *
 * Fire-and-forget-ish: every per-idea error is swallowed with a warn
 * log. The row stays with `commentary: NULL` and the Next-side
 * backfill script (`scripts/backfill-commentary.ts`) will pick it up
 * on the next run.
 */
export async function fillCommentariesInParallel(
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
  jobs: Array<{ ideaId: string; commentaryInput: CommentaryInput }>,
  concurrency = 5
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < jobs.length; i += concurrency) {
    const chunk = jobs.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      chunk.map(async (job) => {
        const result = await generateCommentary(anthropicKey, job.commentaryInput)
        const { error } = await supabase
          .from("ideas")
          .update({
            commentary: result.text,
            commentary_generated_at: new Date().toISOString(),
            commentary_model: result.model,
          })
          .eq("id", job.ideaId)
        if (error) {
          throw new Error(`UPDATE failed: ${error.message}`)
        }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") {
        succeeded++
      } else {
        failed++
        console.warn(`Commentary fill failed:`, r.reason)
      }
    }
  }

  return { succeeded, failed }
}

/**
 * IndexNow client for Deno Edge. Mirror of src/lib/indexnow.ts
 * (Next can't be imported from edge runtime). Bounded by a 3s timeout
 * so a hanging IndexNow endpoint can never slow down idea ingestion.
 */
async function pingIndexNow(url: string): Promise<void> {
  const key = "5436c73b9397607f618476f0877477ca"
  const host = "vibecodeideas.ai"
  const res = await fetchWithTimeout(
    "https://api.indexnow.org/IndexNow",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: [url],
      }),
    },
    INDEXNOW_TIMEOUT_MS
  )
  if (res.status !== 200 && res.status !== 202) {
    const text = await res.text().catch(() => "")
    console.warn(`IndexNow returned ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function logScrapeRun(
  supabase: ReturnType<typeof createClient>,
  run: ScrapeRunData
): Promise<void> {
  try {
    await supabase.from("scrape_runs").insert({
      source_platform: run.source_platform,
      started_at: run.started_at,
      finished_at: new Date().toISOString(),
      posts_fetched: run.posts_fetched,
      ideas_extracted: run.ideas_extracted,
      ideas_new: run.ideas_new,
      ideas_duplicate: run.ideas_duplicate,
      ideas_error: run.ideas_error,
      duration_ms: run.duration_ms,
      status: run.status,
      error_message: run.error_message,
    })
  } catch (e) {
    console.warn(`Failed to log scrape run:`, e)
  }
}

/** Standard handler wrapper for all scrapers */
export function createScrapeHandler(
  sourcePlatform: string,
  fetchFn: () => Promise<string[]>,
  sourceContext: string
) {
  return async (_req: Request) => {
    const startTime = Date.now()
    const startedAt = new Date().toISOString()
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    try {
      console.log(`Fetching from ${sourcePlatform}...`)
      const posts = await fetchFn()
      console.log(`Found ${posts.length} posts`)

      if (posts.length === 0) {
        const run: ScrapeRunData = {
          source_platform: sourcePlatform,
          started_at: startedAt,
          posts_fetched: 0,
          ideas_extracted: 0,
          ideas_new: 0,
          ideas_duplicate: 0,
          ideas_error: 0,
          duration_ms: Date.now() - startTime,
          status: "success",
        }
        await logScrapeRun(supabase, run)
        return new Response(JSON.stringify(run), {
          headers: { "Content-Type": "application/json" },
        })
      }

      console.log("Extracting ideas...")
      const ideas = await extractIdeas(posts, anthropicKey, sourceContext)
      console.log(`Extracted ${ideas.length} ideas`)

      // Phase 1 (serial): dedup + insert. Must run serially so that
      // near-duplicates within the same extracted batch dedupe against
      // each other (each iteration's insert becomes state the next
      // iteration checks against via find_similar_ideas).
      let newCount = 0,
        dupeCount = 0,
        errorCount = 0
      const commentaryJobs: Array<{
        ideaId: string
        commentaryInput: CommentaryInput
      }> = []
      for (const idea of ideas) {
        const result = await deduplicateAndInsert(supabase, idea, sourcePlatform)
        if (result.type === "new") {
          newCount++
          if (result.commentaryInput) {
            commentaryJobs.push({
              ideaId: result.ideaId,
              commentaryInput: result.commentaryInput,
            })
          }
        } else if (result.type === "dupe") {
          dupeCount++
        } else {
          errorCount++
        }
      }

      // Phase 2 (parallel, concurrency 5): backfill commentary on the
      // newly-inserted active ideas. Each chunk of 5 runs concurrently;
      // chunks run serially so we stay well under Anthropic's rate
      // ceiling while still pulling what used to be serial ~6s/idea
      // latency into a parallel-throughput regime.
      let commentarySucceeded = 0
      let commentaryFailed = 0
      if (commentaryJobs.length > 0) {
        console.log(
          `Filling commentary for ${commentaryJobs.length} new ideas (concurrency=5)...`
        )
        const result = await fillCommentariesInParallel(
          supabase,
          anthropicKey,
          commentaryJobs,
          5
        )
        commentarySucceeded = result.succeeded
        commentaryFailed = result.failed
        console.log(
          `Commentary: ${commentarySucceeded} succeeded, ${commentaryFailed} failed`
        )
      }

      const duration = Date.now() - startTime
      const run: ScrapeRunData = {
        source_platform: sourcePlatform,
        started_at: startedAt,
        posts_fetched: posts.length,
        ideas_extracted: ideas.length,
        ideas_new: newCount,
        ideas_duplicate: dupeCount,
        ideas_error: errorCount,
        duration_ms: duration,
        status: "success",
      }

      await logScrapeRun(supabase, run)
      console.log("Done:", JSON.stringify(run))
      return new Response(JSON.stringify(run), {
        headers: { "Content-Type": "application/json" },
      })
    } catch (e) {
      const duration = Date.now() - startTime
      const errorMsg = e instanceof Error ? e.message : String(e)
      const run: ScrapeRunData = {
        source_platform: sourcePlatform,
        started_at: startedAt,
        posts_fetched: 0,
        ideas_extracted: 0,
        ideas_new: 0,
        ideas_duplicate: 0,
        ideas_error: 0,
        duration_ms: duration,
        status: "failure",
        error_message: errorMsg,
      }
      await logScrapeRun(supabase, run)
      console.error(`${sourcePlatform} scrape failed:`, e)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  }
}
