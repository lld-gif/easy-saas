import { createClient } from "jsr:@supabase/supabase-js@2"

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
 * Commentary model — chosen via 2026-04-18 A/B test. Kept in sync with
 * src/lib/commentary.ts on the Next.js side (Deno can't import from src/).
 */
export const COMMENTARY_MODEL = "claude-sonnet-4-6"

export interface CommentaryInput {
  title: string
  summary: string
  category: string
  difficulty: number | null
  market_signal: string
  competition_level: string
  revenue_potential: string
  mention_count: number
}

/**
 * Generate a "why this is interesting" commentary paragraph for a single
 * idea. Mirror of src/lib/commentary.ts::generateCommentary but uses
 * fetch() directly rather than the Anthropic SDK (Deno Edge runtime keeps
 * dependency footprint small).
 *
 * Returns the commentary text on success. Throws on API error — caller
 * decides whether to swallow or propagate.
 */
export async function generateCommentary(
  apiKey: string,
  idea: CommentaryInput
): Promise<{ text: string; model: string }> {
  const prompt = `You are writing a one-paragraph "why this is interesting" commentary for a directory page about a SaaS / product idea. The directory audience is indie hackers and developer-founders researching what to build.

Write 2-4 sentences that cover:
1. Market timing — why this is interesting *right now* (mention real trends if they exist, don't fabricate)
2. Closest competitor or substitute — name one if a well-known one exists, otherwise say "no clear incumbent"
3. Unit economics hint — why the revenue band makes sense (or doesn't)
4. Biggest risk — the single most likely reason this idea fails

Tone: direct, specific, no hype. Short declarative sentences. Avoid filler phrases like "could be a great opportunity" or "definitely has potential". If the idea is weak, say so. Do NOT restate the idea's summary. Do NOT use the phrase "this idea" — just discuss the thing. No headers, no bullets, no markdown. Just prose.

Context:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Category: ${idea.category}
- Difficulty: ${idea.difficulty}/5
- Market signal: ${idea.market_signal}
- Competition: ${idea.competition_level}
- Revenue band: ${idea.revenue_potential}
- Cross-source mentions: ${idea.mention_count}

Return only the paragraph. No preamble.`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: COMMENTARY_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  })

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

export async function deduplicateAndInsert(
  supabase: ReturnType<typeof createClient>,
  idea: ExtractedIdea,
  sourcePlatform: string,
  sourceText?: string
): Promise<"new" | "dupe" | "error"> {
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

      await supabase.from("idea_sources").insert({
        idea_id: existing.idea_id,
        source_platform: sourcePlatform,
        raw_text: sourceText?.slice(0, 2000),
      })

      return "dupe"
    }

    const slug = `${slugify(idea.idea_title)}-${Date.now().toString(36)}`
    const status = idea.confidence >= 0.7 ? "active" : "needs_review"

    // Generate "why this is interesting" commentary before insert so it
    // ships with the idea on first render. Fire-and-forget-style: if
    // generation fails we still insert the idea (commentary column is
    // nullable and the backfill script will pick it up). We use Sonnet
    // 4.6 per the 2026-04-18 A/B test (see docs/commentary-ab-test.md).
    // Only generate for 'active' ideas — 'needs_review' ideas don't get
    // shown to users and aren't worth the ~$0.004 per call.
    let commentary: string | null = null
    let commentaryGeneratedAt: string | null = null
    let commentaryModel: string | null = null
    if (status === "active") {
      try {
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
        if (anthropicKey) {
          const result = await generateCommentary(anthropicKey, {
            title: idea.idea_title,
            summary: idea.summary,
            category: idea.category,
            difficulty: idea.difficulty ?? null,
            market_signal: idea.market_signal ?? "unknown",
            competition_level: idea.competition_level ?? "unknown",
            revenue_potential: idea.revenue_potential ?? "unknown",
            mention_count: 1,
          })
          commentary = result.text
          commentaryGeneratedAt = new Date().toISOString()
          commentaryModel = result.model
        }
      } catch (e) {
        console.warn(`Commentary generation failed (non-fatal):`, e)
      }
    }

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
        commentary,
        commentary_generated_at: commentaryGeneratedAt,
        commentary_model: commentaryModel,
        // popularity_score is computed by DB trigger on insert
      })
      .select()
      .single()

    if (error) {
      console.warn(`Insert failed: ${error.message}`)
      return "error"
    }

    await supabase.from("idea_sources").insert({
      idea_id: newIdea.id,
      source_platform: sourcePlatform,
      raw_text: sourceText?.slice(0, 2000),
    })

    // IndexNow ping — fire-and-forget notifies Bing (and by extension
    // Microsoft Copilot), Yandex, Seznam, Naver that this URL exists
    // so they can index it within minutes instead of hours. Deno Edge
    // can't import from src/lib, so the key + endpoint are hardcoded
    // here; keep in sync with src/lib/indexnow.ts on the Next side.
    // Only ping for active (user-visible) ideas.
    if (status === "active" && slug) {
      try {
        await pingIndexNow(`https://vibecodeideas.ai/ideas/${slug}`)
      } catch (e) {
        console.warn(`IndexNow ping failed (non-fatal):`, e)
      }
    }

    return "new"
  } catch (e) {
    console.warn(`Dedup error:`, e)
    return "error"
  }
}

/**
 * IndexNow client for Deno Edge. Mirror of src/lib/indexnow.ts
 * (Next can't be imported from edge runtime).
 */
async function pingIndexNow(url: string): Promise<void> {
  const key = "5436c73b9397607f618476f0877477ca"
  const host = "vibecodeideas.ai"
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: [url],
    }),
  })
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

      let newCount = 0,
        dupeCount = 0,
        errorCount = 0
      for (const idea of ideas) {
        const result = await deduplicateAndInsert(supabase, idea, sourcePlatform)
        if (result === "new") newCount++
        else if (result === "dupe") dupeCount++
        else errorCount++
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
