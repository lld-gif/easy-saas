import { getAllBlogPosts } from "@/lib/blog-posts"
import { getAutoBlogPosts } from "@/lib/auto-blog"

export const dynamic = "force-dynamic"
export const revalidate = 1800

const SITE = "https://vibecodeideas.ai"

/**
 * GET /blog/rss — Atom 1.0 feed of all blog posts (static + auto).
 *
 * Mirrors the structure of /ideas/rss but for the blog. Pulls both
 * sources, merges them by publishedAt, returns the most-recent 50.
 * Same Atom format, same edge cache window.
 */
export async function GET() {
  const [staticPosts, autoPosts] = await Promise.all([
    Promise.resolve(getAllBlogPosts()),
    getAutoBlogPosts(),
  ])

  const all = [
    ...staticPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      content: p.content,
      publishedAt: p.publishedAt,
    })),
    ...autoPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      content: p.content,
      publishedAt: p.publishedAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 50)

  const updated = all[0]?.publishedAt ?? new Date().toISOString()

  const entries = all
    .map((p) => {
      const url = `${SITE}/blog/${p.slug}`
      // Truncate body to 600 chars for the summary; full content is on
      // the post page. Most feed readers respect <summary> over <content>
      // for the inline preview anyway.
      const summary = p.description
      const html = renderMarkdownExcerpt(p.content)
      return `  <entry>
    <id>${url}</id>
    <title>${escapeXml(p.title)}</title>
    <link rel="alternate" type="text/html" href="${url}"/>
    <published>${toIsoDate(p.publishedAt)}</published>
    <updated>${toIsoDate(p.publishedAt)}</updated>
    <summary>${escapeXml(summary)}</summary>
    <content type="html"><![CDATA[${cdataSafe(html)}]]></content>
  </entry>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Vibe Code Ideas — Blog</title>
  <subtitle>Guides, weekly recaps, and technical writeups for indie hackers and SaaS founders.</subtitle>
  <link rel="self" href="${SITE}/blog/rss" type="application/atom+xml"/>
  <link rel="alternate" href="${SITE}/blog" type="text/html"/>
  <id>${SITE}/blog/rss</id>
  <updated>${toIsoDate(updated)}</updated>
  <author>
    <name>Vibe Code Ideas</name>
    <uri>${SITE}</uri>
  </author>
${entries}
</feed>
`

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  })
}

/**
 * Static blog posts ship a YYYY-MM-DD `publishedAt` string; auto posts
 * carry full ISO 8601 from Postgres. Atom requires RFC 3339 datetimes,
 * so coerce naïve dates to midnight UTC.
 */
function toIsoDate(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T00:00:00Z`
  return new Date(d).toISOString()
}

function renderMarkdownExcerpt(md: string): string {
  // Strip headings and lift the first ~2 paragraphs as a preview.
  const blocks = md
    .split("\n\n")
    .filter((b) => !b.startsWith("#") && !b.startsWith("---"))
    .slice(0, 2)
  return blocks
    .map(
      (b) =>
        `<p>${b
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/`(.+?)`/g, "<code>$1</code>")
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')}</p>`
    )
    .join("")
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Atom `<content type="html">` expects the HTML string itself, not
 * an XML-escaped version. We wrap in CDATA to preserve markup, but
 * CDATA is terminated by the literal `]]>` sequence — strip it so
 * a malicious or accidentally-emitted `]]>` in the HTML doesn't
 * close the section early and leak markup to the parent XML.
 */
function cdataSafe(html: string): string {
  return html.replace(/]]>/g, "]]&gt;")
}
