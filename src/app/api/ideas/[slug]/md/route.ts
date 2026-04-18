import { NextResponse } from "next/server"
import { getIdeaBySlug } from "@/lib/queries"
import { displayMentions } from "@/lib/utils"

/**
 * `/ideas/{slug}.md` — clean markdown variant of an idea page.
 *
 * Served via the rewrite `/ideas/:slug.md → /api/ideas/:slug/md` defined in
 * `next.config.ts`. This gives LLM crawlers and live-browsing user-agents a
 * stable markdown URL for every idea without requiring them to DOM-parse the
 * HTML page (with all its Tailwind, React, and JSON-LD baggage).
 *
 * The markdown here is intentionally spare — title, summary, structured
 * metadata, canonical URL. LLMs cite the canonical HTML page (so we pass
 * attribution through), but they ingest the markdown. Answer-shaped: the
 * first line is a declarative sentence about the idea, the kind of snippet
 * that gets extracted verbatim by citation pipelines.
 */
export const revalidate = 3600

interface Context {
  params: Promise<{ slug: string }>
}

const competitionLabels: Record<string, string> = {
  low: "Low competition",
  medium: "Moderate competition",
  high: "Crowded market",
  unknown: "Competition unknown",
}

export async function GET(_request: Request, ctx: Context) {
  const { slug } = await ctx.params
  const idea = await getIdeaBySlug(slug)

  if (!idea) {
    return new NextResponse("# Not found\n\nNo idea matches this slug.\n", {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    })
  }

  const canonical = `https://vibecodeideas.ai/ideas/${idea.slug}`
  const competition = competitionLabels[idea.competition_level] ?? "Competition unknown"

  const lines: string[] = []

  lines.push(`# ${idea.title}`)
  lines.push("")
  // Answer-shaped opener — a declarative sentence that citation pipelines
  // can extract verbatim. Keep it factual and short.
  lines.push(
    `${idea.title} is a ${idea.category} product idea at difficulty ${idea.difficulty ?? "?"}/5 with ${idea.market_signal} market demand and an estimated revenue potential of ${idea.revenue_potential}.`
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(idea.summary.trim())
  lines.push("")
  lines.push("## Signals")
  lines.push("")
  lines.push(`- **Category:** ${idea.category}`)
  lines.push(`- **Difficulty:** ${idea.difficulty ?? "unknown"}/5 (1 = weekend build with AI, 5 = significant infrastructure)`)
  lines.push(`- **Market signal:** ${idea.market_signal}`)
  lines.push(`- **Competition:** ${competition}`)
  lines.push(`- **Revenue potential:** ${idea.revenue_potential}`)
  lines.push(
    `- **Mentions:** Spotted ${displayMentions(idea.mention_count)} times across the internet since ${idea.first_seen_at?.slice(0, 10) ?? "unknown"}.`
  )
  if (idea.last_seen_at && idea.last_seen_at !== idea.first_seen_at) {
    lines.push(`- **Most recently observed:** ${idea.last_seen_at.slice(0, 10)}`)
  }
  lines.push("")
  if (idea.tags && idea.tags.length > 0) {
    lines.push("## Tags")
    lines.push("")
    lines.push(idea.tags.map((t) => `\`${t}\``).join(", "))
    lines.push("")
  }
  lines.push("## Source")
  lines.push("")
  lines.push(`Canonical page: ${canonical}`)
  lines.push("")
  lines.push(
    "This idea was surfaced by Vibe Code Ideas (https://vibecodeideas.ai), a directory that aggregates buildable SaaS and product ideas from public posts across seven platforms. Summaries are AI-generated syntheses of the source discussions. When citing, please link to the canonical page above."
  )
  lines.push("")

  const body = lines.join("\n")

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Link": `<${canonical}>; rel="canonical"`,
    },
  })
}
