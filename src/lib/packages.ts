import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { loadTemplate } from "@/lib/templates"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

function getDifficultyTier(d: number): "easy" | "medium" | "hard" {
  if (d <= 2) return "easy"
  if (d <= 3) return "medium"
  return "hard"
}

export async function generatePackage(idea: {
  id: string
  title: string
  summary: string
  category: string
  difficulty: number
  tags: string[]
}) {
  const tier = getDifficultyTier(idea.difficulty)

  const techSpec = loadTemplate(`tech-spec-${tier}`)
  const brandKit = loadTemplate("brand-kit")
  const launchChecklist = loadTemplate(`launch-${tier}`)

  const prompt = `You are a startup advisor helping indie hackers plan micro-SaaS products. Generate a detailed quick-start package for this idea.

IDEA: "${idea.title}"
CATEGORY: ${idea.category}
DIFFICULTY: ${idea.difficulty}/5 (${tier})
TAGS: ${idea.tags?.join(", ") || "none"}
SUMMARY: ${idea.summary}

Return a JSON object with ALL of these fields. Be specific and actionable — no generic filler.

{
  "product_names": ["name1", "name2", "name3"],
  "name_rationale": "Why these names work (memorable, available .com/.io likely, conveys the value)",
  "tagline": "A punchy tagline under 10 words that explains the value prop",
  "mvp_features": [
    "Feature with specific detail — e.g. 'Dashboard showing weekly revenue trends with Stripe integration'",
    "Feature 2 with enough detail to start building",
    "Feature 3",
    "Feature 4",
    "Feature 5"
  ],
  "data_model": [
    {"table": "users", "columns": [{"name": "id", "type": "uuid", "note": "primary key"}, {"name": "email", "type": "text", "note": "unique"}, {"name": "plan", "type": "text", "note": "free | pro"}]},
    {"table": "table2", "columns": [{"name": "id", "type": "uuid", "note": "primary key"}, {"name": "user_id", "type": "uuid", "note": "FK → users"}, {"name": "col", "type": "text", "note": "description"}]}
  ],
  "pricing_tiers": [
    {"name": "Free", "price": "$0/mo", "features": ["Specific free feature 1", "Specific free feature 2"], "limit": "Up to X items/users"},
    {"name": "Pro", "price": "$X/mo", "features": ["Everything in Free", "Specific pro feature 1", "Specific pro feature 2"], "limit": "Unlimited"}
  ],
  "colors": [
    {"hex": "#hex1", "role": "primary — buttons, CTAs, brand accent"},
    {"hex": "#hex2", "role": "secondary — hover states, badges, highlights"},
    {"hex": "#hex3", "role": "background accent — cards, section backgrounds"}
  ],
  "color_rationale": "Why this palette fits the ${idea.category} category and target audience",
  "font_pair": "Heading Font + Body Font",
  "font_rationale": "Why these fonts work together",
  "domains": ["domain1.com", "domain2.io", "domain3.app"],
  "distribution": [
    {"channel": "Channel name", "tactic": "Specific action to take", "why": "Why this works for this idea"},
    {"channel": "Channel 2", "tactic": "Specific tactic", "why": "Reasoning"},
    {"channel": "Channel 3", "tactic": "Specific tactic", "why": "Reasoning"}
  ],
  "target_audience": "Specific description of who would pay for this — job title, pain point, current workaround",
  "competitive_edge": "What makes this idea defensible or unique vs existing solutions"
}

IMPORTANT: The data_model should have 3-5 tables with realistic columns and types (uuid, text, integer, boolean, timestamptz, jsonb). Include foreign key relationships. The tables should reflect what's actually needed for the MVP features listed.

Return ONLY valid JSON. No markdown, no explanation.`

  let fillData: any
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000))
      console.log(`[generate] attempt ${attempt + 1}, model: claude-haiku-4-5-20251001, idea: ${idea.id}`)
      const response = await getAnthropic().messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      })
      console.log(`[generate] API response received, stop_reason: ${response.stop_reason}, tokens: ${response.usage?.output_tokens}`)
      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON in response")
      // Clean and repair common LLM JSON issues
      let cleaned = jsonMatch[0]
        .replace(/,\s*([}\]])/g, "$1")  // trailing commas
        .replace(/[\x00-\x1f]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "") // control chars
      // Close any unclosed brackets/braces (truncated output)
      let openBraces = 0, openBrackets = 0
      let inString = false, escaped = false
      for (const ch of cleaned) {
        if (escaped) { escaped = false; continue }
        if (ch === "\\") { escaped = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue
        if (ch === "{") openBraces++
        else if (ch === "}") openBraces--
        else if (ch === "[") openBrackets++
        else if (ch === "]") openBrackets--
      }
      // Trim any trailing incomplete key-value pair
      cleaned = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "")
      for (let i = 0; i < openBrackets; i++) cleaned += "]"
      for (let i = 0; i < openBraces; i++) cleaned += "}"
      // Final trailing comma cleanup after repair
      cleaned = cleaned.replace(/,\s*([}\]])/g, "$1")
      fillData = JSON.parse(cleaned)
      break
    } catch (e) {
      lastError = e
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[generate] attempt ${attempt + 1} failed:`, msg)
      if (attempt === 1) throw new Error(`LLM generation failed after retry: ${msg}`)
    }
  }

  // Format data model — handle both old string format and new structured format
  let dataModelStr = "To be designed"
  if (Array.isArray(fillData.data_model)) {
    dataModelStr = fillData.data_model
      .map((t: any) => {
        const cols = (t.columns || [])
          .map((c: any) => `  - \`${c.name}\` ${c.type}${c.note ? ` — ${c.note}` : ""}`)
          .join("\n")
        return `### ${t.table}\n${cols}`
      })
      .join("\n\n")
  } else if (typeof fillData.data_model === "string") {
    dataModelStr = fillData.data_model.replace(/\\n/g, "\n")
  }

  // Format colors — handle both old array-of-strings and new structured format
  let colorsStr = ""
  if (Array.isArray(fillData.colors) && fillData.colors.length > 0) {
    if (typeof fillData.colors[0] === "object") {
      colorsStr = fillData.colors.map((c: any) => `- \`${c.hex}\` — ${c.role}`).join("\n")
    } else {
      colorsStr = (fillData.colors as string[]).join(", ")
    }
  }
  if (fillData.color_rationale) {
    colorsStr += `\n\n*${fillData.color_rationale}*`
  }

  // Format pricing — handle both old and new format
  const formatPricing = (tiers: any[]) => {
    return tiers.map((t: any) => {
      const features = Array.isArray(t.features) ? t.features.join(", ") : t.features
      const limit = t.limit ? ` (${t.limit})` : ""
      return `- **${t.name}** (${t.price}): ${features}${limit}`
    }).join("\n")
  }

  // Format distribution — handle both old string and new structured format
  const formatDistribution = (dist: any[]) => {
    return dist.map((d: any) => {
      if (typeof d === "string") return `- ${d}`
      return `- **${d.channel}:** ${d.tactic}${d.why ? ` — *${d.why}*` : ""}`
    }).join("\n")
  }

  const mergedTechSpec = techSpec
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{DATA_MODEL}}", dataModelStr)
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n"))
    .replace("{{TARGET_AUDIENCE}}", fillData.target_audience || "")
    .replace("{{COMPETITIVE_EDGE}}", fillData.competitive_edge || "")

  const mergedBrandKit = brandKit
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{PRODUCT_NAMES}}", (fillData.product_names || []).map((n: string, i: number) => `${i + 1}. **${n}**`).join("\n"))
    .replace("{{NAME_RATIONALE}}", fillData.name_rationale || "")
    .replace("{{TAGLINE}}", fillData.tagline || "")
    .replace("{{COLORS}}", colorsStr)
    .replace("{{FONT_PAIR}}", fillData.font_pair || "Inter + Inter")
    .replace("{{FONT_RATIONALE}}", fillData.font_rationale || "")
    .replace("{{DOMAINS}}", (fillData.domains || []).join(", "))

  const mergedLaunch = launchChecklist
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string) => `- [ ] ${f}`).join("\n"))
    .replace("{{PRICING_TIERS}}", formatPricing(fillData.pricing_tiers || []))
    .replace("{{DISTRIBUTION}}", formatDistribution(fillData.distribution || []))
    .replace("{{TARGET_AUDIENCE}}", fillData.target_audience || "")

  // Build the unified copy-ready document
  const fullPackage = `# ${idea.title} — Quick Start Package

> Generated by [Vibe Code Ideas](https://vibecodeideas.ai). Paste this into Claude, Cursor, Codex, or any AI coding assistant to start building.

---

${mergedTechSpec}

---

${mergedBrandKit}

---

${mergedLaunch}
`.trim()

  return {
    fill_data: fillData,
    tech_spec: mergedTechSpec,
    brand_kit: mergedBrandKit,
    launch_checklist: mergedLaunch,
    full_package: fullPackage,
    generated_at: new Date().toISOString(),
  }
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; count: number }> {
  const supabase = getServiceClient()
  const { count } = await supabase
    .from("generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return { allowed: (count ?? 0) < 5, count: count ?? 0 }
}
