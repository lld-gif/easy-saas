import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
// Cache the response edge-side for 30 minutes — feeds don't need to be
// real-time and aggressive readers (Feedly, NetNewsWire) hit this every
// 15-60 minutes already.
export const revalidate = 1800

const SITE = "https://vibecodeideas.ai"
const FEED_LIMIT = 50

/**
 * GET /ideas/rss — Atom 1.0 feed of the most recently first-seen ideas.
 *
 * Why Atom over RSS 2.0:
 *   - Atom requires a stable id per entry, which we already have (idea
 *     slug). RSS 2.0's `<guid>` is optional and frequently abused.
 *   - All major readers (Feedly, NetNewsWire, Inoreader, Newsboat)
 *     handle Atom natively; the format is just better-specified.
 *
 * Hand-rolled XML on purpose — pulling in `feed` or `rss` packages adds
 * ~50KB for what's a 30-line template. Escapes the four characters that
 * matter (& < > ") and emits canonical UTF-8.
 *
 * Discoverability: a `<link rel="alternate" type="application/rss+xml">`
 * in the root layout points at this URL so browsers and feed readers
 * can auto-detect.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: ideas, error } = await supabase
    .from("ideas")
    .select(
      "slug, title, summary, category, mention_count, difficulty, revenue_potential, first_seen_at, updated_at, commentary"
    )
    .eq("status", "active")
    .order("first_seen_at", { ascending: false })
    .limit(FEED_LIMIT)

  if (error) {
    return new Response(
      `<error>Failed to load feed: ${escapeXml(error.message)}</error>`,
      { status: 500, headers: { "Content-Type": "application/xml" } }
    )
  }

  const updatedAt = ideas?.[0]?.updated_at ?? new Date().toISOString()

  const entries = (ideas ?? [])
    .map((i) => {
      const url = `${SITE}/ideas/${i.slug}`
      const summary = (i.commentary ?? i.summary ?? "").slice(0, 1000)
      // Build a small structured description so feed-reader summaries are
      // useful without forcing a click. Difficulty + revenue + category
      // + mention count is exactly the metadata that helps an indie
      // hacker triage from their feed reader at 7am.
      const meta =
        `${i.category ?? "uncategorized"} · ` +
        `difficulty ${i.difficulty}/5 · ` +
        `${i.mention_count ?? 0} mentions · ` +
        `revenue ${i.revenue_potential ?? "unknown"}`
      const html = `<p><strong>${escapeXml(meta)}</strong></p><p>${escapeXml(summary)}</p>`
      return `  <entry>
    <id>${url}</id>
    <title>${escapeXml(i.title)}</title>
    <link rel="alternate" type="text/html" href="${url}"/>
    <published>${i.first_seen_at}</published>
    <updated>${i.updated_at}</updated>
    <category term="${escapeXml(i.category ?? "uncategorized")}"/>
    <summary>${escapeXml(summary)}</summary>
    <content type="html">${escapeXml(html)}</content>
  </entry>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Vibe Code Ideas — Fresh SaaS ideas, daily</title>
  <subtitle>Crowdsourced SaaS product ideas extracted from Hacker News, GitHub, Product Hunt, and Google Trends. Updated daily.</subtitle>
  <link rel="self" href="${SITE}/ideas/rss" type="application/atom+xml"/>
  <link rel="alternate" href="${SITE}/ideas?sort=fresh" type="text/html"/>
  <id>${SITE}/ideas/rss</id>
  <updated>${updatedAt}</updated>
  <author>
    <name>Vibe Code Ideas</name>
    <uri>${SITE}</uri>
  </author>
  <generator uri="${SITE}">Vibe Code Ideas (Next.js)</generator>
${entries}
</feed>
`

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      // Public, intermediate-cacheable, swr for old readers.
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  })
}

/**
 * Minimal XML escaper — handles the five characters that break feed
 * readers. We don't need a general HTML escaper because the only HTML
 * we emit lives inside CDATA-equivalent text content.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
