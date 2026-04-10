import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getBlogPost, getAllBlogPosts } from "@/lib/blog-posts"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  return {
    title: `${post.title} — Vibe Code Ideas`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      url: `https://vibecodeideas.ai/blog/${post.slug}`,
    },
  }
}

function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 230))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const readingTime = estimateReadingTime(post.content)

  return (
    <main className="min-h-screen">
      {/* Article header */}
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 pb-6">
        <nav className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
            All posts
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <time>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <span className="text-border">·</span>
          <span>{readingTime} min read</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {post.description}
        </p>
      </div>

      <hr className="max-w-2xl mx-auto border-border/60" />

      {/* Article body */}
      <article className="max-w-2xl mx-auto px-5 sm:px-6 py-10">
        <div className="blog-content">
          {post.content.split("\n\n").map((block, i) => {
            // Headings
            if (block.startsWith("## ")) {
              return (
                <h2 key={i} className="text-2xl font-semibold tracking-tight text-foreground mt-14 mb-5 first:mt-0">
                  {block.replace("## ", "")}
                </h2>
              )
            }
            if (block.startsWith("### ")) {
              return (
                <h3 key={i} className="text-xl font-semibold text-foreground mt-10 mb-4">
                  {block.replace("### ", "")}
                </h3>
              )
            }
            // Horizontal rule
            if (block.trim() === "---") {
              return <hr key={i} className="my-12 border-border/60" />
            }
            // Table blocks
            if (block.includes("|") && block.includes("---")) {
              const rows = block.trim().split("\n").filter((r) => !r.match(/^\|[\s-|]+\|$/))
              const headers = rows[0]?.split("|").map((c) => c.trim()).filter(Boolean)
              const body = rows.slice(1).map((r) => r.split("|").map((c) => c.trim()).filter(Boolean))
              return (
                <div key={i} className="my-8 -mx-5 sm:mx-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {headers?.map((h, j) => (
                          <th key={j} className="text-left py-3 px-4 sm:px-3 border-b-2 border-border font-semibold text-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {body.map((row, j) => (
                        <tr key={j} className="border-b border-border/40">
                          {row.map((cell, k) => (
                            <td key={k} className="py-3 px-4 sm:px-3 text-muted-foreground">
                              <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(cell) }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
            // Lists
            if (block.match(/^- /m)) {
              const items = block.split("\n").filter((l) => l.startsWith("- "))
              return (
                <ul key={i} className="my-6 space-y-2.5 pl-1">
                  {items.map((item, j) => (
                    <li key={j} className="flex gap-3 text-base leading-relaxed text-muted-foreground">
                      <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                      <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item.replace(/^- /, "")) }} />
                    </li>
                  ))}
                </ul>
              )
            }
            // Checklist
            if (block.match(/^- \[/m)) {
              const items = block.split("\n").filter((l) => l.startsWith("- ["))
              return (
                <ul key={i} className="my-6 space-y-2 pl-1">
                  {items.map((item, j) => {
                    const checked = item.includes("[x]")
                    const text = item.replace(/^- \[.\] /, "")
                    return (
                      <li key={j} className="flex items-start gap-3 text-base text-muted-foreground">
                        <input type="checkbox" checked={checked} readOnly className="mt-1.5 rounded" />
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              )
            }
            // Blockquote
            if (block.startsWith("> ")) {
              const text = block.replace(/^> /gm, "")
              return (
                <blockquote key={i} className="my-8 border-l-2 border-orange-400 pl-5 text-base italic text-muted-foreground">
                  <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(text) }} />
                </blockquote>
              )
            }
            // Paragraphs
            return (
              <p
                key={i}
                className="text-base leading-[1.75] text-muted-foreground mb-6 [&>strong]:text-foreground [&>strong]:font-semibold [&>a]:text-orange-600 [&>a]:underline [&>a]:underline-offset-2 [&>a]:decoration-orange-300 hover:[&>a]:decoration-orange-500 [&>a]:transition-colors"
                dangerouslySetInnerHTML={{ __html: inlineMarkdown(block) }}
              />
            )
          })}
        </div>
      </article>

      {/* Footer CTA */}
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16">
        <div className="border-t border-border/60 pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
              </svg>
              All posts
            </Link>
            <Link
              href="/ideas"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors"
            >
              Browse ideas
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/`(.+?)`/g, '<code class="text-[0.875em] font-mono bg-muted px-1.5 py-0.5 rounded-md text-foreground">$1</code>')
}
