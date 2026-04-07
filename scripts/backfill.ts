import Anthropic from "@anthropic-ai/sdk"
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

const supabase = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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
  difficulty: number
}

// --- Rate limiting helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// --- Reddit historical search ---

const REDDIT_SUBREDDITS = [
  "SaaS",
  "Entrepreneur",
  "SideProject",
  "webdev",
  "learnprogramming",
  "indiehackers",
]

const REDDIT_QUERIES = [
  "app idea",
  "someone should build",
  "I wish there was",
  "micro saas",
  "weekend project",
  "side project idea",
  "simple app",
  "vibe code",
  "no code idea",
  "saas idea",
]

async function fetchRedditSearch(): Promise<string[]> {
  const posts: string[] = []
  let callCount = 0

  for (const sub of REDDIT_SUBREDDITS) {
    for (const query of REDDIT_QUERIES) {
      if (callCount > 0) {
        await sleep(1000) // 1s between Reddit calls
      }

      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=25`
        const res = await fetch(url, {
          headers: { "User-Agent": "EasySaaS-Backfill/1.0" },
        })

        callCount++

        if (!res.ok) {
          console.warn(`  Reddit r/${sub} query "${query}": HTTP ${res.status}`)
          continue
        }

        const data = await res.json()
        const children = data?.data?.children ?? []
        let added = 0

        for (const child of children) {
          const post = child.data
          if (post.title && (post.selftext?.length > 50 || post.title.length > 20)) {
            posts.push(`Title: ${post.title}\nBody: ${(post.selftext ?? "").slice(0, 500)}`)
            added++
          }
        }

        console.log(`  r/${sub} | "${query}" → ${added} posts`)
      } catch (e) {
        console.warn(`  Failed r/${sub} query "${query}":`, (e as Error).message)
      }
    }
  }

  return posts
}

// --- HN historical search ---

const HN_QUERIES = [
  "Show HN",
  "I built",
  "Ask HN build",
  "micro saas",
  "weekend project",
  "simple app idea",
  "vibe coding",
  "side project",
]

async function fetchHNHistorical(): Promise<string[]> {
  const posts: string[] = []

  // Six months ago as a Unix timestamp
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60

  for (let i = 0; i < HN_QUERIES.length; i++) {
    if (i > 0) {
      await sleep(500) // 0.5s between HN calls
    }

    const q = HN_QUERIES[i]

    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=50&numericFilters=created_at_i>${sixMonthsAgo}`
      const res = await fetch(url)

      if (!res.ok) {
        console.warn(`  HN query "${q}": HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      const hits = data?.hits ?? []
      let added = 0

      for (const hit of hits) {
        if (hit.title) {
          posts.push(
            `Title: ${hit.title}${hit.story_text ? `\nBody: ${hit.story_text.slice(0, 500)}` : ""}`
          )
          added++
        }
      }

      console.log(`  HN | "${q}" → ${added} posts`)
    } catch (e) {
      console.warn(`  Failed HN query "${q}":`, (e as Error).message)
    }
  }

  return posts
}

// --- LLM Extraction (same as seed.ts) ---

async function extractIdeas(
  posts: string[],
  sourcePlatform: string
): Promise<{ ideas: ExtractedIdea[]; sourceTexts: string[] }> {
  const chunkSize = 10
  const allIdeas: ExtractedIdea[] = []
  const allSourceTexts: string[] = []

  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    const prompt = `You are an AI that identifies app and SaaS product ideas from internet posts. Focus on ideas that ANYONE could build — from simple weekend projects to more complex platforms.

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

If a post doesn't contain a product idea, skip it. Return ONLY a valid JSON array, no other text.

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
            allSourceTexts.push(
              chunk[Math.min(Math.floor(allIdeas.length % chunk.length), chunk.length - 1)]
            )
          }
        }
      }
    } catch (e) {
      console.warn(
        `  Failed to extract ideas from ${sourcePlatform} batch:`,
        (e as Error).message
      )
    }
  }

  return { ideas: allIdeas, sourceTexts: allSourceTexts }
}

// --- Dedup & Insert (same as seed.ts) ---

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
  // Check for duplicates using trigram similarity
  const { data: matches } = await supabase.rpc("find_similar_ideas", {
    search_title: idea.idea_title,
    search_summary: idea.summary,
    match_threshold: 0.6,
    match_count: 1,
  })

  if (matches && matches.length > 0 && matches[0].title_similarity > 0.6) {
    // Duplicate found — increment mention count
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
      raw_text: sourceText.slice(0, 2000),
    })

    console.log(
      `  ↑ Duplicate: "${idea.idea_title}" ≈ "${existing.idea_title}" (${(existing.title_similarity * 100).toFixed(0)}% similar, now ${existing.mention_count + 1} mentions)`
    )
    return false
  }

  // New idea — insert
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
    })
    .select()
    .single()

  if (error) {
    console.warn(`  ✗ Failed to insert "${idea.idea_title}":`, error.message)
    return false
  }

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
  console.log("📦 EasySaaS Historical Backfill Script")
  console.log(`   Searching Reddit (${REDDIT_SUBREDDITS.length} subreddits × ${REDDIT_QUERIES.length} queries) + HN (${HN_QUERIES.length} queries)`)
  console.log(`   Rate limits: 1s between Reddit calls, 0.5s between HN calls\n`)

  // Test connection
  const { error: connError } = await supabase.from("ideas").select("id").limit(0)
  if (connError) {
    console.error("Cannot connect to Supabase:", connError.message)
    process.exit(1)
  }
  console.log("✓ Connected to Supabase\n")

  const sources: { name: string; fetcher: () => Promise<string[]> }[] = [
    { name: "reddit", fetcher: fetchRedditSearch },
    { name: "hackernews", fetcher: fetchHNHistorical },
  ]

  let totalNew = 0
  let totalDupes = 0

  for (const source of sources) {
    console.log(`\n📡 Fetching historical posts from ${source.name}...`)
    const posts = await source.fetcher()
    console.log(`\n  Total collected: ${posts.length} posts from ${source.name}`)

    if (posts.length === 0) continue

    console.log(`  Extracting ideas with Claude Haiku...`)
    const { ideas, sourceTexts } = await extractIdeas(posts, source.name)
    console.log(`  Extracted ${ideas.length} potential ideas — deduplicating against DB...\n`)

    for (let i = 0; i < ideas.length; i++) {
      const isNew = await deduplicateAndInsert(ideas[i], source.name, sourceTexts[i] ?? "")
      if (isNew) totalNew++
      else totalDupes++

      // Small delay to avoid hammering Supabase RPC
      await sleep(200)
    }
  }

  console.log(`\n✅ Backfill complete: ${totalNew} new ideas, ${totalDupes} duplicates merged`)
  console.log(`   (Duplicates increase mention_count, boosting idea hotness)`)

  const { count } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
  console.log(`📊 Total active ideas in database: ${count}`)
}

main().catch(console.error)
