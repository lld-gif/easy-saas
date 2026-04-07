import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load .env.local
dotenv.config({ path: ".env.local", override: true })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const googleApiKey = process.env.GOOGLE_API_KEY
if (!googleApiKey) {
  console.error("Missing GOOGLE_API_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const genAI = new GoogleGenerativeAI(googleApiKey)

const CATEGORIES = [
  "fintech", "devtools", "automation", "ai-ml", "ecommerce", "health",
  "education", "creator-tools", "productivity", "marketing",
  "hr-recruiting", "real-estate", "logistics", "other",
]

interface ExtractedIdea {
  idea_title: string
  summary: string
  category: string
  tags: string[]
  confidence: number
}

// --- Source fetchers ---

async function fetchReddit(): Promise<string[]> {
  const subreddits = ["SaaS", "Entrepreneur", "SideProject"]
  const posts: string[] = []

  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { "User-Agent": "EasySaaS-Seed/1.0" },
      })
      if (!res.ok) {
        console.warn(`  Reddit r/${sub}: HTTP ${res.status}`)
        continue
      }
      const data = await res.json()
      for (const child of data.data.children) {
        const post = child.data
        if (post.selftext && post.selftext.length > 50) {
          posts.push(`Title: ${post.title}\nBody: ${post.selftext.slice(0, 500)}`)
        }
      }
    } catch (e) {
      console.warn(`  Failed to fetch r/${sub}:`, (e as Error).message)
    }
  }

  return posts
}

async function fetchHackerNews(): Promise<string[]> {
  const posts: string[] = []
  const queries = ["Show HN", "SaaS idea", "I built"]

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`
      )
      if (!res.ok) continue
      const data = await res.json()
      for (const hit of data.hits) {
        if (hit.title) {
          posts.push(`Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}`)
        }
      }
    } catch (e) {
      console.warn(`  Failed to fetch HN for "${q}":`, (e as Error).message)
    }
  }

  return posts
}

async function fetchGitHubTrending(): Promise<string[]> {
  const posts: string[] = []
  const token = process.env.GITHUB_TOKEN

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const url = `https://api.github.com/search/repositories?q=created:>${since.toISOString().split("T")[0]}&sort=stars&order=desc&per_page=30`
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(url, { headers })
    if (!res.ok) {
      console.warn(`  GitHub API: HTTP ${res.status}`)
      return posts
    }
    const data = await res.json()

    for (const repo of data.items || []) {
      if (repo.description) {
        posts.push(`Repo: ${repo.full_name}\nDescription: ${repo.description}\nStars: ${repo.stargazers_count}`)
      }
    }
  } catch (e) {
    console.warn("  Failed to fetch GitHub trending:", (e as Error).message)
  }

  return posts
}

// --- LLM Extraction ---

