import fs from "fs"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getDifficultyTier(d: number): "easy" | "medium" | "hard" {
  if (d <= 2) return "easy"
  if (d <= 3) return "medium"
  return "hard"
}

function loadTemplate(name: string): string {
  const filePath = path.join(process.cwd(), "src", "templates", `${name}.md`)
  return fs.readFileSync(filePath, "utf-8")
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

  const prompt = `For the SaaS idea "${idea.title}" (category: ${idea.category}, difficulty: ${idea.difficulty}/5):
Summary: ${idea.summary}

Return a JSON object with these fields:
{
  "product_names": ["name1", "name2", "name3"],
  "tagline": "under 10 words",
  "mvp_features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "data_model": "table1(col1, col2)\\ntable2(col1, col2, fk)\\ntable3(col1, col2)",
  "pricing_tiers": [{"name": "Free", "price": "$0", "features": "basic features"}, {"name": "Pro", "price": "$X/mo", "features": "all features"}],
  "colors": ["#hex1", "#hex2", "#hex3"],
  "font_pair": "Heading Font + Body Font",
  "domains": ["domain1.com", "domain2.io"],
  "distribution": ["channel 1 with brief explanation", "channel 2 with brief explanation"]
}

Return ONLY valid JSON.`

  let fillData: any
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000))
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      })
      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON in response")
      fillData = JSON.parse(jsonMatch[0])
      break
    } catch (e) {
      if (attempt === 1) throw new Error("LLM generation failed after retry")
    }
  }

  const mergedTechSpec = techSpec
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{DATA_MODEL}}", fillData.data_model?.replace(/\\n/g, "\n") || "To be designed")
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n"))

  const mergedBrandKit = brandKit
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{PRODUCT_NAMES}}", (fillData.product_names || []).map((n: string) => `- **${n}**`).join("\n"))
    .replace("{{TAGLINE}}", fillData.tagline || "")
    .replace("{{COLORS}}", (fillData.colors || []).join(", "))
    .replace("{{FONT_PAIR}}", fillData.font_pair || "Inter + Inter")
    .replace("{{DOMAINS}}", (fillData.domains || []).join(", "))

  const mergedLaunch = launchChecklist
    .replace("{{IDEA_TITLE}}", idea.title)
    .replace("{{MVP_FEATURES}}", (fillData.mvp_features || []).map((f: string) => `- [ ] ${f}`).join("\n"))
    .replace("{{PRICING_TIERS}}", (fillData.pricing_tiers || []).map((t: any) => `- **${t.name}** (${t.price}): ${t.features}`).join("\n"))
    .replace("{{DISTRIBUTION}}", (fillData.distribution || []).map((d: string) => `- ${d}`).join("\n"))

  return {
    fill_data: fillData,
    tech_spec: mergedTechSpec,
    brand_kit: mergedBrandKit,
    launch_checklist: mergedLaunch,
    generated_at: new Date().toISOString(),
  }
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; count: number }> {
  const { count } = await supabase
    .from("generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("generated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return { allowed: (count ?? 0) < 5, count: count ?? 0 }
}
