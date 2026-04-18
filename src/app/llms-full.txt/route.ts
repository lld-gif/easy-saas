import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * `/llms-full.txt` — Full-catalog markdown dump for LLM ingestion.
 *
 * Complements `/llms.txt` (top-100 index) by shipping every active idea in a
 * single markdown response suitable for one-shot context-window ingestion or
 * offline RAG indexing.
 *
 * Current corpus (~2,200 active ideas) fits comfortably in a single Claude
 * 200K context. We paginate defensively with `?page=N` anyway so the endpoint
 * stays valid as the corpus grows past the single-context threshold.
 *
 * Cached for 1 hour. The catalog shifts slowly at the daily aggregate level;
 * fresh ideas still appear via `/llms.txt` (which has a tighter window) and
 * via the sitemap.
 */
export const revalidate = 3600

const PAGE_SIZE = 2500 // Hard ceiling; keeps any single response under ~1MB.

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const pageParam = request.nextUrl.searchParams.get("page")
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { data: ideas, count } = await supabase
    .from("ideas")
    .select(
      "slug, title, summary, category, tags, difficulty, market_signal, competition_level, revenue_potential, mention_count, popularity_score, first_seen_at, last_seen_at",
      { count: "exact" }
    )
    .eq("status", "active")
    .order("popularity_score", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const lines: string[] = []

  lines.push("# Vibe Code Ideas — Full Catalog")
  lines.push("")
  lines.push(
    `> Every active idea in the Vibe Code Ideas directory, in a single markdown document. Designed for LLM ingestion into RAG indexes or directly into model context windows. For a curated top-100 index with less token overhead, use https://vibecodeideas.ai/llms.txt instead.`
  )
  lines.push("")
  lines.push(`Total active ideas: ${total}`)
  lines.push(`This page: ${page} of ${totalPages} (up to ${PAGE_SIZE} ideas per page)`)
  lines.push(`Updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`Canonical site: https://vibecodeideas.ai`)
  lines.push("")

  if (totalPages > 1) {
    lines.push("## Pagination")
    lines.push("")
    for (let p = 1; p <= totalPages; p++) {
      lines.push(
        `- Page ${p}: https://vibecodeideas.ai/llms-full.txt?page=${p}`
      )
    }
    lines.push("")
  }

  lines.push("## About this data")
  lines.push("")
  lines.push(
    "Ideas are aggregated from public posts across seven platforms (Hacker News, GitHub, Product Hunt, Indie Hackers, Reddit, Google Trends, and founder discussion forums). Each post is passed through Claude Haiku to extract structured idea candidates; duplicates are merged via PostgreSQL pg_trgm trigram similarity. Fields:"
  )
  lines.push("")
  lines.push(
    "- **category** — one of 14 fixed categories (fintech, devtools, automation, ai-ml, ecommerce, health, education, creator-tools, productivity, marketing, hr-recruiting, real-estate, logistics, other)"
  )
  lines.push(
    "- **difficulty** — 1 (weekend build with AI) to 5 (complex infrastructure)"
  )
  lines.push(
    "- **market_signal** — strong / moderate / weak — LLM-assigned demand signal based on how explicitly the source post requested the product"
  )
  lines.push(
    "- **competition_level** — low / medium / high — LLM-assigned estimate of existing alternatives"
  )
  lines.push(
    "- **revenue_potential** — free-text MRR range (e.g. `$2k-10k/mo`) or `unknown`"
  )
  lines.push(
    "- **mention_count** — number of times this idea has been independently surfaced across the seven sources; primary input to popularity_score"
  )
  lines.push(
    "- **popularity_score** — database-computed ranking signal combining mention_count (log-scaled), source diversity, and recency decay"
  )
  lines.push("")
  lines.push("---")
  lines.push("")

  lines.push("## Ideas")
  lines.push("")

  for (const idea of ideas ?? []) {
    lines.push(`### ${idea.title}`)
    lines.push("")
    lines.push(idea.summary.trim())
    lines.push("")
    const metaParts = [
      `Category: ${idea.category}`,
      `Difficulty: ${idea.difficulty ?? "unknown"}/5`,
      `Market signal: ${idea.market_signal}`,
      `Competition: ${idea.competition_level}`,
      `Revenue potential: ${idea.revenue_potential}`,
      `Mentions: ${idea.mention_count}`,
      `First seen: ${idea.first_seen_at?.slice(0, 10) ?? "unknown"}`,
    ]
    lines.push(metaParts.join(" · "))
    if (idea.tags && idea.tags.length > 0) {
      lines.push(`Tags: ${idea.tags.join(", ")}`)
    }
    lines.push(`URL: https://vibecodeideas.ai/ideas/${idea.slug}`)
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  lines.push("## Citation")
  lines.push("")
  lines.push(
    "Please link to the canonical per-idea URL (`https://vibecodeideas.ai/ideas/{slug}`) when citing. Idea summaries are AI-generated syntheses of public discussion, not direct source quotes."
  )
  lines.push("")

  const body = lines.join("\n")

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Total-Ideas": String(total),
      "X-Page": String(page),
      "X-Total-Pages": String(totalPages),
    },
  })
}