async function extractIdeas(posts: string[], sourcePlatform: string): Promise<{ ideas: ExtractedIdea[], sourceTexts: string[] }> {
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []
  const allSourceTexts: string[] = []

  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies SaaS product ideas from internet posts. Analyze these posts and extract any viable SaaS ideas mentioned or implied.

For each idea found, return a JSON array of objects with:
- idea_title: concise product name (e.g., "AI Invoice Parser for Freelancers")
- summary: 2-3 sentence pitch describing the problem, solution, and target user
- category: one of: ${CATEGORIES.join(", ")}
- tags: 3-5 lowercase tags
- confidence: 0.0-1.0 (how clearly this is a viable SaaS idea)

If a post doesn't contain a SaaS idea, skip it. Return ONLY a valid JSON array, no other text.

Posts:
${chunk.map((p, idx) => `--- Post ${idx + 1} ---\n${p}`).join("\n\n")}`

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const ideas: ExtractedIdea[] = JSON.parse(jsonMatch[0])
        for (const idea of ideas) {
          if (idea.confidence >= 0.5 && idea.idea_title && idea.summary) {
            allIdeas.push(idea)
            allSourceTexts.push(chunk[Math.min(Math.floor(allIdeas.length % chunk.length), chunk.length - 1)])
          }
        }
      }
    } catch (e) {
      console.warn(`  Failed to extract ideas from ${sourcePlatform} batch:`, (e as Error).message)
    }
  }

  return { ideas: allIdeas, sourceTexts: allSourceTexts }
}

// --- Embedding & Dedup ---

async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
  const result = await model.embedContent(text)
  return result.embedding.values
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

async function deduplicateAndInsert(
  idea: ExtractedIdea,
  sourcePlatform: string,
  sourceText: string
): Promise<boolean> {
  let embedding: number[]
  try {
    embedding = await getEmbedding(`${idea.idea_title} ${idea.summary}`)
  } catch (e) {
    console.warn(`  ⚠ Embedding failed for "${idea.idea_title}", inserting without dedup`)
    // Insert without embedding
    const slug = `${slugify(idea.idea_title)}-${Date.now().toString(36)}`
    await supabase.from("ideas").insert({
      slug,
      title: idea.idea_title,
      summary: idea.summary,
      category: CATEGORIES.includes(idea.category) ? idea.category : "other",
      tags: idea.tags,
      mention_count: 1,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      status: "needs_review",
    })
    return true
  }

  // Check for duplicates
  const { data: matches } = await supabase.rpc("match_idea_embeddings", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.85,
    match_count: 1,
  })

  if (matches && matches.length > 0) {
    const existingId = matches[0].idea_id
    await supabase
      .from("ideas")
      .update({
        mention_count: matches[0].mention_count + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existingId)

    await supabase.from("idea_sources").insert({
      idea_id: existingId,
      source_platform: sourcePlatform,
      raw_text: sourceText.slice(0, 2000),
    })

    console.log(`  ↑ Duplicate: "${idea.idea_title}" (now ${matches[0].mention_count + 1} mentions)`)
    return false
  }

  // New idea
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
    })
    .select()
    .single()

  if (error) {
    console.warn(`  ✗ Failed to insert "${idea.idea_title}":`, error.message)
    return false
  }

  // Insert embedding
  await supabase.from("idea_embeddings").insert({
    idea_id: newIdea.id,
    embedding: JSON.stringify(embedding),
  })

  // Insert source
  await supabase.from("idea_sources").insert({
    idea_id: newIdea.id,
    source_platform: sourcePlatform,
    raw_text: sourceText.slice(0, 2000),
  })

  console.log(`  ✓ New: "${idea.idea_title}" [${idea.category}] (${status})`)
  return true
}

// --- Main ---

async function main() {
  console.log("🌱 EasySaaS Seed Script\n")

  // Test connection
  const { error: connError } = await supabase.from("ideas").select("id").limit(0)
  if (connError) {
    console.error("Cannot connect to Supabase:", connError.message)
    process.exit(1)
  }
  console.log("✓ Connected to Supabase\n")

  // MVP sources: Reddit, HN, GitHub (free, no auth required)
  const sources: { name: string; fetcher: () => Promise<string[]> }[] = [
    { name: "reddit", fetcher: fetchReddit },
    { name: "hackernews", fetcher: fetchHackerNews },
    { name: "github", fetcher: fetchGitHubTrending },
  ]

  let totalNew = 0
  let totalDupes = 0

  for (const source of sources) {
    console.log(`📡 Fetching from ${source.name}...`)
    const posts = await source.fetcher()
    console.log(`  Found ${posts.length} posts`)

    if (posts.length === 0) continue

    console.log(`  Extracting ideas with Claude Haiku...`)
    const { ideas, sourceTexts } = await extractIdeas(posts, source.name)
    console.log(`  Extracted ${ideas.length} potential ideas`)

    for (let i = 0; i < ideas.length; i++) {
      const isNew = await deduplicateAndInsert(ideas[i], source.name, sourceTexts[i] ?? "")
      if (isNew) totalNew++
      else totalDupes++

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))
    }

    console.log()
  }

  console.log(`✅ Seed complete: ${totalNew} new ideas, ${totalDupes} duplicates merged`)

  const { count } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
  console.log(`📊 Total active ideas in database: ${count}`)
}

main().catch(console.error)
