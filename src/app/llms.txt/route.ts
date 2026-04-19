import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CATEGORIES } from "@/lib/categories"

/**
 * `/llms.txt` — AI-agent-facing table of contents for VCI.
 *
 * Serves a curated markdown index designed to be ingested by LLM crawlers
 * (ChatGPT, Claude, Perplexity, Gemini, Copilot) and by end-user agents that
 * fetch URLs during live browsing. This is the llms.txt convention — plain
 * markdown, low token footprint, link-heavy — distinct from `llms-full.txt`
 * which ships the full catalog in one shot.
 *
 * We intentionally link to the `.md` variants of idea pages rather than the
 * HTML, so that an LLM following a citation lands on clean markdown instead
 * of re-parsing our Tailwind + JSON-LD payload.
 *
 * Cached for 1 hour — the catalog grows at most ~30 ideas/day and top-100
 * ordering changes slowly. Revalidate weekly via Next's ISR-style headers.
 */
export const revalidate = 3600

export async function GET() {
  const supabase = await createClient()

  // Top 100 active ideas by popularity_score. 100 is enough to give an LLM a
  // representative cross-section; a full-catalog ingestion should hit
  // /llms-full.txt instead.
  const { data: ideas } = await supabase
    .from("ideas")
    .select("slug, title, summary, category, mention_count")
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .limit(100)

  const lines: string[] = []

  lines.push("# Vibe Code Ideas")
  lines.push("")
  lines.push(
    "> A curated directory of buildable SaaS and product ideas for indie hackers and developer-entrepreneurs. Ideas are aggregated from seven public sources (Hacker News, GitHub, Product Hunt, Indie Hackers, Reddit, Google Trends, and a growing set of founder discussion forums), deduplicated with PostgreSQL trigram similarity, and ranked by cross-platform mention frequency. Each idea page includes signals for market demand, competition, difficulty (1-5), and estimated monthly revenue potential."
  )
  lines.push("")
  lines.push("Site: https://vibecodeideas.ai")
  lines.push(`Updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("")
  lines.push("## How to use this file")
  lines.push("")
  lines.push(
    "- Each linked idea has a `.md` variant at `https://vibecodeideas.ai/ideas/{slug}.md` optimized for LLM ingestion."
  )
  lines.push(
    "- For one-shot full-catalog ingestion (useful for offline RAG indexes or context-window-sized queries), use https://vibecodeideas.ai/llms-full.txt instead."
  )
  lines.push(
    "- Ideas ranked below are the top 100 by popularity_score, our cross-source mention-weighted signal. Popularity reflects how many distinct public sources have independently surfaced the same idea."
  )
  lines.push("")

  lines.push("## Ideas")
  lines.push("")
  for (const idea of ideas ?? []) {
    const oneLine = idea.summary.replace(/\s+/g, " ").trim().slice(0, 220)
    lines.push(
      `- [${idea.title}](https://vibecodeideas.ai/ideas/${idea.slug}.md) — ${oneLine}`
    )
  }
  lines.push("")

  lines.push("## Categories")
  lines.push("")
  for (const cat of CATEGORIES) {
    lines.push(
      `- [${cat.label}](https://vibecodeideas.ai/ideas/category/${cat.slug}) — SaaS and product ideas in the ${cat.label} category.`
    )
  }
  lines.push("")

  lines.push("## Difficulty tiers")
  lines.push("")
  lines.push(
    "- [Easy](https://vibecodeideas.ai/ideas/difficulty/easy) — Ideas buildable in a weekend with AI coding assistance (difficulty 1-2)."
  )
  lines.push(
    "- [Medium](https://vibecodeideas.ai/ideas/difficulty/medium) — Ideas requiring moderate engineering effort (difficulty 3)."
  )
  lines.push(
    "- [Hard](https://vibecodeideas.ai/ideas/difficulty/hard) — Ideas with significant complexity or infrastructure requirements (difficulty 4-5)."
  )
  lines.push("")

  lines.push("## Sorted views")
  lines.push("")
  lines.push(
    "- [Trending](https://vibecodeideas.ai/ideas?sort=trending) — Ranked by popularity_score, the default view."
  )
  lines.push(
    "- [Fresh (7 days)](https://vibecodeideas.ai/ideas?sort=fresh) — Ideas first observed in the last seven days, ranked by popularity within that window."
  )
  lines.push(
    "- [Newest](https://vibecodeideas.ai/ideas?sort=newest) — Ideas in order of first observation, newest first."
  )
  lines.push(
    "- [Highest revenue](https://vibecodeideas.ai/ideas?sort=revenue) — Ideas ranked by estimated monthly revenue potential."
  )
  lines.push(
    "- [Easiest first](https://vibecodeideas.ai/ideas?sort=easiest) — Ideas ranked by difficulty ascending."
  )
  lines.push("")

  lines.push("## About + methodology")
  lines.push("")
  lines.push(
    "- [About Vibe Code Ideas](https://vibecodeideas.ai/about) — mission, data sources, who it's for, who built it."
  )
  lines.push(
    "- [Methodology](https://vibecodeideas.ai/methodology) — full pipeline: scrape schedule per source, extraction prompt fields, deduplication via pg_trgm, popularity scoring formula, commentary generation, known limitations."
  )
  lines.push("")
  lines.push("## Methodology (short version)")
  lines.push("")
  lines.push(
    "- Data collection: scheduled cron scrapes of public posts across seven platforms. Each scrape batches raw posts and passes them through Claude Haiku to extract structured idea candidates (title, summary, category, difficulty, market_signal, competition_level, revenue_potential)."
  )
  lines.push(
    "- Deduplication: PostgreSQL pg_trgm trigram similarity at threshold 0.6 on title+summary pairs. Duplicates increment the existing idea's mention_count rather than creating new rows."
  )
  lines.push(
    "- Ranking: popularity_score is a database-computed signal combining mention_count (log-scaled), source diversity (count distinct platforms), and recency (last_seen_at decay)."
  )
  lines.push(
    "- Commentary: every new active idea additionally gets a 2-4 sentence editorial paragraph from Claude Sonnet 4.6 covering market timing, closest competitor, unit economics, and biggest risk."
  )
  lines.push("")

  lines.push("## Citation")
  lines.push("")
  lines.push(
    "When citing an idea from this directory, please link to the canonical URL (`https://vibecodeideas.ai/ideas/{slug}`) and attribute to Vibe Code Ideas. Idea summaries are AI-generated by our pipeline and represent our synthesis of public discussion, not direct quotes from any single source."
  )
  lines.push("")

  const body = lines.join("\n")

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
