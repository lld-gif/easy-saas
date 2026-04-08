import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local", override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function backfillEnrichment() {
  console.log("Fetching ideas missing enrichment data...")

  const { data: ideas, error } = await supabase
    .from("ideas")
    .select("id, title, summary, category, difficulty, mention_count, last_seen_at")
    .eq("market_signal", "unknown")
    .limit(500)

  if (error) {
    console.error("Failed to fetch ideas:", error)
    return
  }

  console.log(`Found ${ideas.length} ideas to enrich`)

  // Process in batches of 20
  const batchSize = 20
  let enriched = 0

  for (let i = 0; i < ideas.length; i += batchSize) {
    const batch = ideas.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ideas.length / batchSize)}...`)

    const prompt = `For each of the following SaaS ideas, provide enrichment data. Return a JSON array where each object has:
- id: the idea ID (exactly as provided)
- market_signal: "strong" (clear unmet demand), "moderate" (some interest), "weak" (speculative)
- competition_level: "low" (few solutions), "medium" (some competitors), "high" (crowded)
- revenue_potential: MRR estimate (e.g., "$500-2k/mo", "$2k-10k/mo")

Be realistic and conservative. Return ONLY a valid JSON array.

Ideas:
${batch.map((idea) => `- ID: ${idea.id} | ${idea.title} | ${idea.summary} | Category: ${idea.category} | Difficulty: ${idea.difficulty}`).join("\n")}`

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0])

        for (const result of results) {
          const idea = batch.find((i) => i.id === result.id)
          if (!idea) continue

          // Compute source count for popularity score
          const { count: sourceCount } = await supabase
            .from("idea_sources")
            .select("*", { count: "exact", head: true })
            .eq("idea_id", idea.id)

          // Compute popularity score
          const recencyDays = (Date.now() - new Date(idea.last_seen_at).getTime()) / 86400000
          const recencyFactor = Math.max(0, 1.0 - recencyDays / 30.0)
          const popularityScore =
            idea.mention_count * 0.5 + (sourceCount || 1) * 2.0 + recencyFactor * 3.0

          await supabase
            .from("ideas")
            .update({
              market_signal: result.market_signal || "unknown",
              competition_level: result.competition_level || "unknown",
              revenue_potential: result.revenue_potential || "unknown",
              popularity_score: Math.round(popularityScore * 100) / 100,
            })
            .eq("id", idea.id)

          enriched++
        }
      }
    } catch (e) {
      console.warn(`Batch failed:`, e)
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\nDone! Enriched ${enriched}/${ideas.length} ideas.`)
}

backfillEnrichment().catch(console.error)
