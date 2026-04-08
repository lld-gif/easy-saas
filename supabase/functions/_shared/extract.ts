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
        popularity_score: 3.5, // Base score: 1*0.5 + 1*2.0 + 1.0*3.0 (new, 1 source, fresh)
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

    return "new"
  } catch (e) {
    console.warn(`Dedup error:`, e)
    return "error"
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
