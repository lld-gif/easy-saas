import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CATEGORIES = [
  "fintech", "devtools", "automation", "ai-ml", "ecommerce", "health",
  "education", "creator-tools", "productivity", "marketing",
  "hr-recruiting", "real-estate", "logistics", "other",
]

interface ExtractedIdea { idea_title: string; summary: string; category: string; tags: string[]; confidence: number }

async function fetchGitHub(): Promise<string[]> {
  const posts: string[] = []
  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const url = `https://api.github.com/search/repositories?q=created:>${since.toISOString().split("T")[0]}&sort=stars&order=desc&per_page=30`
    const res = await fetch(url, { headers: { Accept: "application/vnd.github.v3+json" } })
    if (!res.ok) return posts
    const data = await res.json()
    for (const repo of data.items || []) {
      if (repo.description) posts.push(`Repo: ${repo.full_name}\nDescription: ${repo.description}\nStars: ${repo.stargazers_count}`)
    }
  } catch (e) { console.warn("Failed to fetch GitHub:", e) }
  return posts
}

async function extractIdeas(posts: string[], apiKey: string): Promise<ExtractedIdea[]> {
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []
  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies SaaS product ideas from GitHub trending repositories. Analyze these repos and extract any that could be viable SaaS products.\n\nFor each idea found, return a JSON array of objects with:\n- idea_title: concise SaaS product name inspired by the repo\n- summary: 2-3 sentence pitch describing the problem, solution, and target user\n- category: one of: ${CATEGORIES.join(", ")}\n- tags: 3-5 lowercase tags\n- confidence: 0.0-1.0\n\nIf a repo doesn't suggest a SaaS idea, skip it. Return ONLY a valid JSON array, no other text.\n\nRepos:\n${chunk.map((p, idx) => `--- Repo ${idx + 1} ---\n${p}`).join("\n\n")}`
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
      })
      if (!res.ok) { console.warn(`Claude API error: ${res.status}`); continue }
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const ideas: ExtractedIdea[] = JSON.parse(jsonMatch[0])
        for (const idea of ideas) { if (idea.confidence >= 0.5 && idea.idea_title && idea.summary) allIdeas.push(idea) }
      }
    } catch (e) { console.warn(`Extraction batch failed:`, e) }
  }
  return allIdeas
}

function slugify(text: string): string { return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) }

async function deduplicateAndInsert(supabase: any, idea: ExtractedIdea, sourcePlatform: string, sourceText?: string): Promise<"new" | "dupe" | "error"> {
  try {
    const { data: matches } = await supabase.rpc("find_similar_ideas", { search_title: idea.idea_title, search_summary: idea.summary, match_threshold: 0.6, match_count: 1 })
    if (matches && matches.length > 0 && matches[0].title_similarity > 0.6) {
      const existing = matches[0]
      await supabase.from("ideas").update({ mention_count: existing.mention_count + 1, last_seen_at: new Date().toISOString() }).eq("id", existing.idea_id)
      await supabase.from("idea_sources").insert({ idea_id: existing.idea_id, source_platform: sourcePlatform, raw_text: sourceText?.slice(0, 2000) })
      return "dupe"
    }
    const slug = `${slugify(idea.idea_title)}-${Date.now().toString(36)}`
    const status = idea.confidence >= 0.7 ? "active" : "needs_review"
    const { data: newIdea, error } = await supabase.from("ideas").insert({ slug, title: idea.idea_title, summary: idea.summary, category: CATEGORIES.includes(idea.category) ? idea.category : "other", tags: idea.tags, mention_count: 1, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), status }).select().single()
    if (error) { console.warn(`Insert failed: ${error.message}`); return "error" }
    await supabase.from("idea_sources").insert({ idea_id: newIdea.id, source_platform: sourcePlatform, raw_text: sourceText?.slice(0, 2000) })
    return "new"
  } catch (e) { console.warn(`Dedup error:`, e); return "error" }
}

Deno.serve(async (_req: Request) => {
  const startTime = Date.now()
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!anthropicKey) return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }), { status: 500 })
  console.log("Fetching from GitHub Trending...")
  const posts = await fetchGitHub()
  console.log(`Found ${posts.length} repos`)
  if (posts.length === 0) return new Response(JSON.stringify({ source: "github", posts: 0, new: 0, dupes: 0, errors: 0 }), { headers: { "Content-Type": "application/json" } })
  console.log("Extracting ideas...")
  const ideas = await extractIdeas(posts, anthropicKey)
  console.log(`Extracted ${ideas.length} ideas`)
  let newCount = 0, dupeCount = 0, errorCount = 0
  for (const idea of ideas) {
    const result = await deduplicateAndInsert(supabase, idea, "github")
    if (result === "new") newCount++; else if (result === "dupe") dupeCount++; else errorCount++
  }
  const duration = Date.now() - startTime
  const summary = { source: "github", posts: posts.length, extracted: ideas.length, new: newCount, dupes: dupeCount, errors: errorCount, duration_ms: duration }
  console.log("Done:", JSON.stringify(summary))
  return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } })
})
