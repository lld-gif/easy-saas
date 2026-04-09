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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/blog" className="hover:text-foreground">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span>{post.title}</span>
      </nav>

      <article>
        <time className="text-sm text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2 mb-8">{post.title}</h1>

        <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-table:text-sm">
          {post.content.split("\n\n").map((block, i) => {
            // Headings
            if (block.startsWith("## ")) {
              return <h2 key={i}>{block.replace("## ", "")}</h2>
            }
            if (block.startsWith("### ")) {
              return <h3 key={i}>{block.replace("### ", "")}</h3>
            }
            // Horizontal rule
            if (block.trim() === "---") {
              return <hr key={i} className="my-10 border-border" />
            }
            // Table blocks
            if (block.includes("|") && block.includes("---")) {
              const rows = block.trim().split("\n").filter((r) => !r.match(/^\|[\s-|]+\|$/))
              const headers = rows[0]?.split("|").map((c) => c.trim()).filter(Boolean)
              const body = rows.slice(1).map((r) => r.split("|").map((c) => c.trim()).filter(Boolean))
              return (
                <div key={i} className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full my-6">
                  <thead>
                    <tr>
                      {headers?.map((h, j) => (
                        <th key={j} className="text-left py-2 px-3 border-b border-border font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {body.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} className="py-2 px-3 border-b border-border/50">
                            {cell}
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
                <ul key={i} className="list-disc pl-4 sm:pl-6 space-y-1 my-4">
                  {items.map((item, j) => (
                    <li key={j}>
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
                <ul key={i} className="space-y-1 my-4 list-none pl-0">
                  {items.map((item, j) => {
                    const checked = item.includes("[x]")
                    const text = item.replace(/^- \[.\] /, "")
                    return (
                      <li key={j} className="flex items-start gap-2">
                        <input type="checkbox" checked={checked} readOnly className="mt-1" />
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              )
            }
            // Paragraphs
            return (
              <p key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(block) }} />
            )
          })}
        </div>
      </article>

      <div className="mt-16 pt-8 border-t border-border">
        <Link
          href="/blog"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          &larr; Back to all posts
        </Link>
      </div>
    </main>
  )
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-indigo-600 hover:underline">$1</a>')
    .replace(/`(.+?)`/g, '<code class="text-sm bg-gray-100 px-1.5 py-0.5 rounded">$1</code>')
}
